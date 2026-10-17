import { Request, Response } from 'express'
import {
  createExtra,
  deactivateExtra,
  ExtraNotFoundError,
  listActiveExtras,
  updateExtra,
} from '../services/extrasService.js'

type ExtraBody = {
  name?: unknown
  price?: unknown
  active?: unknown
}

function getBody(request: Request): ExtraBody {
  return typeof request.body === 'object' && request.body !== null ? request.body as ExtraBody : {}
}

function parsePrice(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const price = Number(value)
  return Number.isFinite(price) && price > 0 ? price : null
}

function validationError(message: string) {
  return { error: message }
}

export async function getExtras(_request: Request, response: Response) {
  try {
    return response.status(200).json(await listActiveExtras())
  } catch {
    return response.status(500).json({ error: 'No se pudieron obtener los extras' })
  }
}

export async function postExtra(request: Request, response: Response) {
  try {
    const body = getBody(request)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const price = parsePrice(body.price)

    if (!name) return response.status(400).json(validationError('El nombre es obligatorio'))
    if (price === null) return response.status(400).json(validationError('El precio es obligatorio y debe ser mayor que 0'))

    return response.status(201).json(await createExtra({ name, price }))
  } catch {
    return response.status(500).json({ error: 'No se pudo crear el extra' })
  }
}

export async function putExtra(request: Request, response: Response) {
  try {
    const id = request.params.id
    if (typeof id !== 'string' || !id) return response.status(400).json(validationError('El id del extra es obligatorio'))

    const body = getBody(request)
    const data: { name?: string; price?: number; active?: boolean } = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) return response.status(400).json(validationError('El nombre no puede estar vacío'))
      data.name = body.name.trim()
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

    return response.status(200).json(await updateExtra(id, data))
  } catch (error) {
    if (error instanceof ExtraNotFoundError) return response.status(404).json({ error: error.message })
    return response.status(500).json({ error: 'No se pudo actualizar el extra' })
  }
}

export async function deleteExtra(request: Request, response: Response) {
  try {
    const id = request.params.id
    if (typeof id !== 'string' || !id) return response.status(400).json(validationError('El id del extra es obligatorio'))

    return response.status(200).json(await deactivateExtra(id))
  } catch (error) {
    if (error instanceof ExtraNotFoundError) return response.status(404).json({ error: error.message })
    return response.status(500).json({ error: 'No se pudo desactivar el extra' })
  }
}
