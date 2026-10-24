import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

export type DailyMenuItemInput = {
  menuItemId: string
  availableQuantity: number
  individualPrice?: number | null
  components: DailyMenuComponentInput[]
}

export type DailyMenuComponentInput = {
  id?: string
  catalogComponentId?: string
  name: string
  removable: boolean
  allowsExtraPortion: boolean
  extraPortionPrice: number
}

export class DailyMenuValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DailyMenuValidationError'
  }
}

export class DailyMenuMenuItemNotFoundError extends Error {
  constructor() {
    super('Uno o más menús no existen o están inactivos')
    this.name = 'DailyMenuMenuItemNotFoundError'
  }
}

export class DailyMenuAlreadyExistsError extends Error {
  constructor() {
    super('Ya existe un menú para esa fecha')
    this.name = 'DailyMenuAlreadyExistsError'
  }
}

export function businessDateFromString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null
}

export function todayBusinessDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function formatBusinessDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function serializeDailyMenu(dailyMenu: {
  id: string
  date: Date
  status: 'ACTIVE' | 'CLOSED'
  createdAt: Date
  updatedAt: Date
  items: Array<{
    id: string
    menuItemId: string
    price: unknown
    individualPrice: unknown
    active: boolean
    availableQuantity: number
    remainingQuantity: number
    soldQuantity: number
    revenue: unknown
    menuItem: { id: string; name: string; description: string; price: unknown }
    components: Array<{ id: string; catalogComponentId: string | null; name: string; position: number; active: boolean; removable: boolean; allowsExtraPortion: boolean; extraPortionPrice: unknown }>
  }>
}) {
  return {
    id: dailyMenu.id,
    date: formatBusinessDate(dailyMenu.date),
    status: dailyMenu.status,
    createdAt: dailyMenu.createdAt.toISOString(),
    updatedAt: dailyMenu.updatedAt.toISOString(),
    items: [...dailyMenu.items].filter((item) => item.active)
      .sort((a, b) => a.menuItem.name.localeCompare(b.menuItem.name, 'es'))
      .map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.menuItem.name,
        description: item.menuItem.description,
        price: item.price,
        individualPrice: item.individualPrice,
        availableQuantity: item.availableQuantity,
        remainingQuantity: item.remainingQuantity,
        soldQuantity: item.soldQuantity,
        revenue: item.revenue,
        components: item.components.filter((component) => component.active).sort((a, b) => a.position - b.position).map((component) => ({ ...component, extraPortionPrice: component.extraPortionPrice })),
      })),
  }
}

const dailyMenuInclude = {
  items: {
    include: {
        components: true,
      menuItem: {
        select: { id: true, name: true, description: true, price: true },
      },
    },
  },
} satisfies Prisma.DailyMenuInclude

export async function getDailyMenu(date: Date) {
  const dailyMenu = await prisma.dailyMenu.findFirst({ where: { date, status: 'ACTIVE' }, include: dailyMenuInclude })
  return dailyMenu ? serializeDailyMenu(dailyMenu) : { id: null, date: formatBusinessDate(date), createdAt: null, updatedAt: null, items: [] }
}

