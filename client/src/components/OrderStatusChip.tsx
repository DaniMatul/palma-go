import { Chip, useTheme } from '@mui/material'
import { OrderStatus } from '../types/order'

type OrderStatusChipProps = { status: OrderStatus }

export function OrderStatusChip({ status }: OrderStatusChipProps) {
  const theme = useTheme()
  const label = status === 'in-progress' ? 'En proceso' : status === 'completed' ? 'Completado' : 'Cancelado'
  const statusKey = status === 'in-progress' ? 'inProgress' : status
  const style = theme.palette.status[statusKey]

  return <Chip
    label={label}
    size="small"
    sx={{
      bgcolor: style.background,
      color: style.color,
      border: `1px solid ${style.border}`,
      borderRadius: 999,
      boxShadow: 'none',
      fontWeight: 600,
      px: 0.75,
      height: 28,
    }}
  />
}
