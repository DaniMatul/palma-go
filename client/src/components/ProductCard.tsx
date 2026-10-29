import { AddRounded, RemoveRounded } from '@mui/icons-material'
import { Box, Card, IconButton, Stack, Typography } from '@mui/material'
import { DailyMenuItem, MenuProduct } from '../types/menu'

type ProductCardProps = {
  product: MenuProduct | DailyMenuItem
  quantity: number
  onIncrease: () => void
  onDecrease: () => void
}

export function ProductCard({ product, quantity, onIncrease, onDecrease }: ProductCardProps) {
  const availableQuantity = 'remainingQuantity' in product ? product.remainingQuantity : product.availableQuantity
  const remaining = Math.max(0, availableQuantity - quantity)
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: quantity > 0 ? 'selection.border' : 'divider', bgcolor: quantity > 0 ? 'selection.background' : 'background.paper', p: { xs: 2, md: 2.25 } }}>
      <Stack spacing={2}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontSize: { xs: '1.5rem', md: '1.625rem' }, fontWeight: 700, lineHeight: 1.3 }}>{product.name}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40, mt: 0.5 }}>{product.description}</Typography>
          <Typography sx={{ color: 'primary.main', fontWeight: 800, mt: 0.25 }}>Q{product.price}</Typography>
          <Typography variant="body2" color={remaining === 0 ? 'error.main' : 'text.secondary'} sx={{ mt: 0.5, fontWeight: remaining === 0 ? 700 : 400 }}>{remaining === 0 ? 'Agotado' : `Quedan ${remaining}`}</Typography>
        </Box>
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5}>
          <IconButton aria-label={`Disminuir ${product.name}`} onClick={onDecrease} disabled={quantity === 0} size="large" sx={{ width: 52, height: 52, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}>
            <RemoveRounded />
          </IconButton>
          <Typography sx={{ minWidth: 32, textAlign: 'center', fontSize: '1.5rem', fontWeight: 800 }}>{quantity}</Typography>
          <IconButton aria-label={`Agregar ${product.name}`} onClick={onIncrease} disabled={quantity >= availableQuantity} size="large" sx={{ width: 52, height: 52, bgcolor: 'primary.main', color: 'common.white', '&:hover': { bgcolor: 'primary.dark' }, '&.Mui-disabled': { bgcolor: 'action.disabledBackground' } }}>
            <AddRounded />
          </IconButton>
        </Stack>
      </Stack>
    </Card>
  )
}
