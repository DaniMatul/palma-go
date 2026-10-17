import { Request, Response } from 'express'
import { OrderItemType, OrderStatus } from '@prisma/client'
import {
  changeOrderStatus,
  createOrder,
  CreateOrderItemInput,
  OrderAvailabilityError,
  OrderItemNotFoundError,
  OrderNotFoundError,
  OrderNumberConflictError,
  OrderStatusTransitionError,
  OrderValidationError,
  listOrders,
  ListOrdersFilters,
} from '../services/ordersService.js'
import { businessDateFromString } from '../services/dailyMenuService.js'

type OrderBody = { customerName?: unknown; address?: unknown; items?: unknown }

function respondError(response: Response, status: number, message: string) {
  return response.status(status).json({ error: message })
}

function parseQuantity(value: unknown) {
  const quantity = Number(value)
  return Number.isInteger(quantity) && quantity > 0 ? quantity : null
}

function parseOrderItems(value: unknown): CreateOrderItemInput[] {
  if (!Array.isArray(value) || value.length === 0) throw new OrderValidationError('items debe tener al menos un elemento')
  return value.map((rawItem) => {
    if (typeof rawItem !== 'object' || rawItem === null) throw new OrderValidationError('Cada item debe ser un objeto')
    const item = rawItem as Record<string, unknown>
    const type = item.type
    const quantity = parseQuantity(item.quantity)
    if (type !== OrderItemType.MENU && type !== OrderItemType.EXTRA && type !== OrderItemType.CUSTOM) throw new OrderValidationError('type de item no válido')
    if (quantity === null) throw new OrderValidationError('quantity debe ser un entero mayor que 0')
    return {
      type,
      quantity,
      menuItemId: typeof item.menuItemId === 'string' || typeof item.menuItemId === 'number' ? String(item.menuItemId) : undefined,
      extraId: typeof item.extraId === 'string' || typeof item.extraId === 'number' ? String(item.extraId) : undefined,
      description: typeof item.description === 'string' ? item.description : undefined,
      unitPrice: item.unitPrice === undefined ? undefined : Number(item.unitPrice),
    }
  })
}

export async function postOrder(request: Request, response: Response) {
  try {
    if (typeof request.body !== 'object' || request.body === null || Array.isArray(request.body)) return respondError(response, 400, 'El body debe ser un objeto')
    const body = request.body as OrderBody
    const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : ''
    const address = typeof body.address === 'string' ? body.address.trim() : ''
    if (!customerName) return respondError(response, 400, 'customerName es obligatorio')
    if (!address) return respondError(response, 400, 'address es obligatorio')
    const items = parseOrderItems(body.items)
    return response.status(201).json(await createOrder({ customerName, address, items }))
  } catch (error) {
    if (error instanceof OrderValidationError) return respondError(response, 400, error.message)
    if (error instanceof OrderItemNotFoundError) return respondError(response, 404, error.message)
    if (error instanceof OrderAvailabilityError) return respondError(response, 409, error.message)
    if (error instanceof OrderNumberConflictError) return respondError(response, 409, error.message)
    return respondError(response, 500, 'No se pudo crear el pedido')
  }
}

export async function getOrders(request: Request, response: Response) {
  try {
    const rawStatus = request.query.status
    const rawFrom = request.query.from
    const rawTo = request.query.to
    const rawSearch = request.query.search
    if (rawStatus !== undefined && typeof rawStatus !== 'string') return respondError(response, 400, 'status no es válido')
    if (rawStatus !== undefined && !Object.values(OrderStatus).includes(rawStatus as OrderStatus)) return respondError(response, 400, 'status no es válido')
    if (rawFrom !== undefined && typeof rawFrom !== 'string') return respondError(response, 400, 'from no es válido')
    if (rawTo !== undefined && typeof rawTo !== 'string') return respondError(response, 400, 'to no es válido')
    if (rawSearch !== undefined && typeof rawSearch !== 'string') return respondError(response, 400, 'search no es válido')
    const from = rawFrom ? businessDateFromString(rawFrom) ?? undefined : undefined
    const to = rawTo ? businessDateFromString(rawTo) ?? undefined : undefined
    if (rawFrom && !from) return respondError(response, 400, 'from debe tener formato YYYY-MM-DD')
    if (rawTo && !to) return respondError(response, 400, 'to debe tener formato YYYY-MM-DD')
    if (from && to && from > to) return respondError(response, 400, 'from no puede ser posterior a to')
    const filters: ListOrdersFilters = {
      from,
      to,
      status: rawStatus as OrderStatus | undefined,
      search: rawSearch,
    }
    return response.status(200).json(await listOrders(filters))
  } catch {
    return respondError(response, 500, 'No se pudieron obtener los pedidos')
  }
}

export async function patchOrderStatus(request: Request, response: Response) {
  try {
    const id = request.params.id
    if (typeof id !== 'string' || !id) return respondError(response, 400, 'El id del pedido es obligatorio')
    const status = request.body?.status
    if (typeof status !== 'string' || !Object.values(OrderStatus).includes(status as OrderStatus)) return respondError(response, 400, 'status no es válido')
    return response.status(200).json(await changeOrderStatus(id, status as OrderStatus))
  } catch (error) {
    if (error instanceof OrderNotFoundError) return respondError(response, 404, error.message)
    if (error instanceof OrderStatusTransitionError) return respondError(response, 400, error.message)
    return respondError(response, 500, 'No se pudo cambiar el estado del pedido')
  }
}
