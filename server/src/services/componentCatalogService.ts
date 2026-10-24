import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

export class ComponentCatalogNotFoundError extends Error {
  constructor() { super('Complemento no encontrado'); this.name = 'ComponentCatalogNotFoundError' }
}

export class ComponentCatalogDuplicateError extends Error {
  constructor() { super('Ya existe un complemento con ese nombre'); this.name = 'ComponentCatalogDuplicateError' }
}

export type ComponentCatalogInput = { name: string; defaultExtraPortionPrice: number | string | Prisma.Decimal }

function normalizeName(name: string) { return name.trim().toLocaleLowerCase('es-GT') }

export function listComponentCatalog() {
  return prisma.componentCatalog.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] })
}

export async function createComponentCatalog(input: ComponentCatalogInput) {
  try {
    return await prisma.componentCatalog.create({ data: { name: input.name.trim(), nameNormalized: normalizeName(input.name), defaultExtraPortionPrice: input.defaultExtraPortionPrice, active: true } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ComponentCatalogDuplicateError()
    throw error
  }
}

export async function updateComponentCatalog(id: string, input: Partial<ComponentCatalogInput> & { active?: boolean }) {
  const existing = await prisma.componentCatalog.findUnique({ where: { id } })
  if (!existing) throw new ComponentCatalogNotFoundError()
  try {
    return await prisma.componentCatalog.update({ where: { id }, data: { ...(input.name === undefined ? {} : { name: input.name.trim(), nameNormalized: normalizeName(input.name) }), ...(input.defaultExtraPortionPrice === undefined ? {} : { defaultExtraPortionPrice: input.defaultExtraPortionPrice }), ...(input.active === undefined ? {} : { active: input.active }) } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ComponentCatalogDuplicateError()
    throw error
  }
}

export async function deactivateComponentCatalog(id: string) {
  return updateComponentCatalog(id, { active: false })
}
