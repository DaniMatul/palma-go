import { Request, Response } from 'express'
import {
  businessDateFromString,
  DailyMenuAlreadyExistsError,
  DailyMenuMenuItemNotFoundError,
  DailyMenuValidationError,
  getDailyMenu,
  replaceDailyMenu,
  resetDailyMenu,
  todayBusinessDate,
} from '../services/dailyMenuService.js'

type DailyMenuBody = {
  date?: unknown
  items?: unknown
}

function errorResponse(response: Response, status: number, message: string) {
  return response.status(status).json({ message, error: message })
}

export function parseItems(value: unknown) {
  if (!Array.isArray(value)) throw new DailyMenuValidationError('items debe ser un array')

  const ids = new Set<string>()
  return value.map((rawItem) => {
    if (typeof rawItem !== 'object' || rawItem === null) throw new DailyMenuValidationError('Cada item debe ser un objeto')
    const item = rawItem as { menuItemId?: unknown; availableQuantity?: unknown; individualPrice?: unknown; components?: unknown }
    const menuItemId = typeof item.menuItemId === 'string' || typeof item.menuItemId === 'number' ? String(item.menuItemId) : ''
    const availableQuantity = Number(item.availableQuantity)
    const individualPrice = item.individualPrice === undefined || item.individualPrice === null || item.individualPrice === '' ? undefined : Number(item.individualPrice)
    if (!menuItemId) throw new DailyMenuValidationError('menuItemId es obligatorio')
    if (ids.has(menuItemId)) throw new DailyMenuValidationError('No se permiten menuItemId duplicados')
    if (!Number.isInteger(availableQuantity) || availableQuantity <= 0) throw new DailyMenuValidationError('Las cantidades deben ser mayores a 0.')
    if (individualPrice !== undefined && (!Number.isFinite(individualPrice) || individualPrice <= 0)) throw new DailyMenuValidationError('El precio del principal individual debe ser mayor a 0')
    ids.add(menuItemId)
    const components = item.components === undefined ? [] : item.components
    if (!Array.isArray(components)) throw new DailyMenuValidationError('components debe ser un array')
    const componentNames = new Set<string>()
    const catalogIds = new Set<string>()
    const parsedComponents = components.map((rawComponent, position) => {
      if (typeof rawComponent !== 'object' || rawComponent === null) throw new DailyMenuValidationError('Cada componente debe ser un objeto')
      const component = rawComponent as Record<string, unknown>
      const name = typeof component.name === 'string' ? component.name.trim() : ''
      const id = typeof component.id === 'string' ? component.id : undefined
      const catalogComponentId = typeof component.catalogComponentId === 'string' ? component.catalogComponentId : undefined
      const removable = component.removable === undefined ? true : component.removable
      const allowsExtraPortion = component.allowsExtraPortion === undefined ? false : component.allowsExtraPortion
      const extraPortionPrice = Number(component.extraPortionPrice ?? 0)
      if (!name) throw new DailyMenuValidationError('El nombre del componente es obligatorio')
      if (componentNames.has(name.toLocaleLowerCase())) throw new DailyMenuValidationError('No se permiten componentes duplicados')
      if (catalogComponentId && catalogIds.has(catalogComponentId)) throw new DailyMenuValidationError('No se permite agregar dos veces el mismo complemento del catálogo')
      if (typeof removable !== 'boolean' || typeof allowsExtraPortion !== 'boolean') throw new DailyMenuValidationError('Las reglas del componente no son válidas')
      if (!Number.isFinite(extraPortionPrice) || extraPortionPrice < 0 || (!allowsExtraPortion && extraPortionPrice !== 0)) throw new DailyMenuValidationError('El precio de porción adicional no es válido')
      componentNames.add(name.toLocaleLowerCase())
      if (catalogComponentId) catalogIds.add(catalogComponentId)
      return { id, catalogComponentId, name, position, removable, allowsExtraPortion, extraPortionPrice }
    })
    return { menuItemId, availableQuantity, individualPrice, components: parsedComponents }
  })
}

export async function postDailyMenuController(request: Request, response: Response) {
  try {
    if (typeof request.body !== 'object' || request.body === null || Array.isArray(request.body)) return errorResponse(response, 400, 'El body debe ser un objeto')
    const body = request.body as DailyMenuBody
    const dateString = typeof body.date === 'string' ? body.date : ''
    const date = businessDateFromString(dateString)
    if (!date) return errorResponse(response, 400, 'date es obligatorio y debe tener el formato YYYY-MM-DD')
    const result = await replaceDailyMenu(date, parseItems(body.items), 'create')
    return response.status(201).json(result.menu)
  } catch (error) {
    if (error instanceof DailyMenuValidationError) return errorResponse(response, 400, error.message)
    if (error instanceof DailyMenuMenuItemNotFoundError) return errorResponse(response, 404, error.message)
    if (error instanceof DailyMenuAlreadyExistsError) return errorResponse(response, 409, error.message)
    return errorResponse(response, 500, 'No se pudo crear el menú del día')
  }
}

export async function getDailyMenuController(request: Request, response: Response) {
  try {
    const requestedDate = request.query.date
    const dateString = requestedDate === undefined ? todayBusinessDate() : typeof requestedDate === 'string' ? requestedDate : ''
    const date = businessDateFromString(dateString)
    if (!date) return errorResponse(response, 400, 'date debe tener el formato YYYY-MM-DD y ser válida')

    return response.status(200).json(await getDailyMenu(date))
  } catch {
    return errorResponse(response, 500, 'No se pudo obtener el menú del día')
  }
}

export async function putDailyMenuController(request: Request, response: Response) {
  try {
    if (typeof request.body !== 'object' || request.body === null || Array.isArray(request.body)) {
      return errorResponse(response, 400, 'El body debe ser un objeto')
    }
    const body = request.body as DailyMenuBody
    const dateString = typeof body?.date === 'string' ? body.date : ''
    const date = businessDateFromString(dateString)
    if (!date) return errorResponse(response, 400, 'date es obligatorio y debe tener el formato YYYY-MM-DD')

    const items = parseItems(body.items)
    const result = await replaceDailyMenu(date, items)
    return response.status(result.created ? 201 : 200).json(result.menu)
  } catch (error) {
    if (error instanceof DailyMenuValidationError) return errorResponse(response, 400, error.message)
    if (error instanceof DailyMenuMenuItemNotFoundError) return errorResponse(response, 404, error.message)
    return errorResponse(response, 500, 'No se pudo actualizar el menú del día')
  }
}

export async function resetDailyMenuController(request: Request, response: Response) {
  try {
    if (typeof request.body !== 'object' || request.body === null || Array.isArray(request.body)) return errorResponse(response, 400, 'El body debe ser un objeto')
    const dateString = typeof request.body.date === 'string' ? request.body.date : ''
    const date = businessDateFromString(dateString)
    if (!date) return errorResponse(response, 400, 'date es obligatorio y debe tener el formato YYYY-MM-DD')
    return response.status(201).json(await resetDailyMenu(date))
  } catch {
    return errorResponse(response, 500, 'No se pudo crear el nuevo menú del día')
  }
}
