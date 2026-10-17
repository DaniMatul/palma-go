import { OrderItemType, OrderStatus, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { businessDateFromString, todayBusinessDate } from './dailyMenuService.js'

export type DashboardTopPeriod = 'day' | 'month' | 'year'
export type DashboardSalesPeriod = 'week' | 'month'

type DateRange = { start: Date; end: Date }

const weekLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function addBusinessDays(date: Date, days: number) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0, 12, 0, 0, 0)).getUTCDate()
}

function businessDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getToday() {
  const today = businessDateFromString(todayBusinessDate())
  if (!today) throw new Error('No se pudo determinar la fecha actual')
  return today
}

function getPeriodRange(period: DashboardTopPeriod, today: Date): DateRange {
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth()
  if (period === 'day') return { start: today, end: today }
  if (period === 'month') {
    return {
      start: new Date(Date.UTC(year, month, 1, 12, 0, 0, 0)),
      end: new Date(Date.UTC(year, month, daysInMonth(year, month + 1), 12, 0, 0, 0)),
    }
  }
  return {
    start: new Date(Date.UTC(year, 0, 1, 12, 0, 0, 0)),
    end: today,
  }
}

function getWeekRange(today: Date): DateRange {
  const day = today.getUTCDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const start = addBusinessDays(today, mondayOffset)
  return { start, end: addBusinessDays(start, 6) }
}

function getSalesRange(period: DashboardSalesPeriod, today: Date): DateRange {
  if (period === 'week') return getWeekRange(today)
  return getPeriodRange('month', today)
}

function completedWhere(range: DateRange): Prisma.OrderWhereInput {
  return { status: OrderStatus.COMPLETED, orderDate: { gte: range.start, lte: range.end } }
}

async function sumCompletedSales(range: DateRange) {
  const result = await prisma.order.aggregate({ where: completedWhere(range), _sum: { total: true } })
  return Number(result._sum.total ?? 0)
}

async function getTopProducts(period: DashboardTopPeriod, today: Date) {
  const range = getPeriodRange(period, today)
  const items = await prisma.orderItem.findMany({
    where: {
      type: OrderItemType.MENU,
      order: completedWhere(range),
    },
    select: { description: true, quantity: true, subtotal: true },
  })
  const grouped = new Map<string, { quantity: number; total: number }>()
  for (const item of items) {
    const current = grouped.get(item.description) ?? { quantity: 0, total: 0 }
    current.quantity += item.quantity
    current.total += Number(item.subtotal)
    grouped.set(item.description, current)
  }
  return [...grouped.entries()]
    .map(([name, values]) => ({ name, ...values }))
    .sort((first, second) => second.quantity - first.quantity || second.total - first.total)
    .slice(0, 4)
}

async function getSales(period: DashboardSalesPeriod, today: Date) {
  const range = getSalesRange(period, today)
  const grouped = await prisma.order.groupBy({
    by: ['orderDate'],
    where: completedWhere(range),
    _sum: { total: true },
    orderBy: { orderDate: 'asc' },
  })
  const valuesByDate = new Map(grouped.map((item) => [businessDateKey(item.orderDate), Number(item._sum.total ?? 0)]))
  const series = period === 'week'
    ? Array.from({ length: 7 }, (_, index) => {
      const date = addBusinessDays(range.start, index)
      return { label: weekLabels[index], value: valuesByDate.get(businessDateKey(date)) ?? 0 }
    })
    : Array.from({ length: daysInMonth(today.getUTCFullYear(), today.getUTCMonth() + 1) }, (_, index) => {
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), index + 1, 12, 0, 0, 0))
      return { label: String(index + 1), value: valuesByDate.get(businessDateKey(date)) ?? 0 }
    })
  return { period, total: series.reduce((sum, item) => sum + item.value, 0), series }
}

export async function getDashboard(topPeriod: DashboardTopPeriod, salesPeriod: DashboardSalesPeriod) {
  const today = getToday()
  const todayRange = getPeriodRange('day', today)
  const weekRange = getWeekRange(today)
  const monthRange = getPeriodRange('month', today)
  const yearRange = getPeriodRange('year', today)
  const [todayTotal, weekTotal, monthTotal, yearTotal, topProducts, sales] = await Promise.all([
    sumCompletedSales(todayRange),
    sumCompletedSales(weekRange),
    sumCompletedSales(monthRange),
    sumCompletedSales(yearRange),
    getTopProducts(topPeriod, today),
    getSales(salesPeriod, today),
  ])
  return {
    summary: { today: todayTotal, week: weekTotal, month: monthTotal, year: yearTotal },
    topProducts,
    sales,
  }
}
