import { useEffect, useMemo, useState } from 'react'
import { GridView, ViewList } from '@mui/icons-material'
import { Box, Grid, Pagination, Stack, Tab, Tabs, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { Order, OrderStatus } from '../types/order'
import { OrderCard } from './OrderCard'
import { OrderGridCard } from './OrderGridCard'

type OrdersListProps = { orders: Order[]; filter: OrderStatus; selectedId: string; onFilterChange: (filter: OrderStatus) => void; onSelect: (id: string) => void }
type ViewMode = 'list' | 'grid'

const pageSize = 10

function timeToMinutes(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return Number.MAX_SAFE_INTEGER
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 ? hours * 60 + minutes : Number.MAX_SAFE_INTEGER
}

function sortOrders(orders: Order[], status: OrderStatus) {
  if (status !== 'in-progress') return [...orders].sort((first, second) => second.createdAt.localeCompare(first.createdAt))

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  return [...orders].sort((first, second) => {
    const firstPromise = timeToMinutes(first.promiseTime)
    const secondPromise = timeToMinutes(second.promiseTime)
    const firstOverdue = firstPromise < currentMinutes
    const secondOverdue = secondPromise < currentMinutes

    if (firstOverdue !== secondOverdue) return firstOverdue ? -1 : 1
    return firstPromise - secondPromise || first.createdAt.localeCompare(second.createdAt)
  })
}

export function OrdersList({ orders, filter, selectedId, onFilterChange, onSelect }: OrdersListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [page, setPage] = useState(1)
  const [now, setNow] = useState(Date.now())
  const counts = useMemo(() => ({
    'in-progress': orders.filter((order) => order.status === 'in-progress').length,
    completed: orders.filter((order) => order.status === 'completed').length,
    cancelled: orders.filter((order) => order.status === 'cancelled').length,
  }), [orders])
  const sortedOrders = useMemo(() => sortOrders(orders.filter((order) => order.status === filter), filter), [filter, now, orders])
  const pageCount = Math.max(1, Math.ceil(sortedOrders.length / pageSize))
  const paginatedOrders = sortedOrders.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => { setPage(1) }, [filter])
  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount])
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const handleFilterChange = (nextFilter: OrderStatus) => {
    setPage(1)
    onFilterChange(nextFilter)
    const nextOrders = sortOrders(orders.filter((order) => order.status === nextFilter), nextFilter)
    if (nextOrders[0]) onSelect(nextOrders[0].id)
  }

  const firstItem = sortedOrders.length === 0 ? 0 : (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, sortedOrders.length)

  return (
    <Box component="section" aria-labelledby="orders-title">
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'flex-end' }} gap={2}>
        <Box>
          <Typography id="orders-title" variant="h4" sx={{ fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.25rem' } }}>Pedidos</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Revisa y actualiza los pedidos del comedor.</Typography>
        </Box>
        <ToggleButtonGroup value={viewMode} exclusive onChange={(_, value: ViewMode | null) => value && setViewMode(value)} aria-label="Vista de pedidos" size="large" sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' }, bgcolor: 'background.paper' }}>
          <ToggleButton value="list" aria-label="Vista Lista" sx={{ minWidth: 52 }}><ViewList /></ToggleButton>
          <ToggleButton value="grid" aria-label="Vista Tarjetas" sx={{ minWidth: 52 }}><GridView /></ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Tabs value={filter} onChange={(_, value: OrderStatus) => handleFilterChange(value)} sx={{ mt: 2, mb: 2.5, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="in-progress" label={`En proceso (${counts['in-progress']})`} sx={{ minHeight: 48, px: 1.5, mr: 2 }} />
        <Tab value="completed" label={`Completados (${counts.completed})`} sx={{ minHeight: 48, px: 1.5, mr: 2 }} />
        <Tab value="cancelled" label={`Cancelados (${counts.cancelled})`} sx={{ minHeight: 48, px: 1.5 }} />
      </Tabs>

      {paginatedOrders.length > 0 ? viewMode === 'list' ? (
        <Stack spacing={1.5}>{paginatedOrders.map((order) => <OrderCard key={order.id} order={order} selected={order.id === selectedId} onSelect={() => onSelect(order.id)} now={now} />)}</Stack>
      ) : (
        <Grid container spacing={1.5}>{paginatedOrders.map((order) => <Grid item xs={12} sm={6} xl={4} key={order.id}><OrderGridCard order={order} selected={order.id === selectedId} onSelect={() => onSelect(order.id)} now={now} /></Grid>)}</Grid>
      ) : <Typography color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>No hay pedidos en esta sección.</Typography>}

      {sortedOrders.length > 0 && <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">Mostrando {firstItem}–{lastItem} de {sortedOrders.length}</Typography>
        <Pagination count={pageCount} page={page} onChange={(_, nextPage) => setPage(nextPage)} siblingCount={0} boundaryCount={1} color="primary" shape="rounded" />
      </Stack>}
    </Box>
  )
}
