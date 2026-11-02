import { MenuCategory, MenuOptionKind } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

export type MenuOptionCategoryInput = Exclude<MenuCategory, 'DINNER'>

export type CreateMenuOptionInput = {
  name: string
  description?: string
  price: number
  kind: MenuOptionKind
  categories?: MenuOptionCategoryInput[]
}

export type UpdateMenuOptionInput = Partial<CreateMenuOptionInput> & { active?: boolean }

export class MenuOptionNotFoundError extends Error {
  constructor() {
    super('Opción no encontrada')
    this.name = 'MenuOptionNotFoundError'
  }
}

export class MenuOptionValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MenuOptionValidationError'
  }
}

const optionInclude = { categories: { where: { active: true }, orderBy: { category: 'asc' as const } }, legacyExtra: true }

function categoryData(categories: MenuOptionCategoryInput[] | undefined) {
  return categories === undefined ? undefined : {
    deleteMany: {},
    create: categories.map((category) => ({ category, active: true })),
  }
}

export function listMenuOptions(filters: { kind?: MenuOptionKind; category?: MenuOptionCategoryInput; active?: boolean } = {}) {
  return prisma.menuOption.findMany({
    where: {
      kind: filters.kind,
      active: filters.active ?? true,
      categories: filters.category ? { some: { category: filters.category, active: true } } : undefined,
    },
    orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    include: optionInclude,
  })
}

export function createMenuOption(input: CreateMenuOptionInput) {
  return prisma.menuOption.create({
    data: {
      name: input.name,
      description: input.description || null,
      price: input.price,
      kind: input.kind,
      categories: { create: (input.categories ?? []).map((category) => ({ category, active: true })) },
    },
    include: optionInclude,
  })
}

export async function updateMenuOption(id: string, input: UpdateMenuOptionInput) {
  const existing = await prisma.menuOption.findUnique({ where: { id } })
  if (!existing) throw new MenuOptionNotFoundError()
  if (existing.legacyExtraId && input.kind !== undefined && input.kind !== MenuOptionKind.EXTRA) {
    throw new MenuOptionValidationError('La opción canónica de un extra debe conservar el tipo EXTRA')
  }

  return prisma.$transaction(async (transaction) => {
    const option = await transaction.menuOption.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.description === undefined ? {} : { description: input.description || null }),
        ...(input.price === undefined ? {} : { price: input.price }),
        ...(input.kind === undefined ? {} : { kind: input.kind }),
        ...(input.active === undefined ? {} : { active: input.active }),
        categories: categoryData(input.categories),
      },
      include: optionInclude,
    })
    if (existing.legacyExtraId) {
      await transaction.extra.update({
        where: { id: existing.legacyExtraId },
        data: {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.price === undefined ? {} : { price: input.price }),
          ...(input.active === undefined ? {} : { active: input.active }),
        },
      })
    }
    return option
  })
}

export async function deactivateMenuOption(id: string) {
  const existing = await prisma.menuOption.findUnique({ where: { id } })
  if (!existing) throw new MenuOptionNotFoundError()
  return prisma.$transaction(async (transaction) => {
    const option = await transaction.menuOption.update({ where: { id }, data: { active: false }, include: optionInclude })
    if (existing.legacyExtraId) {
      await transaction.extra.update({ where: { id: existing.legacyExtraId }, data: { active: false } })
    }
    return option
  })
}
