import { useEffect, useMemo, useState } from 'react'
import { AddRounded, CalendarMonthRounded, ChevronLeftRounded, ChevronRightRounded, CloseRounded, DeleteOutlineRounded, EditRounded, GridView, PushPinOutlined, RemoveRounded, SearchRounded, ViewList } from '@mui/icons-material'
import { Alert, Box, Button, Card, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, Grid, IconButton, InputAdornment, Pagination, Paper, Snackbar, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { createExtra, deleteExtra, getExtras, updateExtra } from '../services/extraService'
import { createDailyMenu, getDailyMenu, getTodayDate, resetDailyMenu, saveDailyMenu, setDailyMenuPin } from '../services/dailyMenuService'
import { createMenuItem, deleteMenuItem, getMenuItems, updateMenuItem } from '../services/menuService'
import { DailyMenuItem, Extra, MenuCategory, MenuItem, MenuItemCategory } from '../types/menu'
import { ExtraDialog } from './ExtraDialog'
import { MenuDialog } from './MenuDialog'
import type { MenuSection } from './MenuSidebar'

type ViewMode = 'cards' | 'list'
type MenuViewItem = MenuItem & { availableToday: boolean; availableQuantity: number; remainingQuantity: number }

const dateMenuCategories: Array<{ title: string; category: MenuCategory }> = [
  { title: 'Desayunos', category: 'Desayuno' },
  { title: 'Refacciones', category: 'Refacción' },
  { title: 'Almuerzos', category: 'Almuerzo' },
  { title: 'Extras', category: 'Extra' },
]

type CatalogDishCategory = Exclude<MenuCategory, 'Extra'>
type DishCategory = Exclude<CatalogDishCategory, 'Cena'>
const menuCategoryLabels: Record<MenuItemCategory, CatalogDishCategory> = { BREAKFAST: 'Desayuno', SNACK: 'Refacción', LUNCH: 'Almuerzo', DINNER: 'Cena' }
const menuCategoryValues: Record<DishCategory, MenuItemCategory> = { Desayuno: 'BREAKFAST', Refacción: 'SNACK', Almuerzo: 'LUNCH' }

function getMenuCategoryLabel(menu: MenuItem): CatalogDishCategory | null {
  return menu.category ? menuCategoryLabels[menu.category] : null
}

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })
}

function updateMenu(items: MenuItem[], id: string, changes: Partial<MenuItem>) {
  return items.map((item) => item.id === id ? { ...item, ...changes } : item)
}

type MenuManagementViewProps = { section?: MenuSection }

