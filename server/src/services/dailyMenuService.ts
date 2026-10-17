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
  createdAt: Date
  updatedAt: Date
  items: Array<{
    id: string
    menuItemId: string
    availableQuantity: number
    remainingQuantity: number
    menuItem: { id: string; name: string; description: string; price: unknown }
  }>
}) {
  return {
    id: dailyMenu.id,
    date: formatBusinessDate(dailyMenu.date),
    createdAt: dailyMenu.createdAt.toISOString(),
    updatedAt: dailyMenu.updatedAt.toISOString(),
    items: [...dailyMenu.items]
      .sort((a, b) => a.menuItem.name.localeCompare(b.menuItem.name, 'es'))
      .map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.menuItem.name,
        description: item.menuItem.description,
        price: item.menuItem.price,
        availableQuantity: item.availableQuantity,
        remainingQuantity: item.remainingQuantity,
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
  const dailyMenu = await prisma.dailyMenu.findUnique({ where: { date }, include: dailyMenuInclude })
  return dailyMenu ? serializeDailyMenu(dailyMenu) : { id: null, date: formatBusinessDate(date), createdAt: null, updatedAt: null, items: [] }
}

export async function replaceDailyMenu(date: Date, items: DailyMenuItemInput[]) {
  return prisma.$transaction(async (transaction) => {
    const menuItems = await transaction.menuItem.findMany({
      where: { id: { in: items.map((item) => item.menuItemId) }, active: true },
      select: { id: true },
    })
    const activeMenuItemIds = new Set(menuItems.map((menuItem) => menuItem.id))
    if (items.some((item) => !activeMenuItemIds.has(item.menuItemId))) throw new DailyMenuMenuItemNotFoundError()

    let dailyMenu = await transaction.dailyMenu.findUnique({ where: { date } })
    const created = !dailyMenu
    if (!dailyMenu) {
      dailyMenu = await transaction.dailyMenu.create({ data: { date } })
    } else {
      dailyMenu = await transaction.dailyMenu.update({
        where: { id: dailyMenu.id },
        data: { updatedAt: new Date() },
        include: dailyMenuInclude,
      })
    }

    await transaction.dailyMenuItem.deleteMany({
      where: { dailyMenuId: dailyMenu.id, menuItemId: { notIn: items.map((item) => item.menuItemId) } },
    })

    for (const item of items) {
      await transaction.dailyMenuItem.upsert({
        where: { dailyMenuId_menuItemId: { dailyMenuId: dailyMenu.id, menuItemId: item.menuItemId } },
        update: { availableQuantity: item.availableQuantity, remainingQuantity: item.availableQuantity },
        create: { dailyMenuId: dailyMenu.id, menuItemId: item.menuItemId, availableQuantity: item.availableQuantity, remainingQuantity: item.availableQuantity },
      })
    }

    const result = await transaction.dailyMenu.findUniqueOrThrow({ where: { id: dailyMenu.id }, include: dailyMenuInclude })
    const menu = serializeDailyMenu(result)
    console.log('DailyMenu updatedAt:', menu.updatedAt)
    return { created, menu }
  })
}
