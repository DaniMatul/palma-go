import { useEffect, useMemo, useState } from 'react'
import { AddRounded, CheckCircleRounded, DeleteOutlineRounded, EditRounded, GridView, RemoveRounded, SearchRounded, ViewList } from '@mui/icons-material'
import { Alert, Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, InputAdornment, Pagination, Paper, Snackbar, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { createExtra, deleteExtra, getExtras, updateExtra } from '../services/extraService'
import { createDailyMenu, getDailyMenu, getTodayDate, resetDailyMenu, saveDailyMenu } from '../services/dailyMenuService'
import { createMenuItem, deleteMenuItem, getMenuItems, updateMenuItem } from '../services/menuService'
import { DailyMenuItem, Extra, MenuItem } from '../types/menu'
import { ExtraDialog } from './ExtraDialog'
import { MenuDialog } from './MenuDialog'

type ViewMode = 'cards' | 'list'
type MenuMode = 'view' | 'edit' | 'create'
type MenuViewItem = MenuItem & { availableToday: boolean; availableQuantity: number; remainingQuantity: number }

function dailyMenuSignature(items: DailyMenuItem[]) {
  return JSON.stringify(items.map(({ menuItemId, availableQuantity }) => ({ menuItemId, availableQuantity })).sort((first, second) => first.menuItemId.localeCompare(second.menuItemId)))
}

function getInvalidDailyItems(items: DailyMenuItem[]) {
  return items.filter((item) => item.availableQuantity <= 0)
}

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })
}

function updateMenu(items: MenuItem[], id: string, changes: Partial<MenuItem>) {
  return items.map((item) => item.id === id ? { ...item, ...changes } : item)
}

