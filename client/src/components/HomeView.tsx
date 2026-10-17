import { Alert, Box, CircularProgress, Divider, Grid, Paper, Snackbar, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { PointOfSale, DateRange, CalendarMonth, EventNote } from '@mui/icons-material'
import { ReactNode, useEffect, useState } from 'react'
import { DashboardData } from '../types/dashboard'
import { getDashboard } from '../services/dashboardService'
import { SalesByDayChart } from './SalesByDayChart'

type SalesPeriod = 'week' | 'month'
type BestSellingPeriod = 'day' | 'month' | 'year'

const formatCurrency = (amount: number) => `Q${amount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function MetricRow({ label, value, icon, status }: { label: string; value: string; icon: ReactNode; status?: 'inProgress' | 'cancelled' }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} sx={{ py: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
        <Box aria-hidden sx={{ display: 'flex', alignItems: 'center', color: '#6269B8', flexShrink: 0, '& svg': { fontSize: 21 } }}>{icon}</Box>
        {status && <Box aria-hidden sx={(theme) => ({ flexShrink: 0, width: 12, height: 12, borderRadius: '50%', bgcolor: theme.palette.status[status].background, border: `1px solid ${theme.palette.status[status].border}` })} />}
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'normal' }}>{label}</Typography>
      </Stack>
      <Typography color="text.primary" sx={{ fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{value}</Typography>
    </Stack>
  )
}

function PeriodSelector({ value, options, onChange, label }: { value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; label: string }) {
  return (
    <ToggleButtonGroup value={value} exclusive onChange={(_, nextValue: string | null) => nextValue && onChange(nextValue)} size="small" aria-label={label}>
      {options.map((option) => <ToggleButton key={option.value} value={option.value}>{option.label}</ToggleButton>)}
    </ToggleButtonGroup>
  )
}

const emptyDashboard: DashboardData = {
  sales: { week: { total: 0, points: [] }, month: { total: 0, points: [] } },
  bestSelling: { day: [], month: [], year: [] },
  summary: { today: 0, week: 0, month: 0, year: 0 },
  operation: { orders: 0, completedSales: 0, completedOrders: 0, inProgress: 0, cancelled: 0 },
}

export function HomeView() {
  const [salesPeriod, setSalesPeriod] = useState<SalesPeriod>('week')
  const [bestSellingPeriod, setBestSellingPeriod] = useState<BestSellingPeriod>('day')
  const [data, setData] = useState<DashboardData>(emptyDashboard)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void getDashboard(bestSellingPeriod, salesPeriod)
      .then((nextData) => { if (!cancelled) setData(nextData) })
      .catch(() => { if (!cancelled) setError('No se pudo cargar el resumen.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [bestSellingPeriod, salesPeriod])

  const sales = data.sales[salesPeriod]
  const bestSelling = data.bestSelling[bestSellingPeriod]

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 68fr) minmax(320px, 32fr)' }, gridTemplateRows: { xs: 'auto', lg: 'auto auto' }, gap: 3, alignItems: 'stretch' }}>
      <Paper variant="outlined" sx={{ gridColumn: { xs: '1', lg: '1' }, gridRow: { xs: 'auto', lg: '1' }, p: { xs: 2, sm: 3 }, borderRadius: 2.75, height: '100%' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Más vendidos</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Menús con mayor movimiento</Typography>
          </Box>
          <PeriodSelector value={bestSellingPeriod} onChange={(value) => setBestSellingPeriod(value as BestSellingPeriod)} label="Periodo de más vendidos" options={[{ value: 'day', label: 'Día' }, { value: 'month', label: 'Mes' }, { value: 'year', label: 'Año' }]} />
        </Stack>
        {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box> : bestSelling.length === 0 ? <Typography color="text.secondary" sx={{ py: 3 }}>No hay ventas registradas en este período.</Typography> : <Grid container spacing={1.5}>
          {bestSelling.slice(0, 4).map((product) => (
            <Grid item xs={12} sm={6} key={product.name}>
              <Box sx={{ p: 1.75, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
                <Typography sx={{ fontWeight: 800 }}>{product.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{product.quantity.toLocaleString('es-GT')} vendidos</Typography>
                <Typography sx={{ mt: 1, fontWeight: 800, color: 'primary.main' }}>{formatCurrency(product.total)}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>}
      </Paper>

      <Paper variant="outlined" sx={{ gridColumn: { xs: '1', lg: '2' }, gridRow: { xs: 'auto', lg: '1' }, p: { xs: 2, sm: 3 }, borderRadius: 2.75, height: '100%' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Resumen</Typography>
        <Stack divider={<Divider sx={{ opacity: 0.65 }} />}>
          <MetricRow icon={<PointOfSale />} label="Ventas hoy" value={formatCurrency(data.summary.today)} />
          <MetricRow icon={<DateRange />} label="Esta semana" value={formatCurrency(data.summary.week)} />
          <MetricRow icon={<CalendarMonth />} label="Este mes" value={formatCurrency(data.summary.month)} />
          <MetricRow icon={<EventNote />} label="Este año" value={formatCurrency(data.summary.year)} />
        </Stack>
      </Paper>
      <Box sx={{ gridColumn: '1 / -1', gridRow: { xs: 'auto', lg: '2' }, minWidth: 0, height: '100%' }}>
        <SalesByDayChart data={sales.points} total={sales.total} period={salesPeriod} onPeriodChange={(value) => setSalesPeriod(value as SalesPeriod)} />
      </Box>
      <Snackbar open={Boolean(error)} autoHideDuration={5000} onClose={() => setError('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
      </Snackbar>
    </Box>
  )
}
