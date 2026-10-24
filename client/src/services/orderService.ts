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
  menuMode?: 'FULL' | 'INDIVIDUAL'
  menuComponentsSnapshot?: string | null
  extraId?: string | null
  orderAccountId?: string | null
  dailyMenuItem?: { components: Array<{ name: string }> } | null
  comment?: string | null
  customizations?: Array<{ id: string; dailyMenuComponentId?: string | null; componentName: string; action: 'REMOVE' | 'ADD'; quantity: number; unitPrice: number | string }>
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
  | { type: 'MENU'; menuItemId: string; quantity: number; menuMode?: 'FULL' | 'INDIVIDUAL'; comment?: string; customizations?: Array<{ componentId: string; action: 'REMOVE' | 'ADD'; quantity: number }> }
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
  const parseMenuComponents = (item: ApiOrderItem) => {
    if (item.menuComponentsSnapshot) {
      try {
        const snapshot = JSON.parse(item.menuComponentsSnapshot)
        if (Array.isArray(snapshot)) return snapshot.filter((component): component is { name: string } => Boolean(component && typeof component.name === 'string'))
      } catch {
        // Fall back to the relation for orders created before the snapshot was added.
      }
    }
    return item.dailyMenuItem?.components.map((component) => ({ name: component.name }))
  }
  const normalizeItem = (item: ApiOrderItem) => ({
    id: item.id,
    name: item.description,
    quantity: item.quantity,
    price: Number(item.unitPrice),
    menuItemId: item.menuItemId ?? undefined,
    menuMode: item.menuMode ?? 'FULL',
    menuComponents: parseMenuComponents(item),
    subtotal: Number(item.subtotal),
    comment: item.comment ?? undefined,
    customizations: item.customizations?.map((customization) => ({ ...customization, unitPrice: Number(customization.unitPrice) })),
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
