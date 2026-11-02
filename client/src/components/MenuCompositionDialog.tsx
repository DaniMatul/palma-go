import { useEffect, useMemo, useState } from 'react'
import { CloseRounded } from '@mui/icons-material'
import { Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'
import { getMenuItemComposition, getMenuOptions, saveMenuItemComposition } from '../services/menuOptionService'
import type { MenuCategory, MenuItem, MenuItemOptionRole, MenuOption } from '../types/menu'

type MenuCompositionDialogProps = { open: boolean; menu: MenuItem | null; category: MenuCategory | null; onClose: () => void; onSaved: () => void; onError: (message: string) => void }
type Definition = { optionId: string; role: MenuItemOptionRole; quantity: number; active: boolean }

const categoryValues: Partial<Record<MenuCategory, string>> = { Desayuno: 'BREAKFAST', Refacción: 'SNACK', Almuerzo: 'LUNCH' }
const includedRoles: MenuItemOptionRole[] = ['PRIMARY_INCLUDED', 'COMPLEMENT_INCLUDED']

export function MenuCompositionDialog({ open, menu, category, onClose, onSaved, onError }: MenuCompositionDialogProps) {
  const [options, setOptions] = useState<MenuOption[]>([])
  const [definitions, setDefinitions] = useState<Definition[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!open || !menu || !category || !categoryValues[category]) return
    let cancelled = false
    setLoading(true)
    setLoadError('')
    setOptions([])
    setDefinitions([])
    Promise.all([
      getMenuOptions({ category: categoryValues[category] }),
      getMenuItemComposition(menu.id),
    ]).then(([categoryOptions, composition]) => {
      if (cancelled) return
      setOptions(categoryOptions)
      setDefinitions(composition.optionDefinitions.map(({ optionId, role, quantity, active }) => ({ optionId, role, quantity, active })))
    }).catch((cause) => {
      if (!cancelled) setLoadError(cause instanceof Error ? cause.message : 'No se pudo cargar la composición del plato')
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [category, menu?.id, open])

  const primaryOptions = useMemo(() => options.filter((option) => option.kind === 'PRIMARY'), [options])
  const complementOptions = useMemo(() => options.filter((option) => option.kind === 'COMPLEMENT'), [options])
  const primaryId = definitions.find((definition) => definition.role === 'PRIMARY_INCLUDED')?.optionId
  const primary = primaryOptions.find((option) => option.id === primaryId) ?? null
  const selectedComplements = complementOptions.filter((option) => definitions.some((definition) => definition.optionId === option.id && definition.role === 'COMPLEMENT_INCLUDED'))
  const unavailableIncluded = definitions.filter((definition) => includedRoles.includes(definition.role) && !options.some((option) => option.id === definition.optionId))

  const choosePrimary = (option: MenuOption | null) => {
    setDefinitions((current) => [
      ...current.filter((definition) => definition.role !== 'PRIMARY_INCLUDED'),
      ...(option ? [{ optionId: option.id, role: 'PRIMARY_INCLUDED' as const, quantity: 1, active: true }] : []),
    ])
  }

  const chooseComplements = (selected: MenuOption[]) => {
    setDefinitions((current) => {
      const existing = new Map(current.filter((definition) => definition.role === 'COMPLEMENT_INCLUDED').map((definition) => [definition.optionId, definition]))
      return [
        ...current.filter((definition) => definition.role !== 'COMPLEMENT_INCLUDED'),
        ...selected.map((option) => existing.get(option.id) ?? { optionId: option.id, role: 'COMPLEMENT_INCLUDED' as const, quantity: 1, active: true }),
      ]
    })
  }

  const save = async () => {
    if (!menu || !primary) {
      onError('Cada plato debe tener exactamente un principal incluido de su categoría.')
      return
    }
    setSaving(true)
    try {
      await saveMenuItemComposition(menu.id, definitions)
      onSaved()
      onClose()
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'No se pudo guardar la composición del plato')
    } finally { setSaving(false) }
  }

  return <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
    <DialogTitle sx={{ fontWeight: 800, pr: 6 }}>Composición de {menu?.name}<Button aria-label="Cerrar" onClick={onClose} disabled={saving} sx={{ position: 'absolute', right: 12, top: 10, minWidth: 40 }}><CloseRounded /></Button></DialogTitle>
    <DialogContent dividers>
      {loading ? <Stack direction="row" alignItems="center" spacing={1.5}><CircularProgress size={22} /><Typography color="text.secondary">Cargando opciones configurables…</Typography></Stack> : loadError ? <Alert severity="error">{loadError}</Alert> : <Stack spacing={3} sx={{ py: 1 }}>
        {unavailableIncluded.length > 0 && <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => setDefinitions((current) => current.filter((definition) => !unavailableIncluded.includes(definition)))}>Quitar de este plato</Button>}>Hay opciones incluidas que ya no están disponibles en esta categoría. Puedes corregir su categoría en el catálogo o quitarlas de este plato.</Alert>}
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>Principal incluido</Typography>
          <Autocomplete
            options={primaryOptions}
            value={primary}
            onChange={(_, option) => choosePrimary(option)}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            disabled={saving || primaryOptions.length === 0}
            renderOption={(props, option) => <li {...props} key={option.id}>{option.name} · Q{option.price.toFixed(2)}</li>}
            renderInput={(params) => <TextField {...params} label="Buscar principal" placeholder="Escribe el nombre" />}
            noOptionsText="No se encontraron principales"
          />
          {primaryOptions.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No hay principales activos para esta categoría.</Typography>}
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>Complementos incluidos</Typography>
          <Autocomplete
            multiple
            options={complementOptions}
            value={selectedComplements}
            onChange={(_, selected) => chooseComplements(selected)}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            disabled={saving || complementOptions.length === 0}
            renderOption={(props, option) => <li {...props} key={option.id}>{option.name} · Q{option.price.toFixed(2)}</li>}
            renderTags={(values, getTagProps) => values.map((option, index) => <Chip label={option.name} {...getTagProps({ index })} key={option.id} />)}
            renderInput={(params) => <TextField {...params} label="Buscar complementos" placeholder="Escribe para agregar" />}
            noOptionsText="No se encontraron complementos"
          />
          {complementOptions.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>No hay complementos activos para esta categoría.</Typography>}
          {selectedComplements.length > 0 && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Seleccionados: {selectedComplements.map((option) => option.name).join(', ')}</Typography>}
        </Box>
      </Stack>}
    </DialogContent>
    <DialogActions><Button onClick={onClose} disabled={saving}>Cancelar</Button><Button variant="contained" onClick={() => void save()} disabled={loading || saving || Boolean(loadError) || !primary || unavailableIncluded.length > 0}>Guardar composición</Button></DialogActions>
  </Dialog>
}