export function MenuManagementView() {
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [extras, setExtras] = useState<Extra[]>([])
  const [dailyItems, setDailyItems] = useState<DailyMenuItem[]>([])
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
      const [menuItems, extraItems, dailyMenu] = await Promise.all([getMenuItems(), getExtras(), getDailyMenu()])
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
      setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el menú')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadData() }, [])

  const filteredMenus = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return query ? menus.filter((menu) => `${menu.name} ${menu.description}`.toLocaleLowerCase().includes(query)) : menus
  }, [menus, search])
  const filteredExtras = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return query ? extras.filter((extra) => extra.name.toLocaleLowerCase().includes(query)) : extras
  }, [extras, search])
  const toViewMenu = (menu: MenuItem): MenuViewItem => {
    const dailyItem = dailyItems.find((item) => item.menuItemId === menu.id)
    return { ...menu, availableToday: Boolean(dailyItem), availableQuantity: dailyItem?.availableQuantity ?? 0, remainingQuantity: dailyItem?.remainingQuantity ?? 0 }
  }
  const activeMenus = filteredMenus.map(toViewMenu).filter((menu) => menu.availableToday)
  const pageSize = viewMode === 'cards' ? 12 : 20
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

  const handleSave = async (menu: { id?: string; name: string; description: string; price: number }) => {
    await runAction(async () => {
      const saved = menu.id ? await updateMenuItem(menu.id, menu) : await createMenuItem(menu)
      setMenus((current) => menu.id ? updateMenu(current, saved.id, saved) : [...current, saved])
      setDialogOpen(false)
    }, menu.id ? 'Menú actualizado.' : 'Menú creado.')
  }

  const handleDelete = async () => {
    if (!menuToDelete) return
    const menu = menuToDelete
    await runAction(async () => { const deleted = await deleteMenuItem(menu.id); setMenus((current) => updateMenu(current, menu.id, deleted)); setDailyItems((current) => current.filter((item) => item.menuItemId !== menu.id)); setMenuToDelete(null) }, 'Menú eliminado.')
  }

  const addToToday = (menu: MenuViewItem) => {
    if (menuMode === 'view' || menu.availableToday || !menu.active) return
    setDailyItems((current) => [...current, { id: `local-${menu.id}`, menuItemId: menu.id, name: menu.name, description: menu.description, price: menu.price, availableQuantity: 0, remainingQuantity: 0 }])
    setMessage('Menú agregado a la edición del día.')
  }

  const removeFromToday = (menu: MenuViewItem) => {
    if (menuMode === 'view') return
    setDailyItems((current) => current.filter((item) => item.menuItemId !== menu.id))
    setMessage('Menú quitado de la edición del día.')
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
      const todayMenu = await getDailyMenu(getTodayDate())
      setDailyItems(todayMenu.items)
      setDailyDate(todayMenu.date)
      setDailyMenuId(todayMenu.id)
      setDailyUpdatedAt(todayMenu.updatedAt)
      setSavedDailySignature(dailyMenuSignature(todayMenu.items))
      setOriginalMenu(todayMenu.items.map((item) => ({ ...item })))
      setQuantityDrafts({})
      setMenuMode(todayMenu.id ? 'edit' : 'create')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el menú de hoy')
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
      setDailyItems(createdMenu.items)
      setDailyMenuId(createdMenu.id)
      setDailyUpdatedAt(createdMenu.updatedAt)
      setSavedDailySignature(dailyMenuSignature(createdMenu.items))
      setOriginalMenu(null)
      setQuantityDrafts({})
      setMenuMode('create')
      setNewDailyMenuDialogOpen(false)
      setMessage('Nuevo menú creado. Agrega opciones desde Menús disponibles.')
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

  const renderQuantityControls = (menu: MenuViewItem) => { const editable = menuMode !== 'view'; const invalidQuantity = menu.availableQuantity <= 0; return <Stack direction="row" alignItems="center" spacing={0.25} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}><IconButton aria-label={`Disminuir disponibilidad de ${menu.name}`} onClick={() => changeAvailableQuantity(menu, -1)} size="large" disabled={!editable || menu.availableQuantity === 0 || busy}><RemoveRounded /></IconButton><TextField aria-label={`Cantidad disponible de ${menu.name}`} value={quantityDrafts[menu.id] ?? String(menu.availableQuantity)} onChange={(event) => changeQuantityFromInput(menu, event.target.value)} onBlur={() => finishQuantityInput(menu)} onFocus={(event) => event.stopPropagation()} disabled={!editable || busy} error={editable && invalidQuantity} variant="outlined" size="small" inputMode="numeric" inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }} sx={{ width: 64, '& .MuiOutlinedInput-root': { height: 36, borderRadius: 1.5 }, '& input': { p: 0.5, textAlign: 'center', fontWeight: 800 }, '& input[type=number]': { MozAppearance: 'textfield' }, '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } }} /><IconButton aria-label={`Aumentar disponibilidad de ${menu.name}`} onClick={() => changeAvailableQuantity(menu, 1)} size="large" disabled={!editable || busy}><AddRounded /></IconButton></Stack> }
  const renderDayAction = (menu: MenuViewItem) => menu.availableToday ? <Chip icon={<CheckCircleRounded />} label="En menú del día" variant="outlined" color="primary" /> : <Button variant="outlined" startIcon={<AddRounded />} onClick={() => addToToday(menu)} disabled={menuMode === 'view' || !menu.active || busy} sx={{ minHeight: 44 }}>{menu.active ? 'Agregar al menú del día' : 'Menú inactivo'}</Button>

  const renderDayCard = (menu: MenuViewItem) => { const invalidQuantity = menu.availableQuantity <= 0; const editable = menuMode !== 'view'; return <Grid item xs={12} sm={6} lg={4} key={menu.id}><Card elevation={0} role="button" tabIndex={0} onClick={editable ? () => removeFromToday(menu) : undefined} onKeyDown={editable ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); removeFromToday(menu) } } : undefined} aria-label={editable ? `Quitar ${menu.name} del menú del día` : `Menú del día: ${menu.name}`} sx={{ height: '100%', border: '1px solid', borderColor: invalidQuantity && editable ? 'warning.light' : '#D9DCF3', bgcolor: 'background.paper', cursor: editable ? 'pointer' : 'default', '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.light' } }}><Box sx={{ p: 1.75 }}><Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}><Box><Typography variant="h6" sx={{ fontWeight: 800, color: editable ? 'text.primary' : 'text.secondary' }}>{menu.name}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{menu.description}</Typography><Typography sx={{ color: 'primary.main', fontWeight: 800, mt: 0.75 }}>Q{menu.price}</Typography></Box><CheckCircleRounded color="success" sx={{ width: 20, height: 20, p: 0, borderRadius: '50%', opacity: editable ? 1 : 0.9 }} /></Stack></Box><Stack sx={{ px: 1.75, pb: 1.25 }}><Typography variant="body2" color="text.secondary">Disponibles: {menu.availableQuantity} · Quedan: {menu.remainingQuantity}</Typography>{invalidQuantity && editable && <Typography sx={{ mt: 0.25, color: 'warning.dark', fontSize: 13, fontWeight: 500 }}>Define al menos 1 unidad</Typography>}{renderQuantityControls(menu)}</Stack></Card></Grid> }
  const renderDayRow = (menu: MenuViewItem) => { const invalidQuantity = menu.availableQuantity <= 0; const editable = menuMode !== 'view'; return <Paper key={menu.id} role="button" tabIndex={0} onClick={editable ? () => removeFromToday(menu) : undefined} onKeyDown={editable ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); removeFromToday(menu) } } : undefined} aria-label={editable ? `Quitar ${menu.name} del menú del día` : `Menú del día: ${menu.name}`} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: invalidQuantity && editable ? 'warning.light' : '#D9DCF3', bgcolor: 'background.paper', cursor: editable ? 'pointer' : 'default', '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.light' } }}><Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={1.5}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800, color: editable ? 'text.primary' : 'text.secondary' }}>{menu.name}</Typography><Typography variant="body2" color="text.secondary">{menu.description}</Typography></Box><Typography sx={{ color: 'primary.main', fontWeight: 800 }}>Q{menu.price}</Typography><Stack direction="row" alignItems="center" justifyContent="space-between"><Stack><Typography variant="body2" color="text.secondary">Disponibles: {menu.availableQuantity} · Quedan: {menu.remainingQuantity}</Typography>{invalidQuantity && editable && <Typography sx={{ mt: 0.25, color: 'warning.dark', fontSize: 13, fontWeight: 500 }}>Define al menos 1 unidad</Typography>}{renderQuantityControls(menu)}</Stack></Stack></Stack></Paper> }

  const renderCatalogCard = (menu: MenuViewItem) => <Grid item xs={12} sm={6} lg={4} key={menu.id}><Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2.25 }}><Stack spacing={2} sx={{ height: '100%' }}><Box sx={{ flex: 1 }}><Stack direction="row" justifyContent="space-between" gap={1}><Typography variant="h6" sx={{ fontWeight: 800 }}>{menu.name}</Typography>{menu.availableToday && <CheckCircleRounded color="primary" fontSize="small" />}</Stack><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{menu.description}</Typography><Typography sx={{ color: 'primary.main', fontWeight: 800, mt: 1 }}>Q{menu.price}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{menu.availableToday ? `Disponible hoy · ${menu.availableQuantity} platos` : 'No disponible hoy'}</Typography></Box>{renderDayAction(menu)}<Stack direction="row" spacing={1}><Button fullWidth variant="outlined" startIcon={<EditRounded />} onClick={() => { setEditingMenu(menu); setDialogOpen(true) }} disabled={busy} sx={{ minHeight: 44 }}>Editar</Button><Button fullWidth variant="outlined" color="error" startIcon={<DeleteOutlineRounded />} onClick={() => setMenuToDelete(menu)} disabled={busy} sx={{ minHeight: 44 }}>Eliminar</Button></Stack></Stack></Card></Grid>
  const renderCatalogRow = (menu: MenuViewItem) => <Paper key={menu.id} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}><Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} gap={1.5}><Box sx={{ flex: 1, minWidth: 0 }}><Typography sx={{ fontWeight: 800 }}>{menu.name}</Typography><Typography variant="body2" color="text.secondary" noWrap>{menu.description}</Typography></Box><Typography sx={{ color: 'primary.main', fontWeight: 800, minWidth: 55 }}>Q{menu.price}</Typography>{renderDayAction(menu)}<Typography variant="body2" sx={{ minWidth: 100, fontWeight: 700 }}>{menu.availableToday ? `${menu.availableQuantity} platos` : 'No disponible'}</Typography><Stack direction="row" spacing={0.75}><Button variant="outlined" startIcon={<EditRounded />} onClick={() => { setEditingMenu(menu); setDialogOpen(true) }} disabled={busy} sx={{ minHeight: 42 }}>Editar</Button><IconButton aria-label={`Eliminar ${menu.name}`} color="error" onClick={() => setMenuToDelete(menu)} disabled={busy} sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 2, width: 42, height: 42 }}><DeleteOutlineRounded /></IconButton></Stack></Stack></Paper>

  const renderExtraCard = (extra: Extra) => <Grid item xs={12} sm={6} lg={4} key={extra.id}><Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2.25 }}><Stack spacing={2} sx={{ height: '100%' }}><Box sx={{ flex: 1 }}><Typography variant="h6" sx={{ fontWeight: 800 }}>{extra.name}</Typography><Typography sx={{ color: 'primary.main', fontWeight: 800, mt: 0.5 }}>Q{extra.price}</Typography><Typography variant="body2" color={extra.active ? 'success.main' : 'text.secondary'} sx={{ mt: 1, fontWeight: 700 }}>{extra.active ? 'Activo' : 'Inactivo'}</Typography></Box><Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}><Switch checked={extra.active} onChange={() => void toggleExtra(extra)} disabled={busy} inputProps={{ 'aria-label': `Activo: ${extra.name}` }} /><Stack direction="row" spacing={0.75}><Button variant="outlined" startIcon={<EditRounded />} onClick={() => { setEditingExtra(extra); setExtraDialogOpen(true) }} disabled={busy} sx={{ minHeight: 44 }}>Editar</Button><IconButton aria-label={`Eliminar ${extra.name}`} color="error" onClick={() => setExtraToDelete(extra)} disabled={busy} sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 2, width: 42, height: 42 }}><DeleteOutlineRounded /></IconButton></Stack></Stack></Stack></Card></Grid>
  const renderExtraRow = (extra: Extra) => <Paper key={extra.id} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}><Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} gap={1.5}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800 }}>{extra.name}</Typography></Box><Typography sx={{ color: 'primary.main', fontWeight: 800, minWidth: 55 }}>Q{extra.price}</Typography><Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 125 }}><Switch checked={extra.active} onChange={() => void toggleExtra(extra)} disabled={busy} inputProps={{ 'aria-label': `Activo: ${extra.name}` }} /><Typography variant="body2" sx={{ fontWeight: 700 }}>{extra.active ? 'Activo' : 'Inactivo'}</Typography></Stack><Stack direction="row" spacing={0.75}><Button variant="outlined" startIcon={<EditRounded />} onClick={() => { setEditingExtra(extra); setExtraDialogOpen(true) }} disabled={busy} sx={{ minHeight: 42 }}>Editar</Button><IconButton aria-label={`Eliminar ${extra.name}`} color="error" onClick={() => setExtraToDelete(extra)} disabled={busy} sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 2, width: 42, height: 42 }}><DeleteOutlineRounded /></IconButton></Stack></Stack></Paper>

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress color="primary" /></Box>
  const firstItem = filteredMenus.length === 0 ? 0 : (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, filteredMenus.length)

  return <Box component="section" aria-labelledby="menu-title">
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'flex-end' }} gap={2} sx={{ mb: 2 }}><Box><Typography id="menu-title" variant="h4" sx={{ fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.25rem' } }}>Menú</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>Organiza los menús disponibles del comedor.</Typography></Box><ToggleButtonGroup value={viewMode} exclusive onChange={(_, value: ViewMode | null) => value && setViewMode(value)} aria-label="Vista de menús" size="large" sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' }, bgcolor: 'background.paper' }}><ToggleButton value="cards" aria-label="Vista Tarjetas" sx={{ minWidth: 52 }}><GridView /></ToggleButton><ToggleButton value="list" aria-label="Vista Lista" sx={{ minWidth: 52 }}><ViewList /></ToggleButton></ToggleButtonGroup></Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}><TextField fullWidth value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar menú..." aria-label="Buscar menú" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded color="action" /></InputAdornment> }} /><Button variant="contained" startIcon={<AddRounded />} onClick={() => { setEditingMenu(null); setDialogOpen(true) }} disabled={busy} sx={{ minHeight: 56, minWidth: { sm: 170 }, fontWeight: 800 }}>Crear menú</Button></Stack>
    {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', mb: 4 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} sx={{ mb: 2 }}><Box><Typography variant="h5" sx={{ fontWeight: 800 }}>Menú del día</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>Activa las opciones y define sus platos disponibles.</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}><Button size="small" variant="outlined" startIcon={<EditRounded />} onClick={() => void editTodayMenu()} disabled={busy || !dailyMenuId} sx={{ display: menuMode === 'view' ? 'inline-flex' : 'none' }}>Editar menú de hoy</Button><Button size="small" variant="outlined" startIcon={<AddRounded />} onClick={() => { setNewDailyMenuDate(getTodayDate()); setNewDailyMenuDialogOpen(true) }} disabled={busy}>Crear nuevo menú</Button></Stack></Box><Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }}><Typography sx={{ color: '#5F6272', fontWeight: 600 }}>Menú activo · {dailyItems.length} platos</Typography>{dailyMenuId && dailyUpdatedAt ? <Typography variant="body2" sx={{ color: '#8A8E9F', fontWeight: 400 }}>Actualizado: {formatUpdatedAt(dailyUpdatedAt)}</Typography> : <Typography variant="body2" sx={{ color: '#8A8E9F', fontWeight: 400 }}>Aún no ha sido guardado.</Typography>}</Stack></Stack>{activeMenus.length > 0 ? viewMode === 'cards' ? <Grid container spacing={1.5}>{activeMenus.map(renderDayCard)}</Grid> : <Stack spacing={1}>{activeMenus.map(renderDayRow)}</Stack> : <Box sx={{ py: 3, textAlign: 'center' }}><Typography color="text.secondary">{filteredMenus.length === 0 ? 'No se encontraron menús.' : 'No hay menús activos hoy.'}</Typography>{filteredMenus.length > 0 && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Agrega opciones desde Menús disponibles.</Typography>}</Box>}{menuMode !== 'view' && <Stack direction="row" spacing={1} sx={{ mt: 2.5 }}><Button variant="contained" onClick={requestDailyMenuSave} disabled={busy || !dailyMenuDirty} sx={{ minHeight: 48, fontWeight: 800 }}>{menuMode === 'edit' ? 'Guardar cambios' : 'Guardar menú del día'}</Button>{menuMode === 'edit' && <Button variant="outlined" color="inherit" onClick={cancelDailyMenuEdit} disabled={busy} sx={{ minHeight: 48 }}>Cancelar edición</Button>}</Stack>}</Paper>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} sx={{ mb: 2 }}><Typography variant="h5" sx={{ fontWeight: 800 }}>Menús disponibles</Typography><Typography variant="body2" color="text.secondary">{filteredMenus.length === 0 ? 'No se encontraron menús.' : `Mostrando ${firstItem}–${lastItem} de ${filteredMenus.length} menús`}</Typography></Stack>
    {filteredMenus.length > 0 ? viewMode === 'cards' ? <Grid container spacing={1.5}>{paginatedMenus.map((menu) => renderCatalogCard(toViewMenu(menu)))}</Grid> : <Stack spacing={1}>{paginatedMenus.map((menu) => renderCatalogRow(toViewMenu(menu)))}</Stack> : <Typography color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>No se encontraron menús.</Typography>}
    {filteredMenus.length > 0 && <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mt: 3 }}><Pagination count={pageCount} page={page} onChange={(_, nextPage) => setPage(nextPage)} siblingCount={0} boundaryCount={1} color="primary" shape="rounded" /></Stack>}
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} sx={{ mt: 4, mb: 2 }}><Box><Typography variant="h5" sx={{ fontWeight: 800 }}>Extras</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Gestiona los extras disponibles para los pedidos.</Typography></Box><Stack direction="row" alignItems="center" gap={2}><Typography variant="body2" color="text.secondary">{filteredExtras.length === 0 ? 'No se encontraron extras.' : `Mostrando ${(extrasPage - 1) * pageSize + 1}–${Math.min(extrasPage * pageSize, filteredExtras.length)} de ${filteredExtras.length} extras`}</Typography><Button variant="contained" startIcon={<AddRounded />} onClick={() => { setEditingExtra(null); setExtraDialogOpen(true) }} disabled={busy} sx={{ minHeight: 48, fontWeight: 800 }}>Crear extra</Button></Stack></Stack>
    {filteredExtras.length > 0 ? viewMode === 'cards' ? <Grid container spacing={1.5}>{paginatedExtras.map(renderExtraCard)}</Grid> : <Stack spacing={1}>{paginatedExtras.map(renderExtraRow)}</Stack> : <Typography color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>No se encontraron extras.</Typography>}
    {filteredExtras.length > 0 && <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}><Pagination count={extrasPageCount} page={extrasPage} onChange={(_, nextPage) => setExtrasPage(nextPage)} siblingCount={0} boundaryCount={1} color="primary" shape="rounded" /></Stack>}
    <Snackbar open={Boolean(message)} autoHideDuration={4000} onClose={() => setMessage('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} sx={{ maxWidth: 'calc(100vw - 32px)' }}><Alert severity="success" onClose={() => setMessage('')} sx={{ width: '100%' }}>{message}</Alert></Snackbar>
    <MenuDialog open={dialogOpen} menu={editingMenu} onClose={() => setDialogOpen(false)} onSave={handleSave} />
    <ExtraDialog open={extraDialogOpen} extra={editingExtra} onClose={() => setExtraDialogOpen(false)} onSave={handleSaveExtra} />
    <Dialog open={replaceDialogOpen} onClose={() => setReplaceDialogOpen(false)} fullWidth maxWidth="xs"><DialogTitle sx={{ fontWeight: 800 }}>Reemplazar menú del día</DialogTitle><DialogContent><Typography color="text.secondary">Ya existe un menú guardado para hoy. Al continuar se reemplazarán las opciones y cantidades actuales.</Typography></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={() => setReplaceDialogOpen(false)} variant="outlined">Cancelar</Button><Button onClick={() => { setReplaceDialogOpen(false); void saveCurrentDailyMenu(true) }} variant="contained">Reemplazar menú</Button></DialogActions></Dialog>
    <Dialog open={newDailyMenuDialogOpen} onClose={() => setNewDailyMenuDialogOpen(false)} fullWidth maxWidth="xs"><DialogTitle sx={{ fontWeight: 800 }}>Crear nuevo menú</DialogTitle><DialogContent><Typography color="text.secondary" sx={{ mb: 2 }}>Selecciona la fecha del nuevo menú. Si ya existe uno para esa fecha, se solicitará confirmación para reemplazarlo.</Typography><TextField fullWidth type="date" label="Fecha" value={newDailyMenuDate} onChange={(event) => setNewDailyMenuDate(event.target.value)} InputLabelProps={{ shrink: true }} /></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={() => setNewDailyMenuDialogOpen(false)} variant="outlined">Cancelar</Button><Button onClick={() => void startNewDailyMenu()} variant="contained" disabled={!newDailyMenuDate || busy}>Continuar</Button></DialogActions></Dialog>
    <Dialog open={resetDailyMenuDialogOpen} onClose={() => setResetDailyMenuDialogOpen(false)} fullWidth maxWidth="sm"><DialogTitle sx={{ fontWeight: 800 }}>Crear nuevo menú</DialogTitle><DialogContent><Typography color="text.secondary">Se eliminará permanentemente el menú del día actualmente registrado, incluyendo todos sus datos asociados. Luego se creará un nuevo menú con todos los valores reiniciados a 0.</Typography><Typography color="error.main" sx={{ mt: 2, fontWeight: 700 }}>Esta acción no se puede deshacer ni recuperar.</Typography></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={() => setResetDailyMenuDialogOpen(false)} variant="outlined">Cancelar</Button><Button onClick={() => void confirmResetDailyMenu()} variant="contained" color="error" disabled={busy}>Eliminar y crear nuevo menú</Button></DialogActions></Dialog>
    <Dialog open={Boolean(menuToDelete)} onClose={() => setMenuToDelete(null)} fullWidth maxWidth="xs"><DialogTitle sx={{ fontWeight: 800 }}>¿Deseas eliminar este menú?</DialogTitle><DialogContent><Typography color="text.secondary">{menuToDelete?.name} dejará de estar disponible en el catálogo.</Typography></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={() => setMenuToDelete(null)} variant="outlined">Cancelar</Button><Button onClick={() => void handleDelete()} variant="contained" color="error">Eliminar</Button></DialogActions></Dialog>
    <Dialog open={Boolean(extraToDelete)} onClose={() => setExtraToDelete(null)} fullWidth maxWidth="xs"><DialogTitle sx={{ fontWeight: 800 }}>¿Deseas eliminar este extra?</DialogTitle><DialogContent><Typography color="text.secondary">{extraToDelete?.name} dejará de estar disponible para los pedidos.</Typography></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={() => setExtraToDelete(null)} variant="outlined">Cancelar</Button><Button onClick={() => void handleDeleteExtra()} variant="contained" color="error">Eliminar</Button></DialogActions></Dialog>
  </Box>
}
