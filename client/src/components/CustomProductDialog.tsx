import { useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'
import { OrderLine } from '../types/menu'

type CustomProductDialogProps = { open: boolean; onClose: () => void; onAdd: (item: OrderLine) => void }

export function CustomProductDialog({ open, onClose, onAdd }: CustomProductDialogProps) {
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('1')

  const reset = () => { setDescription(''); setPrice(''); setQuantity('1') }
  const handleClose = () => { reset(); onClose() }
  const handleAdd = () => {
    const numericPrice = Number(price)
    const numericQuantity = Number(quantity)
    if (!description.trim() || numericPrice <= 0 || numericQuantity <= 0) return
    onAdd({ id: `custom-${Date.now()}`, name: description.trim(), price: numericPrice, quantity: numericQuantity })
    handleClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>Agregar personalizado</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Descripción" value={description} onChange={(event) => setDescription(event.target.value)} autoFocus />
          <TextField label="Precio" value={price} onChange={(event) => setPrice(event.target.value)} type="number" inputProps={{ min: 0.01, step: 0.01 }} InputProps={{ startAdornment: 'Q' }} />
          <TextField label="Cantidad" value={quantity} onChange={(event) => setQuantity(event.target.value)} type="number" inputProps={{ min: 1, step: 1 }} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={handleClose} variant="outlined">Volver</Button><Button onClick={handleAdd} variant="contained">Agregar al pedido</Button></DialogActions>
    </Dialog>
  )
}