export function MenuManagementView({ section = 'Menús' }: MenuManagementViewProps) {
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [extras, setExtras] = useState<Extra[]>([])
  const [dailyItems, setDailyItems] = useState<DailyMenuItem[]>([])
  const [selectedMenuDate, setSelectedMenuDate] = useState(getTodayDate)
  const [dailyDate, setDailyDate] = useState(getTodayDate)
  const [dailyMenuId, setDailyMenuId] = useState<string | null>(null)
  const [dailyUpdatedAt, setDailyUpdatedAt] = useState<string | null>(null)
  const [dailyMenuEditorOpen, setDailyMenuEditorOpen] = useState(false)
  const [dailyMenuEditorCategory, setDailyMenuEditorCategory] = useState<DishCategory | null>(null)
  const [dailyMenuEditorId, setDailyMenuEditorId] = useState<string | null>(null)
  const [dailyMenuEditorSourceId, setDailyMenuEditorSourceId] = useState<string | null>(null)
  const [dailyMenuEditorKeepsPinned, setDailyMenuEditorKeepsPinned] = useState(false)
  const [dailyMenuEditorDate, setDailyMenuEditorDate] = useState(getTodayDate)
  const [dailyMenuEditorSelection, setDailyMenuEditorSelection] = useState<Record<string, number>>({})
  const [dailyMenuEditorQuantityDrafts, setDailyMenuEditorQuantityDrafts] = useState<Record<string, string>>({})
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [extrasPage, setExtrasPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newDailyMenuDialogOpen, setNewDailyMenuDialogOpen] = useState(false)
  const [resetDailyMenuDialogOpen, setResetDailyMenuDialogOpen] = useState(false)
  const [newDailyMenuDate, setNewDailyMenuDate] = useState(getTodayDate)
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
      const [menuItems, extraItems, dailyMenu] = await Promise.all([getMenuItems(), getExtras(), getDailyMenu(selectedMenuDate, true)])
      setMenus(menuItems)
      setExtras(extraItems)
      setDailyItems(dailyMenu.items)
      setDailyDate(dailyMenu.date)
      setDailyMenuId(dailyMenu.id)
      setDailyUpdatedAt(dailyMenu.updatedAt)
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
      const dailyMenu = await getDailyMenu(date, true)
      setDailyItems(dailyMenu.items)
      setDailyDate(dailyMenu.date)
      setDailyMenuId(dailyMenu.id)
      setDailyUpdatedAt(dailyMenu.updatedAt)
      setDailyMenuEditorOpen(false)
      setDailyMenuEditorCategory(null)
      setDailyMenuEditorId(null)
      setDailyMenuEditorSourceId(null)
      setDailyMenuEditorKeepsPinned(false)
      setDailyMenuEditorDate(dailyMenu.date)
      setDailyMenuEditorSelection({})
      setDailyMenuEditorQuantityDrafts({})
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el menú de la fecha seleccionada')
    } finally {
      setLoading(false)
    }
  }

  const changeSelectedMenuDate = (date: string) => {
    setSelectedMenuDate(date)
    setDailyItems([])
    setDailyMenuId(null)
    setDailyUpdatedAt(null)
    setDailyDate(date)
    void loadDailyMenuByDate(date)
  }

  const moveSelectedMenuDate = (days: number) => {
    const nextDate = new Date(`${selectedMenuDate}T12:00:00`)
    nextDate.setDate(nextDate.getDate() + days)
    changeSelectedMenuDate(nextDate.toISOString().slice(0, 10))
  }

  const getMenuCategory = (menu: MenuItem) => getMenuCategoryLabel(menu)
  const sectionCategory: Record<string, MenuCategory> = { Desayunos: 'Desayuno', Refacciones: 'Refacción', Almuerzos: 'Almuerzo' }
  const sectionMenus = useMemo(() => section === 'Menús' || section === 'Extras' ? menus : menus.filter((menu) => getMenuCategory(menu) === sectionCategory[section]), [menus, section])
  const filteredMenus = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return query ? sectionMenus.filter((menu) => `${menu.name} ${menu.description}`.toLocaleLowerCase().includes(query)) : sectionMenus
  }, [sectionMenus, search])
  const filteredExtras = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    const source = extras
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
    return getMenuCategory(menu ?? { id: item.menuItemId, name: item.name, description: '', price: item.price, category: null, active: true }) === category
  })
  const getDailyMenuGroupsForCategory = (category: MenuCategory) => {
    const items = getDailyItemsForCategory(category)
    const grouped = new Map<string, DailyMenuItem[]>()
    items.forEach((item) => {
      const sourceId = item.sourceDailyMenuId ?? dailyMenuId ?? `unpersisted-${category}`
      grouped.set(sourceId, [...(grouped.get(sourceId) ?? []), item])
    })
    return [...grouped.entries()].map(([sourceId, sourceItems]) => ({ sourceId, sourceItems }))
  }
  const dateMenuCount = dateMenuCategories.reduce((total, group) => total + getDailyMenuGroupsForCategory(group.category).length, 0)
  const selectedDateLabel = new Date(`${selectedMenuDate}T12:00:00`).toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })
  const todayBusinessDate = getTodayDate()
  const isSelectedDateToday = selectedMenuDate === todayBusinessDate
  const isSelectedDatePast = selectedMenuDate < todayBusinessDate
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

  const handleSave = async (menu: { id?: string; name: string; description: string; price: number; category?: DishCategory; active: boolean }) => {
    await runAction(async () => {
      const { category, ...menuInput } = menu
      if (menu.id) {
        const saved = await updateMenuItem(menu.id, { ...menuInput, ...(category ? { category: menuCategoryValues[category] } : {}) })
        setMenus((current) => updateMenu(current, saved.id, saved))
      } else {
        if (!category) throw new Error('Selecciona una categoría.')
        const saved = await createMenuItem({ ...menuInput, category: menuCategoryValues[category] })
        setMenus((current) => [...current, saved])
      }
      setDialogOpen(false)
    }, menu.id ? 'Plato actualizado.' : 'Plato creado.')
  }

  const handleDelete = async () => {
    if (!menuToDelete) return
    const menu = menuToDelete
    await runAction(async () => { const deleted = await deleteMenuItem(menu.id); setMenus((current) => updateMenu(current, menu.id, deleted)); setDailyItems((current) => current.filter((item) => item.menuItemId !== menu.id)); setMenuToDelete(null) }, 'Plato eliminado.')
  }

  const openDailyMenuEditor = (category: DishCategory, sourceId?: string, sourceDate?: string) => {
    if (selectedMenuDate < getTodayDate()) {
      setError('Los menús de fechas pasadas solo se pueden consultar.')
      return
    }
    const categoryItems = getDailyItemsForCategory(category).filter((item) => !sourceId || item.sourceDailyMenuId === sourceId)
    const selection = Object.fromEntries(categoryItems.map((item) => [item.menuItemId, item.availableQuantity]))
    const editingFixedFromFuture = Boolean(sourceDate && sourceDate < selectedMenuDate)
    const targetId = editingFixedFromFuture ? dailyMenuId : sourceId ?? dailyMenuId
    const targetDate = editingFixedFromFuture ? selectedMenuDate : sourceDate ?? selectedMenuDate
    setDailyMenuEditorCategory(category)
    setDailyMenuEditorId(targetId)
    setDailyMenuEditorSourceId(sourceId ?? targetId)
    setDailyMenuEditorKeepsPinned(editingFixedFromFuture && categoryItems.some((item) => item.pinned))
    setDailyMenuEditorDate(targetDate)
    setDailyMenuEditorSelection(selection)
    setDailyMenuEditorQuantityDrafts({})
    setDailyMenuEditorOpen(true)
  }

  const closeDailyMenuEditor = () => {
    setDailyMenuEditorOpen(false)
    setDailyMenuEditorCategory(null)
    setDailyMenuEditorId(null)
    setDailyMenuEditorSourceId(null)
    setDailyMenuEditorKeepsPinned(false)
    setDailyMenuEditorDate(getTodayDate())
    setDailyMenuEditorSelection({})
    setDailyMenuEditorQuantityDrafts({})
  }

  const editorDishes = dailyMenuEditorCategory
    ? menus.filter((menu) => menu.active && getMenuCategory(menu) === dailyMenuEditorCategory)
    : []
  const editorHasExistingItems = dailyMenuEditorCategory ? getDailyItemsForCategory(dailyMenuEditorCategory).length > 0 : false

  const toggleEditorDish = (menuItemId: string) => {
    setDailyMenuEditorSelection((current) => {
      if (current[menuItemId] !== undefined) {
        const next = { ...current }
        delete next[menuItemId]
        return next
      }
      return { ...current, [menuItemId]: 1 }
    })
  }

  const changeEditorQuantity = (menuItemId: string, amount: number) => {
    setDailyMenuEditorSelection((current) => ({ ...current, [menuItemId]: Math.max(1, (current[menuItemId] ?? 1) + amount) }))
    setDailyMenuEditorQuantityDrafts((current) => { const next = { ...current }; delete next[menuItemId]; return next })
  }

  const changeEditorQuantityInput = (menuItemId: string, value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '')
    setDailyMenuEditorQuantityDrafts((current) => ({ ...current, [menuItemId]: sanitized }))
    if (sanitized !== '') setDailyMenuEditorSelection((current) => ({ ...current, [menuItemId]: Math.max(1, Number.parseInt(sanitized, 10)) }))
  }

  const finishEditorQuantityInput = (menuItemId: string) => {
    const draft = dailyMenuEditorQuantityDrafts[menuItemId]
    if (draft === undefined || draft !== '') return
    setDailyMenuEditorSelection((current) => ({ ...current, [menuItemId]: 1 }))
    setDailyMenuEditorQuantityDrafts((current) => { const next = { ...current }; delete next[menuItemId]; return next })
  }

  const saveDailyMenuEditor = () => {
    const editorCategory = dailyMenuEditorCategory
    if (!editorCategory || busy) return
    if (dailyMenuEditorDate < getTodayDate()) {
      setError('No se pueden editar menús para fechas pasadas.')
      return
    }
    const selectedItems = Object.entries(dailyMenuEditorSelection).map(([menuItemId, availableQuantity]) => ({ menuItemId, availableQuantity }))
    const invalidItem = selectedItems.find((item) => item.availableQuantity <= 0)
    if (invalidItem) {
      const invalidMenu = editorDishes.find((menu) => menu.id === invalidItem.menuItemId)
      setError(`Las cantidades deben ser mayores a 0${invalidMenu ? `: ${invalidMenu.name}` : '.'}`)
      return
    }
    if (!dailyMenuId && selectedItems.length === 0) {
      setError('Selecciona al menos un plato para crear el menú.')
      return
    }
    const categoryIds = new Set(editorDishes.map((menu) => menu.id))
    const unchangedItems = dailyItems.filter((item) => item.sourceDailyMenuId === dailyMenuEditorId && !categoryIds.has(item.menuItemId)).map(({ menuItemId, availableQuantity }) => ({ menuItemId, availableQuantity }))
    const payload = [...unchangedItems, ...selectedItems]
    void runAction(async () => {
      const saved = dailyMenuEditorId
        ? await saveDailyMenu(dailyMenuEditorDate, payload, dailyMenuEditorId)
        : await createDailyMenu(dailyMenuEditorDate, payload)
      if (dailyMenuEditorKeepsPinned && dailyMenuEditorSourceId && saved.id && dailyMenuEditorSourceId !== saved.id) {
        await setDailyMenuPin(dailyMenuEditorSourceId, menuCategoryValues[editorCategory], false)
        await setDailyMenuPin(saved.id, menuCategoryValues[editorCategory], true)
      }
      const refreshed = await getDailyMenu(selectedMenuDate, true)
      setDailyItems(refreshed.items)
      setSelectedMenuDate(refreshed.date)
      setDailyDate(refreshed.date)
      setDailyMenuId(refreshed.id)
      setDailyUpdatedAt(refreshed.updatedAt)
      closeDailyMenuEditor()
    }, dailyMenuId ? 'Menú actualizado correctamente.' : 'Menú creado correctamente.')
  }

  const startNewDailyMenu = async () => {
    if (newDailyMenuDate < getTodayDate()) {
      setError('No se pueden crear menús para fechas pasadas.')
      return
    }
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
    setResetDailyMenuDialogOpen(false)
  }, 'Nuevo menú creado correctamente.')

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

  const toggleDailyMenuPin = (sourceId: string, category: DishCategory, pinned: boolean) => runAction(async () => {
    await setDailyMenuPin(sourceId, menuCategoryValues[category], pinned)
    const refreshed = await getDailyMenu(selectedMenuDate, true)
    setDailyItems(refreshed.items)
    setDailyDate(refreshed.date)
    setDailyMenuId(refreshed.id)
    setDailyUpdatedAt(refreshed.updatedAt)
  }, pinned ? 'Menú fijado correctamente.' : 'Menú desfijado correctamente.')

  const renderCatalogCard = (menu: MenuViewItem) => <Grid item xs={12} sm={6} lg={4} key={menu.id}><Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2.25 }}><Stack spacing={2} sx={{ height: '100%' }}><Box sx={{ flex: 1 }}><Typography variant="h6" sx={{ fontWeight: 800 }}>{menu.name}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{menu.description}</Typography><Typography sx={{ color: 'primary.main', fontWeight: 800, mt: 1 }}>Q{menu.price}</Typography></Box><Stack direction="row" spacing={1}><Button fullWidth variant="outlined" startIcon={<EditRounded />} onClick={() => { setEditingMenu(menu); setDialogOpen(true) }} disabled={busy} sx={{ minHeight: 44 }}>Editar</Button><Button fullWidth variant="outlined" color="error" startIcon={<DeleteOutlineRounded />} onClick={() => setMenuToDelete(menu)} disabled={busy} sx={{ minHeight: 44 }}>Eliminar</Button></Stack></Stack></Card></Grid>
  const renderCatalogRow = (menu: MenuViewItem) => <Paper key={menu.id} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}><Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} gap={1.5}><Box sx={{ flex: 1, minWidth: 0 }}><Typography sx={{ fontWeight: 800 }}>{menu.name}</Typography><Typography variant="body2" color="text.secondary" noWrap>{menu.description}</Typography></Box><Typography sx={{ color: 'primary.main', fontWeight: 800, minWidth: 55 }}>Q{menu.price}</Typography><Stack direction="row" spacing={0.75}><Button variant="outlined" startIcon={<EditRounded />} onClick={() => { setEditingMenu(menu); setDialogOpen(true) }} disabled={busy} sx={{ minHeight: 42 }}>Editar</Button><IconButton aria-label={`Eliminar ${menu.name}`} color="error" onClick={() => setMenuToDelete(menu)} disabled={busy} sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 2, width: 42, height: 42 }}><DeleteOutlineRounded /></IconButton></Stack></Stack></Paper>

  const renderSelectedDateGroup = (group: typeof dateMenuCategories[number]) => {
    const availableDishes = group.category === 'Extra' ? [] : menus.filter((menu) => menu.active && getMenuCategory(menu) === group.category)
    const groups = getDailyMenuGroupsForCategory(group.category)
    if (groups.length === 0) {
      const canCreate = !isSelectedDatePast && group.category !== 'Extra' && availableDishes.length > 0
      return <Grid item xs={12} md={6} key={group.category}><Card elevation={0} sx={{ height: 340, minHeight: 340, maxHeight: 340, display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2.25 }}><Stack spacing={1.25} sx={{ flex: 1, minHeight: 0 }}><Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}><Box><Typography variant="h6" sx={{ fontWeight: 800 }}>{group.title}</Typography><Typography variant="body2" color="text.secondary">{isSelectedDateToday ? 'Hoy' : selectedDateLabel}</Typography></Box><Chip label="0 platos" size="small" sx={{ bgcolor: 'action.hover', color: 'text.secondary', fontWeight: 700 }} /></Stack><Divider sx={{ my: 2, borderColor: '#E5E7F0' }} /><Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}><Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{group.category === 'Extra' ? 'Los extras se gestionan desde su sección.' : availableDishes.length === 0 ? 'No hay platos registrados en esta categoría.' : 'No hay menú creado para esta fecha.'}</Typography>{isSelectedDatePast && <Typography variant="caption" color="text.secondary">Los menús de fechas pasadas solo se pueden consultar.</Typography>}</Box><Button variant="outlined" size="small" startIcon={<AddRounded />} onClick={() => openDailyMenuEditor(group.category as DishCategory)} disabled={!canCreate || busy} sx={{ alignSelf: 'flex-end', flexShrink: 0 }}>Crear menú</Button></Stack></Card></Grid>
    }
    return groups.map(({ sourceId, sourceItems }) => {
      const pinned = sourceItems.length > 0 && sourceItems.every((item) => item.pinned)
      const sourceDate = sourceItems[0].sourceDate ?? selectedMenuDate
      return <Grid item xs={12} md={6} key={`${group.category}-${sourceId}`}><Card elevation={0} sx={{ height: 340, minHeight: 340, maxHeight: 340, display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2.25 }}><Stack spacing={1.25} sx={{ flex: 1, minHeight: 0 }}><Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}><Box><Typography variant="h6" sx={{ fontWeight: 800 }}>{group.title}</Typography><Typography variant="body2" color="text.secondary">{sourceDate === getTodayDate() ? 'Hoy' : sourceDate}</Typography></Box><Stack direction="row" alignItems="center" gap={0.75}><Chip label={`${sourceItems.length} platos`} size="small" sx={{ bgcolor: 'primary.light', color: 'primary.dark', fontWeight: 700 }} />{pinned && <Chip label="Menú fijo" size="small" icon={<PushPinOutlined />} sx={{ bgcolor: '#EEF0FA', color: 'primary.dark', fontWeight: 700 }} />}</Stack></Stack><Divider sx={{ my: 2, borderColor: '#E5E7F0' }} /><Stack spacing={0.75} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>{sourceItems.map((item) => <Stack key={item.id} spacing={0.5}><Typography variant="body2" sx={{ fontWeight: 700, fontSize: 'calc(1em + 1px)' }} noWrap>{item.name}</Typography><Typography variant="caption" color="text.secondary" sx={{ fontSize: 'calc(1em + 1px)' }}>Q{item.price} · Disponibles: {item.availableQuantity} · Quedan: {item.remainingQuantity}</Typography></Stack>)}</Stack>{isSelectedDatePast && <Typography variant="caption" color="text.secondary">Los menús de fechas pasadas solo se pueden consultar.</Typography>}<Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1} sx={{ flexShrink: 0, width: '100%' }}><Button variant="outlined" size="small" startIcon={<EditRounded />} onClick={() => openDailyMenuEditor(group.category as DishCategory, sourceId, sourceDate)} disabled={busy || isSelectedDatePast}>Editar menú</Button><Button variant="outlined" size="small" startIcon={<PushPinOutlined />} onClick={() => void toggleDailyMenuPin(sourceId, group.category as DishCategory, !pinned)} disabled={busy}>{pinned ? 'Desfijar menú' : 'Fijar menú'}</Button></Stack></Stack></Card></Grid>
      })
  }

  const renderExtraCard = (extra: Extra) => <Grid item xs={12} sm={6} lg={4} key={extra.id}><Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2.25 }}><Stack spacing={2} sx={{ height: '100%' }}><Box sx={{ flex: 1 }}><Typography variant="h6" sx={{ fontWeight: 800 }}>{extra.name}</Typography><Typography sx={{ color: 'primary.main', fontWeight: 800, mt: 0.5 }}>Q{extra.price}</Typography><Typography variant="body2" color={extra.active ? 'success.main' : 'text.secondary'} sx={{ mt: 1, fontWeight: 700 }}>{extra.active ? 'Activo' : 'Inactivo'}</Typography></Box><Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}><Switch checked={extra.active} onChange={() => void toggleExtra(extra)} disabled={busy} inputProps={{ 'aria-label': `Activo: ${extra.name}` }} /><Stack direction="row" spacing={0.75}><Button variant="outlined" startIcon={<EditRounded />} onClick={() => { setEditingExtra(extra); setExtraDialogOpen(true) }} disabled={busy} sx={{ minHeight: 44 }}>Editar</Button><IconButton aria-label={`Eliminar ${extra.name}`} color="error" onClick={() => setExtraToDelete(extra)} disabled={busy} sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 2, width: 42, height: 42 }}><DeleteOutlineRounded /></IconButton></Stack></Stack></Stack></Card></Grid>
  const renderExtraRow = (extra: Extra) => <Paper key={extra.id} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}><Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} gap={1.5}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800 }}>{extra.name}</Typography></Box><Typography sx={{ color: 'primary.main', fontWeight: 800, minWidth: 55 }}>Q{extra.price}</Typography><Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 125 }}><Switch checked={extra.active} onChange={() => void toggleExtra(extra)} disabled={busy} inputProps={{ 'aria-label': `Activo: ${extra.name}` }} /><Typography variant="body2" sx={{ fontWeight: 700 }}>{extra.active ? 'Activo' : 'Inactivo'}</Typography></Stack><Stack direction="row" spacing={0.75}><Button variant="outlined" startIcon={<EditRounded />} onClick={() => { setEditingExtra(extra); setExtraDialogOpen(true) }} disabled={busy} sx={{ minHeight: 42 }}>Editar</Button><IconButton aria-label={`Eliminar ${extra.name}`} color="error" onClick={() => setExtraToDelete(extra)} disabled={busy} sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 2, width: 42, height: 42 }}><DeleteOutlineRounded /></IconButton></Stack></Stack></Paper>

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress color="primary" /></Box>
  const firstItem = filteredMenus.length === 0 ? 0 : (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, filteredMenus.length)
  const isExtrasSection = section === 'Extras'
  const sectionTitle = section === 'Menús' ? 'Menú' : section
  const sectionDescription = section === 'Menús' ? 'Organiza los platos disponibles del comedor.' : section === 'Extras' ? 'Gestiona los extras disponibles para los pedidos.' : `Organiza los platos disponibles para ${section.toLocaleLowerCase()}.`

  return <Box component="section" aria-labelledby="menu-title">
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'flex-end' }} gap={2} sx={{ mb: section === 'Menús' ? 2 : 3 }}><Box><Typography id="menu-title" variant="h4" sx={{ fontWeight: 800, fontSize: '1.8125rem' }}>{sectionTitle}</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>{sectionDescription}</Typography></Box><Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5}><>{section === 'Menús' && <Button variant="contained" startIcon={<AddRounded />} onClick={() => { setNewDailyMenuDate(selectedMenuDate); setNewDailyMenuDialogOpen(true) }} disabled={busy || isSelectedDatePast} sx={{ minHeight: 56, minWidth: { sm: 170 }, fontWeight: 800 }}>Crear menú</Button>}</><ToggleButtonGroup value={viewMode} exclusive onChange={(_, value: ViewMode | null) => value && setViewMode(value)} aria-label="Vista de platos" size="large" sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' }, bgcolor: 'background.paper' }}><ToggleButton value="cards" aria-label="Vista Tarjetas" sx={{ minWidth: 52 }}><GridView /></ToggleButton><ToggleButton value="list" aria-label="Vista Lista" sx={{ minWidth: 52 }}><ViewList /></ToggleButton></ToggleButtonGroup></Stack></Stack>
    {section !== 'Menús' && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}><TextField fullWidth value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isExtrasSection ? 'Buscar extra...' : 'Buscar plato...'} aria-label={isExtrasSection ? 'Buscar extra' : 'Buscar plato'} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded color="action" /></InputAdornment> }} />{!isExtrasSection && <Button variant="contained" startIcon={<AddRounded />} onClick={() => { setEditingMenu(null); setDialogOpen(true) }} disabled={busy} sx={{ minHeight: 56, minWidth: { sm: 170 }, fontWeight: 800 }}>Crear plato</Button>}</Stack>}
    {section === 'Menús' && <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={1.5} sx={{ mb: 3 }}><Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600 }}>Fecha consultada: {selectedDateLabel}</Typography><Stack direction="row" alignItems="center" spacing={0.75}><IconButton aria-label="Día anterior" onClick={() => moveSelectedMenuDate(-1)} disabled={loading}><ChevronLeftRounded /></IconButton><TextField type="date" value={selectedMenuDate} onChange={(event) => changeSelectedMenuDate(event.target.value)} size="small" InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonthRounded fontSize="small" /></InputAdornment> }} inputProps={{ 'aria-label': 'Seleccionar fecha del menú' }} /><IconButton aria-label="Día siguiente" onClick={() => moveSelectedMenuDate(1)} disabled={loading}><ChevronRightRounded /></IconButton><Button size="small" variant="outlined" onClick={() => changeSelectedMenuDate(getTodayDate())} disabled={isSelectedDateToday || loading}>Hoy</Button></Stack></Stack>}
    {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
    {!isExtrasSection && <>{section === 'Menús' && <>
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', mb: 4 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} sx={{ mb: 2 }}><Box><Typography variant="h5" sx={{ fontWeight: 800 }}>Menús por fecha</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>{selectedDateLabel}{isSelectedDateToday ? ' · Hoy' : ''}</Typography></Box><Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }}><Typography sx={{ color: '#5F6272', fontWeight: 600 }}>{dateMenuCount} menús · {dailyItems.length} platos disponibles</Typography>{dailyMenuId && dailyUpdatedAt ? <Typography variant="body2" sx={{ color: '#8A8E9F', fontWeight: 400 }}>Actualizado: {formatUpdatedAt(dailyUpdatedAt)}</Typography> : <Typography variant="body2" sx={{ color: '#8A8E9F', fontWeight: 400 }}>Aún no ha sido guardado.</Typography>}</Stack></Stack>{!dailyMenuId && dateMenuCount === 0 && <Typography color="text.secondary" sx={{ mb: 2 }}>No hay menús creados para esta fecha.</Typography>}<Grid container alignItems="flex-start" spacing={1.5}>{dateMenuCategories.map(renderSelectedDateGroup)}</Grid></Paper>
    </>}{section !== 'Menús' && <>
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
    <Drawer anchor="right" open={dailyMenuEditorOpen} onClose={closeDailyMenuEditor} PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: { xs: 2, sm: 3 } } }}>
      <Stack sx={{ height: '100%' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>{editorHasExistingItems ? 'Editar' : 'Crear'} menú de {dailyMenuEditorCategory?.toLocaleLowerCase()}</Typography>
          <IconButton aria-label="Cerrar formulario" onClick={closeDailyMenuEditor} disabled={busy}><CloseRounded /></IconButton>
        </Stack>
        <Stack spacing={2} sx={{ mb: 3 }}>
          <TextField fullWidth label="Fecha" value={dailyDate} disabled InputLabelProps={{ shrink: true }} />
          <TextField fullWidth label="Categoría" value={dailyMenuEditorCategory ?? ''} disabled InputLabelProps={{ shrink: true }} />
        </Stack>
        {editorDishes.length === 0 ? <Alert severity="info">No hay platos registrados en esta categoría.</Alert> : <Stack spacing={1.25} sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Platos de {dailyMenuEditorCategory?.toLocaleLowerCase()}</Typography>
          {editorDishes.map((menu) => {
            const selected = dailyMenuEditorSelection[menu.id] !== undefined
            const quantity = dailyMenuEditorSelection[menu.id] ?? 1
            return <Paper key={menu.id} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: selected ? 'primary.main' : 'divider', bgcolor: 'background.paper' }}>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
                <Stack direction="row" alignItems="flex-start" gap={1} sx={{ minWidth: 0 }}>
                  <Checkbox checked={selected} onChange={() => toggleEditorDish(menu.id)} disabled={busy} sx={{ p: 0.25 }} />
                  <Box sx={{ minWidth: 0 }}><Typography sx={{ fontWeight: 700 }}>{menu.name}</Typography><Typography variant="body2" color="text.secondary">Q{menu.price}</Typography></Box>
                </Stack>
                {selected && <Stack direction="row" alignItems="center" spacing={0.25} onClick={(event) => event.stopPropagation()}>
                  <IconButton size="small" aria-label={`Disminuir cantidad de ${menu.name}`} onClick={() => changeEditorQuantity(menu.id, -1)} disabled={busy || quantity <= 1}><RemoveRounded fontSize="small" /></IconButton>
                  <TextField aria-label={`Cantidad de ${menu.name}`} value={dailyMenuEditorQuantityDrafts[menu.id] ?? String(quantity)} onChange={(event) => changeEditorQuantityInput(menu.id, event.target.value)} onBlur={() => finishEditorQuantityInput(menu.id)} size="small" inputMode="numeric" inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }} sx={{ width: 64, '& .MuiOutlinedInput-root': { height: 36 }, '& input': { p: 0.5, textAlign: 'center', fontWeight: 800 } }} />
                  <IconButton size="small" aria-label={`Aumentar cantidad de ${menu.name}`} onClick={() => changeEditorQuantity(menu.id, 1)} disabled={busy}><AddRounded fontSize="small" /></IconButton>
                </Stack>}
              </Stack>
              {selected && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4.5, mt: 0.5 }}>Cantidad disponible</Typography>}
            </Paper>
          })}
        </Stack>}
        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ pt: 2.5 }}><Button variant="outlined" onClick={closeDailyMenuEditor} disabled={busy}>Cancelar</Button><Button variant="contained" onClick={saveDailyMenuEditor} disabled={busy || editorDishes.length === 0}>{editorHasExistingItems ? 'Guardar cambios' : 'Crear menú'}</Button></Stack>
      </Stack>
    </Drawer>
    <Snackbar open={Boolean(message)} autoHideDuration={4000} onClose={() => setMessage('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} sx={{ maxWidth: 'calc(100vw - 32px)' }}><Alert severity="success" onClose={() => setMessage('')} sx={{ width: '100%' }}>{message}</Alert></Snackbar>
    <MenuDialog open={dialogOpen} menu={editingMenu} initialCategory={editingMenu ? getMenuCategory(editingMenu) : 'Almuerzo'} onClose={() => setDialogOpen(false)} onSave={handleSave} />
    <ExtraDialog open={extraDialogOpen} extra={editingExtra} onClose={() => setExtraDialogOpen(false)} onSave={handleSaveExtra} />
    <Dialog open={newDailyMenuDialogOpen} onClose={() => setNewDailyMenuDialogOpen(false)} fullWidth maxWidth="xs"><DialogTitle sx={{ fontWeight: 800 }}>Crear nuevo menú</DialogTitle><DialogContent><Typography color="text.secondary" sx={{ mb: 2 }}>Selecciona la fecha del nuevo menú. Si ya existe uno para esa fecha, se solicitará confirmación para reemplazarlo.</Typography><TextField fullWidth type="date" label="Fecha" value={newDailyMenuDate} onChange={(event) => setNewDailyMenuDate(event.target.value)} InputLabelProps={{ shrink: true }} /></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={() => setNewDailyMenuDialogOpen(false)} variant="outlined">Cancelar</Button><Button onClick={() => void startNewDailyMenu()} variant="contained" disabled={!newDailyMenuDate || busy}>Continuar</Button></DialogActions></Dialog>
    <Dialog open={resetDailyMenuDialogOpen} onClose={() => setResetDailyMenuDialogOpen(false)} fullWidth maxWidth="sm"><DialogTitle sx={{ fontWeight: 800 }}>Crear nuevo menú</DialogTitle><DialogContent><Typography color="text.secondary">Se eliminará permanentemente el menú del día actualmente registrado, incluyendo todos sus datos asociados. Luego se creará un nuevo menú con todos los valores reiniciados a 0.</Typography><Typography color="error.main" sx={{ mt: 2, fontWeight: 700 }}>Esta acción no se puede deshacer ni recuperar.</Typography></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={() => setResetDailyMenuDialogOpen(false)} variant="outlined">Cancelar</Button><Button onClick={() => void confirmResetDailyMenu()} variant="contained" color="error" disabled={busy}>Eliminar y crear nuevo menú</Button></DialogActions></Dialog>
    <Dialog open={Boolean(menuToDelete)} onClose={() => setMenuToDelete(null)} fullWidth maxWidth="xs"><DialogTitle sx={{ fontWeight: 800 }}>¿Deseas eliminar este plato?</DialogTitle><DialogContent><Typography color="text.secondary">{menuToDelete?.name} dejará de estar disponible en el catálogo.</Typography></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={() => setMenuToDelete(null)} variant="outlined">Cancelar</Button><Button onClick={() => void handleDelete()} variant="contained" color="error">Eliminar</Button></DialogActions></Dialog>
    <Dialog open={Boolean(extraToDelete)} onClose={() => setExtraToDelete(null)} fullWidth maxWidth="xs"><DialogTitle sx={{ fontWeight: 800 }}>¿Deseas eliminar este extra?</DialogTitle><DialogContent><Typography color="text.secondary">{extraToDelete?.name} dejará de estar disponible para los pedidos.</Typography></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={() => setExtraToDelete(null)} variant="outlined">Cancelar</Button><Button onClick={() => void handleDeleteExtra()} variant="contained" color="error">Eliminar</Button></DialogActions></Dialog>
  </Box>
}
