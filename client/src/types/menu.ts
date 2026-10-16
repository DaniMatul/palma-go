export type MenuProduct = {
  id: string
  name: string
  description: string
  price: number
  availableQuantity: number
  availableToday: boolean
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
