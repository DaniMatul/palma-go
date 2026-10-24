import { ComponentCatalog } from '../types/menu'
import { apiRequest } from './api'

function normalize(component: ComponentCatalog & { defaultExtraPortionPrice: number | string }): ComponentCatalog { return { ...component, defaultExtraPortionPrice: Number(component.defaultExtraPortionPrice) } }
export async function getComponentCatalog() { const components = await apiRequest<Array<ComponentCatalog & { defaultExtraPortionPrice: number | string }>>('/component-catalog'); return components.map(normalize) }
export async function createComponentCatalog(input: { name: string; defaultExtraPortionPrice: number }) { return normalize(await apiRequest<ComponentCatalog & { defaultExtraPortionPrice: number | string }>('/component-catalog', { method: 'POST', body: JSON.stringify(input) })) }
export async function updateComponentCatalog(id: string, input: Partial<{ name: string; defaultExtraPortionPrice: number; active: boolean }>) { return normalize(await apiRequest<ComponentCatalog & { defaultExtraPortionPrice: number | string }>(`/component-catalog/${id}`, { method: 'PUT', body: JSON.stringify(input) })) }
export async function deleteComponentCatalog(id: string) { return updateComponentCatalog(id, { active: false }) }
