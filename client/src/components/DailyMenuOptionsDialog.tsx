import { useEffect, useMemo, useState } from 'react'
import { CloseRounded } from '@mui/icons-material'
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Paper, Stack, Switch, TextField, Typography } from '@mui/material'
import { getDailyMenuOptions, saveDailyMenuOptions } from '../services/dailyMenuOptionsService'
import { getMenuItemComposition, getMenuOptions } from '../services/menuOptionService'
import { DailyMenuItem, DailyMenuOption, MenuCategory, MenuItemComposition, MenuOption } from '../types/menu'

type Props = { open: boolean; date: string; category: Exclude<MenuCategory, 'Cena' | 'Extra'>; items: DailyMenuItem[]; onClose: () => void; onSaved: () => void; onError: (message: string) => void }
type Draft = { optionId: string; price: string; available: boolean; initialQuantity: string; remainingQuantity: string }
type Assignment = { dailyMenuItemId: string; optionId: string; role: 'PRIMARY_INCLUDED' | 'COMPLEMENT_INCLUDED' | 'PRIMARY_ADDITIONAL' | 'COMPLEMENT_OPTIONAL' | 'EXTRA_OPTIONAL' }

const categoryValues: Record<Exclude<MenuCategory, 'Cena' | 'Extra'>, 'BREAKFAST' | 'SNACK' | 'LUNCH'> = { Desayuno: 'BREAKFAST', Refacción: 'SNACK', Almuerzo: 'LUNCH' }

