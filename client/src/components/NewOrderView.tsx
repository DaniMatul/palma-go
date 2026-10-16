import { useMemo, useState } from 'react'
import { AddCircleOutlineRounded, PersonAddAltRounded } from '@mui/icons-material'
import { Box, Button, Card, Grid, Stack, TextField, Typography } from '@mui/material'
import { addMinutesToTime } from '../types/order'
import { ExtraProduct, MenuProduct, OrderLine } from '../types/menu'
import { CustomProductDialog } from './CustomProductDialog'
import { ExtrasDialog } from './ExtrasDialog'
import { NewOrderSummary } from './NewOrderSummary'
import { ProductCard } from './ProductCard'

function getCurrentTime() {
  return new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false })
}

const emptyQuantities = (menus: MenuProduct[]) => Object.fromEntries(menus.map((product) => [product.id, 0]))

type NewOrderViewProps = { menus: MenuProduct[]; extras: ExtraProduct[]; onOrderCreated: (items: OrderLine[]) => void }

export function NewOrderView({ menus, extras, onOrderCreated }: NewOrderViewProps) {
  const [customerName, setCustomerName] = useState('')
  const [address, setAddress] = useState('')
  const [quantities, setQuantities] = useState<Record<string, number>>(() => emptyQuantities(menus))
  const [extraItems, setExtraItems] = useState<OrderLine[]>([])
  const [customItems, setCustomItems] = useState<OrderLine[]>([])
  const [extrasOpen, setExtrasOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [createdAt, setCreatedAt] = useState(getCurrentTime)
  const [successMessage, setSuccessMessage] = useState('')
  const [nextOrderNumber, setNextOrderNumber] = useState(27)
  const promiseTime = useMemo(() => addMinutesToTime(createdAt, 20), [createdAt])
  const activeMenus = menus.filter((menu) => menu.availableToday)
  const orderItems = useMemo(() => [
    ...activeMenus.filter((product) => (quantities[product.id] ?? 0) > 0).map((product) => ({ id: product.id, name: product.name, price: product.price, quantity: quantities[product.id] })),
    ...extraItems,
    ...customItems,
  ], [activeMenus, customItems, extraItems, quantities])

  const changeQuantity = (product: MenuProduct, amount: number) => {
    setSuccessMessage('')
    setQuantities((current) => {
      const currentQuantity = current[product.id] ?? 0
      const nextQuantity = Math.max(0, Math.min(product.availableQuantity, currentQuantity + amount))
      return { ...current, [product.id]: nextQuantity }
    })
  }

  const canCreate = customerName.trim() !== '' && address.trim() !== '' && orderItems.length > 0

  const handleCreate = () => {
    if (!canCreate) return
    onOrderCreated(orderItems)
    setSuccessMessage(`Pedido #${String(nextOrderNumber).padStart(3, '0')} creado correctamente.`)
    setNextOrderNumber((current) => current + 1)
    setCustomerName('')
    setAddress('')
    setQuantities(emptyQuantities(menus))
    setExtraItems([])
    setCustomItems([])
    setCreatedAt(getCurrentTime())
  }

  return (
    <Box component="section" aria-labelledby="new-order-title">
      <Typography id="new-order-title" variant="h4" sx={{ fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.25rem' } }}>Nuevo pedido</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>Registra rápidamente un pedido para el comedor.</Typography>
      <Grid container spacing={{ xs: 3, lg: 4 }}>
        <Grid item xs={12} lg={8}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth label="Nombre del cliente" value={customerName} onChange={(event) => setCustomerName(event.target.value)} inputProps={{ maxLength: 80 }} />
              <TextField fullWidth label="Dirección" value={address} onChange={(event) => setAddress(event.target.value)} inputProps={{ maxLength: 120 }} />
            </Stack>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>Menú principal</Typography>
              <Grid container spacing={1.5}>{activeMenus.length > 0 ? activeMenus.map((product) => <Grid item xs={12} sm={4} key={product.id}><ProductCard product={product} quantity={quantities[product.id] ?? 0} onIncrease={() => changeQuantity(product, 1)} onDecrease={() => changeQuantity(product, -1)} /></Grid>) : <Grid item xs={12}><Typography color="text.secondary">No hay menús activos para hoy.</Typography></Grid>}</Grid>
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
          <NewOrderSummary items={orderItems} createdAt={createdAt} promiseTime={promiseTime} onCreate={handleCreate} successMessage={successMessage} />
        </Grid>
      </Grid>
      <ExtrasDialog open={extrasOpen} extras={extras.filter((extra) => extra.active)} onClose={() => setExtrasOpen(false)} onConfirm={(items) => { setExtraItems(items); setExtrasOpen(false); setSuccessMessage('') }} />
      <CustomProductDialog open={customOpen} onClose={() => setCustomOpen(false)} onAdd={(item) => { setCustomItems((current) => [...current, item]); setSuccessMessage('') }} />
    </Box>
  )
}
