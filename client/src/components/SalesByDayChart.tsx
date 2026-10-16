import { Box, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography, useTheme } from '@mui/material'
import { SalesPoint } from '../types/dashboard'
import { useEffect, useRef, useState } from 'react'

type SalesByDayChartProps = {
  data: SalesPoint[]
  total: number
  period: 'week' | 'month'
  onPeriodChange: (period: 'week' | 'month') => void
}

export function SalesByDayChart({ data, total, period, onPeriodChange }: SalesByDayChartProps) {
  const theme = useTheme()
  const chartRef = useRef<HTMLDivElement>(null)
  const [{ width, height }, setSize] = useState({ width: 1000, height: 310 })
  useEffect(() => {
    const element = chartRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: Math.max(entry.contentRect.width, 1), height: entry.contentRect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const padding = { top: 22, right: 18, bottom: 38, left: 18 }
  const maxAmount = Math.max(...data.map((item) => item.amount), 1)
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const points = data.map((item, index) => {
    const x = data.length === 1 ? width / 2 : padding.left + (index / (data.length - 1)) * chartWidth
    const y = padding.top + chartHeight - (item.amount / maxAmount) * chartHeight
    return { ...item, x, y }
  })
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2.75, height: '100%' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'flex-start' }} gap={2}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Ventas</Typography>
          <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 800, letterSpacing: '-0.03em' }}>
            Q{total.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
          </Typography>
        </Box>
        <ToggleButtonGroup value={period} exclusive onChange={(_, value: 'week' | 'month' | null) => value && onPeriodChange(value)} size="small" aria-label="Periodo de ventas">
          <ToggleButton value="week">Semana</ToggleButton>
          <ToggleButton value="month">Mes</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Box ref={chartRef} sx={{ mt: 2, mx: 'auto', maxWidth: 1100, width: '100%', height: { xs: 260, sm: 310 }, overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ display: 'block' }} role="img" aria-label="Gráfica de ventas">
          <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} stroke="currentColor" opacity="0.12" />
          <polyline points={polyline} fill="none" stroke={theme.palette.primary.main} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="5" fill={theme.palette.background.paper} stroke={theme.palette.primary.main} strokeWidth="3" />
              {(period === 'week' || [1, 5, 10, 15, 20, 25, 30].includes(Number(point.label))) && <text x={point.x} y={height - 12} textAnchor="middle" fill={theme.palette.text.secondary} fontSize="13">{point.label}</text>}
            </g>
          ))}
        </svg>
      </Box>
    </Paper>
  )
}
