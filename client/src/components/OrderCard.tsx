import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material'
import { displayOrderNumber, Order, orderTotal } from '../types/order'
import { OrderStatusChip } from './OrderStatusChip'
import { OrderPromiseTimer } from './OrderPromiseTimer'

type OrderCardProps = { order: Order; selected: boolean; onSelect: () => void; now: number }

export function OrderCard({ order, selected, onSelect, now }: OrderCardProps) {
  const totalItems = order.items.reduce((total, item) => total + item.quantity, 0)
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: selected ? 'selection.border' : 'divider', bgcolor: 'background.paper', boxShadow: selected ? '0 10px 24px rgba(70, 75, 130, 0.14)' : '0 2px 6px rgba(70, 75, 130, 0.05)', transform: selected ? 'translateY(-1px)' : 'none' }}>
      <CardActionArea onClick={onSelect} sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
          <Box>
            <Typography variant="h6" sx={{ fontSize: { xs: '1.5rem', md: '1.625rem' }, fontWeight: 800 }}>Pedido {displayOrderNumber(order)}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{order.customerName}</Typography>
            <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.75}><Typography variant="body2" color="text.secondary">{order.createdAt} · Promesa {order.promiseTime}</Typography>{order.status === 'in-progress' && <OrderPromiseTimer promiseTime={order.promiseTime} now={now} />}</Stack>
            <Typography variant="body2" color="text.secondary">{totalItems} {totalItems === 1 ? 'producto' : 'productos'}</Typography>
          </Box>
          <Stack alignItems="flex-end" spacing={0.75}>
            <Typography variant="h6" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Q{orderTotal(order)}</Typography>
            <Stack direction="row" alignItems="center" gap={0.5}>
              <OrderStatusChip status={order.status} />
            </Stack>
          </Stack>
        </Stack>
      </CardActionArea>
    </Card>
  )
}
