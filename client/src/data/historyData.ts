import { dateKey, HistoryOrder } from '../types/history'
import { addMinutesToTime } from '../types/order'

// Fixtures locales: 24 pedidos por día durante los últimos 90 días.
const today = new Date()
const names = ['María López', 'Juan Pérez', 'Ana Gómez', 'Carlos Ramírez', 'Luis Morales', 'Lucía García']
export const historyOrders: HistoryOrder[] = Array.from({ length: 90 * 24 }, (_, index) => {
  const date = new Date(today)
  date.setDate(date.getDate() - Math.floor(index / 24))
  const createdAt = `${String(10 + Math.floor(index % 24 / 4)).padStart(2, '0')}:${String(index % 4 * 15).padStart(2, '0')}`
  return {
    id: `#${String(3000 - index).padStart(3, '0')}`,
    date: dateKey(date), createdAt, promiseTime: addMinutesToTime(createdAt, 20),
    customerName: names[index % names.length], address: `Zona ${index % 8 + 1}, Quetzaltenango`,
    status: index % 7 === 0 ? 'cancelled' : 'completed',
    items: [{ name: index % 2 ? 'Pollo dorado' : 'Pepián', quantity: index % 3 + 1, price: index % 2 ? 28 : 25 }, { name: 'Bebida', quantity: 1, price: 5 }],
  }
})
