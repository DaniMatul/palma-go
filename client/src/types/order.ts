export type OrderStatus = 'in-progress' | 'completed' | 'cancelled'

export type OrderItem = {
  name: string
  quantity: number
  price: number
}

export type Order = {
  id: string
  customerName: string
  address: string
  createdAt: string
  promiseTime: string
  status: OrderStatus
  items: OrderItem[]
}

export function addMinutesToTime(time: string, minutes: number) {
  const [hours, mins] = time.split(':').map(Number)
  const date = new Date(2000, 0, 1, hours, mins)
  date.setMinutes(date.getMinutes() + minutes)
  return date.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export const orderTotal = (order: Order) =>
  order.items.reduce((total, item) => total + item.quantity * item.price, 0)