export function DailyMenuOptionsDialog({ open, date, category, items, onClose, onSaved, onError }: Props) {
  const [catalog, setCatalog] = useState<MenuOption[]>([])
  const [dailyOptions, setDailyOptions] = useState<DailyMenuOption[]>([])
  const [compositions, setCompositions] = useState<Record<string, MenuItemComposition>>({})
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([getMenuOptions({ category: categoryValues[category] }), getMenuOptions({ kind: 'EXTRA' }), getDailyMenuOptions(date), ...items.map((item) => getMenuItemComposition(item.menuItemId))])
      .then(([categoryOptions, extraOptions, daily, ...loadedCompositions]) => {
        const unique = new Map([...categoryOptions, ...extraOptions].map((option) => [option.id, option]))
        setCatalog([...unique.values()])
        setDailyOptions(daily.options.filter((option) => option.category === categoryValues[category]))
        setCompositions(Object.fromEntries(loadedCompositions.map((composition) => [composition.id, composition])))
        const dailyByOption = new Map(daily.options.filter((option) => option.category === categoryValues[category]).map((option) => [option.optionId, option]))
        setDrafts(Object.fromEntries([...unique.values()].map((option) => {
          const current = dailyByOption.get(option.id)
          return [option.id, { optionId: option.id, price: current ? String(current.price) : String(option.price), available: current?.available ?? false, initialQuantity: current?.initialQuantity == null ? '' : String(current.initialQuantity), remainingQuantity: current?.remainingQuantity == null ? '' : String(current.remainingQuantity) }]
        })))
        const dailyOptionById = new Map(daily.options.map((option) => [option.id, option.optionId]))
        setAssignments(daily.assignments.filter((assignment) => items.some((item) => item.id === assignment.dailyMenuItemId)).flatMap((assignment) => {
          const optionId = dailyOptionById.get(assignment.dailyMenuOptionId)
          return optionId ? [{ dailyMenuItemId: assignment.dailyMenuItemId, optionId, role: assignment.role }] : []
        }))
      })
      .catch((cause) => onError(cause instanceof Error ? cause.message : 'No se pudo cargar la configuración del menú'))
      .finally(() => setLoading(false))
  }, [category, date, items, onError, open])

  const primaryOptions = useMemo(() => catalog.filter((option) => option.kind === 'PRIMARY'), [catalog])
  const isAssigned = (itemId: string, optionId: string, role: Assignment['role']) => assignments.some((assignment) => assignment.dailyMenuItemId === itemId && assignment.optionId === optionId && assignment.role === role)
  const toggleAssignment = (itemId: string, optionId: string, role: Assignment['role'], checked: boolean) => setAssignments((current) => checked ? [...current.filter((assignment) => !(assignment.dailyMenuItemId === itemId && assignment.optionId === optionId && assignment.role === role)), { dailyMenuItemId: itemId, optionId, role }] : current.filter((assignment) => !(assignment.dailyMenuItemId === itemId && assignment.optionId === optionId && assignment.role === role)))
  const updateDraft = (optionId: string, changes: Partial<Draft>) => setDrafts((current) => ({ ...current, [optionId]: { ...current[optionId], ...changes } }))

  const save = async () => {
    const invalidPrice = Object.values(drafts).some((draft) => !Number.isFinite(Number(draft.price)) || Number(draft.price) < 0)
    const invalidStock = catalog.some((option) => option.kind === 'PRIMARY' && drafts[option.id]?.available && (!/^\d+$/.test(drafts[option.id].initialQuantity) || !/^\d+$/.test(drafts[option.id].remainingQuantity)))
    if (invalidPrice || invalidStock) { onError('Revisa los precios y las existencias de las opciones principales.'); return }
    setSaving(true)
    try {
      const options = Object.values(drafts).map((draft) => {
        const option = catalog.find((item) => item.id === draft.optionId)
        return { optionId: draft.optionId, category: categoryValues[category], price: Number(draft.price), available: draft.available, ...(option?.kind === 'PRIMARY' ? { initialQuantity: Number(draft.initialQuantity), remainingQuantity: Number(draft.remainingQuantity) } : {}) }
      })
      const firstSave = await saveDailyMenuOptions(date, options, [])
      const ids = new Map(firstSave.options.filter((option) => option.category === categoryValues[category]).map((option) => [option.optionId, option.id]))
      const savedAssignments = assignments.flatMap((assignment) => { const dailyMenuOptionId = ids.get(assignment.optionId); return dailyMenuOptionId ? [{ dailyMenuItemId: assignment.dailyMenuItemId, dailyMenuOptionId, role: assignment.role, included: true }] : [] })
      await saveDailyMenuOptions(date, options, savedAssignments)
      onSaved()
      onClose()
    } catch (cause) { onError(cause instanceof Error ? cause.message : 'No se pudo guardar la configuración del menú') } finally { setSaving(false) }
  }

  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="md"><DialogTitle sx={{ fontWeight: 800, pr: 6 }}>Configurar menú de {category.toLocaleLowerCase()} · {date}<IconButton aria-label="Cerrar" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 10 }}><CloseRounded /></IconButton></DialogTitle><DialogContent dividers>{loading ? <Typography>Cargando catálogo y composiciones…</Typography> : catalog.length === 0 ? <Alert severity="info">No hay opciones de catálogo para esta categoría.</Alert> : <Stack spacing={2}><Alert severity="info">Las opciones se guardan para la fecha seleccionada. No se crean composiciones automáticamente.</Alert><Stack spacing={1}>{catalog.map((option) => { const draft = drafts[option.id]; return <Paper key={option.id} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }}><Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1.5}><Box sx={{ flex: 1 }}><Typography sx={{ fontWeight: 700 }}>{option.name}</Typography><Typography variant="body2" color="text.secondary">{option.kind} · Precio del día</Typography></Box><TextField label="Precio" value={draft?.price ?? ''} onChange={(event) => updateDraft(option.id, { price: event.target.value.replace(/[^0-9.]/g, '') })} size="small" sx={{ width: 120 }} disabled={saving} /><FormControlLabel control={<Switch checked={draft?.available ?? false} onChange={(event) => updateDraft(option.id, { available: event.target.checked })} disabled={saving} />} label={draft?.available ? 'Disponible' : 'Agotado'} />{option.kind === 'PRIMARY' && draft?.available && <><TextField label="Iniciales" value={draft.initialQuantity} onChange={(event) => updateDraft(option.id, { initialQuantity: event.target.value.replace(/\D/g, '') })} size="small" sx={{ width: 110 }} disabled={saving} /><TextField label="Quedan" value={draft.remainingQuantity} onChange={(event) => updateDraft(option.id, { remainingQuantity: event.target.value.replace(/\D/g, '') })} size="small" sx={{ width: 110 }} disabled={saving} /></>}</Stack></Paper> })}</Stack><Typography variant="h6" sx={{ fontWeight: 800 }}>Asignar opciones a platos</Typography>{items.map((item) => { const composition = compositions[item.menuItemId]; const definitions = composition?.optionDefinitions.filter((definition) => definition.active) ?? []; const hasPrimary = definitions.some((definition) => definition.role === 'PRIMARY_INCLUDED'); return <Paper key={item.id} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: hasPrimary ? 'divider' : 'warning.main' }}><Typography sx={{ fontWeight: 700 }}>{item.name}</Typography>{!composition || !hasPrimary ? <Alert severity="warning" sx={{ mt: 1 }}>Este plato no tiene un principal incluido válido. Configúralo primero en “Composición”.</Alert> : <Stack>{definitions.map((definition) => <FormControlLabel key={`${item.id}-${definition.id ?? definition.optionId}-${definition.role}`} control={<Checkbox checked={isAssigned(item.id, definition.optionId, definition.role)} onChange={(event) => toggleAssignment(item.id, definition.optionId, definition.role, event.target.checked)} disabled={saving || !drafts[definition.optionId]?.available} />} label={`${definition.option.name} · ${definition.role}`} />)}</Stack>}</Paper>})}</Stack>}</DialogContent><DialogActions><Button onClick={onClose} disabled={saving}>Cancelar</Button><Button variant="contained" onClick={() => void save()} disabled={loading || saving || catalog.length === 0}>Guardar configuración</Button></DialogActions></Dialog>
}
