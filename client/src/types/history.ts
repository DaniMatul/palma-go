import { Order, orderTotal } from './order'

export type HistoryOrder = Order & { date: string }
export type HistoryPeriod = 'day' | 'week' | 'month' | 'custom'
export type DateRange = { start: string; end: string }

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export const parseDate = (value: string) => new Date(`${value}T12:00:00`)
export const formatHistoryDate = (value: string) => parseDate(value).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' })
export const historyCurrency = (value: number) => `Q${value.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function periodRange(anchor: string, period: Exclude<HistoryPeriod, 'custom'>): DateRange {
  const start = parseDate(anchor)
  const end = parseDate(anchor)
  if (period === 'week') {
    start.setDate(start.getDate() - (start.getDay() + 6) % 7)
    end.setTime(start.getTime())
    end.setDate(end.getDate() + 6)
  } else if (period === 'month') {
    start.setDate(1)
    end.setMonth(end.getMonth() + 1, 0)
  }
  return { start: dateKey(start), end: dateKey(end) }
}

export function movePeriod(anchor: string, period: HistoryPeriod, direction: number) {
  const next = parseDate(anchor)
  if (period === 'month') next.setMonth(next.getMonth() + direction, 1)
  else next.setDate(next.getDate() + direction * (period === 'week' ? 7 : 1))
  return dateKey(next)
}

export function historyTotals(orders: HistoryOrder[]) {
  const completed = orders.filter((order) => order.status === 'completed')
  const sold = completed.reduce((sum, order) => sum + orderTotal(order), 0)
  return { sold, count: orders.length, average: completed.length ? sold / completed.length : 0 }
}
