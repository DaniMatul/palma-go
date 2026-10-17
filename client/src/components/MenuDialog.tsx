import { useEffect, useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'
import { MenuItem, MenuItemInput } from '../types/menu'

type MenuDialogProps = { open: boolean; menu: MenuItem | null; onClose: () => void; onSave: (menu: MenuItemInput & { id?: string; active: boolean }) => void }

export function MenuDialog({ open, menu, onClose, onSave }: MenuDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setName(menu?.name ?? '')
    setDescription(menu?.description ?? '')
    setPrice(menu ? String(menu.price) : '')
    setSubmitted(false)
  }, [menu, open])

  const nameError = submitted && !name.trim()
  const numericPrice = Number(price)
  const priceError = submitted && (!price || numericPrice <= 0 || Number.isNaN(numericPrice))

  const handleSave = () => {
    setSubmitted(true)
    if (!name.trim() || numericPrice <= 0 || Number.isNaN(numericPrice)) return
    onSave({ id: menu?.id, name: name.trim(), description: description.trim(), price: numericPrice, active: menu?.active ?? true })
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>{menu ? 'Editar menú' : 'Crear menú'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Nombre" value={name} onChange={(event) => setName(event.target.value)} error={nameError} helperText={nameError ? 'El nombre es obligatorio.' : undefined} autoFocus />
          <TextField label="Descripción" value={description} onChange={(event) => setDescription(event.target.value)} />
          <TextField label="Precio" value={price} onChange={(event) => setPrice(event.target.value)} type="number" inputProps={{ min: 0.01, step: 0.01 }} InputProps={{ startAdornment: 'Q' }} error={priceError} helperText={priceError ? 'Ingresa un precio mayor a 0.' : undefined} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">Cancelar</Button>
        <Button onClick={handleSave} variant="contained">Guardar</Button>
      </DialogActions>
    </Dialog>
  )
}
