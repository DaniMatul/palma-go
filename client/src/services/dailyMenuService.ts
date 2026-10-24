import { DailyMenu, DailyMenuItem } from '../types/menu'
import { apiRequest } from './api'

function getTodayDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeDailyMenu(menu: DailyMenu & { items: Array<Omit<DailyMenuItem, 'price' | 'individualPrice'> & { price: number | string; individualPrice: number | string | null }> }): DailyMenu {
  return { ...menu, items: menu.items.map((item) => ({ ...item, price: Number(item.price), individualPrice: item.individualPrice === null ? null : Number(item.individualPrice), components: item.components.map((component) => ({ ...component, extraPortionPrice: Number(component.extraPortionPrice) })) })) }
}

export async function getDailyMenu(date = getTodayDate()) {
  const menu = await apiRequest<DailyMenu & { items: Array<Omit<DailyMenuItem, 'price' | 'individualPrice'> & { price: number | string; individualPrice: number | string | null }> }>(`/daily-menu?date=${date}`)
  return normalizeDailyMenu(menu)
}

export async function saveDailyMenu(date: string, items: Array<Pick<DailyMenuItem, 'menuItemId' | 'availableQuantity' | 'individualPrice'> & { components: DailyMenuItem['components'] }>) {
  const menu = await apiRequest<DailyMenu & { items: Array<Omit<DailyMenuItem, 'price' | 'individualPrice'> & { price: number | string; individualPrice: number | string | null }> }>('/daily-menu', { method: 'PUT', body: JSON.stringify({ date, items }) })
  return normalizeDailyMenu(menu)
}

export async function createDailyMenu(date: string, items: Array<Pick<DailyMenuItem, 'menuItemId' | 'availableQuantity' | 'individualPrice'> & { components: DailyMenuItem['components'] }>) {
  const menu = await apiRequest<DailyMenu & { items: Array<Omit<DailyMenuItem, 'price' | 'individualPrice'> & { price: number | string; individualPrice: number | string | null }> }>('/daily-menu', { method: 'POST', body: JSON.stringify({ date, items }) })
  return normalizeDailyMenu(menu)
}

export async function resetDailyMenu(date: string) {
  const menu = await apiRequest<DailyMenu & { items: Array<Omit<DailyMenuItem, 'price' | 'individualPrice'> & { price: number | string; individualPrice: number | string | null }> }>('/daily-menu/reset', { method: 'POST', body: JSON.stringify({ date }) })
  return normalizeDailyMenu(menu)
}

export { getTodayDate }
