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
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export type MenuItemInput = Pick<MenuItem, 'name' | 'description' | 'price'>

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
  individualPrice: number | null
  availableQuantity: number
  remainingQuantity: number
  soldQuantity?: number
  revenue?: number
  components: DailyMenuComponent[]
}

export type DailyMenuComponent = {
  id?: string
  catalogComponentId?: string | null
  name: string
  position?: number
  active?: boolean
  removable: boolean
  allowsExtraPortion: boolean
  extraPortionPrice: number
}

export type DailyMenuComponentDraft = DailyMenuComponent & {
  catalogDraft?: { name: string; defaultExtraPortionPrice: number; saveToCatalog: boolean }
}

export type ComponentCatalog = {
  id: string
  name: string
  defaultExtraPortionPrice: number
  active: boolean
  createdAt?: string
  updatedAt?: string
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
  menuComponents?: Array<{ name: string }>
  menuItemId?: string
  menuMode?: 'FULL' | 'INDIVIDUAL'
  customizations?: Array<{ componentId?: string; componentName: string; action: 'REMOVE' | 'ADD'; quantity: number; unitPrice: number }>
  comment?: string
}

export type ExtraProduct = {
  id: string
  name: string
  price: number
  active: boolean
}
