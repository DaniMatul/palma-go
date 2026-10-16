import { useEffect, useMemo, useState } from 'react'
import { AddRounded, CheckCircleRounded, DeleteOutlineRounded, EditRounded, GridView, RemoveRounded, SearchRounded, ViewList } from '@mui/icons-material'
import { Alert, Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, InputAdornment, Pagination, Paper, Stack, Switch, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { ExtraProduct, MenuProduct } from '../types/menu'
import { ExtraDialog } from './ExtraDialog'
import { MenuDialog } from './MenuDialog'

type MenuManagementViewProps = { menus: MenuProduct[]; extras: ExtraProduct[]; onMenusChange: (menus: MenuProduct[]) => void; onExtrasChange: (extras: ExtraProduct[]) => void }
type ViewMode = 'cards' | 'list'

function updateMenu(menus: MenuProduct[], id: string, changes: Partial<MenuProduct>) {
  return menus.map((menu) => menu.id === id ? { ...menu, ...changes } : menu)
}

export function MenuManagementView({ menus, extras, onMenusChange, onExtrasChange }: MenuManagementViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [extrasPage, setExtrasPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMenu, setEditingMenu] = useState<MenuProduct | null>(null)
  const [menuToDelete, setMenuToDelete] = useState<MenuProduct | null>(null)
  const [message, setMessage] = useState('')
  const [extraDialogOpen, setExtraDialogOpen] = useState(false)
  const [editingExtra, setEditingExtra] = useState<ExtraProduct | null>(null)
  const [extraToDelete, setExtraToDelete] = useState<ExtraProduct | null>(null)

  const filteredMenus = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return menus
    return menus.filter((menu) => `${menu.name} ${menu.description}`.toLocaleLowerCase().includes(query))
  }, [menus, search])
  const activeMenus = filteredMenus.filter((menu) => menu.availableToday)
  const filteredExtras = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    if (!query) return extras
    return extras.filter((extra) => extra.name.toLocaleLowerCase().includes(query))
  }, [extras, search])
  const pageSize = viewMode === 'cards' ? 12 : 20
  const pageCount = Math.max(1, Math.ceil(filteredMenus.length / pageSize))
  const paginatedMenus = filteredMenus.slice((page - 1) * pageSize, page * pageSize)
  const extrasPageCount = Math.max(1, Math.ceil(filteredExtras.length / pageSize))
  const paginatedExtras = filteredExtras.slice((extrasPage - 1) * pageSize, extrasPage * pageSize)

  useEffect(() => { setPage(1); setExtrasPage(1) }, [search, viewMode])
  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount])
  useEffect(() => { if (extrasPage > extrasPageCount) setExtrasPage(extrasPageCount) }, [extrasPage, extrasPageCount])

  const openCreate = () => { setEditingMenu(null); setDialogOpen(true) }
  const openEdit = (menu: MenuProduct) => { setEditingMenu(menu); setDialogOpen(true) }

  const handleSave = (menu: MenuProduct) => {
    onMenusChange(menus.some((item) => item.id === menu.id) ? updateMenu(menus, menu.id, menu) : [...menus, menu])
    setDialogOpen(false)
    setMessage(editingMenu ? 'Menú actualizado.' : 'Menú creado.')
  }

  const handleDelete = () => {
    if (!menuToDelete) return
    onMenusChange(menus.filter((menu) => menu.id !== menuToDelete.id))
    setMenuToDelete(null)
    setMessage('Menú eliminado.')
  }

  const addToToday = (menu: MenuProduct) => {
    if (menu.availableToday) return
    setMessage('')
    onMenusChange(updateMenu(menus, menu.id, { availableToday: true, availableQuantity: 0 }))
  }

  const removeFromToday = (menu: MenuProduct) => {
    setMessage('')
    onMenusChange(updateMenu(menus, menu.id, { availableToday: false }))
  }

  const renderDayAction = (menu: MenuProduct) => menu.availableToday
    ? <Chip icon={<CheckCircleRounded />} label="En menú del día" variant="outlined" color="primary" />
    : <Button variant="outlined" startIcon={<AddRounded />} onClick={() => addToToday(menu)} sx={{ minHeight: 44 }}>Agregar al menú del día</Button>

  const changeAvailableQuantity = (menu: MenuProduct, amount: number) => {
    setMessage('')
    onMenusChange(updateMenu(menus, menu.id, { availableQuantity: Math.max(0, menu.availableQuantity + amount) }))
  }

  const openCreateExtra = () => { setEditingExtra(null); setExtraDialogOpen(true) }
  const openEditExtra = (extra: ExtraProduct) => { setEditingExtra(extra); setExtraDialogOpen(true) }
  const handleSaveExtra = (extra: ExtraProduct) => {
    onExtrasChange(extras.some((item) => item.id === extra.id) ? extras.map((item) => item.id === extra.id ? extra : item) : [...extras, extra])
    setExtraDialogOpen(false)
    setMessage(editingExtra ? 'Extra actualizado.' : 'Extra creado.')
  }
  const handleDeleteExtra = () => {
    if (!extraToDelete) return
    onExtrasChange(extras.filter((extra) => extra.id !== extraToDelete.id))
    setExtraToDelete(null)
    setMessage('Extra eliminado.')
  }
  const toggleExtra = (extra: ExtraProduct) => onExtrasChange(extras.map((item) => item.id === extra.id ? { ...item, active: !item.active } : item))

  const renderQuantityControls = (menu: MenuProduct) => <Stack direction="row" alignItems="center" spacing={0.25}><IconButton aria-label={`Disminuir disponibilidad de ${menu.name}`} onClick={() => changeAvailableQuantity(menu, -1)} size="large" disabled={menu.availableQuantity === 0}><RemoveRounded /></IconButton><Typography sx={{ minWidth: 30, textAlign: 'center', fontWeight: 800 }}>{menu.availableQuantity}</Typography><IconButton aria-label={`Aumentar disponibilidad de ${menu.name}`} onClick={() => changeAvailableQuantity(menu, 1)} size="large"><AddRounded /></IconButton></Stack>

  const renderDayCard = (menu: MenuProduct) => <Grid item xs={12} sm={6} lg={4} key={menu.id}><Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: menu.availableToday ? 'selection.border' : 'divider', bgcolor: 'background.paper' }}>
    <Box sx={{ p: 2.25 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}><Box><Typography variant="h6" sx={{ fontWeight: 800 }}>{menu.name}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{menu.description}</Typography><Typography sx={{ color: 'primary.main', fontWeight: 800, mt: 1 }}>Q{menu.price}</Typography></Box>{menu.availableToday && <CheckCircleRounded color="primary" sx={{ fontSize: 28 }} />}</Stack>
    </Box>
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.25, pb: 1.5 }}><Stack><Typography variant="body2" color="text.secondary">Cantidad disponible</Typography>{renderQuantityControls(menu)}</Stack><Button variant="outlined" onClick={() => removeFromToday(menu)} sx={{ minHeight: 44 }}>Quitar de hoy</Button></Stack>
  </Card></Grid>

  const renderDayRow = (menu: MenuProduct) => <Paper key={menu.id} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: menu.availableToday ? 'selection.border' : 'divider', bgcolor: 'background.paper' }}><Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={1.5}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800 }}>{menu.name}</Typography><Typography variant="body2" color="text.secondary">{menu.description}</Typography></Box><Typography sx={{ color: 'primary.main', fontWeight: 800 }}>Q{menu.price}</Typography><Stack direction="row" alignItems="center" justifyContent="space-between"><Stack><Typography variant="body2" color="text.secondary">Cantidad disponible</Typography>{renderQuantityControls(menu)}</Stack><Button variant="outlined" onClick={() => removeFromToday(menu)} sx={{ minHeight: 44 }}>Quitar de hoy</Button></Stack></Stack></Paper>

  const renderCatalogCard = (menu: MenuProduct) => <Grid item xs={12} sm={6} lg={4} key={menu.id}><Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2.25 }}><Stack spacing={2} sx={{ height: '100%' }}><Box sx={{ flex: 1 }}><Stack direction="row" justifyContent="space-between" gap={1}><Typography variant="h6" sx={{ fontWeight: 800 }}>{menu.name}</Typography>{menu.availableToday && <CheckCircleRounded color="primary" fontSize="small" />}</Stack><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{menu.description}</Typography><Typography sx={{ color: 'primary.main', fontWeight: 800, mt: 1 }}>Q{menu.price}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{menu.availableToday ? `Disponible hoy · ${menu.availableQuantity} platos` : 'No disponible hoy'}</Typography></Box>{renderDayAction(menu)}<Stack direction="row" spacing={1}><Button fullWidth variant="outlined" startIcon={<EditRounded />} onClick={() => openEdit(menu)} sx={{ minHeight: 44 }}>Editar</Button><Button fullWidth variant="outlined" color="error" startIcon={<DeleteOutlineRounded />} onClick={() => setMenuToDelete(menu)} sx={{ minHeight: 44 }}>Eliminar</Button></Stack></Stack></Card></Grid>

  const renderCatalogRow = (menu: MenuProduct) => <Paper key={menu.id} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}><Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} gap={1.5}><Box sx={{ flex: 1, minWidth: 0 }}><Typography sx={{ fontWeight: 800 }}>{menu.name}</Typography><Typography variant="body2" color="text.secondary" noWrap>{menu.description}</Typography></Box><Typography sx={{ color: 'primary.main', fontWeight: 800, minWidth: 55 }}>Q{menu.price}</Typography>{renderDayAction(menu)}<Typography variant="body2" sx={{ minWidth: 75, fontWeight: 700 }}>{menu.availableQuantity} platos</Typography><Stack direction="row" spacing={0.75}><Button variant="outlined" startIcon={<EditRounded />} onClick={() => openEdit(menu)} sx={{ minHeight: 42 }}>Editar</Button><IconButton aria-label={`Eliminar ${menu.name}`} color="error" onClick={() => setMenuToDelete(menu)} sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 2, width: 42, height: 42 }}><DeleteOutlineRounded /></IconButton></Stack></Stack></Paper>

  const renderExtraCard = (extra: ExtraProduct) => <Grid item xs={12} sm={6} lg={4} key={extra.id}><Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: 2.25 }}><Stack spacing={2} sx={{ height: '100%' }}><Box sx={{ flex: 1 }}><Typography variant="h6" sx={{ fontWeight: 800 }}>{extra.name}</Typography><Typography sx={{ color: 'primary.main', fontWeight: 800, mt: 0.5 }}>Q{extra.price}</Typography><Typography variant="body2" color={extra.active ? 'success.main' : 'text.secondary'} sx={{ mt: 1, fontWeight: 700 }}>{extra.active ? 'Activo' : 'Inactivo'}</Typography></Box><Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}><Switch checked={extra.active} onChange={() => toggleExtra(extra)} inputProps={{ 'aria-label': `Activo: ${extra.name}` }} /><Stack direction="row" spacing={0.75}><Button variant="outlined" startIcon={<EditRounded />} onClick={() => openEditExtra(extra)} sx={{ minHeight: 44 }}>Editar</Button><IconButton aria-label={`Eliminar ${extra.name}`} color="error" onClick={() => setExtraToDelete(extra)} sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 2, width: 42, height: 42 }}><DeleteOutlineRounded /></IconButton></Stack></Stack></Stack></Card></Grid>
  const renderExtraRow = (extra: ExtraProduct) => <Paper key={extra.id} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}><Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} gap={1.5}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 800 }}>{extra.name}</Typography></Box><Typography sx={{ color: 'primary.main', fontWeight: 800, minWidth: 55 }}>Q{extra.price}</Typography><Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 125 }}><Switch checked={extra.active} onChange={() => toggleExtra(extra)} inputProps={{ 'aria-label': `Activo: ${extra.name}` }} /><Typography variant="body2" sx={{ fontWeight: 700 }}>{extra.active ? 'Activo' : 'Inactivo'}</Typography></Stack><Stack direction="row" spacing={0.75}><Button variant="outlined" startIcon={<EditRounded />} onClick={() => openEditExtra(extra)} sx={{ minHeight: 42 }}>Editar</Button><IconButton aria-label={`Eliminar ${extra.name}`} color="error" onClick={() => setExtraToDelete(extra)} sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 2, width: 42, height: 42 }}><DeleteOutlineRounded /></IconButton></Stack></Stack></Paper>

  const firstItem = filteredMenus.length === 0 ? 0 : (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, filteredMenus.length)

  return <Box component="section" aria-labelledby="menu-title">
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'flex-end' }} gap={2} sx={{ mb: 2 }}><Box><Typography id="menu-title" variant="h4" sx={{ fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.25rem' } }}>Menú</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>Organiza los menús disponibles del comedor.</Typography></Box><ToggleButtonGroup value={viewMode} exclusive onChange={(_, value: ViewMode | null) => value && setViewMode(value)} aria-label="Vista de menús" size="large" sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' }, bgcolor: 'background.paper' }}><ToggleButton value="cards" aria-label="Vista Tarjetas" sx={{ minWidth: 52 }}><GridView /></ToggleButton><ToggleButton value="list" aria-label="Vista Lista" sx={{ minWidth: 52 }}><ViewList /></ToggleButton></ToggleButtonGroup></Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}><TextField fullWidth value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar menú..." aria-label="Buscar menú" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded color="action" /></InputAdornment> }} /><Button variant="contained" startIcon={<AddRounded />} onClick={openCreate} sx={{ minHeight: 56, minWidth: { sm: 170 }, fontWeight: 800 }}>Crear menú</Button></Stack>

    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider', mb: 4 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} sx={{ mb: 2 }}><Box><Typography variant="h5" sx={{ fontWeight: 800 }}>Menú del día</Typography><Typography color="text.secondary" sx={{ mt: 0.5 }}>Activa las opciones y define sus platos disponibles.</Typography></Box><Typography sx={{ color: 'primary.main', fontWeight: 800 }}>Menús activos hoy: {menus.filter((menu) => menu.availableToday).length}</Typography></Stack>{activeMenus.length > 0 ? viewMode === 'cards' ? <Grid container spacing={1.5}>{activeMenus.map(renderDayCard)}</Grid> : <Stack spacing={1}>{activeMenus.map(renderDayRow)}</Stack> : <Box sx={{ py: 3, textAlign: 'center' }}><Typography color="text.secondary">{menus.some((menu) => menu.availableToday) ? 'No se encontraron menús.' : 'No hay menús activos hoy.'}</Typography>{!menus.some((menu) => menu.availableToday) && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Agrega opciones desde Menús disponibles.</Typography>}</Box>}<Button variant="contained" onClick={() => setMessage('Menú del día guardado.')} sx={{ mt: 2.5, minHeight: 48, fontWeight: 800 }}>Guardar menú del día</Button></Paper>

    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} sx={{ mb: 2 }}><Typography variant="h5" sx={{ fontWeight: 800 }}>Menús disponibles</Typography><Typography variant="body2" color="text.secondary">{filteredMenus.length === 0 ? 'No se encontraron menús.' : `Mostrando ${firstItem}–${lastItem} de ${filteredMenus.length} menús`}</Typography></Stack>
    {filteredMenus.length > 0 ? viewMode === 'cards' ? <Grid container spacing={1.5}>{paginatedMenus.map(renderCatalogCard)}</Grid> : <Stack spacing={1}>{paginatedMenus.map(renderCatalogRow)}</Stack> : <Typography color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>No se encontraron menús.</Typography>}
    {filteredMenus.length > 0 && <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mt: 3 }}><Pagination count={pageCount} page={page} onChange={(_, nextPage) => setPage(nextPage)} siblingCount={0} boundaryCount={1} color="primary" shape="rounded" /></Stack>}

    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} sx={{ mt: 4, mb: 2 }}><Box><Typography variant="h5" sx={{ fontWeight: 800 }}>Extras</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Gestiona los extras disponibles para los pedidos.</Typography></Box><Stack direction="row" alignItems="center" gap={2}><Typography variant="body2" color="text.secondary">{filteredExtras.length === 0 ? 'No se encontraron extras.' : `Mostrando ${filteredExtras.length === 0 ? 0 : (extrasPage - 1) * pageSize + 1}–${Math.min(extrasPage * pageSize, filteredExtras.length)} de ${filteredExtras.length} extras`}</Typography><Button variant="contained" startIcon={<AddRounded />} onClick={openCreateExtra} sx={{ minHeight: 48, fontWeight: 800 }}>Crear extra</Button></Stack></Stack>
    {filteredExtras.length > 0 ? viewMode === 'cards' ? <Grid container spacing={1.5}>{paginatedExtras.map(renderExtraCard)}</Grid> : <Stack spacing={1}>{paginatedExtras.map(renderExtraRow)}</Stack> : <Typography color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>No se encontraron extras.</Typography>}
    {filteredExtras.length > 0 && <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}><Pagination count={extrasPageCount} page={extrasPage} onChange={(_, nextPage) => setExtrasPage(nextPage)} siblingCount={0} boundaryCount={1} color="primary" shape="rounded" /></Stack>}

    {message && <Alert severity="success" onClose={() => setMessage('')} sx={{ mt: 2 }}>{message}</Alert>}<MenuDialog open={dialogOpen} menu={editingMenu} onClose={() => setDialogOpen(false)} onSave={handleSave} /><ExtraDialog open={extraDialogOpen} extra={editingExtra} onClose={() => setExtraDialogOpen(false)} onSave={handleSaveExtra} /><Dialog open={Boolean(menuToDelete)} onClose={() => setMenuToDelete(null)} fullWidth maxWidth="xs"><DialogTitle sx={{ fontWeight: 800 }}>¿Deseas eliminar este menú?</DialogTitle><DialogContent><Typography color="text.secondary">{menuToDelete?.name} dejará de estar disponible en el catálogo.</Typography></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={() => setMenuToDelete(null)} variant="outlined">Cancelar</Button><Button onClick={handleDelete} variant="contained" color="error">Eliminar</Button></DialogActions></Dialog><Dialog open={Boolean(extraToDelete)} onClose={() => setExtraToDelete(null)} fullWidth maxWidth="xs"><DialogTitle sx={{ fontWeight: 800 }}>¿Deseas eliminar este extra?</DialogTitle><DialogContent><Typography color="text.secondary">{extraToDelete?.name} dejará de estar disponible para los pedidos.</Typography></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={() => setExtraToDelete(null)} variant="outlined">Cancelar</Button><Button onClick={handleDeleteExtra} variant="contained" color="error">Eliminar</Button></DialogActions></Dialog>
  </Box>
}
