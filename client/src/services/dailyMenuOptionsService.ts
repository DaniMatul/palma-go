import { apiRequest } from './api'
import { DailyMenuOption, DailyMenuOptionAssignment, OrderItemOptionAction } from '../types/menu'

type ApiDailyMenuOption = Omit<DailyMenuOption, 'name' | 'description' | 'price'> & {
  price: number | string
  option: { id: string; name: string; description?: string | null; kind: DailyMenuOption['kind'] }
}

type ApiDailyMenuOptions = {
  id: string | null
  date: string
  options: ApiDailyMenuOption[]
  assignments: Array<DailyMenuOptionAssignment & { dailyMenuItem?: { id: string; menuItemId: string } }>
}

function normalize(value: ApiDailyMenuOptions) {
  return {
    id: value.id,
    date: value.date,
    options: value.options.map((option) => ({ ...option, name: option.option.name, description: option.option.description, kind: option.option.kind, price: Number(option.price) })),
    assignments: value.assignments.map(({ dailyMenuItem, ...assignment }) => assignment),
  }
}

export async function getDailyMenuOptions(date: string) {
  return normalize(await apiRequest<ApiDailyMenuOptions>(`/daily-menu-options?date=${date}`))
}

export type DailyMenuOptionSaveInput = {
  optionId: string
  category: 'BREAKFAST' | 'SNACK' | 'LUNCH'
  price?: number
  available?: boolean
  initialQuantity?: number
  remainingQuantity?: number
}

export type DailyMenuAssignmentInput = {
  dailyMenuItemId: string
  dailyMenuOptionId: string
  role: 'PRIMARY_INCLUDED' | 'COMPLEMENT_INCLUDED' | 'PRIMARY_ADDITIONAL' | 'COMPLEMENT_OPTIONAL' | 'EXTRA_OPTIONAL'
  included?: boolean
}

export async function saveDailyMenuOptions(date: string, options: DailyMenuOptionSaveInput[], assignments: DailyMenuAssignmentInput[]) {
  return normalize(await apiRequest<ApiDailyMenuOptions>('/daily-menu-options', { method: 'PUT', body: JSON.stringify({ date, options, assignments }) }))
}

export type CreateOrderCustomization = {
  dailyMenuOptionId: string
  action?: Exclude<OrderItemOptionAction, 'INCLUDED'>
  quantity?: number
  replacesDailyMenuOptionId?: string
}
