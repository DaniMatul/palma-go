import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

export class ExtraNotFoundError extends Error {
  constructor() {
    super('Extra no encontrado')
    this.name = 'ExtraNotFoundError'
  }
}

export type CreateExtraInput = {
  name: string
  price: Prisma.Decimal | number | string
}

export type UpdateExtraInput = Partial<CreateExtraInput> & {
  active?: boolean
}

export function listActiveExtras() {
  return prisma.extra.findMany({ where: { active: true }, orderBy: { name: 'asc' } })
}

export function createExtra(input: CreateExtraInput) {
  return prisma.extra.create({
    data: {
      name: input.name,
      price: input.price,
      active: true,
    },
  })
}

export async function updateExtra(id: string, input: UpdateExtraInput) {
  const existing = await prisma.extra.findUnique({ where: { id } })
  if (!existing) throw new ExtraNotFoundError()

  return prisma.extra.update({ where: { id }, data: input })
}

export async function deactivateExtra(id: string) {
  const existing = await prisma.extra.findUnique({ where: { id } })
  if (!existing) throw new ExtraNotFoundError()

  return prisma.extra.update({ where: { id }, data: { active: false } })
}
