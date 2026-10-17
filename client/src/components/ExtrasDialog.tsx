import { useEffect, useState } from 'react'
import { AddRounded, RemoveRounded } from '@mui/icons-material'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material'
import { Extra, OrderLine } from '../types/menu'

type ExtrasDialogProps = { open: boolean; extras: Extra[]; onClose: () => void; onConfirm: (items: OrderLine[]) => void }

export function ExtrasDialog({ open, extras, onClose, onConfirm }: ExtrasDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  useEffect(() => {
    if (open) setQuantities({})
  }, [open])

  const updateQuantity = (id: string, amount: number) => {
    setQuantities((current) => ({ ...current, [id]: Math.max(0, (current[id] ?? 0) + amount) }))
  }

  const handleConfirm = () => {
    onConfirm(extras.filter((extra) => (quantities[extra.id] ?? 0) > 0).map((extra) => ({ ...extra, quantity: quantities[extra.id] })))
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>Agregar extras</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          {extras.map((extra) => <Stack key={extra.id} direction="row" alignItems="center" justifyContent="space-between" gap={2} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Stack><Typography sx={{ fontWeight: 700 }}>{extra.name}</Typography><Typography variant="body2" color="text.secondary">Q{extra.price}</Typography></Stack>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <IconButton aria-label={`Disminuir ${extra.name}`} onClick={() => updateQuantity(extra.id, -1)} disabled={!quantities[extra.id]} size="large"><RemoveRounded /></IconButton>
              <Typography sx={{ minWidth: 22, textAlign: 'center', fontWeight: 800 }}>{quantities[extra.id] ?? 0}</Typography>
              <IconButton aria-label={`Agregar ${extra.name}`} onClick={() => updateQuantity(extra.id, 1)} size="large" color="primary"><AddRounded /></IconButton>
            </Stack>
          </Stack>)}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={onClose} variant="outlined">Volver</Button><Button onClick={handleConfirm} variant="contained">Agregar extras</Button></DialogActions>
    </Dialog>
  )
}
