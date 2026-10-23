import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

export type DailyMenuItemInput = {
  menuItemId: string
  availableQuantity: number
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
    active: boolean
    availableQuantity: number
    remainingQuantity: number
    soldQuantity: number
    revenue: unknown
    menuItem: { id: string; name: string; description: string; price: unknown }
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
        availableQuantity: item.availableQuantity,
        remainingQuantity: item.remainingQuantity,
        soldQuantity: item.soldQuantity,
        revenue: item.revenue,
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

    const existingDailyMenu = await transaction.dailyMenu.findFirst({ where: { date, status: 'ACTIVE' }, include: { items: true } })
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

export async function resetDailyMenu(date: Date) {
  const result = await replaceDailyMenu(date, [], 'create')
  return result.menu
}
