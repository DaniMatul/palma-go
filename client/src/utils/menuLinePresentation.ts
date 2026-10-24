import { OrderLine } from '../types/menu'

type MenuLine = Pick<OrderLine, 'menuComponents' | 'customizations' | 'comment' | 'menuMode'>

export function isCustomizedMenuLine(item: MenuLine & { id?: string; menuItemId?: string }) {
  return Boolean(item.menuItemId && item.menuMode !== 'INDIVIDUAL' && (item.id?.startsWith('menu-') || item.customizations?.length || item.comment?.trim()))
}

export function getMenuLinePresentation(item: MenuLine) {
  const removed = new Set((item.customizations ?? []).filter((customization) => customization.action === 'REMOVE').map((customization) => customization.componentName))
  const included = (item.menuComponents ?? []).map((component) => component.name).filter((name) => !removed.has(name))
  const additions = (item.customizations ?? []).filter((customization) => customization.action === 'ADD').map((customization) => ({
    name: customization.componentName,
    quantity: customization.quantity,
    price: customization.unitPrice * customization.quantity,
  }))
  return { included, additions, comment: item.comment?.trim() }
}
