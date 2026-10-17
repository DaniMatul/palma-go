import { AccessTimeRounded, CheckCircleRounded } from '@mui/icons-material'
import { Box, Button, Divider, Paper, Stack, Typography } from '@mui/material'
import { OrderLine } from '../types/menu'

type NewOrderSummaryProps = {
  items: OrderLine[]
  createdAt: string
  promiseTime: string
  onCreate: () => void
  loading?: boolean
}

export function NewOrderSummary({ items, createdAt, promiseTime, onCreate, loading = false }: NewOrderSummaryProps) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <Paper component="section" aria-labelledby="order-summary-title" elevation={0} sx={{ p: { xs: 2.5, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 3, position: { lg: 'sticky' }, top: { lg: 24 } }}>
      <Typography id="order-summary-title" variant="h5" sx={{ fontWeight: 800 }}>Resumen del pedido</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>Confirma los productos antes de crear.</Typography>
      <Stack spacing={2} sx={{ minHeight: { xs: 80, lg: 140 } }}>
        {items.length > 0 ? items.map((item) => <Stack key={item.id} direction="row" justifyContent="space-between" gap={2}><Box><Typography sx={{ fontWeight: 700 }}>{item.name}</Typography><Typography variant="body2" color="text.secondary">{item.quantity} x Q{item.price}</Typography></Box><Typography sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Q{item.quantity * item.price}</Typography></Stack>) : <Typography color="text.secondary">Aún no has agregado productos.</Typography>}
      </Stack>
      <Divider sx={{ my: 3 }} />
      <Stack spacing={1.25} sx={{ mb: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center"><Stack direction="row" alignItems="center" gap={1}><AccessTimeRounded fontSize="small" color="action" /><Typography color="text.secondary">Hora del pedido</Typography></Stack><Typography sx={{ fontWeight: 700 }}>{createdAt}</Typography></Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center"><Stack direction="row" alignItems="center" gap={1}><AccessTimeRounded fontSize="small" color="action" /><Typography color="text.secondary">Hora promesa</Typography></Stack><Typography sx={{ fontWeight: 700 }}>{promiseTime}</Typography></Stack>
      </Stack>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}><Typography variant="h6" sx={{ fontWeight: 800 }}>Total</Typography><Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>Q{total}</Typography></Stack>
      <Button fullWidth size="large" variant="contained" startIcon={<CheckCircleRounded />} onClick={onCreate} disabled={loading} sx={{ minHeight: 54, fontWeight: 800 }}>{loading ? 'Creando...' : 'Crear pedido'}</Button>
    </Paper>
  )
}
