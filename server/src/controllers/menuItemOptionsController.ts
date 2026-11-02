import { Request, Response } from 'express'
import { MenuItemOptionRole } from '@prisma/client'
import {
  listMenuItemOptions,
  MenuItemOptionInput,
  MenuItemOptionsNotFoundError,
  MenuItemOptionsValidationError,
  replaceMenuItemOptions,
} from '../services/menuItemOptionsService.js'

type OptionBody = { optionId?: unknown; role?: unknown; quantity?: unknown; active?: unknown }
const validRoles = new Set(Object.values(MenuItemOptionRole))

function error(response: Response, status: number, message: string) {
  return response.status(status).json({ error: message })
}

function parseDefinitions(value: unknown): MenuItemOptionInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new MenuItemOptionsValidationError('options debe ser un arreglo con al menos una opción')
  }
  return value.map((rawDefinition) => {
    if (typeof rawDefinition !== 'object' || rawDefinition === null || Array.isArray(rawDefinition)) {
      throw new MenuItemOptionsValidationError('Cada opción debe ser un objeto')
    }
    const definition = rawDefinition as OptionBody
    if (typeof definition.optionId !== 'string' || !definition.optionId.trim()) {
      throw new MenuItemOptionsValidationError('optionId es obligatorio')
    }
    if (typeof definition.role !== 'string' || !validRoles.has(definition.role as MenuItemOptionRole)) {
      throw new MenuItemOptionsValidationError('role no es válido')
    }
    const quantity = definition.quantity === undefined ? undefined : Number(definition.quantity)
    if (quantity !== undefined && (!Number.isInteger(quantity) || quantity <= 0)) {
      throw new MenuItemOptionsValidationError('quantity debe ser un entero mayor que 0')
    }
    if (definition.active !== undefined && typeof definition.active !== 'boolean') {
      throw new MenuItemOptionsValidationError('active debe ser booleano')
    }
    return {
      optionId: definition.optionId.trim(),
      role: definition.role as MenuItemOptionRole,
      quantity,
      active: definition.active,
    }
  })
}

export async function getMenuItemOptions(request: Request, response: Response) {
  try {
    const menuItemId = request.params.menuItemId
    if (typeof menuItemId !== 'string' || !menuItemId) return error(response, 400, 'El id del plato es obligatorio')
    return response.status(200).json(await listMenuItemOptions(menuItemId))
  } catch (cause) {
    if (cause instanceof MenuItemOptionsNotFoundError) return error(response, 404, cause.message)
    return error(response, 500, 'No se pudo obtener la composición del plato')
  }
}

export async function putMenuItemOptions(request: Request, response: Response) {
  try {
    const menuItemId = request.params.menuItemId
    if (typeof menuItemId !== 'string' || !menuItemId) return error(response, 400, 'El id del plato es obligatorio')
    const body = typeof request.body === 'object' && request.body !== null ? request.body as { options?: unknown } : {}
    const definitions = parseDefinitions(body.options)
    return response.status(200).json(await replaceMenuItemOptions(menuItemId, definitions))
  } catch (cause) {
    if (cause instanceof MenuItemOptionsNotFoundError) return error(response, 404, cause.message)
    if (cause instanceof MenuItemOptionsValidationError) return error(response, 400, cause.message)
    return error(response, 500, 'No se pudo guardar la composición del plato')
  }
}
