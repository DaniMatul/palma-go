import { useEffect, useMemo, useState } from 'react'
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material'
import { DailyMenuItem, OrderLine } from '../types/menu'

type Props = { open: boolean; product: DailyMenuItem | null; initialItem?: OrderLine | null; onClose: () => void; onConfirm: (item: OrderLine) => void }

export function MenuCustomizationDialog({ open, product, initialItem, onClose, onConfirm }: Props) {
  const [removed, setRemoved] = useState<Record<string, boolean>>({})
  const [additional, setAdditional] = useState<Record<string, number>>({})
  const [comment, setComment] = useState('')
  const [showRemoveOptions, setShowRemoveOptions] = useState(false)
  const [showExtraOptions, setShowExtraOptions] = useState(false)
  useEffect(() => {
    if (!open) return
    const nextRemoved = Object.fromEntries((initialItem?.customizations ?? []).filter((customization) => customization.action === 'REMOVE').map((customization) => [customization.componentId ?? customization.componentName, true]))
    const nextAdditional = Object.fromEntries((initialItem?.customizations ?? []).filter((customization) => customization.action === 'ADD').map((customization) => [customization.componentId ?? customization.componentName, customization.quantity]))
    setRemoved(nextRemoved)
    setAdditional(nextAdditional)
    setComment(initialItem?.comment ?? '')
    setShowRemoveOptions(Object.keys(nextRemoved).length > 0)
    setShowExtraOptions(Object.keys(nextAdditional).length > 0)
  }, [open, product, initialItem])
  const price = useMemo(() => (product?.price ?? 0) + (product?.components ?? []).reduce((sum, component) => sum + (additional[component.id ?? component.name] ?? 0) * component.extraPortionPrice, 0), [additional, product])
  const removableComponents = product?.components.filter((component) => component.removable) ?? []
  const extraComponents = product?.components.filter((component) => component.allowsExtraPortion) ?? []
  const confirm = () => {
    if (!product) return
    const customizations = product.components.flatMap((component) => { const id = component.id ?? component.name; const result: Array<{ componentId: string; componentName: string; action: 'REMOVE' | 'ADD'; quantity: number; unitPrice: number }> = []; if (removed[id]) result.push({ componentId: id, componentName: component.name, action: 'REMOVE', quantity: 1, unitPrice: 0 }); if ((additional[id] ?? 0) > 0) result.push({ componentId: id, componentName: component.name, action: 'ADD', quantity: additional[id], unitPrice: component.extraPortionPrice }); return result })
    onConfirm({ id: initialItem?.id ?? `menu-${product.menuItemId}-${Date.now()}`, menuItemId: product.menuItemId, menuComponents: product.components.map((component) => ({ name: component.name })), name: product.name, price, quantity: 1, customizations, comment: comment.trim() || undefined })
  }
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"><DialogTitle sx={{ fontWeight: 800 }}>{initialItem ? `Editar ${product?.name}` : `Personalizar ${product?.name}`}</DialogTitle><DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}>
    {removableComponents.length > 0 && <Stack spacing={0.5}><FormControlLabel control={<Switch checked={showRemoveOptions} onChange={(event) => { const checked = event.target.checked; setShowRemoveOptions(checked); if (!checked) setRemoved({}) }} size="small" />} label="Quitar ingredientes" sx={{ ml: 0, justifyContent: 'space-between', mr: 0, '& .MuiFormControlLabel-label': { fontWeight: 800 } }} />{showRemoveOptions && <Stack spacing={0.25} sx={{ pl: 1 }}>{removableComponents.map((component) => { const id = component.id ?? component.name; return <FormControlLabel key={id} control={<Checkbox checked={Boolean(removed[id])} onChange={(event) => setRemoved((current) => ({ ...current, [id]: event.target.checked }))} />} label={component.name} sx={{ ml: 0 }} /> })}</Stack>}</Stack>}
    {removableComponents.length > 0 && extraComponents.length > 0 && <Divider />}
    {extraComponents.length > 0 && <Stack spacing={0.75}><FormControlLabel control={<Switch checked={showExtraOptions} onChange={(event) => { const checked = event.target.checked; setShowExtraOptions(checked); if (!checked) setAdditional({}) }} size="small" />} label="Agregar porciones" sx={{ ml: 0, justifyContent: 'space-between', mr: 0, '& .MuiFormControlLabel-label': { fontWeight: 800 } }} />{showExtraOptions && <Stack spacing={0.5} sx={{ pl: 1 }}>{extraComponents.map((component) => { const id = component.id ?? component.name; return <Stack key={id} direction="row" alignItems="center" justifyContent="space-between" gap={1}><Typography variant="body2" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{component.name}</Typography><Stack direction="row" alignItems="center" gap={0.5}><Button size="small" onClick={() => setAdditional((current) => ({ ...current, [id]: Math.max(0, (current[id] ?? 0) - 1) }))} disabled={!additional[id]} sx={{ minWidth: 28, px: 0.5 }}>−</Button><Typography sx={{ minWidth: 20, textAlign: 'center', fontWeight: 700 }}>{additional[id] ?? 0}</Typography><Button size="small" onClick={() => setAdditional((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }))} sx={{ minWidth: 28, px: 0.5 }}>+</Button><Typography variant="body2" color="text.secondary" sx={{ minWidth: 48, textAlign: 'right' }}>+Q{component.extraPortionPrice}</Typography></Stack></Stack> })}</Stack>}</Stack>}
    <TextField label="Comentario" value={comment} onChange={(event) => setComment(event.target.value)} multiline minRows={2} inputProps={{ maxLength: 250 }} /><Typography sx={{ fontWeight: 800, textAlign: 'right' }}>Precio unitario: Q{price}</Typography>
  </Stack></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={onClose} variant="outlined">Cancelar</Button><Button onClick={confirm} variant="contained">{initialItem ? 'Guardar cambios' : 'Agregar al pedido'}</Button></DialogActions></Dialog>
}
