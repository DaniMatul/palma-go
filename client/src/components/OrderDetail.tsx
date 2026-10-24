import { CancelOutlined, CheckCircleRounded, CloseRounded, ReceiptLongRounded, ReplayRounded } from '@mui/icons-material'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Paper, Stack, Typography } from '@mui/material'
import { displayOrderNumber, Order, orderTotal } from '../types/order'
import { getMenuLinePresentation, isCustomizedMenuLine } from '../utils/menuLinePresentation'
import { useState } from 'react'

type OrderDetailProps = { order: Order | undefined; onComplete: () => void; onReopen: () => void; onCancel: () => void }

export function OrderDetail({ order, onComplete, onReopen, onCancel }: OrderDetailProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  if (!order) return <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, textAlign: 'center' }}><Typography color="text.secondary">Selecciona un pedido para ver su detalle.</Typography></Paper>
  const total = orderTotal(order)
  const customerAddress = [order.customerName, order.address].filter((value) => value?.trim()).join(' · ') || 'Sin información'
  const orderTimes = [order.createdAt, order.promiseTime].filter(Boolean).join(' → ') || 'Sin información'
  return (
    <Paper component="section" aria-labelledby="order-detail-title" elevation={0} sx={{ p: { xs: 2.5, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 3, position: { lg: 'sticky' }, top: { lg: 24 } }}>
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 3 }}>
        <Box sx={{ display: 'grid', placeItems: 'center', width: 44, height: 44, bgcolor: 'secondary.light', color: 'secondary.main', borderRadius: 2 }}><ReceiptLongRounded /></Box>
        <Box><Typography id="order-detail-title" variant="h5" sx={{ fontWeight: 800 }}>Pedido {displayOrderNumber(order)}</Typography><Typography variant="body2" color="text.secondary">Información del pedido</Typography></Box>
      </Stack>
      <Stack spacing={0.5} sx={{ mb: 2.5 }}>
        <Typography sx={{ fontWeight: 600 }}>{customerAddress}</Typography>
        <Typography variant="body2" color="text.secondary">{orderTimes}</Typography>
      </Stack>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>Cuentas</Typography>
      <Stack spacing={1.5} divider={<Divider flexItem />}>
        {order.accounts.map((account, accountIndex) => <Box key={account.id ?? accountIndex}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} sx={{ mb: 0.75 }}>
            <Typography sx={{ fontWeight: 800, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.name?.trim() || `Cuenta ${accountIndex + 1}`}</Typography>
            <Typography sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Q{account.subtotal}</Typography>
          </Stack>
          <Stack spacing={0.5}>
            {account.items.map((item, itemIndex) => {
              const isMenu = Boolean(item.menuItemId)
              const individual = isMenu && item.menuMode === 'INDIVIDUAL'
              const customized = isMenu && isCustomizedMenuLine(item)
              const presentation = isMenu ? getMenuLinePresentation(item) : null
              return <Box key={`${item.id ?? item.name}-${itemIndex}`} sx={{ py: 0.5 }}><Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={2}><Typography variant="body2" color="text.secondary" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</Typography><Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{isMenu ? item.quantity > 1 ? `${item.quantity} × Q${item.price}` : `Q${item.price}` : `${item.quantity} × Q${item.price}`}</Typography></Stack>{isMenu && presentation && <>{individual && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 1 }}>Principal individual</Typography>}{!individual && !customized && presentation.included.length > 0 && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 1 }}>{presentation.included.join(' · ')}</Typography>}{customized && presentation.included.length > 0 && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 1 }}>{presentation.included.join(' · ')}</Typography>}{customized && presentation.additions.map((addition, additionIndex) => <Typography key={`${addition.name}-${additionIndex}`} variant="caption" color="text.secondary" sx={{ display: 'block', pl: 1 }}>+ {addition.name} adicional{addition.quantity > 1 ? ` ×${addition.quantity}` : ''} Q{addition.price}</Typography>)}{presentation.comment && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 1 }}>Nota: {presentation.comment}</Typography>}</>}{!isMenu && item.comment && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', pl: 1 }}>Nota: {item.comment}</Typography>}</Box>
            })}
          </Stack>
        </Box>)}
      </Stack>
      <Divider sx={{ my: 2 }} />
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}><Typography variant="h6" sx={{ fontWeight: 800 }}>Total</Typography><Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>Q{total}</Typography></Stack>
      {order.status === 'in-progress' && <Stack spacing={1.25}>
        <Button fullWidth size="large" variant="contained" color="primary" startIcon={<CheckCircleRounded />} onClick={onComplete} sx={{ minHeight: 52, fontWeight: 800 }}>Completar pedido</Button>
        <Button fullWidth size="large" variant="outlined" color="error" startIcon={<CancelOutlined />} onClick={() => setCancelDialogOpen(true)} sx={{ minHeight: 48, fontWeight: 800 }}>Cancelar pedido</Button>
      </Stack>}
      {order.status === 'completed' && <Button fullWidth size="large" variant="outlined" color="primary" startIcon={<ReplayRounded />} onClick={onReopen} sx={{ minHeight: 52, fontWeight: 800 }}>Volver a En proceso</Button>}
      {order.status === 'cancelled' && <Button fullWidth size="large" variant="outlined" color="error" startIcon={<CloseRounded />} disabled sx={{ minHeight: 52, fontWeight: 800 }}>Pedido cancelado</Button>}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>¿Deseas cancelar este pedido?</DialogTitle>
        <DialogContent><Typography color="text.secondary">El pedido pasará a la pestaña de cancelados.</Typography></DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0, gap: 1 }}>
          <Button onClick={() => setCancelDialogOpen(false)} variant="outlined">Volver</Button>
          <Button onClick={() => { setCancelDialogOpen(false); onCancel() }} color="error" variant="contained">Cancelar pedido</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
