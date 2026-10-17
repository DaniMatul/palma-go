import { OrderStatus, OrderItemType, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { businessDateFromString, todayBusinessDate } from './dailyMenuService.js'

export type CreateOrderItemInput = {
  type: OrderItemType
  menuItemId?: string
  extraId?: string
  description?: string
  unitPrice?: number
  quantity: number
}

export type CreateOrderInput = {
  customerName: string
  address: string
  items: CreateOrderItemInput[]
}

export type ListOrdersFilters = {
  from?: Date
  to?: Date
  status?: OrderStatus
  search?: string
}

export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrderValidationError'
  }
}

export class OrderNotFoundError extends Error {
  constructor() {
    super('Pedido no encontrado')
    this.name = 'OrderNotFoundError'
  }
}

export class OrderItemNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrderItemNotFoundError'
  }
}

export class OrderAvailabilityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrderAvailabilityError'
  }
}

export class OrderStatusTransitionError extends Error {
  constructor() {
    super('El cambio de estado no está permitido')
    this.name = 'OrderStatusTransitionError'
  }
}

export class OrderNumberConflictError extends Error {
  constructor() {
    super('No se pudo asignar un número de pedido para esta fecha')
    this.name = 'OrderNumberConflictError'
  }
}

const orderInclude = { items: true } satisfies Prisma.OrderInclude

export function formatOrderNumber(dailyNumber: number) {
  return `P${String(dailyNumber).padStart(2, '0')}`
}

function serializeOrder(order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>) {
  return { ...order, displayNumber: formatOrderNumber(order.dailyNumber) }
}

async function createOrderTransaction(input: CreateOrderInput) {
  const businessDate = businessDateFromString(todayBusinessDate())
  if (!businessDate) throw new OrderValidationError('No se pudo determinar la fecha actual')

  return prisma.$transaction(async (transaction) => {
    const dailyMenu = await transaction.dailyMenu.findUnique({
      where: { date: businessDate },
      include: { items: { include: { menuItem: true } } },
    })
    const dailyItemsByMenuId = new Map(dailyMenu?.items.map((item) => [item.menuItemId, item]) ?? [])
    const extraIds = [...new Set(input.items.filter((item) => item.type === OrderItemType.EXTRA).map((item) => item.extraId).filter((id): id is string => Boolean(id)))]
    const extras = await transaction.extra.findMany({ where: { id: { in: extraIds }, active: true } })
    const extrasById = new Map(extras.map((extra) => [extra.id, extra]))
    const menuQuantities = new Map<string, number>()
    const orderItems: Array<{ type: OrderItemType; description: string; quantity: number; unitPrice: Prisma.Decimal; subtotal: Prisma.Decimal; menuItemId?: string; extraId?: string }> = []

    for (const item of input.items) {
      if (item.type === OrderItemType.MENU) {
        if (!item.menuItemId) throw new OrderValidationError('menuItemId es obligatorio para items MENU')
        const dailyItem = dailyItemsByMenuId.get(item.menuItemId)
        if (!dailyItem) throw new OrderItemNotFoundError('El menú no está disponible en el menú del día actual')
        menuQuantities.set(item.menuItemId, (menuQuantities.get(item.menuItemId) ?? 0) + item.quantity)
        const unitPrice = new Prisma.Decimal(dailyItem.menuItem.price)
        orderItems.push({ type: item.type, description: dailyItem.menuItem.name, quantity: item.quantity, unitPrice, subtotal: unitPrice.mul(item.quantity), menuItemId: item.menuItemId })
      } else if (item.type === OrderItemType.EXTRA) {
        if (!item.extraId) throw new OrderValidationError('extraId es obligatorio para items EXTRA')
        const extra = extrasById.get(item.extraId)
        if (!extra) throw new OrderItemNotFoundError('El extra no existe o no está activo')
        const unitPrice = new Prisma.Decimal(extra.price)
        orderItems.push({ type: item.type, description: extra.name, quantity: item.quantity, unitPrice, subtotal: unitPrice.mul(item.quantity), extraId: item.extraId })
      } else if (item.type === OrderItemType.CUSTOM) {
        const description = item.description?.trim() ?? ''
        if (!description) throw new OrderValidationError('description es obligatorio para items CUSTOM')
        if (item.unitPrice === undefined || !Number.isFinite(item.unitPrice) || item.unitPrice <= 0) throw new OrderValidationError('unitPrice debe ser mayor que 0 para items CUSTOM')
        const unitPrice = new Prisma.Decimal(item.unitPrice)
        orderItems.push({ type: item.type, description, quantity: item.quantity, unitPrice, subtotal: unitPrice.mul(item.quantity) })
      } else {
        throw new OrderValidationError('type de item no válido')
      }
    }

    for (const [menuItemId, quantity] of menuQuantities) {
      const dailyItem = dailyItemsByMenuId.get(menuItemId)
      if (!dailyItem) throw new OrderItemNotFoundError('El menú no está disponible en el menú del día actual')
      const updated = await transaction.dailyMenuItem.updateMany({ where: { id: dailyItem.id, remainingQuantity: { gte: quantity } }, data: { remainingQuantity: { decrement: quantity } } })
      if (updated.count !== 1) throw new OrderAvailabilityError(`No hay suficientes unidades disponibles para ${dailyItem.menuItem.name}`)
    }

    const total = orderItems.reduce((sum, item) => sum.add(item.subtotal), new Prisma.Decimal(0))
    const createdAt = new Date()
    const promiseTime = new Date(createdAt.getTime() + 20 * 60 * 1000)
    const lastOrder = await transaction.order.findFirst({ where: { orderDate: businessDate }, orderBy: { dailyNumber: 'desc' }, select: { dailyNumber: true } })
    const dailyNumber = (lastOrder?.dailyNumber ?? 0) + 1
    const order = await transaction.order.create({ data: { customerName: input.customerName, address: input.address, createdAt, promiseTime, orderDate: businessDate, dailyNumber, total } })
    await transaction.orderItem.createMany({ data: orderItems.map((item) => ({ ...item, orderId: order.id })) })

    return serializeOrder(await transaction.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude }))
  })
}

export async function createOrder(input: CreateOrderInput) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await createOrderTransaction(input)
    } catch (error) {
      const isNumberConflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && String(error.meta?.target ?? '').includes('orderDate')
      if (!isNumberConflict) throw error
      if (attempt === 2) throw new OrderNumberConflictError()
    }
  }
  throw new OrderNumberConflictError()
}

export async function listOrders(filters: ListOrdersFilters = {}) {
  const where: Prisma.OrderWhereInput = {}
  if (filters.status) where.status = filters.status
  if (filters.from || filters.to) where.orderDate = { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) }
  if (filters.search) {
    const normalizedSearch = filters.search.trim()
    const dailyNumber = normalizedSearch.match(/^P?\d+$/i)?.[0].replace(/^P/i, '')
    where.OR = [
      { customerName: { contains: normalizedSearch } },
      ...(dailyNumber ? [{ dailyNumber: Number(dailyNumber) }] : []),
    ]
  }
  const orders = await prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, include: orderInclude })
  return orders.map(serializeOrder)
}

export async function changeOrderStatus(id: string, status: OrderStatus) {
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) throw new OrderNotFoundError()
  const allowed: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.IN_PROGRESS]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    [OrderStatus.COMPLETED]: [OrderStatus.IN_PROGRESS],
    [OrderStatus.CANCELLED]: [],
  }
  if (!allowed[order.status].includes(status)) throw new OrderStatusTransitionError()
  return serializeOrder(await prisma.order.update({ where: { id }, data: { status }, include: orderInclude }))
}
