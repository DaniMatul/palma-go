import { useEffect, useState } from 'react'
import { ChevronLeftRounded, ChevronRightRounded, SearchRounded, Tune, Visibility } from '@mui/icons-material'
import { Alert, Badge, Box, Button, CircularProgress, Divider, FormControl, IconButton, InputAdornment, InputLabel, MenuItem, Pagination, PaginationItem, Paper, Popover, Select, Snackbar, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
import { DateRange, dateKey, formatHistoryDate, historyCurrency, HistoryOrder, HistoryPeriod, historyTotals, movePeriod, parseDate, periodRange } from '../types/history'
import { displayOrderNumber, OrderStatus, orderTotal } from '../types/order'
import { OrderStatusChip } from './OrderStatusChip'
import { HistoryOrderDialog } from './HistoryOrderDialog'
import { getOrders } from '../services/orderService'

const periodOptions = [{ value: 'day', label: 'Día' }, { value: 'week', label: 'Semana' }, { value: 'month', label: 'Mes' }] as const
const historyGridColumns = '1.1fr 1.6fr 1.2fr 0.8fr 0.9fr 1fr 0.6fr'
type HistoryFilters = { customer: string; date: string; status: 'all' | OrderStatus; minTotal: string; maxTotal: string }
const emptyHistoryFilters: HistoryFilters = { customer: '', date: '', status: 'all', minTotal: '', maxTotal: '' }

export function HistoryView() {
  const [orders, setOrders] = useState<HistoryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [period, setPeriod] = useState<HistoryPeriod>('day')
  const [anchor, setAnchor] = useState(() => dateKey(new Date()))
  const [custom, setCustom] = useState<DateRange>({ start: anchor, end: anchor })
  const [draft, setDraft] = useState(custom)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<HistoryOrder | null>(null)
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null)
  const [filters, setFilters] = useState<HistoryFilters>(emptyHistoryFilters)
  const [draftFilters, setDraftFilters] = useState<HistoryFilters>(emptyHistoryFilters)
  const [filterError, setFilterError] = useState('')

  const range = period === 'custom' ? custom : periodRange(anchor, period)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getOrders({ from: range.start, to: range.end })
      .then((loadedOrders) => {
        if (!cancelled) setOrders(loadedOrders)
      })
      .catch(() => {
        if (!cancelled) setLoadError('No se pudo cargar el historial.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [range.start, range.end])

  const periodOrders = orders
  const totals = historyTotals(periodOrders)
  const query = search.trim().toLocaleLowerCase('es')
  const filtered = periodOrders
    .filter((order) => `${displayOrderNumber(order)} ${order.customerName}`.toLocaleLowerCase('es').includes(query))
    .filter((order) => {
      const customer = filters.customer.trim().toLocaleLowerCase('es')
      const total = orderTotal(order)
      const min = filters.minTotal === '' ? null : Number(filters.minTotal)
      const max = filters.maxTotal === '' ? null : Number(filters.maxTotal)
      return (!customer || order.customerName.toLocaleLowerCase('es').includes(customer))
        && (!filters.date || order.date === filters.date)
        && (filters.status === 'all' || order.status === filters.status)
        && (min === null || total >= min)
        && (max === null || total <= max)
    })
    .sort((a, b) => `${b.date}T${b.createdAt}`.localeCompare(`${a.date}T${a.createdAt}`))
  const pages = Math.max(1, Math.ceil(filtered.length / 20))
  const currentPage = Math.min(page, pages)
  const visible = filtered.slice((currentPage - 1) * 20, currentPage * 20)
  const periodLabel = period === 'month'
    ? parseDate(anchor).toLocaleDateString('es-GT', { month: 'long', year: 'numeric' })
    : range.start === range.end ? formatHistoryDate(range.start) : `${formatHistoryDate(range.start)} – ${formatHistoryDate(range.end)}`
  const customLabel = `${formatHistoryDate(custom.start)} – ${formatHistoryDate(custom.end)}`
  const filtersActive = Object.values(filters).some((value) => value !== '' && value !== 'all')

  const navigate = (direction: number) => { setAnchor(movePeriod(anchor, period, direction)); setPage(1) }
  const reset = () => { const today = dateKey(new Date()); setAnchor(today); setCustom({ start: today, end: today }); setDraft({ start: today, end: today }); setPeriod('day'); setPage(1); setError('') }
  const apply = () => {
    if (!draft.start || !draft.end) { setError('Selecciona ambas fechas.'); return }
    if (draft.start > draft.end) { setError('La fecha inicial no puede ser posterior a la fecha final.'); return }
    setCustom(draft); setPeriod('custom'); setError(''); setPage(1)
  }
  const applyColumnFilters = () => {
    const min = draftFilters.minTotal === '' ? null : Number(draftFilters.minTotal)
    const max = draftFilters.maxTotal === '' ? null : Number(draftFilters.maxTotal)
    if ((min !== null && Number.isNaN(min)) || (max !== null && Number.isNaN(max))) { setFilterError('Ingresa montos válidos.'); return }
    if (min !== null && max !== null && min > max) { setFilterError('El monto mínimo no puede ser mayor al máximo.'); return }
    setFilters(draftFilters); setFilterError(''); setFilterAnchor(null); setPage(1)
  }
  const clearColumnFilters = () => { setFilters(emptyHistoryFilters); setDraftFilters(emptyHistoryFilters); setFilterError(''); setFilterAnchor(null); setPage(1) }

  return <Stack spacing={3}>
    <Box><Typography variant="h4" fontWeight={800}>Historial</Typography><Typography color="text.secondary">Consulta de ventas y pedidos</Typography></Box>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 7fr) minmax(280px, 3fr)' }, gap: 3, alignItems: 'stretch' }}>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2.5}>
          <ToggleButtonGroup exclusive value={period === 'custom' ? null : period} onChange={(_, value: Exclude<HistoryPeriod, 'custom'> | null) => { if (value) { setPeriod(value); setPage(1); setError('') } }} aria-label="Periodo del historial">
            {periodOptions.map((option) => <ToggleButton key={option.value} value={option.value}>{option.label}</ToggleButton>)}
          </ToggleButtonGroup>
          <Stack direction="row" alignItems="center" gap={1}>
            <IconButton size="large" aria-label="Periodo anterior" onClick={() => navigate(-1)} disabled={period === 'custom'}><ChevronLeftRounded /></IconButton>
            <Typography sx={{ textAlign: 'center', fontWeight: 600, flex: 1, textTransform: 'capitalize' }}>{period === 'custom' ? customLabel : periodLabel}</Typography>
            <IconButton size="large" aria-label="Periodo siguiente" onClick={() => navigate(1)} disabled={period === 'custom'}><ChevronRightRounded /></IconButton>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
            {[
              { title: 'Total vendido', value: historyCurrency(totals.sold), color: '#5E66B8' },
              { title: 'Pedidos', value: String(totals.count), color: '#6B72C4' },
              { title: 'Ticket promedio', value: historyCurrency(totals.average), color: '#7167B5' },
            ].map(({ title, value, color }) => <Box key={title} sx={{ height: { xs: 150, sm: 160 }, p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 2.25, bgcolor: '#EEF0FA', boxShadow: 'none' }}><Typography variant="h4" fontWeight={700} color={color}>{value}</Typography><Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ mt: 1 }}>{title}</Typography></Box>)}
          </Box>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}><Typography variant="h6" fontWeight={800}>Rango personalizado</Typography><Button size="small" onClick={reset}>Restablecer</Button></Stack>
          <TextField label="Desde" type="date" value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} InputLabelProps={{ shrink: true }} error={Boolean(error)} fullWidth />
          <TextField label="Hasta" type="date" value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} InputLabelProps={{ shrink: true }} error={Boolean(error)} fullWidth />
          <Button variant="contained" onClick={apply} fullWidth>Aplicar rango</Button>
          {error && <Alert severity="error">{error}</Alert>}
          {period === 'custom' && <Typography variant="body2" color="text.secondary">Rango activo: {customLabel}</Typography>}
        </Stack>
      </Paper>
    </Box>

    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} gap={2} sx={{ p: { xs: 2, sm: 3 }, pb: 2 }}>
        <Typography variant="h6" fontWeight={800}>Ventas realizadas</Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' } }}>
          <TextField size="small" placeholder="Buscar por pedido o cliente..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} inputProps={{ 'aria-label': 'Buscar por pedido o cliente' }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> }} sx={{ flex: 1, width: { md: 340 } }} />
          <Tooltip title="Filtros">
            <Badge variant="dot" color="primary" invisible={!filtersActive} overlap="circular">
              <IconButton aria-label="Filtros" onClick={(event) => setFilterAnchor(filterAnchor ? null : event.currentTarget)} sx={{ width: 42, height: 42, color: 'primary.main', bgcolor: 'background.secondary', borderRadius: 1.5 }}><Tune /></IconButton>
            </Badge>
          </Tooltip>
        </Stack>
      </Stack>
      <Popover open={Boolean(filterAnchor)} anchorEl={filterAnchor} onClose={() => setFilterAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Stack spacing={1.5} sx={{ width: { xs: 300, sm: 360 }, maxWidth: 'calc(100vw - 32px)', p: 2.5 }}>
          <Typography fontWeight={800}>Filtros</Typography>
          <TextField size="small" label="Cliente" value={draftFilters.customer} onChange={(event) => setDraftFilters({ ...draftFilters, customer: event.target.value })} fullWidth />
          <TextField size="small" label="Fecha" type="date" value={draftFilters.date} onChange={(event) => setDraftFilters({ ...draftFilters, date: event.target.value })} InputLabelProps={{ shrink: true }} fullWidth />
          <FormControl size="small" fullWidth>
            <InputLabel id="history-status-filter-label">Estado</InputLabel>
            <Select labelId="history-status-filter-label" label="Estado" value={draftFilters.status} onChange={(event) => setDraftFilters({ ...draftFilters, status: event.target.value as HistoryFilters['status'] })}>
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="completed">Completado</MenuItem>
              <MenuItem value="cancelled">Cancelado</MenuItem>
              <MenuItem value="in-progress">En proceso</MenuItem>
            </Select>
          </FormControl>
          <Stack direction="row" spacing={1}>
            <TextField size="small" label="Monto mínimo" placeholder="0.00" type="number" value={draftFilters.minTotal} onChange={(event) => setDraftFilters({ ...draftFilters, minTotal: event.target.value })} InputProps={{ startAdornment: <InputAdornment position="start">Q</InputAdornment> }} inputProps={{ min: 0 }} sx={{ flex: 1, minWidth: 0, '& input[type=number]': { paddingRight: 1, MozAppearance: 'textfield' }, '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } }} />
            <TextField size="small" label="Monto máximo" placeholder="0.00" type="number" value={draftFilters.maxTotal} onChange={(event) => setDraftFilters({ ...draftFilters, maxTotal: event.target.value })} InputProps={{ startAdornment: <InputAdornment position="start">Q</InputAdornment> }} inputProps={{ min: 0 }} sx={{ flex: 1, minWidth: 0, '& input[type=number]': { paddingRight: 1, MozAppearance: 'textfield' }, '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } }} />
          </Stack>
          {filterError && <Alert severity="error">{filterError}</Alert>}
          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Button size="small" onClick={clearColumnFilters}>Limpiar filtros</Button>
            <Button variant="contained" size="small" onClick={applyColumnFilters}>Aplicar filtros</Button>
          </Stack>
        </Stack>
      </Popover>
      <Divider />
      <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: historyGridColumns, gap: 2, px: 3, py: 1.5, alignItems: 'center', bgcolor: 'background.secondary' }}>
        {['Pedido', 'Cliente', 'Fecha', 'Hora', 'Total', 'Estado', 'Acción'].map((heading) => <Typography key={heading} variant="caption" color="text.secondary" fontWeight={700} sx={{ textAlign: 'center' }}>{heading}</Typography>)}
      </Box>
      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 180 }}><CircularProgress color="primary" /></Box> : visible.map((order) => <Box key={order.id} component="div" role="button" tabIndex={0} onClick={() => setSelected(order)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(order) } }} aria-label={`Ver detalle ${displayOrderNumber(order)}`} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', md: historyGridColumns }, width: '100%', gap: 2, px: { xs: 2, sm: 3 }, py: 1.5, alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 0 }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 }, cursor: 'pointer' }}>
        <Typography fontWeight={600} sx={{ textAlign: 'left' }}>Pedido {displayOrderNumber(order)}</Typography><Typography sx={{ textAlign: 'left', minWidth: 0 }}>{order.customerName}</Typography><Typography variant="body2" color="text.secondary" sx={{ textAlign: 'left', whiteSpace: 'nowrap' }}>{formatHistoryDate(order.date)}</Typography><Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>{order.createdAt}</Typography><Typography fontWeight={600} sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{historyCurrency(orderTotal(order))}</Typography><Box sx={{ display: 'flex', justifyContent: 'center' }}><OrderStatusChip status={order.status} /></Box><Tooltip title="Ver detalle"><IconButton aria-label={`Ver detalle ${displayOrderNumber(order)}`} onClick={(event) => { event.stopPropagation(); setSelected(order) }} sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, justifySelf: { xs: 'center', md: 'center' }, width: 30, height: 30, color: 'rgba(98, 105, 184, 0.65)', bgcolor: 'rgba(98, 105, 184, 0.05)', borderRadius: '50%', boxShadow: 'none', '&:hover': { bgcolor: 'rgba(98, 105, 184, 0.10)' } }}><Visibility sx={{ fontSize: 17 }} /></IconButton></Tooltip>
      </Box>)}
      {!loading && !visible.length && <Typography sx={{ p: 4, textAlign: 'center' }} color="text.secondary">{periodOrders.length ? 'No se encontraron pedidos.' : 'No hay pedidos registrados para este período.'}</Typography>}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" gap={2} sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="body2" color="text.secondary">Mostrando {filtered.length ? (currentPage - 1) * 20 + 1 : 0}–{Math.min(currentPage * 20, filtered.length)} de {filtered.length} ventas</Typography>
        <Pagination count={pages} page={currentPage} onChange={(_, value) => setPage(value)} siblingCount={0} color="primary" renderItem={(item) => <PaginationItem {...item} slots={{ previous: () => <span>Anterior</span>, next: () => <span>Siguiente</span> }} sx={{ minHeight: 44 }} />} />
      </Stack>
    </Paper>
    <HistoryOrderDialog order={selected} onClose={() => setSelected(null)} />
    <Snackbar open={Boolean(loadError)} autoHideDuration={5000} onClose={() => setLoadError('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}><Alert severity="error" onClose={() => setLoadError('')} sx={{ width: '100%' }}>{loadError}</Alert></Snackbar>
  </Stack>
}
