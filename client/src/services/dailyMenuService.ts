import { DailyMenu, DailyMenuItem, MenuItemCategory } from '../types/menu'
import { apiRequest } from './api'

function getTodayDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

function normalizeDailyMenu(menu: DailyMenu & { items: Array<Omit<DailyMenuItem, 'price'> & { price: number | string }> }): DailyMenu {
  return { ...menu, items: menu.items.map((item) => ({ ...item, price: Number(item.price) })) }
}

export async function getDailyMenu(date = getTodayDate(), includePinned = false) {
  const menu = await apiRequest<DailyMenu & { items: Array<Omit<DailyMenuItem, 'price'> & { price: number | string }> }>(`/daily-menu?date=${date}${includePinned ? '&includePinned=true' : ''}`)
  return normalizeDailyMenu(menu)
}

export async function saveDailyMenu(date: string, items: Array<Pick<DailyMenuItem, 'menuItemId' | 'availableQuantity'>>, dailyMenuId?: string) {
  const menu = await apiRequest<DailyMenu & { items: Array<Omit<DailyMenuItem, 'price'> & { price: number | string }> }>('/daily-menu', { method: 'PUT', body: JSON.stringify({ date, items, ...(dailyMenuId ? { dailyMenuId } : {}) }) })
  return normalizeDailyMenu(menu)
}

export async function setDailyMenuPin(dailyMenuId: string, category: MenuItemCategory, pinned: boolean) {
  return apiRequest<{ dailyMenuId: string; category: MenuItemCategory; pinned: boolean }>(`/daily-menu/${dailyMenuId}/pin`, { method: 'PATCH', body: JSON.stringify({ category, pinned }) })
}

export async function createDailyMenu(date: string, items: Array<Pick<DailyMenuItem, 'menuItemId' | 'availableQuantity'>>) {
  const menu = await apiRequest<DailyMenu & { items: Array<Omit<DailyMenuItem, 'price'> & { price: number | string }> }>('/daily-menu', { method: 'POST', body: JSON.stringify({ date, items }) })
  return normalizeDailyMenu(menu)
}

export async function resetDailyMenu(date: string) {
  const menu = await apiRequest<DailyMenu & { items: Array<Omit<DailyMenuItem, 'price'> & { price: number | string }> }>('/daily-menu/reset', { method: 'POST', body: JSON.stringify({ date }) })
  return normalizeDailyMenu(menu)
}

export { getTodayDate }
