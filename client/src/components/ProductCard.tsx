import { AddRounded } from '@mui/icons-material'
import { Box, Button, Card, Stack, Typography } from '@mui/material'
import { DailyMenuItem, MenuProduct } from '../types/menu'

type ProductCardProps = {
  product: MenuProduct | DailyMenuItem
  onAdd: () => void
  onCustomize?: () => void
  individualPrice?: number | null
  onAddIndividual?: () => void
  remainingQuantityOverride?: number
  addDisabled?: boolean
}

export function ProductCard({ product, onAdd, onCustomize, individualPrice, onAddIndividual, remainingQuantityOverride, addDisabled = false }: ProductCardProps) {
  const availableQuantity = 'remainingQuantity' in product ? product.remainingQuantity : product.availableQuantity
  const remaining = remainingQuantityOverride ?? availableQuantity
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', p: { xs: 2, md: 2.25 } }}>
      <Stack spacing={2}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1.05rem', md: '1.15rem' }, fontWeight: 800 }}>{product.name}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40, mt: 0.5 }}>{product.description}</Typography>
          <Typography sx={{ color: 'primary.main', fontWeight: 800, mt: 0.25 }}>Q{product.price}</Typography>
          <Typography variant="body2" color={remaining === 0 ? 'error.main' : 'text.secondary'} sx={{ mt: 0.5, fontWeight: remaining === 0 ? 700 : 400 }}>{remaining === 0 ? 'Agotado' : `Quedan ${remaining}`}</Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="stretch" justifyContent="center" spacing={1}>
          <Button fullWidth variant="contained" startIcon={<AddRounded />} onClick={onAdd} disabled={addDisabled} sx={{ minHeight: 44, fontWeight: 800 }}>Agregar plato</Button>
        </Stack>
        {onCustomize && <Button size="small" variant="text" onClick={onCustomize} disabled={addDisabled && remaining === 0} sx={{ alignSelf: 'center', minHeight: 28, textTransform: 'none' }}>Personalizar</Button>}
        {onAddIndividual && individualPrice !== null && individualPrice !== undefined && <Button size="small" variant="text" onClick={onAddIndividual} disabled={addDisabled && remaining === 0} sx={{ alignSelf: 'center', minHeight: 28, textTransform: 'none', color: 'text.secondary' }}>Solo principal · Q{individualPrice}</Button>}
      </Stack>
    </Card>
  )
}
