import { useEffect, useMemo, useState } from 'react'
import { AddRounded, CalendarMonthRounded, CheckCircleRounded, ChevronLeftRounded, ChevronRightRounded, CloseRounded, DeleteOutlineRounded, EditRounded, GridView, PushPin, PushPinOutlined, RemoveRounded, SearchRounded, ViewList } from '@mui/icons-material'
import { Alert, Box, Button, Card, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, Grid, IconButton, InputAdornment, MenuItem as SelectOption, Pagination, Paper, Snackbar, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { createExtra, deleteExtra, getExtras, updateExtra } from '../services/extraService'
import { createDailyMenu, getDailyMenu, getTodayDate, resetDailyMenu, saveDailyMenu } from '../services/dailyMenuService'
import { createMenuItem, deleteMenuItem, getMenuItems, updateMenuItem } from '../services/menuService'
import { DailyMenuItem, Extra, MenuCategory, MenuItem } from '../types/menu'
import { ExtraDialog } from './ExtraDialog'
import { MenuDialog } from './MenuDialog'
import type { MenuSection } from './MenuSidebar'

type ViewMode = 'cards' | 'list'
type MenuMode = 'view' | 'edit' | 'create'
type MenuViewItem = MenuItem & { availableToday: boolean; availableQuantity: number; remainingQuantity: number }
type CreateMenuCategory = 'Desayuno' | 'Refacción' | 'Almuerzo'
type CreateMenuDish = { id: string; name: string; price: number }
type ExampleMenuGroup = { title: string; category: MenuCategory; items: Array<CreateMenuDish & { initialQuantity: number; availableQuantity: number }> }
type ExampleMenuDisplayGroup = { group: ExampleMenuGroup; sourceDate: string; pinned: boolean }

const menuCategoryByName: Record<string, MenuCategory> = {
  'pepian': 'Almuerzo',
  'pollo dorado': 'Almuerzo',
  'caldo de res': 'Almuerzo',
  'hilachas': 'Almuerzo',
  'chuleta': 'Almuerzo',
  'desayuno tradicional': 'Desayuno',
  'huevos al gusto': 'Desayuno',
  'panqueques': 'Desayuno',
  'sandwich de pollo': 'Refacción',
  'pan con frijol': 'Refacción',
  'ensalada de frutas': 'Refacción',
  'pollo a la plancha': 'Almuerzo',
  'carne guisada': 'Almuerzo',
  'opcion vegetariana': 'Almuerzo',
}

const menuGroups = [
  { title: 'Menú desayuno', description: 'Organiza las opciones disponibles para el desayuno.' },
  { title: 'Menú refacción', description: 'Organiza las opciones disponibles para la refacción.' },
  { title: 'Menú almuerzo', description: 'Organiza las opciones disponibles para el almuerzo.' },
]

const createMenuDishes: Record<CreateMenuCategory, CreateMenuDish[]> = {
  Desayuno: [
    { id: 'breakfast-traditional', name: 'Desayuno tradicional', price: 25 },
    { id: 'breakfast-eggs', name: 'Huevos al gusto', price: 20 },
    { id: 'breakfast-pancakes', name: 'Panqueques', price: 18 },
  ],
  Refacción: [
    { id: 'snack-chicken-sandwich', name: 'Sándwich de pollo', price: 15 },
    { id: 'snack-bean-bread', name: 'Pan con frijol', price: 12 },
    { id: 'snack-fruit-salad', name: 'Ensalada de frutas', price: 18 },
  ],
  Almuerzo: [
    { id: 'lunch-grilled-chicken', name: 'Pollo a la plancha', price: 28 },
    { id: 'lunch-stewed-beef', name: 'Carne guisada', price: 30 },
    { id: 'lunch-vegetarian', name: 'Opción vegetariana', price: 24 },
  ],
}

const mockExtras: Extra[] = [
  { id: 'mock-extra-rice', name: 'Arroz', price: 5, active: true },
  { id: 'mock-extra-tortillas', name: 'Tortillas adicionales', price: 3, active: true },
  { id: 'mock-extra-refresco', name: 'Refresco natural', price: 8, active: true },
]

// Datos temporales de UI: solo sirven para visualizar Menús por fecha sin persistirlos.
const exampleMenuGroups: ExampleMenuGroup[] = [
  { title: 'Desayunos', category: 'Desayuno', items: [{ ...createMenuDishes.Desayuno[0], initialQuantity: 25, availableQuantity: 10 }, { ...createMenuDishes.Desayuno[1], initialQuantity: 20, availableQuantity: 8 }, { ...createMenuDishes.Desayuno[2], initialQuantity: 18, availableQuantity: 6 }] },
  { title: 'Refacciones', category: 'Refacción', items: [{ ...createMenuDishes.Refacción[0], initialQuantity: 20, availableQuantity: 15 }, { ...createMenuDishes.Refacción[1], initialQuantity: 18, availableQuantity: 10 }, { ...createMenuDishes.Refacción[2], initialQuantity: 16, availableQuantity: 8 }] },
  { title: 'Almuerzos', category: 'Almuerzo', items: [{ ...createMenuDishes.Almuerzo[0], initialQuantity: 25, availableQuantity: 10 }, { ...createMenuDishes.Almuerzo[1], initialQuantity: 20, availableQuantity: 8 }, { ...createMenuDishes.Almuerzo[2], initialQuantity: 18, availableQuantity: 12 }] },
  { title: 'Extras', category: 'Extra', items: [{ id: mockExtras[0].id, name: mockExtras[0].name, price: mockExtras[0].price, initialQuantity: 30, availableQuantity: 20 }, { id: mockExtras[1].id, name: mockExtras[1].name, price: mockExtras[1].price, initialQuantity: 40, availableQuantity: 30 }, { id: mockExtras[2].id, name: mockExtras[2].name, price: mockExtras[2].price, initialQuantity: 25, availableQuantity: 18 }] },
]

const exampleCategoryDishes: Record<MenuCategory, CreateMenuDish[]> = {
  Desayuno: [...createMenuDishes.Desayuno, { id: 'breakfast-avocado-toast', name: 'Tostadas con aguacate', price: 16 }],
  Refacción: [...createMenuDishes.Refacción, { id: 'snack-yogurt-granola', name: 'Yogur con granola', price: 14 }],
  Almuerzo: [...createMenuDishes.Almuerzo, { id: 'lunch-salad', name: 'Ensalada del día', price: 18 }],
  Extra: [...mockExtras.map((extra) => ({ id: extra.id, name: extra.name, price: extra.price })), { id: 'mock-extra-avocado', name: 'Aguacate', price: 5 }],
}

function addDaysToDate(date: string, days: number) {
  const result = new Date(`${date}T12:00:00`)
  result.setDate(result.getDate() + days)
  return result.toISOString().slice(0, 10)
}

const dateMenuCategories: Array<{ title: string; category: MenuCategory }> = [
  { title: 'Desayunos', category: 'Desayuno' },
  { title: 'Refacciones', category: 'Refacción' },
  { title: 'Almuerzos', category: 'Almuerzo' },
  { title: 'Extras', category: 'Extra' },
]

function getCategoryForName(name: string): MenuCategory {
  const normalizedName = name.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return menuCategoryByName[normalizedName] ?? 'Almuerzo'
}

function getDefaultMenuCategory(menu: MenuItem): MenuCategory {
  return getCategoryForName(menu.name)
}

function dailyMenuSignature(items: DailyMenuItem[]) {
  return JSON.stringify(items.map(({ menuItemId, availableQuantity }) => ({ menuItemId, availableQuantity })).sort((first, second) => first.menuItemId.localeCompare(second.menuItemId)))
}

function getInvalidDailyItems(items: DailyMenuItem[]) {
  return items.filter((item) => item.availableQuantity <= 0)
}

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })
}

