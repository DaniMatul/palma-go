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

export type MenuOptionKind = 'PRIMARY' | 'COMPLEMENT' | 'EXTRA'
export type MenuItemOptionRole = 'PRIMARY_INCLUDED' | 'COMPLEMENT_INCLUDED' | 'PRIMARY_ADDITIONAL' | 'COMPLEMENT_OPTIONAL' | 'EXTRA_OPTIONAL'
export type OrderItemOptionAction = 'INCLUDED' | 'REPLACED' | 'ADDED'

export type DailyMenuOption = {
  id: string
  optionId: string
  category: 'BREAKFAST' | 'SNACK' | 'LUNCH'
  name: string
  description?: string | null
  kind: MenuOptionKind
  price: number
  available: boolean
  initialQuantity?: number | null
  remainingQuantity?: number | null
  soldQuantity?: number
}

export type DailyMenuOptionAssignment = {
  id: string
  dailyMenuItemId: string
  dailyMenuOptionId: string
  role: MenuItemOptionRole
  included: boolean
}

export type DailyMenuOptions = {
  id: string | null
  date: string
  options: DailyMenuOption[]
  assignments: DailyMenuOptionAssignment[]
}

export type MenuOption = {
  id: string
  name: string
  description?: string | null
  price: number
  kind: MenuOptionKind
  active: boolean
  legacyExtraId?: string | null
  categories?: Array<{ category: string }>
}

export type MenuItemOptionDefinition = {
  id?: string
  optionId: string
  role: MenuItemOptionRole
  quantity: number
  active: boolean
  option: MenuOption
}

export type MenuItemComposition = {
  id: string
  name: string
  optionDefinitions: MenuItemOptionDefinition[]
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
  customizations?: Array<{ dailyMenuOptionId: string; action?: 'REPLACED' | 'ADDED'; quantity?: number; replacesDailyMenuOptionId?: string }>
}

export type ExtraProduct = {
  id: string
  name: string
  price: number
  active: boolean
}
