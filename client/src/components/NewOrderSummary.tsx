import { AccessTimeRounded, CheckCircleRounded } from '@mui/icons-material'
import { Box, Button, Divider, Paper, Stack, TextField, Typography } from '@mui/material'
import { OrderLine } from '../types/menu'

type NewOrderSummaryProps = {
  accounts: Array<{ id: string; name: string; items: OrderLine[] }>
  createdAt: string
  promiseTime: string
  promiseTimeError?: string
  onPromiseTimeChange: (value: string) => void
  onCreate: () => void
  onClear: () => void
  loading?: boolean
}

export function NewOrderSummary({ accounts, createdAt, promiseTime, promiseTimeError, onPromiseTimeChange, onCreate, onClear, loading = false }: NewOrderSummaryProps) {
  const total = accounts.reduce((sum, account) => sum + account.items.reduce((accountTotal, item) => accountTotal + item.price * item.quantity, 0), 0)

  return (
    <Paper component="section" aria-labelledby="order-summary-title" elevation={0} sx={{ p: { xs: 2.5, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 3, position: { lg: 'sticky' }, top: { lg: 24 } }}>
      <Typography id="order-summary-title" variant="h5" sx={{ fontWeight: 800 }}>Resumen del pedido</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>Confirma los productos antes de crear.</Typography>
      <Stack spacing={2} sx={{ minHeight: { xs: 80, lg: 140 } }}>
        {accounts.some((account) => account.items.length > 0) ? accounts.map((account, accountIndex) => <Box key={account.id}><Typography sx={{ fontWeight: 800, mb: 1 }}>{account.name.trim() || `Cuenta ${accountIndex + 1}`}</Typography><Stack spacing={1.25}>{account.items.length > 0 ? account.items.map((item, itemIndex) => <Stack key={`${item.id}-${itemIndex}`} direction="row" justifyContent="space-between" gap={2}><Box><Typography sx={{ fontWeight: 700 }}>{item.name}</Typography><Typography variant="body2" color="text.secondary">{item.quantity} x Q{item.price}</Typography></Box><Typography sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Q{item.quantity * item.price}</Typography></Stack>) : <Typography variant="body2" color="text.secondary">Sin productos</Typography>}</Stack><Stack direction="row" justifyContent="space-between" sx={{ mt: 1.5 }}><Typography variant="body2" fontWeight={700}>Subtotal</Typography><Typography variant="body2" fontWeight={700}>Q{account.items.reduce((sum, item) => sum + item.price * item.quantity, 0)}</Typography></Stack></Box>) : <Typography color="text.secondary">Aún no has agregado productos.</Typography>}
      </Stack>
      <Divider sx={{ my: 3 }} />
      <Stack spacing={1.25} sx={{ mb: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center"><Stack direction="row" alignItems="center" gap={1}><AccessTimeRounded fontSize="small" color="action" /><Typography color="text.secondary">Hora del pedido</Typography></Stack><Typography sx={{ fontWeight: 700 }}>{createdAt}</Typography></Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}><Stack direction="row" alignItems="center" gap={1}><AccessTimeRounded fontSize="small" color="action" /><Typography color="text.secondary">Hora promesa</Typography></Stack><TextField type="time" size="small" value={promiseTime} onChange={(event) => onPromiseTimeChange(event.target.value)} error={Boolean(promiseTimeError)} helperText={promiseTimeError} inputProps={{ step: 60 }} sx={{ width: 132, '& input': { fontWeight: 700, textAlign: 'center' }, '& .MuiFormHelperText-root': { whiteSpace: 'nowrap', ml: 0 } }} /> </Stack>
      </Stack>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}><Typography variant="h6" sx={{ fontWeight: 800 }}>Total</Typography><Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>Q{total}</Typography></Stack>
      <Stack spacing={1.25}>
        <Button fullWidth size="large" variant="contained" startIcon={<CheckCircleRounded />} onClick={onCreate} disabled={loading} sx={{ minHeight: 54, fontWeight: 800 }}>{loading ? 'Creando...' : 'Crear pedido'}</Button>
        <Button fullWidth variant="outlined" color="error" onClick={onClear} disabled={loading} sx={{ minHeight: 44, fontWeight: 700 }}>Limpiar pedido</Button>
      </Stack>
    </Paper>
  )
}
