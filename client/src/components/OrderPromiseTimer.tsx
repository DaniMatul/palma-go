import { Chip } from '@mui/material'
import { getPromiseTimerState, PromiseTimerTone } from '../config/orderTimer'

type OrderPromiseTimerProps = {
  promiseTime: string
  now: number
}

const toneStyles: Record<PromiseTimerTone, { bgcolor: string; color: string }> = {
  normal: { bgcolor: 'action.hover', color: 'text.secondary' },
  warning: { bgcolor: '#FFF7D6', color: '#9A6B16' },
  critical: { bgcolor: '#FFF0DE', color: '#B86A2A' },
  overdue: { bgcolor: '#FBE5E7', color: '#A85A62' },
}

export function OrderPromiseTimer({ promiseTime, now }: OrderPromiseTimerProps) {
  const timer = getPromiseTimerState(promiseTime, now)
  const styles = toneStyles[timer.tone]
  return <Chip label={timer.label} size="small" sx={{ bgcolor: styles.bgcolor, color: styles.color, borderRadius: '999px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', '& .MuiChip-label': { px: 1 } }} />
}
