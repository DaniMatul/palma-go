import { useEffect, useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'
import { ComponentCatalog } from '../types/menu'

type Props = { open: boolean; component: ComponentCatalog | null; onClose: () => void; onSave: (input: { name: string; defaultExtraPortionPrice: number }) => void }

export function ComponentCatalogDialog({ open, component, onClose, onSave }: Props) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  useEffect(() => { setName(component?.name ?? ''); setPrice(component ? String(component.defaultExtraPortionPrice) : '') }, [component, open])
  const save = () => { const numericPrice = Number(price); if (!name.trim() || !Number.isFinite(numericPrice) || numericPrice < 0) return; onSave({ name: name.trim(), defaultExtraPortionPrice: numericPrice }) }
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"><DialogTitle sx={{ fontWeight: 800 }}>{component ? 'Editar complemento' : 'Crear complemento'}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField label="Nombre" value={name} onChange={(event) => setName(event.target.value)} autoFocus /><TextField label="Precio por porción adicional" type="number" value={price} onChange={(event) => setPrice(event.target.value)} inputProps={{ min: 0, step: 0.01 }} InputProps={{ startAdornment: 'Q' }} /></Stack></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={onClose} variant="outlined">Cancelar</Button><Button onClick={save} variant="contained">Guardar</Button></DialogActions></Dialog>
}
