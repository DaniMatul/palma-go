import { useCallback, useEffect, useMemo, useState } from 'react'
import { AddRounded, CloseRounded, DeleteOutlineRounded, EditRounded } from '@mui/icons-material'
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, Drawer, FormControlLabel, IconButton, MenuItem, Pagination, Paper, Select, Snackbar, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { createExtra, deleteExtra, getExtras, updateExtra } from '../services/extraService'
import { createMenuOption, deactivateMenuOption, getMenuOptions, updateMenuOption } from '../services/menuOptionService'
import type { Extra, MenuOption, MenuOptionKind } from '../types/menu'

type CatalogEntry = { id: string; option: MenuOption | null; extra: Extra | null; name: string; price: number; active: boolean; description: string; categories: string[] }
type FormValues = { name: string; description: string; price: string; categories: string[] }
const categories = [
  { value: 'BREAKFAST', label: 'Desayuno' },
  { value: 'SNACK', label: 'Refacción' },
  { value: 'LUNCH', label: 'Almuerzo' },
] as const
const labels: Record<MenuOptionKind, string> = { PRIMARY: 'Principal', COMPLEMENT: 'Complemento', EXTRA: 'Extra' }
const pageSize = 20
const emptyForm: FormValues = { name: '', description: '', price: '', categories: [] }

