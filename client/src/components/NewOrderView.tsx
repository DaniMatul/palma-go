import { useEffect, useMemo, useState } from 'react'
import { AddCircleOutlineRounded, PersonAddAltRounded } from '@mui/icons-material'
import { Alert, Box, Button, Card, CircularProgress, Grid, Snackbar, Stack, TextField, Typography } from '@mui/material'
import { getDailyMenu } from '../services/dailyMenuService'
import { getExtras } from '../services/extraService'
import { createOrder, CreateOrderInput } from '../services/orderService'
import { addMinutesToTime } from '../types/order'
import { DailyMenuItem, Extra, OrderLine } from '../types/menu'
import { CustomProductDialog } from './CustomProductDialog'
import { ExtrasDialog } from './ExtrasDialog'
import { NewOrderSummary } from './NewOrderSummary'
import { ProductCard } from './ProductCard'

function getCurrentTime() {
  return new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const emptyQuantities = (menus: DailyMenuItem[]) => Object.fromEntries(menus.map((product) => [product.id, 0]))

type NewOrderViewProps = { onOrderCreated?: () => Promise<void> | void }

export function NewOrderView({ onOrderCreated }: NewOrderViewProps) {
  const [menus, setMenus] = useState<DailyMenuItem[]>([])
  const [extras, setExtras] = useState<Extra[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [address, setAddress] = useState('')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [extraItems, setExtraItems] = useState<OrderLine[]>([])
  const [customItems, setCustomItems] = useState<OrderLine[]>([])
  const [extrasOpen, setExtrasOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [createdAt, setCreatedAt] = useState(getCurrentTime)
  const [notification, setNotification] = useState<{ severity: 'success' | 'error'; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const promiseTime = useMemo(() => addMinutesToTime(createdAt, 20), [createdAt])
  const orderItems = useMemo(() => [
    ...menus.filter((product) => (quantities[product.id] ?? 0) > 0).map((product) => ({ id: product.menuItemId, name: product.name, price: product.price, quantity: quantities[product.id] })),
    ...extraItems,
    ...customItems,
  ], [customItems, extraItems, menus, quantities])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    Promise.all([getDailyMenu(), getExtras()])
      .then(([dailyMenu, loadedExtras]) => {
        if (cancelled) return
        setMenus(dailyMenu.items)
        setExtras(loadedExtras)
        setQuantities(emptyQuantities(dailyMenu.items))
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el menú de hoy')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const changeQuantity = (product: DailyMenuItem, amount: number) => {
    setNotification(null)
    setQuantities((current) => {
      const currentQuantity = current[product.id] ?? 0
      const nextQuantity = Math.max(0, Math.min(product.remainingQuantity, currentQuantity + amount))
      return { ...current, [product.id]: nextQuantity }
    })
  }

  const handleCreate = async () => {
    if (submitting) return
    const missingFields: string[] = []
    if (!customerName.trim()) missingFields.push('el nombre del cliente')
    if (!address.trim()) missingFields.push('la dirección')
    if (orderItems.length === 0) missingFields.push('al menos un producto')
    if (missingFields.length > 0) {
      setNotification({ severity: 'error', message: `Completa ${missingFields.join(', ')}.` })
      return
    }
    setSubmitting(true)
    setError('')
    setNotification(null)
    const input: CreateOrderInput = {
      customerName: customerName.trim(),
      address: address.trim(),
      items: [
        ...menus.filter((product) => (quantities[product.id] ?? 0) > 0).map((product) => ({ type: 'MENU' as const, menuItemId: product.menuItemId, quantity: quantities[product.id] })),
        ...extraItems.map((item) => ({ type: 'EXTRA' as const, extraId: item.id, quantity: item.quantity })),
        ...customItems.map((item) => ({ type: 'CUSTOM' as const, description: item.name, unitPrice: item.price, quantity: item.quantity })),
      ],
    }

    try {
      await createOrder(input)
      setNotification({ severity: 'success', message: 'Pedido creado correctamente' })
      setCustomerName('')
      setAddress('')
      setQuantities(emptyQuantities(menus))
      setExtraItems([])
      setCustomItems([])
      setCreatedAt(getCurrentTime())
      try {
        const latestMenu = await getDailyMenu()
        setMenus(latestMenu.items)
        setQuantities(emptyQuantities(latestMenu.items))
        await onOrderCreated?.()
      } catch {
        console.error('No se pudo actualizar el menú del día después de crear el pedido')
        setNotification({ severity: 'error', message: 'El pedido se creó, pero no se pudo actualizar la disponibilidad en pantalla.' })
      }
    } catch (requestError: unknown) {
      console.error(requestError)
      setNotification({ severity: 'error', message: requestError instanceof Error ? requestError.message : 'No se pudo crear el pedido' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress color="primary" /></Box>

  return (
    <Box component="section" aria-labelledby="new-order-title">
      <Typography id="new-order-title" variant="h4" sx={{ fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.25rem' } }}>Nuevo pedido</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>Registra rápidamente un pedido para el comedor.</Typography>
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={{ xs: 3, lg: 4 }}>
        <Grid item xs={12} lg={8}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth label="Nombre del cliente" value={customerName} onChange={(event) => setCustomerName(event.target.value)} inputProps={{ maxLength: 80 }} />
              <TextField fullWidth label="Dirección" value={address} onChange={(event) => setAddress(event.target.value)} inputProps={{ maxLength: 120 }} />
            </Stack>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>Menú principal</Typography>
              <Grid container spacing={1.5}>{menus.length > 0 ? menus.map((product) => <Grid item xs={12} sm={4} key={product.id}><ProductCard product={product} quantity={quantities[product.id] ?? 0} onIncrease={() => changeQuantity(product, 1)} onDecrease={() => changeQuantity(product, -1)} /></Grid>) : <Grid item xs={12}><Typography color="text.secondary">No hay platillos disponibles para hoy.</Typography></Grid>}</Grid>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
                <Card elevation={0} sx={{ flex: 1, border: '1px dashed', borderColor: 'primary.main', bgcolor: 'primary.light' }}>
                  <Button fullWidth size="large" startIcon={<AddCircleOutlineRounded />} onClick={() => setExtrasOpen(true)} sx={{ minHeight: 64, fontWeight: 800 }}>Agregar extras</Button>
                </Card>
                <Card elevation={0} sx={{ flex: 1, border: '1px dashed', borderColor: 'divider', bgcolor: 'background.paper' }}>
                  <Button fullWidth size="large" startIcon={<PersonAddAltRounded />} onClick={() => setCustomOpen(true)} sx={{ minHeight: 64, fontWeight: 800 }}>Agregar personalizado</Button>
                </Card>
              </Stack>
            </Box>
          </Stack>
        </Grid>
        <Grid item xs={12} lg={4}>
          <NewOrderSummary items={orderItems} createdAt={createdAt} promiseTime={promiseTime} onCreate={handleCreate} loading={submitting} />
        </Grid>
      </Grid>
      <ExtrasDialog open={extrasOpen} extras={extras.filter((extra) => extra.active)} onClose={() => setExtrasOpen(false)} onConfirm={(items) => { setExtraItems(items); setExtrasOpen(false); setNotification(null) }} />
      <CustomProductDialog open={customOpen} onClose={() => setCustomOpen(false)} onAdd={(item) => { setCustomItems((current) => [...current, item]); setNotification(null) }} />
      <Snackbar open={Boolean(notification)} autoHideDuration={4000} onClose={() => setNotification(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} sx={{ maxWidth: 'calc(100vw - 32px)' }}><Alert severity={notification?.severity ?? 'success'} onClose={() => setNotification(null)} sx={{ width: '100%' }}>{notification?.message}</Alert></Snackbar>
    </Box>
  )
}
