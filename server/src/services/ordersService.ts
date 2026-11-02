import { createHash } from 'node:crypto'
import { OrderItemOptionAction, OrderStatus, OrderItemType, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { businessDateFromString, todayBusinessDate } from './dailyMenuService.js'

export type CreateOrderItemInput = {
  type: OrderItemType
  menuItemId?: string
  extraId?: string
  description?: string
  unitPrice?: number
  quantity: number
  options?: CreateOrderOptionInput[]
}

export type CreateOrderOptionInput = {
  dailyMenuOptionId: string
  action?: OrderItemOptionAction
  quantity?: number
  replacesDailyMenuOptionId?: string
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

export class OrderIdempotencyConflictError extends Error {
  constructor(message = 'La clave de idempotencia ya fue utilizada con un payload diferente') {
    super(message)
    this.name = 'OrderIdempotencyConflictError'
  }
}

export class OrderIdempotencyResolutionError extends Error {
  constructor() {
    super('No se pudo recuperar la orden asociada a la clave de idempotencia')
    this.name = 'OrderIdempotencyResolutionError'
  }
}

export class ActiveDailyMenuNotFoundError extends Error {
  constructor() {
    super('No existe un menú del día activo. Crea primero un menú del día.')
    this.name = 'ActiveDailyMenuNotFoundError'
  }
}

const orderInclude = { items: { include: { options: true } }, accounts: { include: { items: { include: { options: true } } } } } satisfies Prisma.OrderInclude

function stableSerialize(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString())
  if (Array.isArray(value)) return `[${value.map((item) => stableSerialize(item)).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function createOrderFingerprint(input: CreateOrderInput) {
  return createHash('sha256').update(stableSerialize(input)).digest('hex')
}

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

async function createOrderTransaction(input: CreateOrderInput, idempotencyKey?: string, idempotencyFingerprint?: string) {
  const businessDate = businessDateFromString(todayBusinessDate())
  if (!businessDate) throw new OrderValidationError('No se pudo determinar la fecha actual')

  return prisma.$transaction(async (transaction) => {
    if (idempotencyKey) {
      const existingOrder = await transaction.order.findUnique({ where: { idempotencyKey }, include: orderInclude })
      if (existingOrder) {
        if (existingOrder.idempotencyFingerprint !== idempotencyFingerprint) throw new OrderIdempotencyConflictError()
        return serializeOrder(existingOrder)
      }
    }

    const dailyMenu = await transaction.dailyMenu.findFirst({
      where: { date: businessDate, status: 'ACTIVE' },
      include: {
        items: {
          where: { active: true },
          include: {
            menuItem: { include: { optionDefinitions: { where: { active: true }, include: { option: true } } } },
            optionAssignments: { include: { dailyMenuOption: { include: { option: true } } } },
          },
        },
      },
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
    const optionQuantities = new Map<string, number>()
    const orderItems: Array<{ accountIndex: number; type: OrderItemType; description: string; quantity: number; unitPrice: Prisma.Decimal; subtotal: Prisma.Decimal; menuItemId?: string; extraId?: string; dailyMenuItemId?: string; options: PreparedOrderOption[] }> = []

    accounts.forEach((account, accountIndex) => account.items.forEach((item) => {
      if (item.type === OrderItemType.MENU) {
        if (!item.menuItemId) throw new OrderValidationError('menuItemId es obligatorio para items MENU')
        const dailyItem = dailyItemsByMenuId.get(item.menuItemId)
        if (!dailyItem) throw new OrderItemNotFoundError('El menú no está disponible en el menú del día actual')
        const options = prepareMenuItemOptions(item, dailyItem)
        if (dailyItem.inventoryMode === 'LEGACY') menuQuantities.set(item.menuItemId, (menuQuantities.get(item.menuItemId) ?? 0) + item.quantity)
        options.forEach((option) => {
        if (option.reservedQuantity && option.dailyMenuOptionId) optionQuantities.set(option.dailyMenuOptionId, (optionQuantities.get(option.dailyMenuOptionId) ?? 0) + option.reservedQuantity)
        })
        const unitPrice = new Prisma.Decimal(dailyItem.price)
        const optionCharge = options.reduce((sum, option) => sum.add(option.charge), new Prisma.Decimal(0))
        orderItems.push({ accountIndex, type: item.type, description: dailyItem.menuItem.name, quantity: item.quantity, unitPrice, subtotal: unitPrice.mul(item.quantity).add(optionCharge), menuItemId: item.menuItemId, dailyMenuItemId: dailyItem.id, options })
      } else if (item.type === OrderItemType.EXTRA) {
        if (!item.extraId) throw new OrderValidationError('extraId es obligatorio para items EXTRA')
        const extra = extrasById.get(item.extraId)
        if (!extra) throw new OrderItemNotFoundError('El extra no existe o no está activo')
        const unitPrice = new Prisma.Decimal(extra.price)
        orderItems.push({ accountIndex, type: item.type, description: extra.name, quantity: item.quantity, unitPrice, subtotal: unitPrice.mul(item.quantity), extraId: item.extraId, options: [] })
      } else if (item.type === OrderItemType.CUSTOM) {
        const description = item.description?.trim() ?? ''
        if (!description) throw new OrderValidationError('description es obligatorio para items CUSTOM')
        if (item.unitPrice === undefined || !Number.isFinite(item.unitPrice) || item.unitPrice <= 0) throw new OrderValidationError('unitPrice debe ser mayor que 0 para items CUSTOM')
        const unitPrice = new Prisma.Decimal(item.unitPrice)
        orderItems.push({ accountIndex, type: item.type, description, quantity: item.quantity, unitPrice, subtotal: unitPrice.mul(item.quantity), options: [] })
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

    for (const [dailyMenuOptionId, quantity] of optionQuantities) {
      const updated = await transaction.dailyMenuOption.updateMany({ where: { id: dailyMenuOptionId, available: true, remainingQuantity: { gte: quantity } }, data: { remainingQuantity: { decrement: quantity }, soldQuantity: { increment: quantity } } })
      if (updated.count !== 1) throw new OrderAvailabilityError('No hay suficientes unidades disponibles para una opción principal')
    }

    const optionModeTotals = new Map<string, { quantity: number; revenue: Prisma.Decimal }>()
    for (const item of orderItems) {
      if (!item.dailyMenuItemId || dailyItemsByMenuId.get(item.menuItemId ?? '')?.inventoryMode !== 'OPTIONS') continue
      const current = optionModeTotals.get(item.dailyMenuItemId) ?? { quantity: 0, revenue: new Prisma.Decimal(0) }
      current.quantity += item.quantity
      current.revenue = current.revenue.add(item.subtotal)
      optionModeTotals.set(item.dailyMenuItemId, current)
    }
    for (const [dailyMenuItemId, totals] of optionModeTotals) {
      await transaction.dailyMenuItem.update({ where: { id: dailyMenuItemId }, data: { soldQuantity: { increment: totals.quantity }, revenue: { increment: totals.revenue } } })
    }

    const total = orderItems.reduce((sum, item) => sum.add(item.subtotal), new Prisma.Decimal(0))
    const createdAt = new Date()
    const promiseTime = input.promiseTime ?? new Date(createdAt.getTime() + 20 * 60 * 1000)
    if (Number.isNaN(promiseTime.getTime()) || promiseTime < createdAt) throw new OrderValidationError('La hora de promesa debe ser posterior a la hora actual.')
    const lastOrder = await transaction.order.findFirst({ where: { orderDate: businessDate }, orderBy: { dailyNumber: 'desc' }, select: { dailyNumber: true } })
    const dailyNumber = (lastOrder?.dailyNumber ?? 0) + 1
    const order = await transaction.order.create({ data: { customerName: input.customerName, address: input.address, createdAt, promiseTime, orderDate: businessDate, dailyNumber, total, dailyMenuId: dailyMenu.id, idempotencyKey, idempotencyFingerprint } })
    const createdAccounts: Array<{ id: string }> = []
    for (const [position, account] of accounts.entries()) {
      const createdAccount = await transaction.orderAccount.create({ data: { orderId: order.id, name: account.name || null, position: position + 1 } })
      createdAccounts.push(createdAccount)
    }
    for (const preparedItem of orderItems) {
      const createdItem = await transaction.orderItem.create({
        data: {
          orderId: order.id,
          orderAccountId: createdAccounts[preparedItem.accountIndex].id,
          type: preparedItem.type,
          description: preparedItem.description,
          quantity: preparedItem.quantity,
          unitPrice: preparedItem.unitPrice,
          subtotal: preparedItem.subtotal,
          menuItemId: preparedItem.menuItemId,
          extraId: preparedItem.extraId,
          dailyMenuItemId: preparedItem.dailyMenuItemId,
        },
      })
      for (const option of preparedItem.options) {
        const createdOption = await transaction.orderItemOption.create({
          data: {
            orderItemId: createdItem.id,
            dailyMenuOptionId: option.dailyMenuOptionId,
            action: option.action,
            description: option.description,
            unitPrice: option.unitPrice,
            quantity: option.quantity,
            charge: option.charge,
            replacedDescription: option.replacedDescription,
            replacedUnitPrice: option.replacedUnitPrice,
          },
        })
        if (option.reservedQuantity && option.dailyMenuOptionId) {
          await transaction.orderInventoryAllocation.create({ data: { orderId: order.id, orderItemOptionId: createdOption.id, dailyMenuOptionId: option.dailyMenuOptionId, dailyMenuItemId: option.reservedDailyMenuItemId, quantity: option.reservedQuantity } })
        }
      }
    }

    return serializeOrder(await transaction.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude }))
  })
}

type PreparedOrderOption = {
  dailyMenuOptionId?: string
  action: OrderItemOptionAction
  description: string
  unitPrice: Prisma.Decimal
  quantity: number
  charge: Prisma.Decimal
  reservedQuantity?: number
  reservedDailyMenuItemId?: string
  replacedDescription?: string
  replacedUnitPrice?: Prisma.Decimal
}

function prepareMenuItemOptions(item: CreateOrderItemInput, dailyItem: {
  quantity?: never
  price: Prisma.Decimal | number | string
  inventoryMode: 'LEGACY' | 'OPTIONS'
  optionAssignments: Array<{
    role: 'PRIMARY_INCLUDED' | 'COMPLEMENT_INCLUDED' | 'PRIMARY_ADDITIONAL' | 'COMPLEMENT_OPTIONAL' | 'EXTRA_OPTIONAL'
    included: boolean
    dailyMenuOptionId: string
    dailyMenuOption: { id: string; price: Prisma.Decimal | number | string; available: boolean; remainingQuantity: number | null; option: { id: string; name: string; kind: 'PRIMARY' | 'COMPLEMENT' | 'EXTRA' } }
  }>
  menuItem: { name: string; price: Prisma.Decimal | number | string; optionDefinitions: Array<{ optionId: string; role: 'PRIMARY_INCLUDED' | 'COMPLEMENT_INCLUDED' | 'PRIMARY_ADDITIONAL' | 'COMPLEMENT_OPTIONAL' | 'EXTRA_OPTIONAL'; quantity: number; option: { id: string; name: string; kind: 'PRIMARY' | 'COMPLEMENT' | 'EXTRA' } }> }
  id: string
}) {
  if (dailyItem.inventoryMode === 'LEGACY') {
    if (item.options?.length) throw new OrderValidationError('Este plato todavía no tiene personalización habilitada')
    return [{ action: OrderItemOptionAction.INCLUDED, description: dailyItem.menuItem.name, unitPrice: new Prisma.Decimal(dailyItem.price), quantity: item.quantity, charge: new Prisma.Decimal(0), reservedQuantity: item.quantity, reservedDailyMenuItemId: dailyItem.id }]
  }

  const assignments = new Map(dailyItem.optionAssignments.map((assignment) => [assignment.dailyMenuOptionId, assignment]))
  const definitions = new Map(dailyItem.menuItem.optionDefinitions.map((definition) => [`${definition.optionId}:${definition.role}`, definition]))
  const primaryAssignment = dailyItem.optionAssignments.find((assignment) => assignment.role === 'PRIMARY_INCLUDED')
  if (!primaryAssignment || !primaryAssignment.dailyMenuOption.available || primaryAssignment.dailyMenuOption.remainingQuantity === null) throw new OrderAvailabilityError('El principal incluido no está disponible')
  const primaryDefinition = definitions.get(`${primaryAssignment.dailyMenuOption.option.id}:PRIMARY_INCLUDED`)
  if (!primaryDefinition) throw new OrderValidationError('El plato no tiene configurado su principal incluido')

  const options: PreparedOrderOption[] = [{
    dailyMenuOptionId: primaryAssignment.dailyMenuOptionId,
    action: OrderItemOptionAction.INCLUDED,
    description: primaryAssignment.dailyMenuOption.option.name,
    unitPrice: new Prisma.Decimal(primaryAssignment.dailyMenuOption.price),
    quantity: primaryDefinition.quantity * item.quantity,
    charge: new Prisma.Decimal(0),
    reservedQuantity: primaryDefinition.quantity * item.quantity,
  }]
  for (const assignment of dailyItem.optionAssignments.filter((value) => value.role === 'COMPLEMENT_INCLUDED')) {
    const definition = definitions.get(`${assignment.dailyMenuOption.option.id}:COMPLEMENT_INCLUDED`)
    if (!definition) continue
    options.push({ dailyMenuOptionId: assignment.dailyMenuOptionId, action: OrderItemOptionAction.INCLUDED, description: assignment.dailyMenuOption.option.name, unitPrice: new Prisma.Decimal(assignment.dailyMenuOption.price), quantity: definition.quantity * item.quantity, charge: new Prisma.Decimal(0) })
  }

  for (const requested of item.options ?? []) {
    const action = requested.action ?? OrderItemOptionAction.ADDED
    if (action === OrderItemOptionAction.INCLUDED) throw new OrderValidationError('Las opciones incluidas se agregan automáticamente')
    const assignment = assignments.get(requested.dailyMenuOptionId)
    if (!assignment || !assignment.dailyMenuOption.available || !['PRIMARY_ADDITIONAL', 'COMPLEMENT_OPTIONAL', 'EXTRA_OPTIONAL'].includes(assignment.role)) throw new OrderItemNotFoundError('La opción solicitada no está permitida para este plato')
    const requestedQuantity = requested.quantity ?? 1
    if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) throw new OrderValidationError('La cantidad de una opción debe ser un entero mayor que 0')
    const replacement = action === OrderItemOptionAction.REPLACED ? assignments.get(requested.replacesDailyMenuOptionId ?? '') : undefined
    if (action === OrderItemOptionAction.REPLACED && (!replacement || replacement.role !== 'COMPLEMENT_INCLUDED' || replacement.dailyMenuOption.option.kind !== 'COMPLEMENT')) throw new OrderValidationError('La sustitución debe reemplazar un complemento incluido')
    const unitPrice = new Prisma.Decimal(assignment.dailyMenuOption.price)
    const charge = action === OrderItemOptionAction.REPLACED
      ? Prisma.Decimal.max(new Prisma.Decimal(0), unitPrice.sub(replacement!.dailyMenuOption.price)).mul(item.quantity)
      : unitPrice.mul(requestedQuantity)
    const quantity = action === OrderItemOptionAction.REPLACED ? item.quantity : requestedQuantity
    options.push({ dailyMenuOptionId: assignment.dailyMenuOptionId, action, description: assignment.dailyMenuOption.option.name, unitPrice, quantity, charge, reservedQuantity: assignment.dailyMenuOption.option.kind === 'PRIMARY' ? requestedQuantity : undefined, replacedDescription: replacement?.dailyMenuOption.option.name, replacedUnitPrice: replacement ? new Prisma.Decimal(replacement.dailyMenuOption.price) : undefined })
  }
  return options
}

export async function createOrder(input: CreateOrderInput, idempotencyKey?: string) {
  const idempotencyFingerprint = idempotencyKey ? createOrderFingerprint(input) : undefined

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await createOrderTransaction(input, idempotencyKey, idempotencyFingerprint)
    } catch (error) {
      const isPrismaUniqueConflict = error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === 'P2002'
      const conflictTarget = String(error instanceof Prisma.PrismaClientKnownRequestError ? error.meta?.target ?? '' : '')
      const isIdempotencyConflict = isPrismaUniqueConflict && conflictTarget.includes('idempotencyKey')
      const isOrderNumberConflict = isPrismaUniqueConflict && conflictTarget.includes('orderDate')

      if (isIdempotencyConflict && idempotencyKey && idempotencyFingerprint) {
        const existingOrder = await prisma.order.findUnique({ where: { idempotencyKey }, include: orderInclude })
        if (existingOrder) {
          if (existingOrder.idempotencyFingerprint !== idempotencyFingerprint) throw new OrderIdempotencyConflictError()
          return serializeOrder(existingOrder)
        }
        if (attempt === 2) throw new OrderIdempotencyResolutionError()
        continue
      }

      if (!isOrderNumberConflict) throw error
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
  return prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findUnique({ where: { id } })
    if (!order) throw new OrderNotFoundError()
    const allowed: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.IN_PROGRESS]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
      [OrderStatus.COMPLETED]: [OrderStatus.IN_PROGRESS],
      [OrderStatus.CANCELLED]: [],
    }
    if (!allowed[order.status].includes(status)) throw new OrderStatusTransitionError()

    const updated = await transaction.order.updateMany({ where: { id, status: order.status }, data: { status } })
    if (updated.count !== 1) throw new OrderStatusTransitionError()

    if (status === OrderStatus.CANCELLED && order.status === OrderStatus.IN_PROGRESS) {
      const allocations = await transaction.orderInventoryAllocation.findMany({ where: { orderId: id, releasedAt: null } })
      for (const allocation of allocations) {
        const released = await transaction.orderInventoryAllocation.updateMany({ where: { id: allocation.id, releasedAt: null }, data: { releasedAt: new Date(), releaseReason: 'ORDER_CANCELLED' } })
        if (released.count === 1) {
          if (allocation.dailyMenuOptionId) {
            await transaction.dailyMenuOption.update({ where: { id: allocation.dailyMenuOptionId }, data: { remainingQuantity: { increment: allocation.quantity }, soldQuantity: { decrement: allocation.quantity } } })
          } else if (allocation.dailyMenuItemId) {
            await transaction.dailyMenuItem.update({ where: { id: allocation.dailyMenuItemId }, data: { remainingQuantity: { increment: allocation.quantity }, soldQuantity: { decrement: allocation.quantity } } })
          }
        }
      }
    }

    return serializeOrder(await transaction.order.findUniqueOrThrow({ where: { id }, include: orderInclude }))
  })
}
