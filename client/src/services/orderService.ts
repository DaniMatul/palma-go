import { Order, OrderStatus } from '../types/order'
import { apiRequest } from './api'

type ApiOrderItem = {
  id: string
  type: 'MENU' | 'EXTRA' | 'CUSTOM'
  description: string
  quantity: number
  unitPrice: number | string
  subtotal: number | string
  menuItemId?: string | null
  extraId?: string | null
  orderAccountId?: string | null
}

type ApiOrderAccount = {
  id: string
  name: string | null
  position: number
  subtotal: number | string
  items: ApiOrderItem[]
}

type ApiOrder = {
  id: string
  dailyNumber: number
  displayNumber: string
  orderDate: string
  customerName: string
  address: string
  createdAt: string
  promiseTime: string
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  total: number | string
  items: ApiOrderItem[]
  accounts?: ApiOrderAccount[]
}

export type CreateOrderItemInput =
  | { type: 'MENU'; menuItemId: string; quantity: number }
  | { type: 'EXTRA'; extraId: string; quantity: number }
  | { type: 'CUSTOM'; description: string; unitPrice: number; quantity: number }

export type CreateOrderInput = {
  customerName: string
  address: string
  items?: CreateOrderItemInput[]
  accounts?: Array<{ name?: string; items: CreateOrderItemInput[] }>
  promiseTime: string
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function normalizeStatus(status: ApiOrder['status']): OrderStatus {
  if (status === 'COMPLETED') return 'completed'
  if (status === 'CANCELLED') return 'cancelled'
  return 'in-progress'
}

function normalizeOrder(order: ApiOrder): Order {
  const normalizeItem = (item: ApiOrderItem) => ({
    id: item.id,
    name: item.description,
    quantity: item.quantity,
    price: Number(item.unitPrice),
    subtotal: Number(item.subtotal),
  })
  const items = order.items.map(normalizeItem)
  const accounts = order.accounts?.map((account) => ({
    id: account.id,
    name: account.name,
    items: account.items.map(normalizeItem),
    subtotal: Number(account.subtotal),
  })) ?? [{ name: null, items, subtotal: items.reduce((sum, item) => sum + (item.subtotal ?? item.quantity * item.price), 0) }]
  return {
    id: order.id,
    dailyNumber: order.dailyNumber,
    displayNumber: order.displayNumber,
    date: order.orderDate.slice(0, 10),
    customerName: order.customerName,
    address: order.address,
    createdAt: formatTime(order.createdAt),
    promiseTime: formatTime(order.promiseTime),
    status: normalizeStatus(order.status),
    total: Number(order.total),
    items,
    accounts,
  }
}

export type OrderQuery = { from?: string; to?: string; status?: OrderStatus; search?: string; activeOnly?: boolean }

export async function getOrders(filters: OrderQuery = {}) {
  const backendStatus = filters.status === 'in-progress' ? 'IN_PROGRESS' : filters.status === 'completed' ? 'COMPLETED' : filters.status === 'cancelled' ? 'CANCELLED' : undefined
  const params = new URLSearchParams()
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (backendStatus) params.set('status', backendStatus)
  if (filters.search?.trim()) params.set('search', filters.search.trim())
  if (filters.activeOnly) params.set('scope', 'active')
  const query = params.toString() ? `?${params.toString()}` : ''
  const orders = await apiRequest<ApiOrder[]>(`/orders${query}`)
  return orders.map(normalizeOrder)
}

export async function createOrder(input: CreateOrderInput) {
  const order = await apiRequest<ApiOrder>('/orders', { method: 'POST', body: JSON.stringify(input) })
  return normalizeOrder(order)
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const backendStatus = status === 'in-progress' ? 'IN_PROGRESS' : status === 'completed' ? 'COMPLETED' : 'CANCELLED'
  const order = await apiRequest<ApiOrder>(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: backendStatus }) })
  return normalizeOrder(order)
}
