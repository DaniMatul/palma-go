import { Request, Response } from 'express'
import { DashboardSalesPeriod, DashboardTopPeriod, getDashboard } from '../services/dashboardService.js'

function isTopPeriod(value: unknown): value is DashboardTopPeriod {
  return value === 'day' || value === 'month' || value === 'year'
}

function isSalesPeriod(value: unknown): value is DashboardSalesPeriod {
  return value === 'week' || value === 'month'
}

export async function getDashboardData(request: Request, response: Response) {
  const topPeriod = request.query.topPeriod ?? 'day'
  const salesPeriod = request.query.salesPeriod ?? 'week'
  if (!isTopPeriod(topPeriod)) return response.status(400).json({ error: 'topPeriod no es válido' })
  if (!isSalesPeriod(salesPeriod)) return response.status(400).json({ error: 'salesPeriod no es válido' })
  try {
    return response.status(200).json(await getDashboard(topPeriod, salesPeriod))
  } catch {
    return response.status(500).json({ error: 'No se pudo obtener el dashboard' })
  }
}
