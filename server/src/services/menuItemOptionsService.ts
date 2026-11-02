import { MenuItemOptionRole, MenuOptionKind } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

export type MenuItemOptionInput = {
  optionId: string
  role: MenuItemOptionRole
  quantity?: number
  active?: boolean
}

const compositionInclude = {
  option: {
    include: {
      categories: { where: { active: true }, orderBy: { category: 'asc' as const } },
      legacyExtra: true,
    },
  },
}

export class MenuItemOptionsNotFoundError extends Error {
  constructor() {
    super('Plato no encontrado')
    this.name = 'MenuItemOptionsNotFoundError'
  }
}

export class MenuItemOptionsValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MenuItemOptionsValidationError'
  }
}

const roleKinds: Record<MenuItemOptionRole, MenuOptionKind> = {
  PRIMARY_INCLUDED: MenuOptionKind.PRIMARY,
  COMPLEMENT_INCLUDED: MenuOptionKind.COMPLEMENT,
  PRIMARY_ADDITIONAL: MenuOptionKind.PRIMARY,
  COMPLEMENT_OPTIONAL: MenuOptionKind.COMPLEMENT,
  EXTRA_OPTIONAL: MenuOptionKind.EXTRA,
}

export function listMenuItemOptions(menuItemId: string) {
  return prisma.menuItem.findUnique({
    where: { id: menuItemId },
    select: {
      id: true,
      name: true,
      optionDefinitions: {
        orderBy: [{ role: 'asc' }, { id: 'asc' }],
        include: compositionInclude,
      },
    },
  }).then((menuItem) => {
    if (!menuItem) throw new MenuItemOptionsNotFoundError()
    return menuItem
  })
}

export async function replaceMenuItemOptions(menuItemId: string, definitions: MenuItemOptionInput[]) {
  const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId }, select: { id: true } })
  if (!menuItem) throw new MenuItemOptionsNotFoundError()

  const primaryIncluded = definitions.filter((definition) => definition.role === MenuItemOptionRole.PRIMARY_INCLUDED)
  if (primaryIncluded.length !== 1) {
    throw new MenuItemOptionsValidationError('Cada plato debe tener exactamente un principal incluido')
  }

  const optionIds = [...new Set(definitions.map((definition) => definition.optionId))]
  if (optionIds.some((optionId) => !optionId)) {
    throw new MenuItemOptionsValidationError('Cada opción debe tener un optionId')
  }

  const options = await prisma.menuOption.findMany({ where: { id: { in: optionIds } }, select: { id: true, kind: true, active: true } })
  const optionsById = new Map(options.map((option) => [option.id, option]))
  if (options.length !== optionIds.length) {
    throw new MenuItemOptionsValidationError('Una o más opciones no existen')
  }

  for (const definition of definitions) {
    const option = optionsById.get(definition.optionId)
    if (!option) throw new MenuItemOptionsValidationError('Una o más opciones no existen')
    if (!option.active) throw new MenuItemOptionsValidationError('No se pueden configurar opciones inactivas')
    if (roleKinds[definition.role] !== option.kind) {
      throw new MenuItemOptionsValidationError(`La opción ${definition.optionId} no corresponde al rol ${definition.role}`)
    }
    const quantity = definition.quantity ?? 1
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new MenuItemOptionsValidationError('quantity debe ser un entero mayor que 0')
    }
  }

  return prisma.$transaction(async (transaction) => {
    await transaction.menuItemOption.deleteMany({ where: { menuItemId } })
    await Promise.all(definitions.map((definition) => transaction.menuItemOption.create({
      data: {
        menuItemId,
        optionId: definition.optionId,
        role: definition.role,
        quantity: definition.quantity ?? 1,
        active: definition.active ?? true,
      },
      include: compositionInclude,
    })))
    return listMenuItemOptionsWithTransaction(transaction, menuItemId)
  })
}

function listMenuItemOptionsWithTransaction(transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], menuItemId: string) {
  return transaction.menuItem.findUniqueOrThrow({
    where: { id: menuItemId },
    select: {
      id: true,
      name: true,
      optionDefinitions: {
        orderBy: [{ role: 'asc' }, { id: 'asc' }],
        include: compositionInclude,
      },
    },
  })
}
