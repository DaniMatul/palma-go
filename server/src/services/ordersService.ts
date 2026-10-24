import { CustomizationAction, MenuOrderMode, OrderStatus, OrderItemType, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { businessDateFromString, todayBusinessDate } from './dailyMenuService.js'

export type CreateOrderItemInput = {
  type: OrderItemType
  menuItemId?: string
  extraId?: string
  description?: string
  unitPrice?: number
  quantity: number
  comment?: string
  customizations?: Array<{ componentId: string; action: CustomizationAction; quantity: number }>
  menuMode?: MenuOrderMode
}

export type CreateOrderAccountInput = {
  name?: string
  items: CreateOrderItemInput[]
}

export type CreateOrderInput = {
  customerName: string
  address: string
  accounts: CreateOrderAccountInput[] | { items: CreateOrderItemInput[] }
  promiseTime?: Date
}

export type ListOrdersFilters = {
  from?: Date
  to?: Date
  status?: OrderStatus
  search?: string
  activeOnly?: boolean
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

export class ActiveDailyMenuNotFoundError extends Error {
  constructor() {
    super('No existe un menú del día activo. Crea primero un menú del día.')
    this.name = 'ActiveDailyMenuNotFoundError'
  }
}

const orderItemInclude = { customizations: true, dailyMenuItem: { include: { components: { where: { active: true }, orderBy: { position: 'asc' } } } } } satisfies Prisma.OrderItemInclude
const orderInclude = { items: { include: orderItemInclude }, accounts: { include: { items: { include: orderItemInclude } } } } satisfies Prisma.OrderInclude

export function formatOrderNumber(dailyNumber: number) {
  return `P${String(dailyNumber).padStart(2, '0')}`
}

function serializeOrder(order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>) {
  return {
    ...order,
    displayNumber: formatOrderNumber(order.dailyNumber),
    accounts: order.accounts.map((account) => ({
      ...account,
      subtotal: account.items.reduce((sum, item) => sum.add(item.subtotal), new Prisma.Decimal(0)),
    })),
  }
}

async function createOrderTransaction(input: CreateOrderInput) {
  const businessDate = businessDateFromString(todayBusinessDate())
  if (!businessDate) throw new OrderValidationError('No se pudo determinar la fecha actual')

  return prisma.$transaction(async (transaction) => {
    const dailyMenu = await transaction.dailyMenu.findFirst({
      where: { date: businessDate, status: 'ACTIVE' },
      include: { items: { where: { active: true }, include: { menuItem: true, components: { where: { active: true }, orderBy: { position: 'asc' } } } } },
    })
    if (!dailyMenu) throw new ActiveDailyMenuNotFoundError()
    const accounts: CreateOrderAccountInput[] = Array.isArray(input.accounts) ? input.accounts : [input.accounts]
    if (accounts.length === 0 || accounts.some((account) => account.items.length === 0)) throw new OrderValidationError('Cada pedido debe tener al menos una cuenta con productos')
    const dailyItemsByMenuId = new Map(dailyMenu?.items.map((item) => [item.menuItemId, item]) ?? [])
    const allItems = accounts.flatMap((account) => account.items)
    const extraIds = [...new Set(allItems.filter((item) => item.type === OrderItemType.EXTRA).map((item) => item.extraId).filter((id): id is string => Boolean(id)))]
    const extras = await transaction.extra.findMany({ where: { id: { in: extraIds }, active: true } })
    const extrasById = new Map(extras.map((extra) => [extra.id, extra]))
    const menuQuantities = new Map<string, number>()
    const orderItems: Array<{ accountIndex: number; type: OrderItemType; menuMode?: MenuOrderMode; description: string; quantity: number; unitPrice: Prisma.Decimal; subtotal: Prisma.Decimal; menuComponentsSnapshot?: string; menuItemId?: string; extraId?: string; dailyMenuItemId?: string; comment?: string; customizations?: Array<{ dailyMenuComponentId: string; componentName: string; action: CustomizationAction; quantity: number; unitPrice: Prisma.Decimal }> }> = []

    accounts.forEach((account, accountIndex) => account.items.forEach((item) => {
      if (item.type === OrderItemType.MENU) {
        if (!item.menuItemId) throw new OrderValidationError('menuItemId es obligatorio para items MENU')
        const dailyItem = dailyItemsByMenuId.get(item.menuItemId)
        if (!dailyItem) throw new OrderItemNotFoundError('El menú no está disponible en el menú del día actual')
        menuQuantities.set(item.menuItemId, (menuQuantities.get(item.menuItemId) ?? 0) + item.quantity)
        const menuMode = item.menuMode ?? MenuOrderMode.FULL
        if (menuMode === MenuOrderMode.INDIVIDUAL && item.customizations?.length) throw new OrderValidationError('El principal individual no admite personalizaciones')
        if (menuMode === MenuOrderMode.INDIVIDUAL && dailyItem.individualPrice === null) throw new OrderValidationError(`El principal individual de ${dailyItem.menuItem.name} no tiene precio configurado`)
        const componentById = new Map(dailyItem.components.map((component) => [component.id, component]))
        const usedComponents = new Set<string>()
        let unitPrice = new Prisma.Decimal(menuMode === MenuOrderMode.INDIVIDUAL ? dailyItem.individualPrice! : dailyItem.price)
        const customizations = (item.customizations ?? []).map((customization) => {
          const component = componentById.get(customization.componentId)
          if (!component) throw new OrderValidationError('La personalización no pertenece al menú seleccionado')
          if (usedComponents.has(component.id)) throw new OrderValidationError('No se puede personalizar dos veces el mismo componente')
          usedComponents.add(component.id)
          if (customization.action === CustomizationAction.REMOVE) {
            if (!component.removable) throw new OrderValidationError(`El componente ${component.name} no se puede quitar`)
            if (customization.quantity !== 1) throw new OrderValidationError('Un componente solo puede quitarse una vez')
            return { dailyMenuComponentId: component.id, componentName: component.name, action: customization.action, quantity: 1, unitPrice: new Prisma.Decimal(0) }
          }
          if (!component.allowsExtraPortion) throw new OrderValidationError(`El componente ${component.name} no permite porción adicional`)
          const extraPrice = new Prisma.Decimal(component.extraPortionPrice)
          unitPrice = unitPrice.add(extraPrice.mul(customization.quantity))
          return { dailyMenuComponentId: component.id, componentName: component.name, action: customization.action, quantity: customization.quantity, unitPrice: extraPrice }
        })
        orderItems.push({ accountIndex, type: item.type, menuMode, description: dailyItem.menuItem.name, quantity: item.quantity, unitPrice, subtotal: unitPrice.mul(item.quantity), menuComponentsSnapshot: JSON.stringify(menuMode === MenuOrderMode.FULL ? dailyItem.components.map((component) => ({ name: component.name })) : []), menuItemId: item.menuItemId, dailyMenuItemId: dailyItem.id, comment: menuMode === MenuOrderMode.FULL ? item.comment : undefined, customizations: menuMode === MenuOrderMode.FULL ? customizations : undefined })
      } else if (item.type === OrderItemType.EXTRA) {
        if (item.customizations?.length) throw new OrderValidationError('Las personalizaciones solo aplican a items MENU')
        if (!item.extraId) throw new OrderValidationError('extraId es obligatorio para items EXTRA')
        const extra = extrasById.get(item.extraId)
        if (!extra) throw new OrderItemNotFoundError('El extra no existe o no está activo')
        const unitPrice = new Prisma.Decimal(extra.price)
        orderItems.push({ accountIndex, type: item.type, description: extra.name, quantity: item.quantity, unitPrice, subtotal: unitPrice.mul(item.quantity), extraId: item.extraId })
      } else if (item.type === OrderItemType.CUSTOM) {
        if (item.customizations?.length) throw new OrderValidationError('Las personalizaciones solo aplican a items MENU')
        const description = item.description?.trim() ?? ''
        if (!description) throw new OrderValidationError('description es obligatorio para items CUSTOM')
        if (item.unitPrice === undefined || !Number.isFinite(item.unitPrice) || item.unitPrice <= 0) throw new OrderValidationError('unitPrice debe ser mayor que 0 para items CUSTOM')
        const unitPrice = new Prisma.Decimal(item.unitPrice)
        orderItems.push({ accountIndex, type: item.type, description, quantity: item.quantity, unitPrice, subtotal: unitPrice.mul(item.quantity) })
      } else {
        throw new OrderValidationError('type de item no válido')
      }
    }))

    for (const [menuItemId, quantity] of menuQuantities) {
      const dailyItem = dailyItemsByMenuId.get(menuItemId)
      if (!dailyItem) throw new OrderItemNotFoundError('El menú no está disponible en el menú del día actual')
      const updated = await transaction.dailyMenuItem.updateMany({ where: { id: dailyItem.id, remainingQuantity: { gte: quantity } }, data: { remainingQuantity: { decrement: quantity } } })
      if (updated.count !== 1) throw new OrderAvailabilityError(`No hay suficientes unidades disponibles para ${dailyItem.menuItem.name}`)
      const menuSubtotal = orderItems
        .filter((item) => item.dailyMenuItemId === dailyItem.id)
        .reduce((sum, item) => sum.add(item.subtotal), new Prisma.Decimal(0))
      if (!menuSubtotal.isZero()) {
        await transaction.dailyMenuItem.update({ where: { id: dailyItem.id }, data: { soldQuantity: { increment: quantity }, revenue: { increment: menuSubtotal } } })
      }
    }

    const total = orderItems.reduce((sum, item) => sum.add(item.subtotal), new Prisma.Decimal(0))
    const createdAt = new Date()
    const promiseTime = input.promiseTime ?? new Date(createdAt.getTime() + 20 * 60 * 1000)
    if (Number.isNaN(promiseTime.getTime()) || promiseTime < createdAt) throw new OrderValidationError('La hora de promesa debe ser posterior a la hora actual.')
    const lastOrder = await transaction.order.findFirst({ where: { orderDate: businessDate }, orderBy: { dailyNumber: 'desc' }, select: { dailyNumber: true } })
    const dailyNumber = (lastOrder?.dailyNumber ?? 0) + 1
    const order = await transaction.order.create({ data: { customerName: input.customerName, address: input.address, createdAt, promiseTime, orderDate: businessDate, dailyNumber, total, dailyMenuId: dailyMenu.id } })
    const createdAccounts: Array<{ id: string }> = []
    for (const [position, account] of accounts.entries()) {
      const createdAccount = await transaction.orderAccount.create({ data: { orderId: order.id, name: account.name || null, position: position + 1 } })
      createdAccounts.push(createdAccount)
    }
    for (const { accountIndex, customizations, ...item } of orderItems) {
      const createdItem = await transaction.orderItem.create({ data: { ...item, orderId: order.id, orderAccountId: createdAccounts[accountIndex].id, customizations: customizations ? { create: customizations } : undefined } })
      if (!createdItem) throw new OrderValidationError('No se pudo guardar el detalle de personalización')
    }

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
  if (filters.activeOnly) where.dailyMenu = { status: 'ACTIVE' }
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
