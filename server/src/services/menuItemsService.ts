import { Prisma } from '@prisma/client'
import type { MenuCategory } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

export class MenuItemNotFoundError extends Error {
  constructor() {
    super('Menú no encontrado')
    this.name = 'MenuItemNotFoundError'
  }
}

export type CreateMenuItemInput = {
  name: string
  description: string
  price: Prisma.Decimal | number | string
  category: MenuCategory
}

export type UpdateMenuItemInput = Partial<CreateMenuItemInput> & {
  active?: boolean
}

export function listMenuItems() {
  return prisma.menuItem.findMany({ orderBy: { name: 'asc' } })
}

export function createMenuItem(input: CreateMenuItemInput) {
  return prisma.menuItem.create({
    data: {
      name: input.name,
      description: input.description,
      price: input.price,
      category: input.category,
      active: true,
    },
  })
}

export async function updateMenuItem(id: string, input: UpdateMenuItemInput) {
  const existing = await prisma.menuItem.findUnique({ where: { id } })
  if (!existing) throw new MenuItemNotFoundError()

  return prisma.menuItem.update({ where: { id }, data: input })
}

export async function deactivateMenuItem(id: string) {
  const existing = await prisma.menuItem.findUnique({ where: { id } })
  if (!existing) throw new MenuItemNotFoundError()

  return prisma.menuItem.update({ where: { id }, data: { active: false } })
}
