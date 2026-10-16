export type SalesPoint = {
  label: string
  amount: number
}

export type BestSellingProduct = {
  name: string
  quantity: number
  total: number
}

export type DashboardData = {
  sales: {
    week: { total: number; points: SalesPoint[] }
    month: { total: number; points: SalesPoint[] }
  }
  bestSelling: {
    day: BestSellingProduct[]
    month: BestSellingProduct[]
    year: BestSellingProduct[]
  }
  summary: {
    today: number
    week: number
    month: number
    year: number
  }
  operation: {
    orders: number
    completedSales: number
    completedOrders: number
    inProgress: number
    cancelled: number
  }
}
