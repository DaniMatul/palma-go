import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

export type DailyMenuItemInput = {
  menuItemId: string
  availableQuantity: number
}

export type DailyMenuPinCategory = 'BREAKFAST' | 'SNACK' | 'LUNCH'

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

export class DailyMenuPastDateError extends Error {
  constructor() {
    super('No se pueden crear ni editar menús de fechas pasadas')
    this.name = 'DailyMenuPastDateError'
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

function assertEditableBusinessDate(date: Date) {
  const today = businessDateFromString(todayBusinessDate())
  if (today && date.getTime() < today.getTime()) throw new DailyMenuPastDateError()
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
    active: boolean
    availableQuantity: number
    remainingQuantity: number
    pinned: boolean
    soldQuantity: number
    revenue: unknown
    menuItem: { id: string; name: string; description: string; price: unknown }
  }>
}, pinnedOnly = false) {
  return {
    id: dailyMenu.id,
    date: formatBusinessDate(dailyMenu.date),
    status: dailyMenu.status,
    createdAt: dailyMenu.createdAt.toISOString(),
    updatedAt: dailyMenu.updatedAt.toISOString(),
    items: [...dailyMenu.items].filter((item) => item.active && (!pinnedOnly || item.pinned))
      .sort((a, b) => a.menuItem.name.localeCompare(b.menuItem.name, 'es'))
      .map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.menuItem.name,
        description: item.menuItem.description,
        price: item.price,
        availableQuantity: item.availableQuantity,
        remainingQuantity: item.remainingQuantity,
        soldQuantity: item.soldQuantity,
        revenue: item.revenue,
        pinned: item.pinned,
        sourceDailyMenuId: dailyMenu.id,
        sourceDate: formatBusinessDate(dailyMenu.date),
      })),
  }
}

const dailyMenuInclude = {
  items: {
    include: {
      menuItem: {
        select: { id: true, name: true, description: true, price: true },
      },
    },
  },
} satisfies Prisma.DailyMenuInclude

export async function getDailyMenu(date: Date, includePinned = false) {
  const dailyMenus = await prisma.dailyMenu.findMany({
    where: includePinned
      ? { OR: [{ date }, { date: { lte: date }, items: { some: { active: true, pinned: true } } }] }
      : { date, status: 'ACTIVE' },
    orderBy: { date: 'asc' },
    include: dailyMenuInclude,
  })
  const selectedMenu = dailyMenus.find((dailyMenu) => dailyMenu.date.getTime() === date.getTime()) ?? null
  if (!includePinned) return selectedMenu ? serializeDailyMenu(selectedMenu) : { id: null, date: formatBusinessDate(date), createdAt: null, updatedAt: null, items: [] }

  const serializedMenus = dailyMenus.map((dailyMenu) => serializeDailyMenu(dailyMenu, dailyMenu.id !== selectedMenu?.id))
  return {
    id: selectedMenu?.id ?? null,
    date: formatBusinessDate(date),
    status: selectedMenu?.status ?? null,
    createdAt: selectedMenu?.createdAt.toISOString() ?? null,
    updatedAt: selectedMenu?.updatedAt.toISOString() ?? null,
    items: serializedMenus.flatMap((menu) => menu.items),
  }
}

export async function replaceDailyMenu(date: Date, items: DailyMenuItemInput[], mode: 'upsert' | 'create' = 'upsert', targetDailyMenuId?: string) {
  assertEditableBusinessDate(date)
  return prisma.$transaction(async (transaction) => {
    const menuItems = await transaction.menuItem.findMany({
      where: { id: { in: items.map((item) => item.menuItemId) }, active: true },
      select: { id: true, price: true },
    })
    const activeMenuItemIds = new Set(menuItems.map((menuItem) => menuItem.id))
    if (items.some((item) => !activeMenuItemIds.has(item.menuItemId))) throw new DailyMenuMenuItemNotFoundError()

    const existingDailyMenu = targetDailyMenuId
      ? await transaction.dailyMenu.findUnique({ where: { id: targetDailyMenuId }, include: { items: true } })
      : await transaction.dailyMenu.findFirst({ where: { date, status: 'ACTIVE' }, include: { items: true } })
    if (existingDailyMenu && existingDailyMenu.date.getTime() !== date.getTime()) {
      throw new DailyMenuPastDateError()
    }
    if (mode === 'create' || !existingDailyMenu) {
      await transaction.dailyMenu.updateMany({ where: { status: 'ACTIVE' }, data: { status: 'CLOSED' } })
    }
    const created = mode === 'create' || !existingDailyMenu
    const dailyMenu = existingDailyMenu && mode !== 'create'
      ? await transaction.dailyMenu.update({ where: { id: existingDailyMenu.id }, data: { updatedAt: new Date(), status: 'ACTIVE' }, include: { items: true } })
      : await transaction.dailyMenu.create({ data: { date, status: 'ACTIVE' }, include: { items: true } })

    const incomingIds = new Set(items.map((item) => item.menuItemId))
    await transaction.dailyMenuItem.updateMany({
      where: { dailyMenuId: dailyMenu.id, menuItemId: { notIn: [...incomingIds] } },
      data: { active: false },
    })

    for (const item of items) {
      const menuItem = menuItems.find((candidate) => candidate.id === item.menuItemId)
      if (!menuItem) throw new DailyMenuMenuItemNotFoundError()
      const existing = dailyMenu.items.find((dailyItem) => dailyItem.menuItemId === item.menuItemId)
      await transaction.dailyMenuItem.upsert({
        where: { dailyMenuId_menuItemId: { dailyMenuId: dailyMenu.id, menuItemId: item.menuItemId } },
        update: {
          active: true,
          price: menuItem.price,
          availableQuantity: item.availableQuantity,
          remainingQuantity: Math.max(0, item.availableQuantity - (existing?.soldQuantity ?? 0)),
        },
        create: {
          dailyMenuId: dailyMenu.id,
          menuItemId: item.menuItemId,
          price: menuItem.price,
          active: true,
          availableQuantity: item.availableQuantity,
          remainingQuantity: item.availableQuantity,
          soldQuantity: 0,
          revenue: 0,
        },
      })
    }

    const result = await transaction.dailyMenu.findUniqueOrThrow({ where: { id: dailyMenu.id }, include: dailyMenuInclude })
    const menu = serializeDailyMenu(result)
    console.log('DailyMenu updatedAt:', menu.updatedAt)
    return { created, menu }
  })
}

export async function setDailyMenuPin(dailyMenuId: string, category: DailyMenuPinCategory, pinned: boolean) {
  return prisma.$transaction(async (transaction) => {
    const dailyMenu = await transaction.dailyMenu.findUnique({ where: { id: dailyMenuId } })
    if (!dailyMenu) return null
    const result = await transaction.dailyMenuItem.updateMany({
      where: { dailyMenuId, active: true, menuItem: { category } },
      data: { pinned },
    })
    if (result.count === 0) return null
    await transaction.dailyMenu.update({ where: { id: dailyMenuId }, data: { updatedAt: new Date() } })
    return { dailyMenuId, category, pinned }
  })
}

export async function resetDailyMenu(date: Date) {
  const result = await replaceDailyMenu(date, [], 'create')
  return result.menu
}
