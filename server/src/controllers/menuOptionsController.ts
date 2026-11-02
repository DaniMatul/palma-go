import { Request, Response } from 'express'
import { MenuOptionKind } from '@prisma/client'
import {
  createMenuOption,
  deactivateMenuOption,
  listMenuOptions,
  MenuOptionCategoryInput,
  MenuOptionNotFoundError,
  MenuOptionValidationError,
  updateMenuOption,
} from '../services/menuOptionsService.js'

type MenuOptionBody = { name?: unknown; description?: unknown; price?: unknown; kind?: unknown; categories?: unknown; active?: unknown }

const validKinds = new Set(Object.values(MenuOptionKind))
const validCategories = new Set(['BREAKFAST', 'SNACK', 'LUNCH'])

function bodyOf(request: Request) {
  return typeof request.body === 'object' && request.body !== null && !Array.isArray(request.body) ? request.body as MenuOptionBody : {}
}

function parsePrice(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const price = Number(value)
  return Number.isFinite(price) && price >= 0 ? price : null
}

function parseKind(value: unknown) {
  return typeof value === 'string' && validKinds.has(value as MenuOptionKind) ? value as MenuOptionKind : null
}

function parseCategories(value: unknown): MenuOptionCategoryInput[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) throw new MenuOptionValidationError('categories debe ser un arreglo')
  return [...new Set(value.map((category) => {
    if (typeof category !== 'string' || !validCategories.has(category)) throw new MenuOptionValidationError('La categoría debe ser BREAKFAST, SNACK o LUNCH')
    return category as MenuOptionCategoryInput
  }))]
}

function error(response: Response, status: number, message: string) {
  return response.status(status).json({ error: message })
}

export async function getMenuOptions(request: Request, response: Response) {
  try {
    const rawKind = request.query.kind
    const rawCategory = request.query.category
    if (rawKind !== undefined && typeof rawKind !== 'string') return error(response, 400, 'kind no es válido')
    if (rawCategory !== undefined && typeof rawCategory !== 'string') return error(response, 400, 'category no es válida')
    const kind = rawKind === undefined ? undefined : parseKind(rawKind)
    if (rawKind !== undefined && !kind) return error(response, 400, 'kind no es válido')
    const parsedCategories = rawCategory === undefined ? undefined : parseCategories([rawCategory])
    const category = parsedCategories?.[0]
    return response.status(200).json(await listMenuOptions({ kind: kind ?? undefined, category }))
  } catch (cause) {
    if (cause instanceof MenuOptionValidationError) return error(response, 400, cause.message)
    return error(response, 500, 'No se pudieron obtener las opciones')
  }
}

export async function postMenuOption(request: Request, response: Response) {
  try {
    const body = bodyOf(request)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description = body.description === undefined ? undefined : typeof body.description === 'string' ? body.description.trim() : null
    const price = parsePrice(body.price)
    const kind = parseKind(body.kind)
    const categories = parseCategories(body.categories)
    if (!name) return error(response, 400, 'El nombre es obligatorio')
    if (description === null) return error(response, 400, 'La descripción debe ser texto')
    if (price === null) return error(response, 400, 'El precio es obligatorio y no puede ser negativo')
    if (!kind) return error(response, 400, 'kind debe ser PRIMARY, COMPLEMENT o EXTRA')
    return response.status(201).json(await createMenuOption({ name, description, price, kind, categories }))
  } catch (cause) {
    if (cause instanceof MenuOptionValidationError) return error(response, 400, cause.message)
    return error(response, 500, 'No se pudo crear la opción')
  }
}

export async function putMenuOption(request: Request, response: Response) {
  try {
    const id = request.params.id
    if (typeof id !== 'string' || !id) return error(response, 400, 'El id de la opción es obligatorio')
    const body = bodyOf(request)
    const data: Parameters<typeof updateMenuOption>[1] = {}
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) return error(response, 400, 'El nombre no puede estar vacío')
      data.name = body.name.trim()
    }
    if (body.description !== undefined) {
      if (typeof body.description !== 'string') return error(response, 400, 'La descripción debe ser texto')
      data.description = body.description.trim()
    }
    if (body.price !== undefined) {
      const price = parsePrice(body.price)
      if (price === null) return error(response, 400, 'El precio no puede ser negativo')
      data.price = price
    }
    if (body.kind !== undefined) {
      const kind = parseKind(body.kind)
      if (!kind) return error(response, 400, 'kind debe ser PRIMARY, COMPLEMENT o EXTRA')
      data.kind = kind
    }
    if (body.categories !== undefined) data.categories = parseCategories(body.categories)
    if (body.active !== undefined) {
      if (typeof body.active !== 'boolean') return error(response, 400, 'active debe ser booleano')
      data.active = body.active
    }
    if (Object.keys(data).length === 0) return error(response, 400, 'No hay campos válidos para actualizar')
    return response.status(200).json(await updateMenuOption(id, data))
  } catch (cause) {
    if (cause instanceof MenuOptionNotFoundError) return error(response, 404, cause.message)
    if (cause instanceof MenuOptionValidationError) return error(response, 400, cause.message)
    return error(response, 500, 'No se pudo actualizar la opción')
  }
}

export async function deleteMenuOption(request: Request, response: Response) {
  try {
    const id = request.params.id
    if (typeof id !== 'string' || !id) return error(response, 400, 'El id de la opción es obligatorio')
    return response.status(200).json(await deactivateMenuOption(id))
  } catch (cause) {
    if (cause instanceof MenuOptionNotFoundError) return error(response, 404, cause.message)
    return error(response, 500, 'No se pudo desactivar la opción')
  }
}
