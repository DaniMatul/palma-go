import { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import {
  createMenuItem,
  deactivateMenuItem,
  MenuItemNotFoundError,
  listMenuItems,
  updateMenuItem,
} from '../services/menuItemsService.js'

type MenuItemBody = {
  name?: unknown
  description?: unknown
  price?: unknown
  active?: unknown
}

function getBody(request: Request): MenuItemBody {
  return typeof request.body === 'object' && request.body !== null ? request.body as MenuItemBody : {}
}

function parsePrice(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const price = Number(value)
  return Number.isFinite(price) && price > 0 ? price : null
}

function validationError(message: string) {
  return { error: message }
}

export async function getMenuItems(_request: Request, response: Response) {
  try {
    response.status(200).json(await listMenuItems())
  } catch {
    response.status(500).json({ error: 'No se pudieron obtener los menús' })
  }
}

export async function postMenuItem(request: Request, response: Response) {
  try {
    const body = getBody(request)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const price = parsePrice(body.price)

    if (!name) return response.status(400).json(validationError('El nombre es obligatorio'))
    if (price === null) return response.status(400).json(validationError('El precio es obligatorio y debe ser mayor que 0'))

    const menuItem = await createMenuItem({ name, description, price })
    return response.status(201).json(menuItem)
  } catch {
    return response.status(500).json({ error: 'No se pudo crear el menú' })
  }
}

export async function putMenuItem(request: Request, response: Response) {
  try {
    const id = request.params.id
    if (typeof id !== 'string' || !id) return response.status(400).json(validationError('El id del menú es obligatorio'))
    const body = getBody(request)
    const data: { name?: string; description?: string; price?: number; active?: boolean } = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) return response.status(400).json(validationError('El nombre no puede estar vacío'))
      data.name = body.name.trim()
    }
    if (body.description !== undefined) {
      if (typeof body.description !== 'string') return response.status(400).json(validationError('La descripción debe ser texto'))
      data.description = body.description.trim()
    }
    if (body.price !== undefined) {
      const price = parsePrice(body.price)
      if (price === null) return response.status(400).json(validationError('El precio debe ser mayor que 0'))
      data.price = price
    }
    if (body.active !== undefined) {
      if (typeof body.active !== 'boolean') return response.status(400).json(validationError('active debe ser booleano'))
      data.active = body.active
    }
    if (Object.keys(data).length === 0) return response.status(400).json(validationError('No hay campos válidos para actualizar'))

    return response.status(200).json(await updateMenuItem(id, data))
  } catch (error) {
    if (error instanceof MenuItemNotFoundError) return response.status(404).json({ error: error.message })
    return response.status(500).json({ error: 'No se pudo actualizar el menú' })
  }
}

export async function deleteMenuItem(request: Request, response: Response) {
  try {
    const id = request.params.id
    if (typeof id !== 'string' || !id) return response.status(400).json(validationError('El id del menú es obligatorio'))
    return response.status(200).json(await deactivateMenuItem(id))
  } catch (error) {
    if (error instanceof MenuItemNotFoundError) return response.status(404).json({ error: error.message })
    if (error instanceof Prisma.PrismaClientKnownRequestError) return response.status(500).json({ error: 'No se pudo desactivar el menú' })
    return response.status(500).json({ error: 'No se pudo desactivar el menú' })
  }
}
