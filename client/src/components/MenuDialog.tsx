import { useEffect, useState } from 'react'
import { Button, Drawer, FormControl, IconButton, InputLabel, MenuItem as SelectOption, Select, Stack, TextField, Typography } from '@mui/material'
import { Close } from '@mui/icons-material'
import { MenuCategory, MenuItem, MenuItemInput } from '../types/menu'

type MenuDialogProps = { open: boolean; menu: MenuItem | null; initialCategory?: MenuCategory; onClose: () => void; onSave: (menu: MenuItemInput & { id?: string; active: boolean; category: MenuCategory }) => void }

export function MenuDialog({ open, menu, initialCategory = 'Almuerzo', onClose, onSave }: MenuDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [dishType, setDishType] = useState<MenuCategory>(initialCategory)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setName(menu?.name ?? '')
    setDescription(menu?.description ?? '')
    setPrice(menu ? String(menu.price) : '')
    setDishType(initialCategory)
    setSubmitted(false)
  }, [initialCategory, menu, open])

  const nameError = submitted && !name.trim()
  const numericPrice = Number(price)
  const priceError = submitted && (!price || numericPrice <= 0 || Number.isNaN(numericPrice))

  const handleSave = () => {
    setSubmitted(true)
    if (!name.trim() || numericPrice <= 0 || Number.isNaN(numericPrice)) return
    onSave({ id: menu?.id, name: name.trim(), description: description.trim(), price: numericPrice, active: menu?.active ?? true, category: dishType })
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, maxWidth: '100%', bgcolor: 'background.paper', borderRadius: { xs: 0, sm: '20px 0 0 20px' } } }}>
      <Stack sx={{ height: '100%' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, py: 2.25, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>{menu ? 'Editar plato' : 'Crear plato'}</Typography>
          <IconButton aria-label="Cerrar" onClick={onClose}><Close /></IconButton>
        </Stack>
        <Stack spacing={2} sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
          <TextField label="Nombre" value={name} onChange={(event) => setName(event.target.value)} error={nameError} helperText={nameError ? 'El nombre es obligatorio.' : undefined} autoFocus />
          <TextField label="Descripción" value={description} onChange={(event) => setDescription(event.target.value)} />
          <TextField label="Precio" value={price} onChange={(event) => setPrice(event.target.value)} type="number" inputProps={{ min: 0.01, step: 0.01 }} InputProps={{ startAdornment: 'Q' }} error={priceError} helperText={priceError ? 'Ingresa un precio mayor a 0.' : undefined} />
          <FormControl fullWidth>
            <InputLabel id="dish-type-label">Tipo de plato</InputLabel>
            <Select labelId="dish-type-label" label="Tipo de plato" value={dishType} onChange={(event) => setDishType(event.target.value)}>
              <SelectOption value="Desayuno">Desayuno</SelectOption>
              <SelectOption value="Refacción">Refacción</SelectOption>
              <SelectOption value="Almuerzo">Almuerzo</SelectOption>
              <SelectOption value="Extra">Extra</SelectOption>
            </Select>
          </FormControl>
        </Stack>
        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={onClose} variant="outlined">Cancelar</Button>
          <Button onClick={handleSave} variant="contained">Guardar</Button>
        </Stack>
      </Stack>
    </Drawer>
  )
}
