import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material'
import { formatHistoryDate, historyCurrency, HistoryOrder } from '../types/history'
import { orderTotal } from '../types/order'
import { OrderStatusChip } from './OrderStatusChip'

export function HistoryOrderDialog({ order, onClose }: { order: HistoryOrder | null; onClose: () => void }) {
  return <Dialog open={Boolean(order)} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="history-detail-title">
    {order && <>
      <DialogTitle id="history-detail-title">Pedido {order.id}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <OrderStatusChip status={order.status} />
          <Typography><strong>Cliente:</strong> {order.customerName}</Typography>
          <Typography><strong>Dirección:</strong> {order.address}</Typography>
          <Typography><strong>Fecha:</strong> {formatHistoryDate(order.date)}</Typography>
          <Typography>Hora del pedido: {order.createdAt} · Hora promesa: {order.promiseTime}</Typography>
          <Divider />
          {order.items.map((item, index) => <Stack key={index} direction="row" justifyContent="space-between" gap={2}>
            <Stack><Typography fontWeight={600}>{item.name}</Typography><Typography color="text.secondary">{item.quantity} × {historyCurrency(item.price)}</Typography></Stack>
            <Typography>{historyCurrency(item.quantity * item.price)}</Typography>
          </Stack>)}
          <Divider />
          <Stack direction="row" justifyContent="space-between"><Typography fontWeight={700}>Total</Typography><Typography fontWeight={700}>{historyCurrency(orderTotal(order))}</Typography></Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}><Button onClick={onClose}>Cerrar</Button></DialogActions>
    </>}
  </Dialog>
}
