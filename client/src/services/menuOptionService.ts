import { apiRequest } from './api'
import { MenuItemComposition, MenuItemOptionRole, MenuOption, MenuOptionKind } from '../types/menu'

type ApiMenuOption = Omit<MenuOption, 'price'> & { price: number | string }

function normalizeOption(option: ApiMenuOption): MenuOption {
  return { ...option, price: Number(option.price) }
}

export async function getMenuOptions(filters: { category?: string; kind?: MenuOptionKind } = {}) {
  const params = new URLSearchParams()
  if (filters.category) params.set('category', filters.category)
  if (filters.kind) params.set('kind', filters.kind)
  const suffix = params.toString() ? `?${params.toString()}` : ''
  const options = await apiRequest<ApiMenuOption[]>(`/menu-options${suffix}`)
  return options.map(normalizeOption)
}

export async function getMenuItemComposition(menuItemId: string) {
  return apiRequest<MenuItemComposition>(`/menu-items/${menuItemId}/options`)
}

export async function saveMenuItemComposition(menuItemId: string, options: Array<{ optionId: string; role: MenuItemOptionRole; quantity?: number; active?: boolean }>) {
  return apiRequest<MenuItemComposition>(`/menu-items/${menuItemId}/options`, { method: 'PUT', body: JSON.stringify({ options }) })
}

export type MenuOptionInput = { name: string; description?: string; price: number; kind: MenuOptionKind; categories?: string[]; active?: boolean }

export async function createMenuOption(input: MenuOptionInput) {
  const option = await apiRequest<ApiMenuOption>('/menu-options', { method: 'POST', body: JSON.stringify(input) })
  return normalizeOption(option)
}

export async function updateMenuOption(id: string, input: Partial<MenuOptionInput>) {
  const option = await apiRequest<ApiMenuOption>(`/menu-options/${id}`, { method: 'PUT', body: JSON.stringify(input) })
  return normalizeOption(option)
}

export async function deactivateMenuOption(id: string) {
  const option = await apiRequest<ApiMenuOption>(`/menu-options/${id}`, { method: 'DELETE' })
  return normalizeOption(option)
}
