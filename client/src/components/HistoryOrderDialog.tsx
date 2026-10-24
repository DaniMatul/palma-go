import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material'
import { formatHistoryDate, historyCurrency, HistoryOrder } from '../types/history'
import { displayOrderNumber, orderTotal } from '../types/order'
import { OrderStatusChip } from './OrderStatusChip'

export function HistoryOrderDialog({ order, onClose }: { order: HistoryOrder | null; onClose: () => void }) {
  return <Dialog open={Boolean(order)} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="history-detail-title">
    {order && <>
      <DialogTitle id="history-detail-title">Pedido {displayOrderNumber(order)}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <OrderStatusChip status={order.status} />
          <Typography><strong>Cliente:</strong> {order.customerName}</Typography>
          <Typography><strong>Dirección:</strong> {order.address}</Typography>
          <Typography><strong>Fecha:</strong> {formatHistoryDate(order.date)}</Typography>
          <Typography>Hora del pedido: {order.createdAt} · Hora promesa: {order.promiseTime}</Typography>
          <Divider />
          {order.accounts.map((account, accountIndex) => <Stack key={account.id ?? accountIndex} spacing={1}>
            <Typography fontWeight={700}>{account.name?.trim() || `Cuenta ${accountIndex + 1}`}</Typography>
            {account.items.map((item, index) => <Stack key={`${item.id ?? item.name}-${index}`} direction="row" justifyContent="space-between" gap={2}>
              <Stack><Typography fontWeight={600}>{item.name}</Typography><Typography color="text.secondary">{item.quantity} × {historyCurrency(item.price)}</Typography></Stack>
              <Typography>{historyCurrency(item.subtotal ?? item.quantity * item.price)}</Typography>
            </Stack>)}
            <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">Subtotal</Typography><Typography fontWeight={600}>{historyCurrency(account.subtotal)}</Typography></Stack>
          </Stack>)}
          <Divider />
          <Stack direction="row" justifyContent="space-between"><Typography fontWeight={700}>Total</Typography><Typography fontWeight={700}>{historyCurrency(orderTotal(order))}</Typography></Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}><Button onClick={onClose}>Cerrar</Button></DialogActions>
    </>}
  </Dialog>
}
