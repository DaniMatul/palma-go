import { apiRequest } from './api'
import { DashboardData, SalesPoint } from '../types/dashboard'

type DashboardResponse = {
  summary: DashboardData['summary']
  topProducts: DashboardData['bestSelling']['day']
  sales: {
    period: 'week' | 'month'
    total: number
    series: { label: string; value: number }[]
  }
}

type DashboardTopPeriod = 'day' | 'month' | 'year'
type DashboardSalesPeriod = 'week' | 'month'

const emptyPoints: SalesPoint[] = []

export async function getDashboard(topPeriod: DashboardTopPeriod, salesPeriod: DashboardSalesPeriod): Promise<DashboardData> {
  const response = await apiRequest<DashboardResponse>(`/dashboard?topPeriod=${topPeriod}&salesPeriod=${salesPeriod}`)
  const points = response.sales.series.map(({ label, value }) => ({ label, amount: Number(value) }))
  const sales = { total: Number(response.sales.total), points }

  return {
    summary: {
      today: Number(response.summary.today),
      week: Number(response.summary.week),
      month: Number(response.summary.month),
      year: Number(response.summary.year),
    },
    bestSelling: {
      day: topPeriod === 'day' ? response.topProducts : [],
      month: topPeriod === 'month' ? response.topProducts : [],
      year: topPeriod === 'year' ? response.topProducts : [],
    },
    sales: {
      week: salesPeriod === 'week' ? sales : { total: 0, points: emptyPoints },
      month: salesPeriod === 'month' ? sales : { total: 0, points: emptyPoints },
    },
    operation: { orders: 0, completedSales: 0, completedOrders: 0, inProgress: 0, cancelled: 0 },
  }
}
