import { useEffect, useMemo, useState } from 'react'
import { AddRounded, CheckCircleRounded, DeleteOutlineRounded, EditRounded, GridView, RemoveRounded, SearchRounded, ViewList } from '@mui/icons-material'
import { Alert, Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, InputAdornment, Pagination, Paper, Snackbar, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { createExtra, deleteExtra, getExtras, updateExtra } from '../services/extraService'
import { getDailyMenu, getTodayDate, saveDailyMenu } from '../services/dailyMenuService'
import { createMenuItem, deleteMenuItem, getMenuItems, updateMenuItem } from '../services/menuService'
import { DailyMenuItem, Extra, MenuItem } from '../types/menu'
import { ExtraDialog } from './ExtraDialog'
import { MenuDialog } from './MenuDialog'

type ViewMode = 'cards' | 'list'
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
  const [savedDailySignature, setSavedDailySignature] = useState(() => dailyMenuSignature([]))
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [extrasPage, setExtrasPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false)
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
    if (menu.availableToday || !menu.active) return
    setDailyItems((current) => [...current, { id: `local-${menu.id}`, menuItemId: menu.id, name: menu.name, description: menu.description, price: menu.price, availableQuantity: 0, remainingQuantity: 0 }])
    setMessage('Menú agregado a la edición del día.')
  }

  const removeFromToday = (menu: MenuViewItem) => {
    setDailyItems((current) => current.filter((item) => item.menuItemId !== menu.id))
    setMessage('Menú quitado de la edición del día.')
  }

  const changeAvailableQuantity = (menu: MenuViewItem, amount: number) => {
    setDailyItems((current) => current.map((item) => item.menuItemId === menu.id ? { ...item, availableQuantity: Math.max(0, item.availableQuantity + amount), remainingQuantity: Math.max(0, item.availableQuantity + amount) } : item))
  }

  const saveCurrentDailyMenu = (replaced: boolean) => runAction(async () => {
    const saved = await saveDailyMenu(dailyDate, dailyItems.map(({ menuItemId, availableQuantity }) => ({ menuItemId, availableQuantity })))
    console.log('PUT updatedAt:', saved.updatedAt)
    const refreshed = await getDailyMenu(dailyDate)
    console.log('GET updatedAt:', refreshed.updatedAt)
    setDailyItems(refreshed.items)
    setDailyDate(refreshed.date)
    setDailyMenuId(refreshed.id)
    setDailyUpdatedAt(refreshed.updatedAt)
    setSavedDailySignature(dailyMenuSignature(refreshed.items))
  }, replaced ? 'Menú del día actualizado correctamente.' : 'Menú del día guardado correctamente.')

  const dailyMenuDirty = dailyMenuSignature(dailyItems) !== savedDailySignature
  const requestDailyMenuSave = () => {
    if (!dailyMenuDirty || busy) return
    const invalidItems = getInvalidDailyItems(dailyItems)
    if (invalidItems.length > 0) {
      setError(`No se puede guardar el menú del día. Define una cantidad mayor a 0 para: ${invalidItems.map((item) => item.name).join(', ')}.`)
      return
    }
    if (dailyMenuId) {
      setReplaceDialogOpen(true)
      return
    }
    void saveCurrentDailyMenu(false)
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

  const renderQuantityControls = (menu: MenuViewItem) => <Stack direction="row" alignItems="center" spacing={0.25}><IconButton aria-label={`Disminuir disponibilidad de ${menu.name}`} onClick={() => changeAvailableQuantity(menu, -1)} size="large" disabled={menu.availableQuantity === 0 || busy}><RemoveRounded /></IconButton><Typography sx={{ minWidth: 30, textAlign: 'center', fontWeight: 800 }}>{menu.availableQuantity}</Typography><IconButton aria-label={`Aumentar disponibilidad de ${menu.name}`} onClick={() => changeAvailableQuantity(menu, 1)} size="large" disabled={busy}><AddRounded /></IconButton></Stack>
  const renderDayAction = (menu: MenuViewItem) => menu.availableToday ? <Chip icon={<CheckCircleRounded />} label="En menú del día" variant="outlined" color="primary" /> : <Button variant="outlined" startIcon={<AddRounded />} onClick={() => addToToday(menu)} disabled={!menu.active || busy} sx={{ minHeight: 44 }}>{menu.active ? 'Agregar al menú del día' : 'Menú inactivo'}</Button>

  const renderDayCard = (menu: MenuViewItem) => { const invalidQuantity = menu.availableQuantity <= 0; return <Grid item xs={12} sm={6} lg={4} key={menu.id}><Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: invalidQuantity ? 'warning.light' : 'selection.border', bgcolor: 'background.paper' }}><Box sx={{ p: 2.25 }}><Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}><Box><Typography variant="h6" sx={{ fontWeight: 800 }}>{menu.name}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{menu.description}</Typography><Typography sx={{ color: 'primary.main', fontWeight: 800, mt: 1 }}>Q{menu.price}</Typography></Box><CheckCircleRounded color="primary" sx={{ fontSize: 28 }} /></Stack>{invalidQuantity && <Typography variant="body2" sx={{ mt: 1.5, color: 'warning.dark', fontWeight: 600 }}>Define al menos 1 unidad</Typography>}</Box><Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.25, pb: 1.5 }}><Stack><Typography variant="body2" color="text.secondary">Disponibles: {menu.availableQuantity} · Quedan: {menu.remainingQuantity}</Typography>{renderQuantityControls(menu)}</Stack><Button variant="outlined" onClick={() => removeFromToday(menu)} disabled={busy} sx={{ minHeight: 44 }}>Quitar de hoy</Button></Stack></Card></Grid> }
  const renderDayRow = (menu: MenuViewItem) => { const invalidQuantity = menu.availableQuantity <= 0; return <Paper key={menu.id} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: invalidQuantity ? 'warning.light' : 'selection.border', bgcolor: 'background.paper' }}><Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={1.5}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800 }}>{menu.name}</Typography><Typography variant="body2" color="text.secondary">{menu.description}</Typography>{invalidQuantity && <Typography variant="body2" sx={{ mt: 0.5, color: 'warning.dark', fontWeight: 600 }}>Define al menos 1 unidad</Typography>}</Box><Typography sx={{ color: 'primary.main', fontWeight: 800 }}>Q{menu.price}</Typography><Stack direction="row" alignItems="center" justifyContent="space-between"><Stack><Typography variant="body2" color="text.secondary">Disponibles: {menu.availableQuantity} · Quedan: {menu.remainingQuantity}</Typography>{renderQuantityControls(menu)}</Stack><Button variant="outlined" onClick={() => removeFromToday(menu)} disabled={busy} sx={{ minHeight: 44 }}>Quitar de hoy</Button></Stack></Stack></Paper> }

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
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', mb: 4 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} sx={{ mb: 2 }}><Box><Typography variant="h5" sx={{ fontWeight: 800 }}>Menú del día</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>Activa las opciones y define sus platos disponibles.</Typography></Box><Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }}><Typography sx={{ color: 'primary.main', fontWeight: 800 }}>Menús activos hoy: {dailyItems.length}</Typography>{dailyMenuId && dailyUpdatedAt ? <Typography variant="body2" sx={{ color: 'primary.main', opacity: 0.72, fontWeight: 400 }}>Actualizado: {formatUpdatedAt(dailyUpdatedAt)}</Typography> : <Typography variant="body2" sx={{ color: 'primary.main', opacity: 0.72, fontWeight: 400 }}>Aún no ha sido guardado.</Typography>}</Stack></Stack>{activeMenus.length > 0 ? viewMode === 'cards' ? <Grid container spacing={1.5}>{activeMenus.map(renderDayCard)}</Grid> : <Stack spacing={1}>{activeMenus.map(renderDayRow)}</Stack> : <Box sx={{ py: 3, textAlign: 'center' }}><Typography color="text.secondary">{filteredMenus.length === 0 ? 'No se encontraron menús.' : 'No hay menús activos hoy.'}</Typography>{filteredMenus.length > 0 && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Agrega opciones desde Menús disponibles.</Typography>}</Box>}<Button variant="contained" onClick={requestDailyMenuSave} disabled={busy || !dailyMenuDirty} sx={{ mt: 2.5, minHeight: 48, fontWeight: 800 }}>Guardar menú del día</Button></Paper>
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
    <Dialog open={Boolean(menuToDelete)} onClose={() => setMenuToDelete(null)} fullWidth maxWidth="xs"><DialogTitle sx={{ fontWeight: 800 }}>¿Deseas eliminar este menú?</DialogTitle><DialogContent><Typography color="text.secondary">{menuToDelete?.name} dejará de estar disponible en el catálogo.</Typography></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={() => setMenuToDelete(null)} variant="outlined">Cancelar</Button><Button onClick={() => void handleDelete()} variant="contained" color="error">Eliminar</Button></DialogActions></Dialog>
    <Dialog open={Boolean(extraToDelete)} onClose={() => setExtraToDelete(null)} fullWidth maxWidth="xs"><DialogTitle sx={{ fontWeight: 800 }}>¿Deseas eliminar este extra?</DialogTitle><DialogContent><Typography color="text.secondary">{extraToDelete?.name} dejará de estar disponible para los pedidos.</Typography></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={() => setExtraToDelete(null)} variant="outlined">Cancelar</Button><Button onClick={() => void handleDeleteExtra()} variant="contained" color="error">Eliminar</Button></DialogActions></Dialog>
  </Box>
}
