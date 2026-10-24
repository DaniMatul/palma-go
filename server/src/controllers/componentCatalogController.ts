import { Request, Response } from 'express'
import { ComponentCatalogDuplicateError, ComponentCatalogNotFoundError, createComponentCatalog, deactivateComponentCatalog, listComponentCatalog, updateComponentCatalog } from '../services/componentCatalogService.js'

type CatalogBody = { name?: unknown; defaultExtraPortionPrice?: unknown; active?: unknown }
const bodyOf = (request: Request) => typeof request.body === 'object' && request.body !== null ? request.body as CatalogBody : {}
const priceOf = (value: unknown) => { const price = Number(value); return Number.isFinite(price) && price >= 0 ? price : null }
const error = (response: Response, status: number, message: string) => response.status(status).json({ error: message })

export async function getComponentCatalog(_request: Request, response: Response) { try { return response.status(200).json(await listComponentCatalog()) } catch { return error(response, 500, 'No se pudo obtener el catálogo de complementos') } }

export async function postComponentCatalog(request: Request, response: Response) {
  try { const body = bodyOf(request); const name = typeof body.name === 'string' ? body.name.trim() : ''; const price = priceOf(body.defaultExtraPortionPrice); if (!name) return error(response, 400, 'El nombre es obligatorio'); if (price === null) return error(response, 400, 'El precio debe ser un número mayor o igual a 0'); return response.status(201).json(await createComponentCatalog({ name, defaultExtraPortionPrice: price })) }
  catch (requestError) { if (requestError instanceof ComponentCatalogDuplicateError) return error(response, 409, requestError.message); return error(response, 500, 'No se pudo crear el complemento') }
}

export async function putComponentCatalog(request: Request, response: Response) {
  try { const id = typeof request.params.id === 'string' ? request.params.id : ''; if (!id) return error(response, 400, 'El id del complemento es obligatorio'); const body = bodyOf(request); const data: { name?: string; defaultExtraPortionPrice?: number; active?: boolean } = {}; if (typeof body.name !== 'undefined') { if (typeof body.name !== 'string' || !body.name.trim()) return error(response, 400, 'El nombre no puede estar vacío'); data.name = body.name.trim() } if (typeof body.defaultExtraPortionPrice !== 'undefined') { const price = priceOf(body.defaultExtraPortionPrice); if (price === null) return error(response, 400, 'El precio debe ser un número mayor o igual a 0'); data.defaultExtraPortionPrice = price } if (typeof body.active !== 'undefined') { if (typeof body.active !== 'boolean') return error(response, 400, 'active debe ser booleano'); data.active = body.active } if (!Object.keys(data).length) return error(response, 400, 'No hay campos válidos para actualizar'); return response.status(200).json(await updateComponentCatalog(id, data)) }
  catch (requestError) { if (requestError instanceof ComponentCatalogNotFoundError) return error(response, 404, requestError.message); if (requestError instanceof ComponentCatalogDuplicateError) return error(response, 409, requestError.message); return error(response, 500, 'No se pudo actualizar el complemento') }
}

export async function deleteComponentCatalog(request: Request, response: Response) { try { const id = typeof request.params.id === 'string' ? request.params.id : ''; if (!id) return error(response, 400, 'El id del complemento es obligatorio'); return response.status(200).json(await deactivateComponentCatalog(id)) } catch (requestError) { if (requestError instanceof ComponentCatalogNotFoundError) return error(response, 404, requestError.message); return error(response, 500, 'No se pudo desactivar el complemento') } }