function formatMenuDate(value: string) {
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

function updateMenu(items: MenuItem[], id: string, changes: Partial<MenuItem>) {
  return items.map((item) => item.id === id ? { ...item, ...changes } : item)
}

type MenuManagementViewProps = { section?: MenuSection }

export function MenuManagementView({ section = 'Menús' }: MenuManagementViewProps) {
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [menuCategories, setMenuCategories] = useState<Record<string, MenuCategory>>({})
  const [extras, setExtras] = useState<Extra[]>([])
  const [dailyItems, setDailyItems] = useState<DailyMenuItem[]>([])
  const [selectedMenuDate, setSelectedMenuDate] = useState(getTodayDate)
  const [dailyDate, setDailyDate] = useState(getTodayDate)
  const [dailyMenuId, setDailyMenuId] = useState<string | null>(null)
  const [dailyUpdatedAt, setDailyUpdatedAt] = useState<string | null>(null)
  const [originalMenu, setOriginalMenu] = useState<DailyMenuItem[] | null>(null)
  const [menuMode, setMenuMode] = useState<MenuMode>('create')
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({})
  const [savedDailySignature, setSavedDailySignature] = useState(() => dailyMenuSignature([]))
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [extrasPage, setExtrasPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false)
  const [newDailyMenuDialogOpen, setNewDailyMenuDialogOpen] = useState(false)
  const [createMenuDrawerOpen, setCreateMenuDrawerOpen] = useState(false)
  const [createMenuEditGroup, setCreateMenuEditGroup] = useState<ExampleMenuGroup | null>(null)
  const [pinnedExampleMenus, setPinnedExampleMenus] = useState<Record<string, boolean>>({})
  const [resetDailyMenuDialogOpen, setResetDailyMenuDialogOpen] = useState(false)
  const [newDailyMenuDate, setNewDailyMenuDate] = useState(getTodayDate)
  const [createMenuDate, setCreateMenuDate] = useState(getTodayDate)
  const [createMenuCategory, setCreateMenuCategory] = useState<CreateMenuCategory>('Almuerzo')
  const [createMenuSelection, setCreateMenuSelection] = useState<Record<string, number>>({})
  const [createMenuQuantityDrafts, setCreateMenuQuantityDrafts] = useState<Record<string, string>>({})
  const [exampleAvailability, setExampleAvailability] = useState<Record<string, boolean>>(() => Object.fromEntries(exampleMenuGroups.flatMap((group) => group.items.map((item) => [item.id, true]))))
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null)
  const [menuToDelete, setMenuToDelete] = useState<MenuItem | null>(null)
  const [extraDialogOpen, setExtraDialogOpen] = useState(false)
  const [editingExtra, setEditingExtra] = useState<Extra | null>(null)
  const [extraToDelete, setExtraToDelete] = useState<Extra | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [menuItems, extraItems, dailyMenu] = await Promise.all([getMenuItems(), getExtras(), getDailyMenu(selectedMenuDate)])
      setMenus(menuItems)
      setExtras(extraItems)
      setDailyItems(dailyMenu.items)
      setDailyDate(dailyMenu.date)
      setDailyMenuId(dailyMenu.id)
      setDailyUpdatedAt(dailyMenu.updatedAt)
      setSavedDailySignature(dailyMenuSignature(dailyMenu.items))
      setOriginalMenu(dailyMenu.id ? dailyMenu.items.map((item) => ({ ...item })) : null)
      setMenuMode(dailyMenu.id ? 'view' : 'create')
      console.log('GET updatedAt:', dailyMenu.updatedAt)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar los platos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadData() }, [])

  const loadDailyMenuByDate = async (date: string) => {
    setLoading(true)
    setError('')
    try {
      const dailyMenu = await getDailyMenu(date)
      setDailyItems(dailyMenu.items)
      setDailyDate(dailyMenu.date)
      setDailyMenuId(dailyMenu.id)
      setDailyUpdatedAt(dailyMenu.updatedAt)
      setSavedDailySignature(dailyMenuSignature(dailyMenu.items))
      setOriginalMenu(dailyMenu.id ? dailyMenu.items.map((item) => ({ ...item })) : null)
      setMenuMode(dailyMenu.id ? 'view' : 'create')
      setQuantityDrafts({})
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el menú de la fecha seleccionada')
    } finally {
      setLoading(false)
    }
  }

  const changeSelectedMenuDate = (date: string) => {
    setSelectedMenuDate(date)
    void loadDailyMenuByDate(date)
  }

  const moveSelectedMenuDate = (days: number) => {
    const nextDate = new Date(`${selectedMenuDate}T12:00:00`)
    nextDate.setDate(nextDate.getDate() + days)
    changeSelectedMenuDate(nextDate.toISOString().slice(0, 10))
  }

  const getMenuCategory = (menu: MenuItem) => menuCategories[menu.id] ?? getDefaultMenuCategory(menu)
  const sectionCategory: Record<string, MenuCategory> = { Desayunos: 'Desayuno', Refacciones: 'Refacción', Almuerzos: 'Almuerzo' }
  const sectionMenus = useMemo(() => section === 'Menús' || section === 'Extras' ? menus : menus.filter((menu) => getMenuCategory(menu) === sectionCategory[section]), [menuCategories, menus, section])
  const filteredMenus = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return query ? sectionMenus.filter((menu) => `${menu.name} ${menu.description}`.toLocaleLowerCase().includes(query)) : sectionMenus
  }, [sectionMenus, search])
  const filteredExtras = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    const source = extras.length > 0 ? extras : mockExtras
    return query ? source.filter((extra) => extra.name.toLocaleLowerCase().includes(query)) : source
  }, [extras, search])
  const toViewMenu = (menu: MenuItem): MenuViewItem => {
    const dailyItem = dailyItems.find((item) => item.menuItemId === menu.id)
    return { ...menu, availableToday: Boolean(dailyItem), availableQuantity: dailyItem?.availableQuantity ?? 0, remainingQuantity: dailyItem?.remainingQuantity ?? 0 }
  }
  const pageSize = viewMode === 'cards' ? 12 : 20
  const activeMenus = filteredMenus.map(toViewMenu).filter((menu) => menu.availableToday)
  const getDailyItemsForCategory = (category: MenuCategory) => category === 'Extra' ? [] : dailyItems.filter((item) => {
    const menu = menus.find((candidate) => candidate.id === item.menuItemId)
    return getCategoryForName(menu?.name ?? item.name) === category
  })
  const dateMenuCount = dateMenuCategories.filter((group) => getDailyItemsForCategory(group.category).length > 0).length
  const selectedDateLabel = new Date(`${selectedMenuDate}T12:00:00`).toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })
  const isSelectedDateToday = selectedMenuDate === getTodayDate()
  const showingDateGroupedMenus = section === 'Menús'
  const dailyAvailableCount = dailyItems.reduce((total, item) => total + item.availableQuantity, 0)
  const exampleDateMenus = useMemo(() => {
    const today = getTodayDate()
    return {
      [today]: exampleMenuGroups,
      [addDaysToDate(today, 1)]: exampleMenuGroups.filter((group) => group.category === 'Desayuno' || group.category === 'Almuerzo'),
      [addDaysToDate(today, 2)]: [],
    } as Record<string, ExampleMenuGroup[]>
  }, [])
  const exampleGroupsForDate = exampleDateMenus[selectedMenuDate] ?? []
  const exampleMenuKey = (date: string, category: MenuCategory) => `${date}:${category}`
  const displayExampleGroupsForDate = useMemo(() => {
    const displayed = new Map<string, ExampleMenuDisplayGroup>()
    for (const group of exampleGroupsForDate) {
      displayed.set(exampleMenuKey(selectedMenuDate, group.category), { group, sourceDate: selectedMenuDate, pinned: Boolean(pinnedExampleMenus[exampleMenuKey(selectedMenuDate, group.category)]) })
    }
    for (const [sourceDate, groups] of Object.entries(exampleDateMenus)) {
      for (const group of groups) {
        const key = exampleMenuKey(sourceDate, group.category)
        if (pinnedExampleMenus[key]) displayed.set(key, { group, sourceDate, pinned: true })
      }
    }
    return Array.from(displayed.values())
  }, [exampleDateMenus, exampleGroupsForDate, pinnedExampleMenus, selectedMenuDate])
  const exampleMenuCount = displayExampleGroupsForDate.length
  const exampleDishCount = displayExampleGroupsForDate.reduce((total, { group }) => total + group.items.filter((item) => exampleAvailability[item.id] !== false).length, 0)
  const createMenuDrawerDishes: CreateMenuDish[] = createMenuEditGroup ? exampleCategoryDishes[createMenuEditGroup.category] : createMenuDishes[createMenuCategory]
  const pageCount = Math.max(1, Math.ceil(filteredMenus.length / pageSize))
  const paginatedMenus = filteredMenus.slice((page - 1) * pageSize, page * pageSize)
  const extrasPageCount = Math.max(1, Math.ceil(filteredExtras.length / pageSize))
  const paginatedExtras = filteredExtras.slice((extrasPage - 1) * pageSize, extrasPage * pageSize)

  useEffect(() => { setPage(1); setExtrasPage(1) }, [search, viewMode])
  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount])
  useEffect(() => { if (extrasPage > extrasPageCount) setExtrasPage(extrasPageCount) }, [extrasPage, extrasPageCount])

  const runAction = async (action: () => Promise<void>, success: string) => {
    setBusy(true)
    setError('')
    try { await action(); setMessage(success) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No se pudo completar la operación') } finally { setBusy(false) }
  }

  const handleSave = async (menu: { id?: string; name: string; description: string; price: number; category: MenuCategory }) => {
    await runAction(async () => {
      const { category, ...menuInput } = menu
      const saved = menu.id ? await updateMenuItem(menu.id, menuInput) : await createMenuItem(menuInput)
      setMenus((current) => menu.id ? updateMenu(current, saved.id, saved) : [...current, saved])
      setMenuCategories((current) => ({ ...current, [saved.id]: category }))
      setDialogOpen(false)
    }, menu.id ? 'Plato actualizado.' : 'Plato creado.')
  }

  const handleDelete = async () => {
    if (!menuToDelete) return
    const menu = menuToDelete
    await runAction(async () => { const deleted = await deleteMenuItem(menu.id); setMenus((current) => updateMenu(current, menu.id, deleted)); setDailyItems((current) => current.filter((item) => item.menuItemId !== menu.id)); setMenuToDelete(null) }, 'Plato eliminado.')
  }

  const removeFromToday = (menu: MenuViewItem) => {
    if (menuMode === 'view') return
    setDailyItems((current) => current.filter((item) => item.menuItemId !== menu.id))
    setMessage('Plato quitado de la edición del día.')
  }

  const changeAvailableQuantity = (menu: MenuViewItem, amount: number) => {
    if (menuMode === 'view') return
    setQuantityDrafts((current) => { const next = { ...current }; delete next[menu.id]; return next })
    setDailyItems((current) => current.map((item) => item.menuItemId === menu.id ? { ...item, availableQuantity: Math.max(0, item.availableQuantity + amount), remainingQuantity: Math.max(0, item.availableQuantity + amount) } : item))
  }

  const changeQuantityFromInput = (menu: MenuViewItem, value: string) => {
    if (menuMode === 'view') return
    const sanitized = value.replace(/[^0-9]/g, '')
    setQuantityDrafts((current) => ({ ...current, [menu.id]: sanitized }))
    const quantity = sanitized === '' ? 0 : Number.parseInt(sanitized, 10)
    setDailyItems((current) => current.map((item) => item.menuItemId === menu.id ? { ...item, availableQuantity: quantity, remainingQuantity: quantity } : item))
  }

  const finishQuantityInput = (menu: MenuViewItem) => {
    if (menuMode === 'view') return
    if (quantityDrafts[menu.id] !== '') return
    setQuantityDrafts((current) => { const next = { ...current }; delete next[menu.id]; return next })
    setDailyItems((current) => current.map((item) => item.menuItemId === menu.id ? { ...item, availableQuantity: 0, remainingQuantity: 0 } : item))
  }

  const saveCurrentDailyMenu = (replaced: boolean) => runAction(async () => {
    const payload = dailyItems.map(({ menuItemId, availableQuantity }) => ({ menuItemId, availableQuantity }))
    const saved = dailyMenuId ? await saveDailyMenu(dailyDate, payload) : await createDailyMenu(dailyDate, payload)
    console.log('PUT updatedAt:', saved.updatedAt)
    const refreshed = await getDailyMenu(dailyDate)
    console.log('GET updatedAt:', refreshed.updatedAt)
    setDailyItems(refreshed.items)
    setSelectedMenuDate(refreshed.date)
    setDailyDate(refreshed.date)
    setDailyMenuId(refreshed.id)
    setDailyUpdatedAt(refreshed.updatedAt)
    setSavedDailySignature(dailyMenuSignature(refreshed.items))
    setOriginalMenu(refreshed.items.map((item) => ({ ...item })))
    setQuantityDrafts({})
    setMenuMode('view')
  }, replaced ? 'Menú del día actualizado correctamente.' : 'Menú del día guardado correctamente.')

  const dailyMenuDirty = dailyMenuSignature(dailyItems) !== savedDailySignature
  const requestDailyMenuSave = () => {
    if (menuMode === 'view' || !dailyMenuDirty || busy) return
    const invalidItems = getInvalidDailyItems(dailyItems)
    if (invalidItems.length > 0) {
      setError(`Las cantidades deben ser mayores a 0. Corrige: ${invalidItems.map((item) => item.name).join(', ')}.`)
      return
    }
    if (dailyMenuId) {
      setReplaceDialogOpen(true)
      return
    }
    void saveCurrentDailyMenu(false)
  }

  const editTodayMenu = async () => {
    setBusy(true)
    setError('')
    try {
      const todayMenu = await getDailyMenu(selectedMenuDate)
      setDailyItems(todayMenu.items)
      setSelectedMenuDate(todayMenu.date)
      setDailyDate(todayMenu.date)
      setDailyMenuId(todayMenu.id)
      setDailyUpdatedAt(todayMenu.updatedAt)
      setSavedDailySignature(dailyMenuSignature(todayMenu.items))
      setOriginalMenu(todayMenu.items.map((item) => ({ ...item })))
      setQuantityDrafts({})
      setMenuMode(todayMenu.id ? 'edit' : 'create')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el menú del día')
    } finally {
      setBusy(false)
    }
  }

  const startNewDailyMenu = async () => {
    setBusy(true)
    setError('')
    try {
      const existingMenu = await getDailyMenu(newDailyMenuDate)
      if (existingMenu.id) {
        setNewDailyMenuDialogOpen(false)
        setResetDailyMenuDialogOpen(true)
        return
      }
      const createdMenu = await createDailyMenu(newDailyMenuDate, [])
      setDailyDate(createdMenu.date)
      setSelectedMenuDate(createdMenu.date)
      setDailyItems(createdMenu.items)
      setDailyMenuId(createdMenu.id)
      setDailyUpdatedAt(createdMenu.updatedAt)
      setSavedDailySignature(dailyMenuSignature(createdMenu.items))
      setOriginalMenu(null)
      setQuantityDrafts({})
      setMenuMode('create')
      setNewDailyMenuDialogOpen(false)
      setMessage('Nuevo menú creado. Agrega opciones desde Platos disponibles.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo preparar el nuevo menú')
    } finally {
      setBusy(false)
    }
  }

  const confirmResetDailyMenu = () => runAction(async () => {
    const resetMenu = await resetDailyMenu(newDailyMenuDate)
    setDailyDate(resetMenu.date)
    setDailyItems(resetMenu.items)
    setDailyMenuId(resetMenu.id)
    setDailyUpdatedAt(resetMenu.updatedAt)
    setSavedDailySignature(dailyMenuSignature(resetMenu.items))
    setOriginalMenu(null)
    setQuantityDrafts({})
    setMenuMode('create')
    setResetDailyMenuDialogOpen(false)
  }, 'Nuevo menú creado correctamente.')

  const cancelDailyMenuEdit = () => {
    if (menuMode !== 'edit' || !originalMenu) return
    setDailyItems(originalMenu.map((item) => ({ ...item })))
    setSavedDailySignature(dailyMenuSignature(originalMenu))
    setQuantityDrafts({})
    setMenuMode('view')
    setMessage('Edición cancelada.')
  }

  const handleSaveExtra = async (extra: { id?: string; name: string; price: number; active: boolean }) => {
    await runAction(async () => {
      const saved = extra.id ? await updateExtra(extra.id, extra) : await createExtra(extra)
      setExtras((current) => extra.id ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved])
      setExtraDialogOpen(false)
    }, extra.id ? 'Extra actualizado.' : 'Extra creado.')
  }

  const handleDeleteExtra = async () => {
    if (!extraToDelete) return
    const extra = extraToDelete
    await runAction(async () => { const deleted = await deleteExtra(extra.id); setExtras((current) => current.map((item) => item.id === deleted.id ? deleted : item)); setExtraToDelete(null) }, 'Extra eliminado.')
  }

  const toggleExtra = (extra: Extra) => runAction(async () => {
    const saved = await updateExtra(extra.id, { active: !extra.active })
    setExtras((current) => current.map((item) => item.id === saved.id ? saved : item))
  }, extra.active ? 'Extra desactivado.' : 'Extra activado.')

  const closeCreateMenuDrawer = () => {
    setCreateMenuDrawerOpen(false)
    setCreateMenuEditGroup(null)
    setCreateMenuDate(getTodayDate())
    setCreateMenuCategory('Almuerzo')
    setCreateMenuSelection({})
    setCreateMenuQuantityDrafts({})
  }

  const toggleCreateMenuDish = (dishId: string) => {
    const wasSelected = Boolean(createMenuSelection[dishId])
    setCreateMenuSelection((current) => {
      if (wasSelected) {
        const next = { ...current }
        delete next[dishId]
        return next
      }
      return { ...current, [dishId]: 1 }
    })
    setCreateMenuQuantityDrafts((current) => {
      const next = { ...current }
      if (wasSelected) delete next[dishId]
      else next[dishId] = '1'
      return next
    })
  }

  const changeCreateMenuQuantity = (dishId: string, amount: number) => {
    setCreateMenuSelection((current) => {
      const quantity = Math.max(1, (current[dishId] ?? 1) + amount)
      setCreateMenuQuantityDrafts((drafts) => ({ ...drafts, [dishId]: String(quantity) }))
      return { ...current, [dishId]: quantity }
    })
  }

  const changeCreateMenuQuantityFromInput = (dishId: string, value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '')
    setCreateMenuQuantityDrafts((current) => ({ ...current, [dishId]: sanitized }))
    if (sanitized !== '') {
      setCreateMenuSelection((current) => ({ ...current, [dishId]: Math.max(1, Number.parseInt(sanitized, 10)) }))
    }
  }

  const finishCreateMenuQuantityInput = (dishId: string) => {
    const draft = createMenuQuantityDrafts[dishId]
    const quantity = draft ? Math.max(1, Number.parseInt(draft, 10)) : 1
    setCreateMenuQuantityDrafts((current) => ({ ...current, [dishId]: String(quantity) }))
    setCreateMenuSelection((current) => ({ ...current, [dishId]: quantity }))
  }

  const createMenuLocally = () => {
    setMessage(`Menú preparado localmente para ${createMenuDate}.`)
    closeCreateMenuDrawer()
  }

  const renderQuantityControls = (menu: MenuViewItem) => { const editable = menuMode !== 'view'; const invalidQuantity = menu.availableQuantity <= 0; return <Stack direction="row" alignItems="center" spacing={0.25} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}><IconButton aria-label={`Disminuir disponibilidad de ${menu.name}`} onClick={() => changeAvailableQuantity(menu, -1)} size="large" disabled={!editable || menu.availableQuantity === 0 || busy}><RemoveRounded /></IconButton><TextField aria-label={`Cantidad disponible de ${menu.name}`} value={quantityDrafts[menu.id] ?? String(menu.availableQuantity)} onChange={(event) => changeQuantityFromInput(menu, event.target.value)} onBlur={() => finishQuantityInput(menu)} onFocus={(event) => event.stopPropagation()} disabled={!editable || busy} error={editable && invalidQuantity} variant="outlined" size="small" inputMode="numeric" inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }} sx={{ width: 64, '& .MuiOutlinedInput-root': { height: 36, borderRadius: 1.5 }, '& input': { p: 0.5, textAlign: 'center', fontWeight: 800 }, '& input[type=number]': { MozAppearance: 'textfield' }, '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } }} /><IconButton aria-label={`Aumentar disponibilidad de ${menu.name}`} onClick={() => changeAvailableQuantity(menu, 1)} size="large" disabled={!editable || busy}><AddRounded /></IconButton></Stack> }
  const renderDayCard = (menu: MenuViewItem) => { const invalidQuantity = menu.availableQuantity <= 0; const editable = menuMode !== 'view'; return <Grid item xs={12} sm={6} lg={4} key={menu.id}><Card elevation={0} role="button" tabIndex={0} onClick={editable ? () => removeFromToday(menu) : undefined} onKeyDown={editable ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); removeFromToday(menu) } } : undefined} aria-label={editable ? `Quitar ${menu.name} del menú del día` : `Menú del día: ${menu.name}`} sx={{ height: '100%', border: '1px solid', borderColor: invalidQuantity && editable ? 'warning.light' : '#D9DCF3', bgcolor: 'background.paper', cursor: editable ? 'pointer' : 'default', '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.light' } }}><Box sx={{ p: 1.75 }}><Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}><Box><Typography variant="h6" sx={{ fontWeight: 800, color: editable ? 'text.primary' : 'text.secondary' }}>{menu.name}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{menu.description}</Typography><Typography sx={{ color: 'primary.main', fontWeight: 800, mt: 0.75 }}>Q{menu.price}</Typography></Box><CheckCircleRounded color="success" sx={{ width: 20, height: 20, p: 0, borderRadius: '50%', opacity: editable ? 1 : 0.9 }} /></Stack></Box><Stack sx={{ px: 1.75, pb: 1.25 }}><Typography variant="body2" color="text.secondary">Disponibles: {menu.availableQuantity} · Quedan: {menu.remainingQuantity}</Typography>{invalidQuantity && editable && <Typography sx={{ mt: 0.25, color: 'warning.dark', fontSize: 14, fontWeight: 500 }}>Define al menos 1 unidad</Typography>}{renderQuantityControls(menu)}</Stack></Card></Grid> }
  const renderDayRow = (menu: MenuViewItem) => { const invalidQuantity = menu.availableQuantity <= 0; const editable = menuMode !== 'view'; return <Paper key={menu.id} role="button" tabIndex={0} onClick={editable ? () => removeFromToday(menu) : undefined} onKeyDown={editable ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); removeFromToday(menu) } } : undefined} aria-label={editable ? `Quitar ${menu.name} del menú del día` : `Menú del día: ${menu.name}`} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: invalidQuantity && editable ? 'warning.light' : '#D9DCF3', bgcolor: 'background.paper', cursor: editable ? 'pointer' : 'default', '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.light' } }}><Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={1.5}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800, color: editable ? 'text.primary' : 'text.secondary' }}>{menu.name}</Typography><Typography variant="body2" color="text.secondary">{menu.description}</Typography></Box><Typography sx={{ color: 'primary.main', fontWeight: 800 }}>Q{menu.price}</Typography><Stack direction="row" alignItems="center" justifyContent="space-between"><Stack><Typography variant="body2" color="text.secondary">Disponibles: {menu.availableQuantity} · Quedan: {menu.remainingQuantity}</Typography>{invalidQuantity && editable && <Typography sx={{ mt: 0.25, color: 'warning.dark', fontSize: 14, fontWeight: 500 }}>Define al menos 1 unidad</Typography>}{renderQuantityControls(menu)}</Stack></Stack></Stack></Paper> }

  const renderCatalogCard = (menu: MenuViewItem) => <Grid item xs={12} sm={6} lg={4} key={menu.id}><Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2.25 }}><Stack spacing={2} sx={{ height: '100%' }}><Box sx={{ flex: 1 }}><Typography variant="h6" sx={{ fontWeight: 800 }}>{menu.name}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{menu.description}</Typography><Typography sx={{ color: 'primary.main', fontWeight: 800, mt: 1 }}>Q{menu.price}</Typography></Box><Stack direction="row" spacing={1}><Button fullWidth variant="outlined" startIcon={<EditRounded />} onClick={() => { setEditingMenu(menu); setDialogOpen(true) }} disabled={busy} sx={{ minHeight: 44 }}>Editar</Button><Button fullWidth variant="outlined" color="error" startIcon={<DeleteOutlineRounded />} onClick={() => setMenuToDelete(menu)} disabled={busy} sx={{ minHeight: 44 }}>Eliminar</Button></Stack></Stack></Card></Grid>
  const renderCatalogRow = (menu: MenuViewItem) => <Paper key={menu.id} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}><Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} gap={1.5}><Box sx={{ flex: 1, minWidth: 0 }}><Typography sx={{ fontWeight: 800 }}>{menu.name}</Typography><Typography variant="body2" color="text.secondary" noWrap>{menu.description}</Typography></Box><Typography sx={{ color: 'primary.main', fontWeight: 800, minWidth: 55 }}>Q{menu.price}</Typography><Stack direction="row" spacing={0.75}><Button variant="outlined" startIcon={<EditRounded />} onClick={() => { setEditingMenu(menu); setDialogOpen(true) }} disabled={busy} sx={{ minHeight: 42 }}>Editar</Button><IconButton aria-label={`Eliminar ${menu.name}`} color="error" onClick={() => setMenuToDelete(menu)} disabled={busy} sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 2, width: 42, height: 42 }}><DeleteOutlineRounded /></IconButton></Stack></Stack></Paper>

  const openExampleMenuEditor = ({ group, sourceDate }: ExampleMenuDisplayGroup) => {
    const activeItems = group.items.filter((item) => exampleAvailability[item.id] !== false)
    const selection = Object.fromEntries(activeItems.map((item) => [item.id, item.availableQuantity]))
    if (group.category !== 'Extra') setCreateMenuCategory(group.category)
    setCreateMenuEditGroup(group)
    setCreateMenuSelection(selection)
    setCreateMenuQuantityDrafts(Object.fromEntries(activeItems.map((item) => [item.id, String(item.availableQuantity)])))
    setCreateMenuDate(sourceDate)
    setCreateMenuDrawerOpen(true)
  }

  const toggleExampleMenuPin = (sourceDate: string, group: ExampleMenuGroup) => {
    const key = exampleMenuKey(sourceDate, group.category)
    setPinnedExampleMenus((current) => ({ ...current, [key]: !current[key] }))
  }

  const renderExampleDateGroup = ({ group, sourceDate, pinned }: ExampleMenuDisplayGroup) => {
    const activeItems = group.items.filter((item) => exampleAvailability[item.id] !== false)
    const sourceDateLabel = new Date(`${sourceDate}T12:00:00`).toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })
    return <Grid item xs={12} md={6} key={exampleMenuKey(sourceDate, group.category)}><Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2.25 }}><Stack spacing={1.25} sx={{ height: '100%' }}><Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}><Box><Stack direction="row" alignItems="center" gap={1}><Typography variant="h6" sx={{ fontWeight: 800 }}>{group.title}</Typography>{pinned && <Chip label="Menú fijo" size="small" icon={<PushPin fontSize="small" />} sx={{ fontWeight: 700 }} />}</Stack><Typography variant="body2" color="text.secondary">{sourceDate === getTodayDate() ? 'Hoy' : sourceDateLabel}</Typography></Box><Chip label={`${activeItems.length} platos`} size="small" sx={{ bgcolor: activeItems.length > 0 ? 'primary.light' : 'action.hover', color: activeItems.length > 0 ? 'primary.dark' : 'text.secondary', fontWeight: 700 }} /></Stack><Stack spacing={0.75} sx={{ flex: 1 }}>{group.items.map((item) => { const active = exampleAvailability[item.id] !== false; return <Stack key={item.id} direction="row" alignItems="center" justifyContent="flex-start" gap={1}><Box sx={{ minWidth: 0 }}><Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{item.name}</Typography><Typography variant="caption" color="text.secondary">Q{item.price} · Iniciales: {item.initialQuantity} · Disponibles: {active ? item.availableQuantity : 0}</Typography></Box></Stack> })}</Stack><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><Button variant="outlined" size="small" startIcon={<EditRounded />} onClick={() => openExampleMenuEditor({ group, sourceDate, pinned })}>Editar menú</Button><Button variant={pinned ? 'contained' : 'outlined'} size="small" startIcon={pinned ? <PushPin /> : <PushPinOutlined />} onClick={() => toggleExampleMenuPin(sourceDate, group)}>{pinned ? 'Desfijar menú' : 'Fijar menú'}</Button></Stack></Stack></Card></Grid>
  }

  const renderSelectedDateGroup = (group: typeof dateMenuCategories[number]) => {
    const items = getDailyItemsForCategory(group.category)
    return <Grid item xs={12} md={6} key={group.category}><Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2.25 }}><Stack spacing={1.25} sx={{ height: '100%' }}><Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}><Box><Typography variant="h6" sx={{ fontWeight: 800 }}>{group.title}</Typography><Typography variant="body2" color="text.secondary">{isSelectedDateToday ? 'Hoy' : selectedDateLabel}</Typography></Box><Chip label={`${items.length} platos`} size="small" sx={{ bgcolor: items.length > 0 ? 'primary.light' : 'action.hover', color: items.length > 0 ? 'primary.dark' : 'text.secondary', fontWeight: 700 }} /></Stack>{items.length > 0 ? <Stack spacing={0.75} sx={{ flex: 1 }}>{items.map((item) => { const menu = menus.find((candidate) => candidate.id === item.menuItemId); const viewItem = menu ? toViewMenu(menu) : { id: item.id, menuItemId: item.menuItemId, name: item.name, description: item.description, price: item.price, active: true, availableToday: true, availableQuantity: item.availableQuantity, remainingQuantity: item.remainingQuantity }; return <Stack key={item.id} spacing={0.5}><Stack direction="row" alignItems="center" justifyContent="flex-start" gap={1}><Box sx={{ minWidth: 0 }}><Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{item.name}</Typography><Typography variant="caption" color="text.secondary">Q{item.price} · Disponibles: {item.availableQuantity} · Quedan: {item.remainingQuantity}</Typography></Box></Stack>{menuMode !== 'view' && renderQuantityControls(viewItem)}</Stack>})}</Stack> : <Typography variant="body2" color="text.secondary" sx={{ flex: 1, py: 1 }}>No hay menú creado para esta categoría.</Typography>}<Button variant="outlined" size="small" startIcon={<EditRounded />} onClick={() => void editTodayMenu()} disabled={!dailyMenuId || busy} sx={{ alignSelf: 'flex-start' }}>Editar menú</Button></Stack></Card></Grid>
  }

  const renderMenuGroupCard = (group: typeof menuGroups[number]) => { const category: MenuCategory = group.title.includes('desayuno') ? 'Desayuno' : group.title.includes('refacción') ? 'Refacción' : 'Almuerzo'; const exampleGroup = exampleGroupsForDate.find((candidate) => candidate.category === category); const items = exampleGroup?.items ?? []; return <Grid item xs={12} md={4} key={group.title}><Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2.25 }}><Stack spacing={1.25} sx={{ height: '100%' }}><Typography variant="h6" sx={{ fontWeight: 800 }}>{group.title}</Typography><Typography variant="body2" color="text.secondary">{isSelectedDateToday ? 'Hoy' : selectedDateLabel} · {items.length} platos</Typography><Stack spacing={0.5} sx={{ flex: 1 }}>{items.length > 0 ? items.map((item) => <Stack key={item.id} direction="row" justifyContent="space-between" gap={1}><Typography variant="body2" noWrap>{item.name}</Typography><Typography variant="body2" color="text.secondary">Iniciales: {item.initialQuantity} · Disponibles: {exampleAvailability[item.id] !== false ? item.availableQuantity : 0}</Typography></Stack>) : <Typography variant="body2" color="text.secondary">No hay menú creado para esta categoría.</Typography>}</Stack><Button size="small" variant="outlined" onClick={() => exampleGroup && openExampleMenuEditor({ group: exampleGroup, sourceDate: selectedMenuDate, pinned: Boolean(pinnedExampleMenus[exampleMenuKey(selectedMenuDate, category)]) })}>Editar menú</Button></Stack></Card></Grid> }

  const renderExtraCard = (extra: Extra) => <Grid item xs={12} sm={6} lg={4} key={extra.id}><Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2.25 }}><Stack spacing={2} sx={{ height: '100%' }}><Box sx={{ flex: 1 }}><Typography variant="h6" sx={{ fontWeight: 800 }}>{extra.name}</Typography><Typography sx={{ color: 'primary.main', fontWeight: 800, mt: 0.5 }}>Q{extra.price}</Typography><Typography variant="body2" color={extra.active ? 'success.main' : 'text.secondary'} sx={{ mt: 1, fontWeight: 700 }}>{extra.active ? 'Activo' : 'Inactivo'}</Typography></Box><Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}><Switch checked={extra.active} onChange={() => void toggleExtra(extra)} disabled={busy} inputProps={{ 'aria-label': `Activo: ${extra.name}` }} /><Stack direction="row" spacing={0.75}><Button variant="outlined" startIcon={<EditRounded />} onClick={() => { setEditingExtra(extra); setExtraDialogOpen(true) }} disabled={busy} sx={{ minHeight: 44 }}>Editar</Button><IconButton aria-label={`Eliminar ${extra.name}`} color="error" onClick={() => setExtraToDelete(extra)} disabled={busy} sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 2, width: 42, height: 42 }}><DeleteOutlineRounded /></IconButton></Stack></Stack></Stack></Card></Grid>
  const renderExtraRow = (extra: Extra) => <Paper key={extra.id} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}><Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} gap={1.5}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800 }}>{extra.name}</Typography></Box><Typography sx={{ color: 'primary.main', fontWeight: 800, minWidth: 55 }}>Q{extra.price}</Typography><Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 125 }}><Switch checked={extra.active} onChange={() => void toggleExtra(extra)} disabled={busy} inputProps={{ 'aria-label': `Activo: ${extra.name}` }} /><Typography variant="body2" sx={{ fontWeight: 700 }}>{extra.active ? 'Activo' : 'Inactivo'}</Typography></Stack><Stack direction="row" spacing={0.75}><Button variant="outlined" startIcon={<EditRounded />} onClick={() => { setEditingExtra(extra); setExtraDialogOpen(true) }} disabled={busy} sx={{ minHeight: 42 }}>Editar</Button><IconButton aria-label={`Eliminar ${extra.name}`} color="error" onClick={() => setExtraToDelete(extra)} disabled={busy} sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 2, width: 42, height: 42 }}><DeleteOutlineRounded /></IconButton></Stack></Stack></Paper>

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress color="primary" /></Box>
  const firstItem = filteredMenus.length === 0 ? 0 : (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, filteredMenus.length)
  const isExtrasSection = section === 'Extras'
  const sectionTitle = section === 'Menús' ? 'Menú' : section
  const sectionDescription = section === 'Menús' ? 'Organiza los platos disponibles del comedor.' : section === 'Extras' ? 'Gestiona los extras disponibles para los pedidos.' : `Organiza los platos disponibles para ${section.toLocaleLowerCase()}.`

  return <Box component="section" aria-labelledby="menu-title">
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'flex-end' }} gap={2} sx={{ mb: section === 'Menús' ? 2 : 3 }}><Box><Typography id="menu-title" variant="h4" sx={{ fontWeight: 800, fontSize: '2rem' }}>{sectionTitle}</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>{sectionDescription}</Typography></Box><Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5}><>{section === 'Menús' && <Button variant="contained" startIcon={<AddRounded />} onClick={() => { setCreateMenuEditGroup(null); setCreateMenuDate(selectedMenuDate); setCreateMenuDrawerOpen(true) }} disabled={busy} sx={{ minHeight: 56, minWidth: { sm: 170 }, fontWeight: 800 }}>Crear menú</Button>}</><ToggleButtonGroup value={viewMode} exclusive onChange={(_, value: ViewMode | null) => value && setViewMode(value)} aria-label="Vista de platos" size="large" sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' }, bgcolor: 'background.paper' }}><ToggleButton value="cards" aria-label="Vista Tarjetas" sx={{ minWidth: 52 }}><GridView /></ToggleButton><ToggleButton value="list" aria-label="Vista Lista" sx={{ minWidth: 52 }}><ViewList /></ToggleButton></ToggleButtonGroup></Stack></Stack>
    {section !== 'Menús' && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}><TextField fullWidth value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isExtrasSection ? 'Buscar extra...' : 'Buscar plato...'} aria-label={isExtrasSection ? 'Buscar extra' : 'Buscar plato'} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded color="action" /></InputAdornment> }} />{!isExtrasSection && <Button variant="contained" startIcon={<AddRounded />} onClick={() => { setEditingMenu(null); setDialogOpen(true) }} disabled={busy} sx={{ minHeight: 56, minWidth: { sm: 170 }, fontWeight: 800 }}>Crear plato</Button>}</Stack>}
    {section === 'Menús' && <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={1.5} sx={{ mb: 3 }}><Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600 }}>Fecha consultada: {selectedDateLabel}</Typography><Stack direction="row" alignItems="center" spacing={0.75}><IconButton aria-label="Día anterior" onClick={() => moveSelectedMenuDate(-1)} disabled={loading}><ChevronLeftRounded /></IconButton><TextField type="date" value={selectedMenuDate} onChange={(event) => changeSelectedMenuDate(event.target.value)} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonthRounded fontSize="small" /></InputAdornment> }} inputProps={{ 'aria-label': 'Seleccionar fecha del menú' }} /><IconButton aria-label="Día siguiente" onClick={() => moveSelectedMenuDate(1)} disabled={loading}><ChevronRightRounded /></IconButton><Button size="small" variant="outlined" onClick={() => changeSelectedMenuDate(getTodayDate())} disabled={isSelectedDateToday || loading}>Hoy</Button></Stack></Stack>}
    {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
    {!isExtrasSection && <>{section === 'Menús' && <>{showingDateGroupedMenus ? <>
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', mb: 4 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} sx={{ mb: 2 }}><Box><Typography variant="h5" sx={{ fontWeight: 800 }}>Menús por fecha</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>{selectedDateLabel}{isSelectedDateToday ? ' · Hoy' : ''}</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}><Button size="small" variant="outlined" startIcon={<EditRounded />} onClick={() => void editTodayMenu()} disabled={busy || !dailyMenuId}>Editar menú</Button><Button size="small" variant="outlined" startIcon={<AddRounded />} onClick={() => { setNewDailyMenuDate(selectedMenuDate); setNewDailyMenuDialogOpen(true) }} disabled={busy}>Crear nuevo menú</Button></Stack></Box><Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }}><Typography sx={{ color: '#5F6272', fontWeight: 600 }}>{exampleMenuCount} menús · {exampleDishCount} platos disponibles</Typography><Typography variant="body2" sx={{ color: '#8A8E9F', fontWeight: 400 }}>Datos de ejemplo · Todos los cambios guardados</Typography></Stack></Stack>{exampleMenuCount > 0 ? <Grid container spacing={1.5}>{displayExampleGroupsForDate.map(renderExampleDateGroup)}</Grid> : <Stack alignItems="center" spacing={1.5} sx={{ py: 3 }}><Typography color="text.secondary">No hay menús creados para esta fecha</Typography><Button variant="outlined" onClick={() => { setCreateMenuEditGroup(null); setCreateMenuDate(selectedMenuDate); setCreateMenuDrawerOpen(true) }}>Crear menú para esta fecha</Button></Stack>}</Paper>
    </> : <>
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', mb: 4 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} sx={{ mb: 2 }}><Box><Typography variant="h5" sx={{ fontWeight: 800 }}>Menú del día</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>Activa las opciones y define sus platos disponibles.</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}><Button size="small" variant="outlined" startIcon={<EditRounded />} onClick={() => void editTodayMenu()} disabled={busy || !dailyMenuId} sx={{ display: menuMode === 'view' ? 'inline-flex' : 'none' }}>Editar menú de hoy</Button><Button size="small" variant="outlined" startIcon={<AddRounded />} onClick={() => { setNewDailyMenuDate(getTodayDate()); setNewDailyMenuDialogOpen(true) }} disabled={busy}>Crear nuevo menú</Button></Stack></Box><Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }}><Typography sx={{ color: '#5F6272', fontWeight: 600 }}>Menú activo · {dailyItems.length} platos</Typography>{dailyMenuId && dailyUpdatedAt ? <Typography variant="body2" sx={{ color: '#8A8E9F', fontWeight: 400 }}>Actualizado: {formatUpdatedAt(dailyUpdatedAt)}</Typography> : <Typography variant="body2" sx={{ color: '#8A8E9F', fontWeight: 400 }}>Aún no ha sido guardado.</Typography>}</Stack></Stack>{activeMenus.length > 0 ? viewMode === 'cards' ? <Grid container spacing={1.5}>{activeMenus.map(renderDayCard)}</Grid> : <Stack spacing={1}>{activeMenus.map(renderDayRow)}</Stack> : <Box sx={{ py: 3, textAlign: 'center' }}><Typography color="text.secondary">{filteredMenus.length === 0 ? 'No se encontraron platos.' : 'No hay menús activos hoy.'}</Typography>{filteredMenus.length > 0 && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Agrega opciones desde Platos disponibles.</Typography>}</Box>}{menuMode !== 'view' && <Stack direction="row" spacing={1} sx={{ mt: 2.5 }}><Button variant="contained" onClick={requestDailyMenuSave} disabled={busy || !dailyMenuDirty} sx={{ minHeight: 48, fontWeight: 800 }}>{menuMode === 'edit' ? 'Guardar cambios' : 'Guardar menú del día'}</Button>{menuMode === 'edit' && <Button variant="outlined" color="inherit" onClick={cancelDailyMenuEdit} disabled={busy} sx={{ minHeight: 48 }}>Cancelar edición</Button>}</Stack>}</Paper>
    </>}</>}{section !== 'Menús' && <>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} sx={{ mb: 2 }}><Typography variant="h5" sx={{ fontWeight: 800 }}>Platos disponibles</Typography><Typography variant="body2" color="text.secondary">{filteredMenus.length === 0 ? 'No se encontraron platos.' : `Mostrando ${firstItem}–${lastItem} de ${filteredMenus.length} platos`}</Typography></Stack>
      {filteredMenus.length > 0 ? viewMode === 'cards' ? <Grid container spacing={1.5}>{paginatedMenus.map((menu) => renderCatalogCard(toViewMenu(menu)))}</Grid> : <Stack spacing={1}>{paginatedMenus.map((menu) => renderCatalogRow(toViewMenu(menu)))}</Stack> : <Typography color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>No se encontraron platos.</Typography>}
      {filteredMenus.length > 0 && <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mt: 3 }}><Pagination count={pageCount} page={page} onChange={(_, nextPage) => setPage(nextPage)} siblingCount={0} boundaryCount={1} color="primary" shape="rounded" /></Stack>}
    </>}
    </>}
    {isExtrasSection && <>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} sx={{ mt: 4, mb: 2 }}><Box><Typography variant="h5" sx={{ fontWeight: 800 }}>Extras</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Gestiona los extras disponibles para los pedidos.</Typography></Box><Stack direction="row" alignItems="center" gap={2}><Typography variant="body2" color="text.secondary">{filteredExtras.length === 0 ? 'No se encontraron extras.' : `Mostrando ${(extrasPage - 1) * pageSize + 1}–${Math.min(extrasPage * pageSize, filteredExtras.length)} de ${filteredExtras.length} extras`}</Typography><Button variant="contained" startIcon={<AddRounded />} onClick={() => { setEditingExtra(null); setExtraDialogOpen(true) }} disabled={busy} sx={{ minHeight: 48, fontWeight: 800 }}>Crear extra</Button></Stack></Stack>
    {filteredExtras.length > 0 ? viewMode === 'cards' ? <Grid container spacing={1.5}>{paginatedExtras.map(renderExtraCard)}</Grid> : <Stack spacing={1}>{paginatedExtras.map(renderExtraRow)}</Stack> : <Typography color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>No se encontraron extras.</Typography>}
    {filteredExtras.length > 0 && <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}><Pagination count={extrasPageCount} page={extrasPage} onChange={(_, nextPage) => setExtrasPage(nextPage)} siblingCount={0} boundaryCount={1} color="primary" shape="rounded" /></Stack>}
    </>}
    <Snackbar open={Boolean(message)} autoHideDuration={4000} onClose={() => setMessage('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} sx={{ maxWidth: 'calc(100vw - 32px)' }}><Alert severity="success" onClose={() => setMessage('')} sx={{ width: '100%' }}>{message}</Alert></Snackbar>
    <MenuDialog open={dialogOpen} menu={editingMenu} initialCategory={editingMenu ? getMenuCategory(editingMenu) : 'Almuerzo'} onClose={() => setDialogOpen(false)} onSave={handleSave} />
    <ExtraDialog open={extraDialogOpen} extra={editingExtra} onClose={() => setExtraDialogOpen(false)} onSave={handleSaveExtra} />
    <Dialog open={replaceDialogOpen} onClose={() => setReplaceDialogOpen(false)} fullWidth maxWidth="xs"><DialogTitle sx={{ fontWeight: 800 }}>Reemplazar menú del día</DialogTitle><DialogContent><Typography color="text.secondary">Ya existe un menú guardado para hoy. Al continuar se reemplazarán las opciones y cantidades actuales.</Typography></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={() => setReplaceDialogOpen(false)} variant="outlined">Cancelar</Button><Button onClick={() => { setReplaceDialogOpen(false); void saveCurrentDailyMenu(true) }} variant="contained">Reemplazar menú</Button></DialogActions></Dialog>
    <Dialog open={newDailyMenuDialogOpen} onClose={() => setNewDailyMenuDialogOpen(false)} fullWidth maxWidth="xs"><DialogTitle sx={{ fontWeight: 800 }}>Crear nuevo menú</DialogTitle><DialogContent><Typography color="text.secondary" sx={{ mb: 2 }}>Selecciona la fecha del nuevo menú. Si ya existe uno para esa fecha, se solicitará confirmación para reemplazarlo.</Typography><TextField fullWidth type="date" label="Fecha" value={newDailyMenuDate} onChange={(event) => setNewDailyMenuDate(event.target.value)} InputLabelProps={{ shrink: true }} /></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={() => setNewDailyMenuDialogOpen(false)} variant="outlined">Cancelar</Button><Button onClick={() => void startNewDailyMenu()} variant="contained" disabled={!newDailyMenuDate || busy}>Continuar</Button></DialogActions></Dialog>
    <Dialog open={resetDailyMenuDialogOpen} onClose={() => setResetDailyMenuDialogOpen(false)} fullWidth maxWidth="sm"><DialogTitle sx={{ fontWeight: 800 }}>Crear nuevo menú</DialogTitle><DialogContent><Typography color="text.secondary">Se eliminará permanentemente el menú del día actualmente registrado, incluyendo todos sus datos asociados. Luego se creará un nuevo menú con todos los valores reiniciados a 0.</Typography><Typography color="error.main" sx={{ mt: 2, fontWeight: 700 }}>Esta acción no se puede deshacer ni recuperar.</Typography></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={() => setResetDailyMenuDialogOpen(false)} variant="outlined">Cancelar</Button><Button onClick={() => void confirmResetDailyMenu()} variant="contained" color="error" disabled={busy}>Eliminar y crear nuevo menú</Button></DialogActions></Dialog>
    <Dialog open={Boolean(menuToDelete)} onClose={() => setMenuToDelete(null)} fullWidth maxWidth="xs"><DialogTitle sx={{ fontWeight: 800 }}>¿Deseas eliminar este plato?</DialogTitle><DialogContent><Typography color="text.secondary">{menuToDelete?.name} dejará de estar disponible en el catálogo.</Typography></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={() => setMenuToDelete(null)} variant="outlined">Cancelar</Button><Button onClick={() => void handleDelete()} variant="contained" color="error">Eliminar</Button></DialogActions></Dialog>
    <Dialog open={Boolean(extraToDelete)} onClose={() => setExtraToDelete(null)} fullWidth maxWidth="xs"><DialogTitle sx={{ fontWeight: 800 }}>¿Deseas eliminar este extra?</DialogTitle><DialogContent><Typography color="text.secondary">{extraToDelete?.name} dejará de estar disponible para los pedidos.</Typography></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={() => setExtraToDelete(null)} variant="outlined">Cancelar</Button><Button onClick={() => void handleDeleteExtra()} variant="contained" color="error">Eliminar</Button></DialogActions></Dialog>
    <Drawer anchor="right" open={createMenuDrawerOpen} onClose={closeCreateMenuDrawer} PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, maxWidth: '100%', bgcolor: 'background.paper', borderRadius: { xs: 0, sm: '20px 0 0 20px' } } }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: { xs: 2.5, sm: 3 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>{createMenuEditGroup ? `Editar menú de ${createMenuEditGroup.title.toLocaleLowerCase()}` : 'Crear menú'}</Typography>
          <IconButton aria-label="Cerrar crear menú" onClick={closeCreateMenuDrawer}><CloseRounded /></IconButton>
        </Stack>
        <Stack spacing={2} sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <Box>
            <Typography component="label" htmlFor="menu-date-picker" variant="body1" sx={{ display: 'block', mb: 1, fontWeight: 600, lineHeight: 1.4 }}>Fecha</Typography>
            <Box sx={{ position: 'relative', minHeight: 56 }}>
              <TextField fullWidth value={formatMenuDate(createMenuDate)} InputProps={{ readOnly: true, endAdornment: <InputAdornment position="end"><CalendarMonthRounded color="action" /></InputAdornment> }} />
              <Box component="input" id="menu-date-picker" type="date" value={createMenuDate} onChange={(event) => setCreateMenuDate(event.target.value)} aria-label="Seleccionar fecha del menú" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
            </Box>
          </Box>
          {!createMenuEditGroup && <TextField fullWidth select label="Categoría" value={createMenuCategory} onChange={(event) => { setCreateMenuCategory(event.target.value as CreateMenuCategory); setCreateMenuSelection({}); setCreateMenuQuantityDrafts({}) }}>
            {(['Desayuno', 'Refacción', 'Almuerzo'] as CreateMenuCategory[]).map((category) => <SelectOption key={category} value={category}>{category}</SelectOption>)}
          </TextField>}
          <Divider />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Platos disponibles</Typography>
          <Stack spacing={1}>
            {createMenuDrawerDishes.map((dish) => {
              const selected = Boolean(createMenuSelection[dish.id])
              return <Paper key={dish.id} elevation={0} sx={{ p: 1.25, border: '1px solid', borderColor: selected ? 'primary.light' : 'divider', borderRadius: 2 }}>
                <Stack direction="row" alignItems="flex-start" spacing={1}>
                  <Checkbox checked={selected} onChange={() => toggleCreateMenuDish(dish.id)} sx={{ p: 0.5, mt: -0.25 }} inputProps={{ 'aria-label': `Seleccionar ${dish.name}` }} />
                  <Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 700 }}>{dish.name}</Typography><Typography variant="body2" color="text.secondary">Q{dish.price}</Typography></Box>
                </Stack>
                {selected && <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1, pl: 5 }}><Typography variant="body2" color="text.secondary">Cantidad disponible</Typography><Stack direction="row" alignItems="center"><IconButton size="small" aria-label={`Disminuir ${dish.name}`} onClick={() => changeCreateMenuQuantity(dish.id, -1)}><RemoveRounded fontSize="small" /></IconButton><TextField aria-label={`Cantidad disponible de ${dish.name}`} value={createMenuQuantityDrafts[dish.id] ?? String(createMenuSelection[dish.id])} onChange={(event) => changeCreateMenuQuantityFromInput(dish.id, event.target.value)} onBlur={() => finishCreateMenuQuantityInput(dish.id)} size="small" inputMode="numeric" inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }} sx={{ width: 58, '& .MuiOutlinedInput-root': { height: 32, borderRadius: 1.5 }, '& input': { p: 0.25, textAlign: 'center', fontWeight: 700 }, '& input[type=number]': { MozAppearance: 'textfield' }, '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } }} /><IconButton size="small" aria-label={`Aumentar ${dish.name}`} onClick={() => changeCreateMenuQuantity(dish.id, 1)}><AddRounded fontSize="small" /></IconButton></Stack></Stack>}
              </Paper>
            })}
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ pt: 2.5 }}>
          <Button variant="outlined" onClick={closeCreateMenuDrawer}>Cancelar</Button>
          <Button variant="contained" onClick={createMenuLocally}>{createMenuEditGroup ? 'Guardar cambios' : 'Crear menú'}</Button>
        </Stack>
      </Box>
    </Drawer>
  </Box>
}