export function CatalogManagement() {
  const [tab, setTab] = useState<MenuOptionKind>('PRIMARY')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [options, setOptions] = useState<MenuOption[]>([])
  const [extras, setExtras] = useState<Extra[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CatalogEntry | null>(null)
  const [form, setForm] = useState<FormValues>(emptyForm)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [loadedOptions, loadedExtras] = await Promise.all([
        getMenuOptions({ kind: tab }),
        tab === 'EXTRA' ? getExtras() : Promise.resolve([]),
      ])
      setOptions(loadedOptions)
      setExtras(loadedExtras)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el catálogo.')
    } finally {
      setLoading(false)
    }
  }, [tab])
  useEffect(() => { void load() }, [load])
  useEffect(() => { setSearch(''); setCategory(''); setPage(1) }, [tab])

  const entries = useMemo(() => {
    if (tab !== 'EXTRA') return options.map((option): CatalogEntry => ({
      id: option.id, option, extra: null, name: option.name, price: option.price, active: option.active,
      description: option.description ?? '', categories: option.categories?.map((item) => item.category) ?? [],
    }))
    const linked = new Map(options.filter((option) => option.legacyExtraId).map((option) => [option.legacyExtraId, option]))
    const legacyEntries = extras.map((extra): CatalogEntry => {
      const option = linked.get(extra.id) ?? null
      return { id: option?.id ?? extra.id, option, extra, name: extra.name, price: extra.price, active: extra.active,
        description: option?.description ?? '', categories: option?.categories?.map((item) => item.category) ?? [] }
    })
    const legacyIds = new Set(extras.map((extra) => extra.id))
    const standalone = options.filter((option) => !option.legacyExtraId || !legacyIds.has(option.legacyExtraId)).map((option): CatalogEntry => ({
      id: option.id, option, extra: null, name: option.name, price: option.price, active: option.active,
      description: option.description ?? '', categories: option.categories?.map((item) => item.category) ?? [],
    }))
    return [...legacyEntries, ...standalone].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [extras, options, tab])
  const filtered = useMemo(() => entries.filter((entry) =>
    entry.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
    && (!category || entry.categories.includes(category) || (tab === 'EXTRA' && entry.categories.length === 0)),
  ), [entries, search, category, tab])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount])

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormError(''); setFormOpen(true) }
  const openEdit = (entry: CatalogEntry) => {
    setEditing(entry)
    setForm({ name: entry.name, description: entry.description, price: String(entry.price), categories: entry.categories })
    setFormError('')
    setFormOpen(true)
  }
  const toggleCategory = (value: string) => setForm((current) => ({
    ...current, categories: current.categories.includes(value)
      ? current.categories.filter((item) => item !== value) : [...current.categories, value],
  }))

  const save = async () => {
    const price = Number(form.price)
    if (!form.name.trim() || !form.price.trim() || !Number.isFinite(price) || price < 0) {
      setFormError('Ingresa un nombre y un precio válido.')
      return
    }
    if (tab !== 'EXTRA' && form.categories.length === 0) {
      setFormError('Selecciona al menos una categoría.')
      return
    }
    setBusy(true)
    setFormError('')
    try {
      const data = { name: form.name.trim(), description: form.description.trim(), price, categories: form.categories }
      if (editing?.option) {
        await updateMenuOption(editing.option.id, data)
      } else if (editing?.extra) {
        await updateExtra(editing.extra.id, { name: data.name, price: data.price })
        const canonical = (await getMenuOptions({ kind: 'EXTRA' })).find((option) => option.legacyExtraId === editing.extra?.id)
        if (!canonical) throw new Error('El extra se guardó, pero falta su opción canónica para asociar categorías.')
        await updateMenuOption(canonical.id, { description: data.description, categories: data.categories })
      } else if (tab === 'EXTRA') {
        const extra = await createExtra({ name: data.name, price: data.price })
        const canonical = (await getMenuOptions({ kind: 'EXTRA' })).find((option) => option.legacyExtraId === extra.id)
        if (!canonical) throw new Error('El extra se creó, pero falta su opción canónica para asociar categorías.')
        if (data.description || data.categories.length) await updateMenuOption(canonical.id, { description: data.description, categories: data.categories })
      } else {
        await createMenuOption({ ...data, kind: tab })
      }
      await load()
      setFormOpen(false)
      setMessage(editing ? 'Registro actualizado.' : 'Registro creado.')
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar el registro.')
      await load()
    } finally {
      setBusy(false)
    }
  }
  const deactivate = async (entry: CatalogEntry) => {
    setBusy(true)
    setError('')
    try {
      if (entry.option) await deactivateMenuOption(entry.option.id)
      else if (entry.extra) await deleteExtra(entry.extra.id)
      await load()
      setMessage('Registro desactivado.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo desactivar el registro.')
    } finally {
      setBusy(false)
    }
  }

  return <Box component="section" aria-labelledby="catalog-title">
    <Typography id="catalog-title" variant="h4" sx={{ fontWeight: 800 }}>Opciones</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>Administra principales, complementos y extras del catálogo.</Typography>
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={2.5}>
        <Tabs value={tab} onChange={(_, next: MenuOptionKind) => setTab(next)} variant="scrollable" allowScrollButtonsMobile aria-label="Tipo de opción">
          <Tab value="PRIMARY" label="Principales" /><Tab value="COMPLEMENT" label="Complementos" /><Tab value="EXTRA" label="Extras" />
        </Tabs>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField size="small" label="Buscar por nombre" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} sx={{ flex: 1 }} />
          <Select size="small" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1) }} displayEmpty aria-label="Filtrar por categoría" sx={{ minWidth: 200 }}>
            <MenuItem value="">Todas las categorías</MenuItem>
            {categories.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
          </Select>
          <Button variant="contained" startIcon={<AddRounded />} onClick={openCreate} disabled={busy}>Crear {labels[tab].toLocaleLowerCase()}</Button>
        </Stack>
        {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void load()}>Reintentar</Button>}>{error}</Alert>}
        {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box> : filtered.length === 0 ? <Alert severity="info">No hay registros para los filtros seleccionados.</Alert> : <Stack spacing={1}>
          {visible.map((entry) => <Stack key={entry.id} direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} gap={1.5} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}><Typography sx={{ fontWeight: 700 }}>{entry.name}</Typography><Typography variant="body2" color="text.secondary">Q{entry.price.toFixed(2)} · {entry.categories.length ? entry.categories.map((value) => categories.find((item) => item.value === value)?.label ?? value).join(', ') : tab === 'EXTRA' ? 'Todas las categorías' : 'Sin categoría'}</Typography></Box>
            <Chip label={entry.active ? 'Activo' : 'Inactivo'} size="small" color={entry.active ? 'success' : 'default'} />
            <Button variant="outlined" size="small" startIcon={<EditRounded />} onClick={() => openEdit(entry)} disabled={busy}>Editar</Button>
            <Button variant="outlined" size="small" color="error" startIcon={<DeleteOutlineRounded />} onClick={() => void deactivate(entry)} disabled={busy || !entry.active}>Desactivar</Button>
          </Stack>)}
        </Stack>}
        {filtered.length > pageSize && <Stack direction="row" justifyContent="flex-end"><Pagination count={pageCount} page={page} onChange={(_, next) => setPage(next)} siblingCount={0} boundaryCount={1} /></Stack>}
      </Stack>
    </Paper>
    <Drawer anchor="right" open={formOpen} onClose={busy ? undefined : () => setFormOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, maxWidth: '100%', bgcolor: 'background.paper', borderRadius: { xs: 0, sm: '20px 0 0 20px' } } }}>
      <Stack sx={{ height: '100%' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 2.25, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{editing ? 'Editar' : 'Crear'} {labels[tab].toLocaleLowerCase()}</Typography>
          <IconButton aria-label="Cerrar" onClick={() => setFormOpen(false)} disabled={busy}><CloseRounded /></IconButton>
        </Stack>
        <Stack spacing={2} sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField label="Nombre" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} autoFocus />
          <TextField label="Descripción" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} multiline minRows={2} />
          <TextField label="Precio" type="number" inputProps={{ min: 0, step: 0.01 }} value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} InputProps={{ startAdornment: 'Q' }} />
          <Box><Typography sx={{ fontWeight: 700 }}>Categorías</Typography><Stack direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap">{categories.map((item) => <FormControlLabel key={item.value} control={<Checkbox checked={form.categories.includes(item.value)} onChange={() => toggleCategory(item.value)} />} label={item.label} />)}</Stack>{tab === 'EXTRA' && <Typography variant="body2" color="text.secondary">Sin categorías seleccionadas, se ofrece en todas.</Typography>}</Box>
        </Stack>
        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}><Button variant="outlined" onClick={() => setFormOpen(false)} disabled={busy}>Cancelar</Button><Button variant="contained" onClick={() => void save()} disabled={busy}>Guardar</Button></Stack>
      </Stack>
    </Drawer>
    <Snackbar open={Boolean(message)} autoHideDuration={4000} onClose={() => setMessage('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}><Alert severity="success" onClose={() => setMessage('')}>{message}</Alert></Snackbar>
  </Box>
}
