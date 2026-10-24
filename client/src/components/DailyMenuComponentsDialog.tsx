import { useEffect, useMemo, useState } from 'react'
import { AddRounded, DeleteOutlineRounded } from '@mui/icons-material'
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Stack, TextField, Typography } from '@mui/material'
import { ComponentCatalog, DailyMenuComponentDraft } from '../types/menu'

type DraftComponent = DailyMenuComponentDraft & { key: string }
type Props = { open: boolean; menuName: string; components: DailyMenuComponentDraft[]; catalog: ComponentCatalog[]; onClose: () => void; onSave: (components: DailyMenuComponentDraft[]) => Promise<boolean> }

function toDraft(component: DailyMenuComponentDraft, index: number): DraftComponent { return { ...component, key: component.id ?? `component-${index}-${Date.now()}` } }

export function DailyMenuComponentsDialog({ open, menuName, components, catalog, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<DraftComponent[]>([])
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [saveNewToCatalog, setSaveNewToCatalog] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) { setDraft(components.map(toDraft)); setNewName(''); setNewPrice(''); setSaveNewToCatalog(false) } }, [components, open])
  const selectedCatalogIds = useMemo(() => new Set(draft.flatMap((component) => component.catalogComponentId ? [component.catalogComponentId] : [])), [draft])
  const update = (key: string, changes: Partial<DraftComponent>) => setDraft((current) => current.map((component) => component.key === key ? { ...component, ...changes } : component))
  const toggleCatalogComponent = (component: ComponentCatalog, checked: boolean) => {
    if (checked) setDraft((current) => [...current, { key: `component-${component.id}-${Date.now()}`, catalogComponentId: component.id, name: component.name, removable: true, allowsExtraPortion: false, extraPortionPrice: component.defaultExtraPortionPrice }])
    else setDraft((current) => current.filter((item) => item.catalogComponentId !== component.id))
  }
  const addNewComponent = () => {
    const name = newName.trim()
    const price = Number(newPrice)
    if (!name || !Number.isFinite(price) || price < 0) return
    setDraft((current) => [...current, { key: `component-${Date.now()}`, name, removable: true, allowsExtraPortion: false, extraPortionPrice: price, catalogDraft: { name, defaultExtraPortionPrice: price, saveToCatalog: saveNewToCatalog } }])
    setNewName(''); setNewPrice(''); setSaveNewToCatalog(false)
  }
  const save = async () => { if (saving) return; setSaving(true); try { const success = await onSave(draft.map(({ key, ...component }, position) => ({ ...component, position, name: component.name.trim(), extraPortionPrice: component.allowsExtraPortion ? Number(component.extraPortionPrice) || 0 : 0 }))); if (success) onClose() } finally { setSaving(false) } }

  return <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm"><DialogTitle sx={{ fontWeight: 800 }}>Componentes de {menuName}</DialogTitle><DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}>
    <Stack spacing={0.5}><Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Seleccionar del catálogo</Typography>{catalog.filter((component) => component.active).map((component) => <FormControlLabel key={component.id} control={<Checkbox checked={selectedCatalogIds.has(component.id)} onChange={(event) => toggleCatalogComponent(component, event.target.checked)} disabled={saving} />} label={<Stack direction="row" justifyContent="space-between" sx={{ minWidth: 260 }}><span>{component.name}</span><Typography component="span" variant="body2" color="text.secondary">+Q{component.defaultExtraPortionPrice}</Typography></Stack>} />)}</Stack>
    <Stack spacing={0.75} sx={{ pt: 0.5, borderTop: '1px solid', borderColor: 'divider' }}><Typography variant="subtitle2" sx={{ fontWeight: 800, pt: 1 }}>Crear complemento nuevo</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}><TextField size="small" fullWidth label="Nombre del complemento" value={newName} onChange={(event) => setNewName(event.target.value)} disabled={saving} /><TextField size="small" label="Precio adicional" type="number" value={newPrice} onChange={(event) => setNewPrice(event.target.value)} inputProps={{ min: 0, step: 0.01 }} InputProps={{ startAdornment: 'Q' }} sx={{ width: { sm: 155 } }} disabled={saving} /><Button size="small" variant="outlined" startIcon={<AddRounded />} onClick={addNewComponent} disabled={saving}>Añadir</Button></Stack><FormControlLabel control={<Checkbox checked={saveNewToCatalog} onChange={(event) => setSaveNewToCatalog(event.target.checked)} disabled={saving} />} label="Guardar también en el catálogo" /></Stack>
    {draft.length > 0 && <Stack spacing={1}><Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Componentes de este menú</Typography>{draft.map((component, index) => <Stack key={component.key} spacing={0.75} sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography sx={{ fontWeight: 700 }}>{component.name}</Typography><Typography variant="body2" color="text.secondary">Precio adicional: Q{component.extraPortionPrice}</Typography></Box><IconButton aria-label={`Retirar ${component.name}`} onClick={() => setDraft((current) => current.filter((item) => item.key !== component.key))} color="error" disabled={saving}><DeleteOutlineRounded /></IconButton></Stack><Stack direction={{ xs: 'column', sm: 'row' }} gap={1}><FormControlLabel control={<Checkbox checked={component.removable} onChange={(event) => update(component.key, { removable: event.target.checked })} disabled={saving} />} label="Se puede quitar" /><FormControlLabel control={<Checkbox checked={component.allowsExtraPortion} onChange={(event) => update(component.key, { allowsExtraPortion: event.target.checked })} disabled={saving} />} label="Permite porción adicional" /><TextField size="small" label="Precio adicional" type="number" value={component.extraPortionPrice} disabled={!component.allowsExtraPortion || saving} onChange={(event) => update(component.key, { extraPortionPrice: Number(event.target.value) })} InputProps={{ startAdornment: 'Q' }} inputProps={{ min: 0, step: 0.01 }} sx={{ maxWidth: 155 }} /></Stack></Stack>)}</Stack>}
  </Stack></DialogContent><DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={onClose} variant="outlined" disabled={saving}>Cancelar</Button><Button onClick={() => void save()} variant="contained" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button></DialogActions></Dialog>
}
