import { useEffect, useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Switch, TextField } from '@mui/material'
import { Extra, ExtraInput } from '../types/menu'

type ExtraDialogProps = { open: boolean; extra: Extra | null; onClose: () => void; onSave: (extra: ExtraInput & { id?: string; active: boolean }) => void }

export function ExtraDialog({ open, extra, onClose, onSave }: ExtraDialogProps) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [active, setActive] = useState(true)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setName(extra?.name ?? '')
    setPrice(extra ? String(extra.price) : '')
    setActive(extra?.active ?? true)
    setSubmitted(false)
  }, [extra, open])

  const numericPrice = Number(price)
  const nameError = submitted && !name.trim()
  const priceError = submitted && (!price || Number.isNaN(numericPrice) || numericPrice <= 0)

  const handleSave = () => {
    setSubmitted(true)
    if (!name.trim() || Number.isNaN(numericPrice) || numericPrice <= 0) return
    onSave({ id: extra?.id, name: name.trim(), price: numericPrice, active: extra?.active ?? active })
  }

  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"><DialogTitle sx={{ fontWeight: 800 }}>{extra ? 'Editar extra' : 'Crear extra'}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField label="Nombre" value={name} onChange={(event) => setName(event.target.value)} error={nameError} helperText={nameError ? 'El nombre es obligatorio.' : undefined} autoFocus /><TextField label="Precio" value={price} onChange={(event) => setPrice(event.target.value)} type="number" inputProps={{ min: 0.01, step: 0.01 }} InputProps={{ startAdornment: 'Q' }} error={priceError} helperText={priceError ? 'Ingresa un precio mayor a 0.' : undefined} /><FormControlLabel control={<Switch checked={active} onChange={(event) => setActive(event.target.checked)} />} label="Activo" /></Stack></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={onClose} variant="outlined">Cancelar</Button><Button onClick={handleSave} variant="contained">Guardar</Button></DialogActions></Dialog>
}
