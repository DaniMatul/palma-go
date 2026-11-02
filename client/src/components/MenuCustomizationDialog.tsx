import { useEffect, useMemo, useState } from 'react'
import { AddRounded, RemoveRounded } from '@mui/icons-material'
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material'
import { CreateOrderCustomization } from '../services/dailyMenuOptionsService'
import { DailyMenuItem, DailyMenuOption, DailyMenuOptionAssignment } from '../types/menu'

type MenuCustomizationDialogProps = {
  open: boolean
  product: DailyMenuItem | null
  options: DailyMenuOption[]
  assignments: DailyMenuOptionAssignment[]
  onClose: () => void
  onSave: (customizations: CreateOrderCustomization[]) => void
}

export function MenuCustomizationDialog({ open, product, options, assignments, onClose, onSave }: MenuCustomizationDialogProps) {
  const [replacements, setReplacements] = useState<Record<string, string>>({})
  const [added, setAdded] = useState<Record<string, boolean>>({})
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const productAssignments = useMemo(() => assignments.filter((assignment) => assignment.dailyMenuItemId === product?.id), [assignments, product?.id])
  const optionById = useMemo(() => new Map(options.map((option) => [option.id, option])), [options])
  const includedComplements = productAssignments.filter((assignment) => assignment.role === 'COMPLEMENT_INCLUDED')
  const replacementsByTarget = (targetId: string) => productAssignments.filter((assignment) => assignment.role === 'COMPLEMENT_OPTIONAL' && optionById.get(assignment.dailyMenuOptionId)?.available && assignment.dailyMenuOptionId !== targetId)
  const additions = productAssignments.filter((assignment) => ['PRIMARY_ADDITIONAL', 'COMPLEMENT_OPTIONAL', 'EXTRA_OPTIONAL'].includes(assignment.role) && optionById.get(assignment.dailyMenuOptionId)?.available)

  useEffect(() => {
    if (!open) return
    setReplacements(Object.fromEntries(includedComplements.map((assignment) => [assignment.dailyMenuOptionId, assignment.dailyMenuOptionId])))
    setAdded({})
    setQuantities({})
  }, [open, product?.id, includedComplements])

  const updateQuantity = (id: string, amount: number) => setQuantities((current) => ({ ...current, [id]: Math.max(1, (current[id] ?? 1) + amount) }))

  const save = () => {
    const result: CreateOrderCustomization[] = []
    includedComplements.forEach((assignment) => {
      const selected = replacements[assignment.dailyMenuOptionId]
      if (selected && selected !== assignment.dailyMenuOptionId) result.push({ dailyMenuOptionId: selected, action: 'REPLACED', quantity: 1, replacesDailyMenuOptionId: assignment.dailyMenuOptionId })
    })
    additions.filter((assignment) => added[assignment.dailyMenuOptionId]).forEach((assignment) => result.push({ dailyMenuOptionId: assignment.dailyMenuOptionId, action: 'ADDED', quantity: quantities[assignment.dailyMenuOptionId] ?? 1 }))
    onSave(result)
  }

  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle sx={{ fontWeight: 800 }}>Personalizar {product?.name ?? 'plato'}</DialogTitle>
    <DialogContent>
      <Stack spacing={2} sx={{ pt: 1 }}>
        {productAssignments.length === 0 ? <Typography color="text.secondary">Este plato todavía no tiene opciones configuradas.</Typography> : <>
          {includedComplements.map((assignment) => {
            const current = optionById.get(assignment.dailyMenuOptionId)
            const replacementOptions = replacementsByTarget(assignment.dailyMenuOptionId)
            return <FormControl key={assignment.id} fullWidth disabled={replacementOptions.length === 0}>
              <InputLabel>Complemento: {current?.name}</InputLabel>
              <Select label={`Complemento: ${current?.name}`} value={replacements[assignment.dailyMenuOptionId] ?? assignment.dailyMenuOptionId} onChange={(event) => setReplacements((state) => ({ ...state, [assignment.dailyMenuOptionId]: event.target.value }))}>
                <MenuItem value={assignment.dailyMenuOptionId}>{current?.name} (incluido)</MenuItem>
                {replacementOptions.map((replacement) => <MenuItem key={replacement.dailyMenuOptionId} value={replacement.dailyMenuOptionId}>{optionById.get(replacement.dailyMenuOptionId)?.name} · Q{optionById.get(replacement.dailyMenuOptionId)?.price}</MenuItem>)}
              </Select>
            </FormControl>
          })}
          {additions.map((assignment) => {
            const option = optionById.get(assignment.dailyMenuOptionId)
            if (!option) return null
            const selected = Boolean(added[assignment.dailyMenuOptionId])
            return <Stack key={assignment.id} direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1 }}>
              <Stack direction="row" alignItems="center" gap={1}><Checkbox checked={selected} onChange={(event) => setAdded((state) => ({ ...state, [assignment.dailyMenuOptionId]: event.target.checked }))} /><Stack><Typography sx={{ fontWeight: 700 }}>{option.name}</Typography><Typography variant="body2" color="text.secondary">Q{option.price}{option.kind === 'PRIMARY' && option.remainingQuantity !== null ? ` · Quedan ${option.remainingQuantity}` : ''}</Typography></Stack></Stack>
              {selected && <Stack direction="row" alignItems="center"><Button onClick={() => updateQuantity(assignment.dailyMenuOptionId, -1)} size="small" startIcon={<RemoveRounded />} aria-label="Disminuir" /> <Typography sx={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>{quantities[assignment.dailyMenuOptionId] ?? 1}</Typography><Button onClick={() => updateQuantity(assignment.dailyMenuOptionId, 1)} size="small" startIcon={<AddRounded />} aria-label="Aumentar" /></Stack>}
            </Stack>
          })}
        </>}
      </Stack>
    </DialogContent>
    <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}><Button onClick={onClose} variant="outlined">Cancelar</Button><Button onClick={save} variant="contained">Aplicar personalización</Button></DialogActions>
  </Dialog>
}
