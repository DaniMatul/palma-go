import { DailyMenuItemOptionRole, MenuCategory, MenuOptionKind, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { businessDateFromString } from './dailyMenuService.js'

export type DailyMenuOptionInput = {
  optionId: string
  category: Exclude<MenuCategory, 'DINNER'>
  price?: number
  available?: boolean
  initialQuantity?: number
  remainingQuantity?: number
}

export type DailyMenuAssignmentInput = {
  dailyMenuItemId: string
  dailyMenuOptionId: string
  role: DailyMenuItemOptionRole
  included?: boolean
}

export class DailyMenuOptionsNotFoundError extends Error {
  constructor(message = 'Menú del día no encontrado') {
    super(message)
    this.name = 'DailyMenuOptionsNotFoundError'
  }
}

export class DailyMenuOptionsValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DailyMenuOptionsValidationError'
  }
}

const dailyMenuOptionsInclude = {
  option: { include: { categories: { where: { active: true }, orderBy: { category: 'asc' as const } }, legacyExtra: true } },
  assignments: { include: { dailyMenuItem: { select: { id: true, menuItemId: true } } } },
} satisfies Prisma.DailyMenuOptionInclude

const dailyMenuOptionsRelation = { include: dailyMenuOptionsInclude } satisfies Prisma.DailyMenu$dailyOptionsArgs

const roleKinds: Record<DailyMenuItemOptionRole, MenuOptionKind> = {
  PRIMARY_INCLUDED: MenuOptionKind.PRIMARY,
  COMPLEMENT_INCLUDED: MenuOptionKind.COMPLEMENT,
  PRIMARY_ADDITIONAL: MenuOptionKind.PRIMARY,
  COMPLEMENT_OPTIONAL: MenuOptionKind.COMPLEMENT,
  EXTRA_OPTIONAL: MenuOptionKind.EXTRA,
}

const validCategories = new Set(['BREAKFAST', 'SNACK', 'LUNCH'])

export async function getDailyMenuOptions(date: Date) {
  const dailyMenu = await prisma.dailyMenu.findUnique({ where: { date }, include: { dailyOptions: dailyMenuOptionsRelation } })
  if (!dailyMenu) return { id: null, date: date.toISOString().slice(0, 10), options: [], assignments: [] }
  return {
    id: dailyMenu.id,
    date: dailyMenu.date.toISOString().slice(0, 10),
    options: dailyMenu.dailyOptions,
    assignments: dailyMenu.dailyOptions.flatMap((option) => option.assignments.map((assignment) => ({
      ...assignment,
      dailyMenuOptionId: option.id,
    }))),
  }
}

