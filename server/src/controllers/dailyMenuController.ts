import { Request, Response } from 'express'
import {
  businessDateFromString,
  DailyMenuMenuItemNotFoundError,
  DailyMenuValidationError,
  getDailyMenu,
  replaceDailyMenu,
  todayBusinessDate,
} from '../services/dailyMenuService.js'

type DailyMenuBody = {
  date?: unknown
  items?: unknown
}

function errorResponse(response: Response, status: number, message: string) {
  return response.status(status).json({ message, error: message })
}

function parseItems(value: unknown) {
  if (!Array.isArray(value)) throw new DailyMenuValidationError('items debe ser un array')

  const ids = new Set<string>()
  return value.map((rawItem) => {
    if (typeof rawItem !== 'object' || rawItem === null) throw new DailyMenuValidationError('Cada item debe ser un objeto')
    const item = rawItem as { menuItemId?: unknown; availableQuantity?: unknown }
    const menuItemId = typeof item.menuItemId === 'string' || typeof item.menuItemId === 'number' ? String(item.menuItemId) : ''
    const availableQuantity = Number(item.availableQuantity)
    if (!menuItemId) throw new DailyMenuValidationError('menuItemId es obligatorio')
    if (ids.has(menuItemId)) throw new DailyMenuValidationError('No se permiten menuItemId duplicados')
    if (!Number.isInteger(availableQuantity) || availableQuantity <= 0) throw new DailyMenuValidationError('Todos los platillos del menú del día deben tener al menos 1 unidad disponible.')
    ids.add(menuItemId)
    return { menuItemId, availableQuantity }
  })
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
