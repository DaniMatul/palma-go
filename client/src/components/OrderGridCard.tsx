import { Card, CardActionArea, Stack, Typography } from '@mui/material'
import { displayOrderNumber, Order, orderTotal } from '../types/order'
import { OrderStatusChip } from './OrderStatusChip'

type OrderGridCardProps = { order: Order; selected: boolean; onSelect: () => void }

export function OrderGridCard({ order, selected, onSelect }: OrderGridCardProps) {
  const totalItems = order.items.reduce((total, item) => total + item.quantity, 0)
  return (
    <Card elevation={0} sx={{ height: '100%', border: '1px solid', borderColor: selected ? 'selection.border' : 'divider', bgcolor: 'background.paper', boxShadow: selected ? '0 10px 24px rgba(70, 75, 130, 0.14)' : '0 2px 6px rgba(70, 75, 130, 0.05)', transform: selected ? 'translateY(-1px)' : 'none' }}>
      <CardActionArea onClick={onSelect} sx={{ height: '100%', p: 2.25 }}>
        <Stack spacing={1.5} sx={{ height: '100%' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 800 }}>Pedido {displayOrderNumber(order)}</Typography>
          </Stack>
          <Typography sx={{ fontWeight: 700 }}>{order.customerName}</Typography>
          <Stack spacing={0.4} sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary">Pedido: {order.createdAt}</Typography>
            <Typography variant="body2" color="text.secondary">Promesa: {order.promiseTime}</Typography>
            <Typography variant="body2" color="text.secondary">{totalItems} {totalItems === 1 ? 'producto' : 'productos'}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>Q{orderTotal(order)}</Typography>
            <OrderStatusChip status={order.status} />
          </Stack>
        </Stack>
      </CardActionArea>
    </Card>
  )
}