export async function replaceDailyMenuOptions(date: Date, options: DailyMenuOptionInput[], assignments: DailyMenuAssignmentInput[]) {
  return prisma.$transaction(async (transaction) => {
    const dailyMenu = await transaction.dailyMenu.findUnique({ where: { date }, include: { items: true, dailyOptions: true } })
    if (!dailyMenu) throw new DailyMenuOptionsNotFoundError()
    if (dailyMenu.status !== 'ACTIVE') throw new DailyMenuOptionsValidationError('El menú del día no está activo')

    const optionIds = [...new Set(options.map((item) => item.optionId))]
    const catalogOptions = await transaction.menuOption.findMany({ where: { id: { in: optionIds } }, select: { id: true, kind: true, price: true, active: true } })
    const catalogById = new Map(catalogOptions.map((option) => [option.id, option]))
    if (catalogOptions.length !== optionIds.length) throw new DailyMenuOptionsValidationError('Una o más opciones no existen')

    for (const item of options) {
      if (!validCategories.has(item.category)) throw new DailyMenuOptionsValidationError('La categoría debe ser BREAKFAST, SNACK o LUNCH')
      const catalogOption = catalogById.get(item.optionId)
      if (!catalogOption || !catalogOption.active) throw new DailyMenuOptionsValidationError('No se pueden configurar opciones inactivas')
      if (item.price !== undefined && (!Number.isFinite(item.price) || item.price < 0)) throw new DailyMenuOptionsValidationError('El precio no puede ser negativo')
      if (catalogOption.kind === MenuOptionKind.PRIMARY) {
        if (item.initialQuantity !== undefined && (!Number.isInteger(item.initialQuantity) || item.initialQuantity < 0)) throw new DailyMenuOptionsValidationError('initialQuantity debe ser un entero no negativo')
        if (item.remainingQuantity !== undefined && (!Number.isInteger(item.remainingQuantity) || item.remainingQuantity < 0)) throw new DailyMenuOptionsValidationError('remainingQuantity debe ser un entero no negativo')
      } else if (item.initialQuantity !== undefined || item.remainingQuantity !== undefined) {
        throw new DailyMenuOptionsValidationError('Solo las opciones PRIMARY manejan existencias')
      }
    }

    const dailyItems = new Map(dailyMenu.items.map((item) => [item.id, item]))
    const dailyOptionsByKey = new Map(dailyMenu.dailyOptions.map((item) => [`${item.category}:${item.optionId}`, item]))
    const resultingDailyOptions = new Map<string, string>()
    for (const item of options) {
      const catalogOption = catalogById.get(item.optionId)
      if (!catalogOption) throw new DailyMenuOptionsValidationError('Una o más opciones no existen')
      const existing = dailyOptionsByKey.get(`${item.category}:${item.optionId}`)
      const initialQuantity = catalogOption.kind === MenuOptionKind.PRIMARY ? item.initialQuantity ?? existing?.initialQuantity ?? 0 : null
      const remainingQuantity = catalogOption.kind === MenuOptionKind.PRIMARY
        ? item.remainingQuantity ?? existing?.remainingQuantity ?? initialQuantity ?? 0
        : null
      const dailyOption = await transaction.dailyMenuOption.upsert({
        where: { dailyMenuId_category_optionId: { dailyMenuId: dailyMenu.id, category: item.category, optionId: item.optionId } },
        update: {
          price: item.price ?? existing?.price ?? catalogOption.price,
          available: item.available ?? existing?.available ?? true,
          initialQuantity,
          remainingQuantity,
        },
        create: {
          dailyMenuId: dailyMenu.id,
          optionId: item.optionId,
          category: item.category,
          price: item.price ?? catalogOption.price,
          available: item.available ?? true,
          initialQuantity,
          remainingQuantity,
        },
      })
      resultingDailyOptions.set(`${item.category}:${item.optionId}`, dailyOption.id)
    }

    for (const existing of dailyMenu.dailyOptions) {
      if (!resultingDailyOptions.has(`${existing.category}:${existing.optionId}`)) {
        await transaction.dailyMenuOption.update({ where: { id: existing.id }, data: { available: false } })
      }
    }

    await transaction.dailyMenuItemOption.deleteMany({ where: { dailyMenuItem: { dailyMenuId: dailyMenu.id } } })
    const assignmentsByItem = new Map<string, boolean>()
    for (const assignment of assignments) {
      const dailyItem = dailyItems.get(assignment.dailyMenuItemId)
      const dailyOption = await transaction.dailyMenuOption.findUnique({ where: { id: assignment.dailyMenuOptionId }, include: { option: true } })
      if (!dailyItem || !dailyOption || dailyOption.dailyMenuId !== dailyMenu.id) throw new DailyMenuOptionsValidationError('La asignación no pertenece al menú del día')
      if (roleKinds[assignment.role] !== dailyOption.option.kind) throw new DailyMenuOptionsValidationError('El rol no corresponde al tipo de opción')
      await transaction.dailyMenuItemOption.create({ data: { dailyMenuItemId: dailyItem.id, dailyMenuOptionId: dailyOption.id, role: assignment.role, included: assignment.included ?? false } })
      if (assignment.role === DailyMenuItemOptionRole.PRIMARY_INCLUDED) assignmentsByItem.set(dailyItem.id, true)
    }
    for (const item of dailyMenu.items) {
      await transaction.dailyMenuItem.update({ where: { id: item.id }, data: { inventoryMode: assignmentsByItem.has(item.id) ? 'OPTIONS' : 'LEGACY' } })
    }

    return getDailyMenuOptionsWithTransaction(transaction, date)
  })
}

function getDailyMenuOptionsWithTransaction(transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], date: Date) {
  return transaction.dailyMenu.findUniqueOrThrow({ where: { date }, include: { dailyOptions: dailyMenuOptionsRelation } }).then((dailyMenu) => ({
    id: dailyMenu.id,
    date: dailyMenu.date.toISOString().slice(0, 10),
    options: dailyMenu.dailyOptions,
    assignments: dailyMenu.dailyOptions.flatMap((option) => option.assignments.map((assignment) => ({ ...assignment, dailyMenuOptionId: option.id }))),
  }))
}

export function parseDailyMenuOptionsDate(value: string) {
  const date = businessDateFromString(value)
  if (!date) throw new DailyMenuOptionsValidationError('date debe tener el formato YYYY-MM-DD')
  return date
}
