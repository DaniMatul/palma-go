export type OrderStatus = 'in-progress' | 'completed' | 'cancelled'

export type OrderItem = {
  id?: string
  name: string
  quantity: number
  price: number
  menuComponents?: Array<{ name: string }>
  menuItemId?: string
  menuMode?: 'FULL' | 'INDIVIDUAL'
  subtotal?: number
  comment?: string
  customizations?: Array<{ componentName: string; action: 'REMOVE' | 'ADD'; quantity: number; unitPrice: number }>
}

export type OrderAccount = {
  id?: string
  name?: string | null
  items: OrderItem[]
  subtotal: number
}

export type Order = {
  id: string
  dailyNumber?: number
  displayNumber?: string
  date: string
  customerName: string
  address: string
  createdAt: string
  promiseTime: string
  status: OrderStatus
  total?: number
  items: OrderItem[]
  accounts: OrderAccount[]
}

export function displayOrderNumber(order: Pick<Order, 'id' | 'displayNumber'>) {
  return order.displayNumber ?? order.id
}

export function addMinutesToTime(time: string, minutes: number) {
  const [hours, mins] = time.split(':').map(Number)
  const date = new Date(2000, 0, 1, hours, mins)
  date.setMinutes(date.getMinutes() + minutes)
  return date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export const orderTotal = (order: Order) => order.total ?? order.accounts.reduce((total, account) => total + account.subtotal, 0)
