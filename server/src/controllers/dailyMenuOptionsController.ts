import { Request, Response } from 'express'
import { DailyMenuItemOptionRole, MenuCategory } from '@prisma/client'
import { getDailyMenuOptions, parseDailyMenuOptionsDate, replaceDailyMenuOptions, DailyMenuOptionsNotFoundError, DailyMenuOptionsValidationError, DailyMenuOptionInput, DailyMenuAssignmentInput } from '../services/dailyMenuOptionsService.js'

function error(response: Response, status: number, message: string) {
  return response.status(status).json({ message, error: message })
}

function parseBody(request: Request) {
  if (typeof request.body !== 'object' || request.body === null || Array.isArray(request.body)) throw new DailyMenuOptionsValidationError('El body debe ser un objeto')
  const body = request.body as { date?: unknown; options?: unknown; assignments?: unknown }
  const date = typeof body.date === 'string' ? parseDailyMenuOptionsDate(body.date) : null
  if (!date) throw new DailyMenuOptionsValidationError('date es obligatorio')
  if (!Array.isArray(body.options) || !Array.isArray(body.assignments)) throw new DailyMenuOptionsValidationError('options y assignments deben ser arreglos')
  const options = body.options.map((raw) => {
    if (typeof raw !== 'object' || raw === null) throw new DailyMenuOptionsValidationError('Cada opción debe ser un objeto')
    const value = raw as Record<string, unknown>
    const optionId = typeof value.optionId === 'string' ? value.optionId : ''
    const category = typeof value.category === 'string' ? value.category as Exclude<MenuCategory, 'DINNER'> : '' as Exclude<MenuCategory, 'DINNER'>
    if (!optionId) throw new DailyMenuOptionsValidationError('optionId es obligatorio')
    return { optionId, category, price: value.price === undefined ? undefined : Number(value.price), available: value.available === undefined ? undefined : Boolean(value.available), initialQuantity: value.initialQuantity === undefined ? undefined : Number(value.initialQuantity), remainingQuantity: value.remainingQuantity === undefined ? undefined : Number(value.remainingQuantity) } as DailyMenuOptionInput
  })
  const assignments = body.assignments.map((raw) => {
    if (typeof raw !== 'object' || raw === null) throw new DailyMenuOptionsValidationError('Cada asignación debe ser un objeto')
    const value = raw as Record<string, unknown>
    const role = value.role as DailyMenuItemOptionRole
    if (typeof value.dailyMenuItemId !== 'string' || typeof value.dailyMenuOptionId !== 'string' || !Object.values(DailyMenuItemOptionRole).includes(role)) throw new DailyMenuOptionsValidationError('La asignación no es válida')
    return { dailyMenuItemId: value.dailyMenuItemId, dailyMenuOptionId: value.dailyMenuOptionId, role, included: value.included === undefined ? undefined : Boolean(value.included) } as DailyMenuAssignmentInput
  })
  return { date, options, assignments }
}

export async function getDailyMenuOptionsController(request: Request, response: Response) {
  try {
    const rawDate = request.query.date
    if (typeof rawDate !== 'string') return error(response, 400, 'date es obligatorio')
    return response.status(200).json(await getDailyMenuOptions(parseDailyMenuOptionsDate(rawDate)))
  } catch (cause) {
    if (cause instanceof DailyMenuOptionsValidationError) return error(response, 400, cause.message)
    return error(response, 500, 'No se pudieron obtener las opciones del menú')
  }
}

export async function putDailyMenuOptionsController(request: Request, response: Response) {
  try {
    const { date, options, assignments } = parseBody(request)
    return response.status(200).json(await replaceDailyMenuOptions(date, options, assignments))
  } catch (cause) {
    if (cause instanceof DailyMenuOptionsNotFoundError) return error(response, 404, cause.message)
    if (cause instanceof DailyMenuOptionsValidationError) return error(response, 400, cause.message)
    return error(response, 500, 'No se pudieron guardar las opciones del menú')
  }
}
