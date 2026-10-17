import { DailyMenu, DailyMenuItem } from '../types/menu'
import { apiRequest } from './api'

function getTodayDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeDailyMenu(menu: DailyMenu & { items: Array<Omit<DailyMenuItem, 'price'> & { price: number | string }> }): DailyMenu {
  return { ...menu, items: menu.items.map((item) => ({ ...item, price: Number(item.price) })) }
}

export async function getDailyMenu(date = getTodayDate()) {
  const menu = await apiRequest<DailyMenu & { items: Array<Omit<DailyMenuItem, 'price'> & { price: number | string }> }>(`/daily-menu?date=${date}`)
  return normalizeDailyMenu(menu)
}

export async function saveDailyMenu(date: string, items: Array<Pick<DailyMenuItem, 'menuItemId' | 'availableQuantity'>>) {
  const menu = await apiRequest<DailyMenu & { items: Array<Omit<DailyMenuItem, 'price'> & { price: number | string }> }>('/daily-menu', { method: 'PUT', body: JSON.stringify({ date, items }) })
  return normalizeDailyMenu(menu)
}

export { getTodayDate }
