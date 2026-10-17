import { MenuItem, MenuItemInput } from '../types/menu'
import { apiRequest } from './api'

function normalizeMenu(menu: MenuItem & { price: number | string }): MenuItem {
  return { ...menu, price: Number(menu.price) }
}

export async function getMenuItems() {
  const menus = await apiRequest<Array<MenuItem & { price: number | string }>>('/menu-items')
  return menus.map(normalizeMenu)
}

export async function createMenuItem(input: MenuItemInput) {
  const menu = await apiRequest<MenuItem & { price: number | string }>('/menu-items', { method: 'POST', body: JSON.stringify(input) })
  return normalizeMenu(menu)
}

export async function updateMenuItem(id: string, input: Partial<MenuItemInput> & { active?: boolean }) {
  const menu = await apiRequest<MenuItem & { price: number | string }>(`/menu-items/${id}`, { method: 'PUT', body: JSON.stringify(input) })
  return normalizeMenu(menu)
}

export async function deleteMenuItem(id: string) {
  const menu = await apiRequest<MenuItem & { price: number | string }>(`/menu-items/${id}`, { method: 'DELETE' })
  return normalizeMenu(menu)
}
