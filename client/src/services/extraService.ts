import { Extra, ExtraInput } from '../types/menu'
import { apiRequest } from './api'

function normalizeExtra(extra: Extra & { price: number | string }): Extra {
  return { ...extra, price: Number(extra.price) }
}

export async function getExtras() {
  const extras = await apiRequest<Array<Extra & { price: number | string }>>('/extras')
  return extras.map(normalizeExtra)
}

export async function createExtra(input: ExtraInput) {
  const extra = await apiRequest<Extra & { price: number | string }>('/extras', { method: 'POST', body: JSON.stringify(input) })
  return normalizeExtra(extra)
}

export async function updateExtra(id: string, input: Partial<ExtraInput> & { active?: boolean }) {
  const extra = await apiRequest<Extra & { price: number | string }>(`/extras/${id}`, { method: 'PUT', body: JSON.stringify(input) })
  return normalizeExtra(extra)
}

export async function deleteExtra(id: string) {
  const extra = await apiRequest<Extra & { price: number | string }>(`/extras/${id}`, { method: 'DELETE' })
  return normalizeExtra(extra)
}