export async function replaceDailyMenu(date: Date, items: DailyMenuItemInput[], mode: 'upsert' | 'create' = 'upsert') {
  return prisma.$transaction(async (transaction) => {
    const menuItems = await transaction.menuItem.findMany({
      where: { id: { in: items.map((item) => item.menuItemId) }, active: true },
      select: { id: true, price: true },
    })
    const activeMenuItemIds = new Set(menuItems.map((menuItem) => menuItem.id))
    if (items.some((item) => !activeMenuItemIds.has(item.menuItemId))) throw new DailyMenuMenuItemNotFoundError()

    const existingDailyMenu = await transaction.dailyMenu.findFirst({ where: { date, status: 'ACTIVE' }, include: { items: { include: { components: true } } } })
    if (mode === 'create' || !existingDailyMenu) {
      await transaction.dailyMenu.updateMany({ where: { status: 'ACTIVE' }, data: { status: 'CLOSED' } })
    }
    const created = mode === 'create' || !existingDailyMenu
    const dailyMenu = existingDailyMenu && mode !== 'create'
      ? await transaction.dailyMenu.update({ where: { id: existingDailyMenu.id }, data: { updatedAt: new Date(), status: 'ACTIVE' }, include: { items: { include: { components: true } } } })
      : await transaction.dailyMenu.create({ data: { date, status: 'ACTIVE' }, include: { items: { include: { components: true } } } })

    const incomingIds = new Set(items.map((item) => item.menuItemId))
    await transaction.dailyMenuItem.updateMany({
      where: { dailyMenuId: dailyMenu.id, menuItemId: { notIn: [...incomingIds] } },
      data: { active: false },
    })

    for (const item of items) {
      const menuItem = menuItems.find((candidate) => candidate.id === item.menuItemId)
      if (!menuItem) throw new DailyMenuMenuItemNotFoundError()
      const catalogIds = item.components.flatMap((component) => component.catalogComponentId ? [component.catalogComponentId] : [])
      const catalogComponents = await transaction.componentCatalog.findMany({ where: { id: { in: catalogIds }, active: true } })
      if (catalogComponents.length !== new Set(catalogIds).size) throw new DailyMenuValidationError('Uno o más complementos no existen o están inactivos')
      const existing = dailyMenu.items.find((dailyItem) => dailyItem.menuItemId === item.menuItemId)
      if (item.individualPrice !== undefined && item.individualPrice !== null && (!Number.isFinite(item.individualPrice) || item.individualPrice <= 0)) throw new DailyMenuValidationError('El precio del principal individual debe ser mayor a 0')
      await transaction.dailyMenuItem.upsert({
        where: { dailyMenuId_menuItemId: { dailyMenuId: dailyMenu.id, menuItemId: item.menuItemId } },
        update: {
          active: true,
          price: existing?.price ?? menuItem.price,
          individualPrice: item.individualPrice === undefined ? existing?.individualPrice ?? null : item.individualPrice,
          availableQuantity: item.availableQuantity,
          remainingQuantity: Math.max(0, item.availableQuantity - (existing?.soldQuantity ?? 0)),
        },
        create: {
          dailyMenuId: dailyMenu.id,
          menuItemId: item.menuItemId,
          price: menuItem.price,
          individualPrice: item.individualPrice ?? null,
          active: true,
          availableQuantity: item.availableQuantity,
          remainingQuantity: item.availableQuantity,
          soldQuantity: 0,
          revenue: 0,
        },
      })

      const savedDailyItem = await transaction.dailyMenuItem.findUniqueOrThrow({ where: { dailyMenuId_menuItemId: { dailyMenuId: dailyMenu.id, menuItemId: item.menuItemId } }, include: { components: true } })
      const incomingComponentIds = item.components.flatMap((component) => component.id ? [component.id] : [])
      const existingComponentIds = new Set(savedDailyItem.components.map((component) => component.id))
      if (incomingComponentIds.some((id) => !existingComponentIds.has(id))) throw new DailyMenuValidationError('Uno o más componentes no pertenecen al menú del día')
      await transaction.dailyMenuComponent.deleteMany({ where: { dailyMenuItemId: savedDailyItem.id, id: { notIn: incomingComponentIds } } })
      for (const [position, component] of item.components.entries()) {
        const data = {
          name: component.name.trim(),
          catalogComponentId: component.catalogComponentId ?? null,
          position,
          active: true,
          removable: component.removable,
          allowsExtraPortion: component.allowsExtraPortion,
          extraPortionPrice: component.extraPortionPrice,
        }
        if (component.id) await transaction.dailyMenuComponent.update({ where: { id: component.id }, data })
        else await transaction.dailyMenuComponent.create({ data: { ...data, dailyMenuItemId: savedDailyItem.id } })
      }
    }

    const result = await transaction.dailyMenu.findUniqueOrThrow({ where: { id: dailyMenu.id }, include: dailyMenuInclude })
    const menu = serializeDailyMenu(result)
    console.log('DailyMenu updatedAt:', menu.updatedAt)
    return { created, menu }
  })
}

export async function resetDailyMenu(date: Date) {
  const result = await replaceDailyMenu(date, [], 'create')
  return result.menu
}
