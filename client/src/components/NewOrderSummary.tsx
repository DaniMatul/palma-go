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
    <Paper component="section" aria-labelledby="order-summary-title" elevation={0} sx={{ p: { xs: 2, md: 2.5 }, border: '1px solid', borderColor: 'divider', borderRadius: 3, position: { lg: 'sticky' }, top: { lg: 24 } }}>
      <Typography id="order-summary-title" variant="h5" sx={{ fontWeight: 800 }}>Resumen del pedido</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>Confirma los productos antes de crear.</Typography>
      <Stack spacing={1.5} divider={<Divider flexItem />} sx={{ minHeight: { xs: 64, lg: 100 } }}>
        {accounts.some((account) => account.items.length > 0) ? accounts.map((account, accountIndex) => {
          const accountTotal = account.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
          return <Box key={account.id}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} sx={{ mb: 0.75 }}>
              <Typography sx={{ fontWeight: 800, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.name.trim() || `Cuenta ${accountIndex + 1}`}</Typography>
              <Typography sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Q{accountTotal}</Typography>
            </Stack>
            <Stack spacing={0.5}>
              {account.items.length > 0 ? account.items.map((item, itemIndex) => <Stack key={`${item.id}-${itemIndex}`} direction="row" justifyContent="space-between" alignItems="baseline" gap={2}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{item.quantity} × Q{item.price}</Typography>
              </Stack>) : <Typography variant="body2" color="text.secondary">Sin productos</Typography>}
            </Stack>
          </Box>
        }) : <Typography color="text.secondary">Aún no has agregado productos.</Typography>}
      </Stack>
      <Divider sx={{ my: 2 }} />
      <Stack spacing={0.75} sx={{ mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center"><Stack direction="row" alignItems="center" gap={0.75}><AccessTimeRounded fontSize="small" color="action" /><Typography variant="body2" color="text.secondary">Pedido</Typography></Stack><Typography variant="body2" sx={{ fontWeight: 700 }}>{createdAt}</Typography></Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}><Stack direction="row" alignItems="center" gap={0.75}><AccessTimeRounded fontSize="small" color="action" /><Typography variant="body2" color="text.secondary">Promesa</Typography></Stack><TextField type="text" size="small" value={promiseTime} onChange={(event) => onPromiseTimeChange(event.target.value)} error={Boolean(promiseTimeError)} helperText={promiseTimeError} inputProps={{ inputMode: 'numeric', maxLength: 5, pattern: '[0-9]{2}:[0-9]{2}', placeholder: 'HH:mm' }} sx={{ width: 132, '& input': { fontWeight: 700, textAlign: 'center', py: 0.75 }, '& .MuiFormHelperText-root': { whiteSpace: 'nowrap', ml: 0 } }} /></Stack>
      </Stack>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}><Typography variant="h6" sx={{ fontWeight: 800 }}>Total</Typography><Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>Q{total}</Typography></Stack>
      <Stack spacing={1}>
        <Button fullWidth size="large" variant="contained" startIcon={<CheckCircleRounded />} onClick={onCreate} disabled={loading} sx={{ minHeight: 54, fontWeight: 800 }}>{loading ? 'Creando...' : 'Crear pedido'}</Button>
        <Button fullWidth variant="outlined" color="error" onClick={onClear} disabled={loading} sx={{ minHeight: 44, fontWeight: 700 }}>Limpiar pedido</Button>
      </Stack>
    </Paper>
  )
}
