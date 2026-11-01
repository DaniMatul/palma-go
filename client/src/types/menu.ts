export type MenuProduct = {
  id: string
  name: string
  description: string
  price: number
  availableQuantity: number
  availableToday: boolean
}

export type MenuItem = {
  id: string
  name: string
  description: string
  price: number
  category: MenuItemCategory | null
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export type MenuItemCategory = 'BREAKFAST' | 'SNACK' | 'LUNCH' | 'DINNER'

export type MenuItemInput = Pick<MenuItem, 'name' | 'description' | 'price' | 'category'>

export type MenuCategory = 'Desayuno' | 'Refacción' | 'Almuerzo' | 'Cena' | 'Extra'

export type Extra = {
  id: string
  name: string
  price: number
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export type ExtraInput = Pick<Extra, 'name' | 'price'> & { active?: boolean }

export type DailyMenuItem = {
  id: string
  menuItemId: string
  name: string
  description: string
  price: number
  availableQuantity: number
  remainingQuantity: number
  soldQuantity?: number
  revenue?: number
  pinned?: boolean
  sourceDailyMenuId?: string
  sourceDate?: string
}

export type DailyMenu = {
  id: string | null
  date: string
  status?: 'ACTIVE' | 'CLOSED'
  createdAt: string | null
  updatedAt: string | null
  items: DailyMenuItem[]
}

export type OrderLine = {
  id: string
  name: string
  price: number
  quantity: number
}

export type ExtraProduct = {
  id: string
  name: string
  price: number
  active: boolean
}
