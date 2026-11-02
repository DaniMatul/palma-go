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
  return prisma.$transaction(async (transaction) => {
    const extra = await transaction.extra.create({ data: { name: input.name, price: input.price, active: true } })
    await transaction.menuOption.create({
      data: { name: extra.name, price: extra.price, kind: 'EXTRA', active: extra.active, legacyExtraId: extra.id },
    })
    return extra
  })
}

export async function updateExtra(id: string, input: UpdateExtraInput) {
  const existing = await prisma.extra.findUnique({ where: { id } })
  if (!existing) throw new ExtraNotFoundError()

  return prisma.$transaction(async (transaction) => {
    const extra = await transaction.extra.update({ where: { id }, data: input })
    await transaction.menuOption.upsert({
      where: { legacyExtraId: id },
      create: { name: extra.name, price: extra.price, kind: 'EXTRA', active: extra.active, legacyExtraId: extra.id },
      update: { name: extra.name, price: extra.price, active: extra.active },
    })
    return extra
  })
}

export async function deactivateExtra(id: string) {
  const existing = await prisma.extra.findUnique({ where: { id } })
  if (!existing) throw new ExtraNotFoundError()

  return prisma.$transaction(async (transaction) => {
    const extra = await transaction.extra.update({ where: { id }, data: { active: false } })
    await transaction.menuOption.updateMany({ where: { legacyExtraId: id }, data: { active: false } })
    return extra
  })
}
