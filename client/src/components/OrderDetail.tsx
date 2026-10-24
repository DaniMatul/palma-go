import { CancelOutlined, CheckCircleRounded, CloseRounded, ReceiptLongRounded, ReplayRounded } from '@mui/icons-material'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Paper, Stack, Typography } from '@mui/material'
import { displayOrderNumber, Order, orderTotal } from '../types/order'
import { useState } from 'react'

type OrderDetailProps = { order: Order | undefined; onComplete: () => void; onReopen: () => void; onCancel: () => void }

export function OrderDetail({ order, onComplete, onReopen, onCancel }: OrderDetailProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  if (!order) return <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, textAlign: 'center' }}><Typography color="text.secondary">Selecciona un pedido para ver su detalle.</Typography></Paper>
  const total = orderTotal(order)
  return (
    <Paper component="section" aria-labelledby="order-detail-title" elevation={0} sx={{ p: { xs: 2.5, md: 3 }, border: '1px solid', borderColor: 'divider', borderRadius: 3, position: { lg: 'sticky' }, top: { lg: 24 } }}>
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 3 }}>
        <Box sx={{ display: 'grid', placeItems: 'center', width: 44, height: 44, bgcolor: 'secondary.light', color: 'secondary.main', borderRadius: 2 }}><ReceiptLongRounded /></Box>
        <Box><Typography id="order-detail-title" variant="h5" sx={{ fontWeight: 800 }}>Pedido {displayOrderNumber(order)}</Typography><Typography variant="body2" color="text.secondary">Información del pedido</Typography></Box>
      </Stack>
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography><strong>Cliente:</strong> {order.customerName}</Typography>
        <Typography><strong>Dirección:</strong> {order.address}</Typography>
        <Typography><strong>Hora del pedido:</strong> {order.createdAt}</Typography>
        <Typography><strong>Hora promesa:</strong> {order.promiseTime}</Typography>
      </Stack>
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>Cuentas</Typography>
      <Stack spacing={2}>
        {order.accounts.map((account, accountIndex) => <Box key={account.id ?? accountIndex}><Typography sx={{ fontWeight: 800, mb: 1 }}>{account.name?.trim() || `Cuenta ${accountIndex + 1}`}</Typography><Stack spacing={1.25}>{account.items.map((item, itemIndex) => <Stack key={`${item.id ?? item.name}-${itemIndex}`} direction="row" justifyContent="space-between" gap={2}><Box><Typography sx={{ fontWeight: 700 }}>{item.name}</Typography><Typography variant="body2" color="text.secondary">Cantidad: {item.quantity} · Unitario: Q{item.price}</Typography></Box><Typography sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Q{item.subtotal ?? item.quantity * item.price}</Typography></Stack>)}</Stack><Stack direction="row" justifyContent="space-between" sx={{ mt: 1.25 }}><Typography variant="body2" fontWeight={700}>Subtotal</Typography><Typography variant="body2" fontWeight={700}>Q{account.subtotal}</Typography></Stack></Box>)}
      </Stack>
      <Divider sx={{ my: 3 }} />
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
