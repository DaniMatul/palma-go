import { AccessTimeRounded, CheckCircleRounded, DeleteOutlineRounded, EditRounded } from '@mui/icons-material'
import { Box, Button, Divider, IconButton, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { OrderLine } from '../types/menu'
import { getMenuLinePresentation, isCustomizedMenuLine } from '../utils/menuLinePresentation'

type NewOrderSummaryProps = {
  accounts: Array<{ id: string; name: string; items: OrderLine[] }>
  createdAt: string
  promiseTime: string
  promiseTimeError?: string
  onPromiseTimeChange: (value: string) => void
  onEditCustomization: (accountId: string, item: OrderLine) => void
  onDeleteMenuLine: (accountId: string, item: OrderLine) => void
  onCreate: () => void
  onClear: () => void
  loading?: boolean
}

export function NewOrderSummary({ accounts, createdAt, promiseTime, promiseTimeError, onPromiseTimeChange, onEditCustomization, onDeleteMenuLine, onCreate, onClear, loading = false }: NewOrderSummaryProps) {
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
              {account.items.length > 0 ? account.items.map((item, itemIndex) => {
                const isMenu = Boolean(item.menuItemId)
                const individual = isMenu && item.menuMode === 'INDIVIDUAL'
                const customized = isMenu && isCustomizedMenuLine(item)
                const presentation = isMenu ? getMenuLinePresentation(item) : null
                return <Box key={`${item.id}-${itemIndex}`} sx={{ py: 0.5, borderBottom: itemIndex < account.items.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{isMenu ? `Q${item.price}` : `${item.quantity} × Q${item.price}`}</Typography>
                  </Stack>
                  {isMenu && presentation && <>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1} sx={{ pl: 1 }}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        {individual && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Principal individual</Typography>}
                        {presentation.included.length > 0 && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflowWrap: 'anywhere' }}>{presentation.included.join(' · ')}</Typography>}
                        {customized && presentation.additions.length > 0 && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflowWrap: 'anywhere' }}>{presentation.additions.map((addition) => `+ ${addition.name}${addition.quantity > 1 ? ` ×${addition.quantity}` : ''} Q${addition.price}`).join(' · ')}</Typography>}
                        {presentation.comment && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Nota: {presentation.comment}</Typography>}
                      </Box>
                      <Stack direction="row" spacing={0} sx={{ flexShrink: 0, mt: -0.5 }}>
                        {customized && <Tooltip title="Editar personalización"><IconButton size="small" aria-label={`Editar personalización de ${item.name}`} onClick={() => onEditCustomization(account.id, item)} disabled={loading}><EditRounded fontSize="small" /></IconButton></Tooltip>}
                        <Tooltip title="Eliminar unidad"><IconButton size="small" color="error" aria-label={`Eliminar unidad de ${item.name}`} onClick={() => onDeleteMenuLine(account.id, item)} disabled={loading}><DeleteOutlineRounded fontSize="small" /></IconButton></Tooltip>
                      </Stack>
                    </Stack>
                  </>}
                </Box>
              }) : <Typography variant="body2" color="text.secondary">Sin productos</Typography>}
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
