import { useEffect, useMemo, useState } from 'react'
import { AddCircleOutlineRounded, MoreVertRounded, PersonAddAltRounded } from '@mui/icons-material'
import { Alert, Box, Button, Card, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Grid, IconButton, Menu, MenuItem, Snackbar, Stack, TextField, Typography } from '@mui/material'
import { getDailyMenu } from '../services/dailyMenuService'
import { getExtras } from '../services/extraService'
import { createOrder, CreateOrderInput } from '../services/orderService'
import { DailyMenuItem, Extra, OrderLine } from '../types/menu'
import { CustomProductDialog } from './CustomProductDialog'
import { ExtrasDialog } from './ExtrasDialog'
import { NewOrderSummary } from './NewOrderSummary'
import { ProductCard } from './ProductCard'

function getCurrentTime() {
  return new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function getLocalDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDefaultPromise() {
  const value = new Date(Date.now() + 20 * 60 * 1000)
  return { date: getLocalDate(value), time: value.toTimeString().slice(0, 5) }
}

function getLocalDateTime(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes)
}

function toIsoDateTime(date: string, time: string) {
  return getLocalDateTime(date, time).toISOString()
}

const emptyQuantities = (menus: DailyMenuItem[]) => Object.fromEntries(menus.map((product) => [product.id, 0]))

type NewOrderViewProps = { onOrderCreated?: () => Promise<void> | void }

type AccountDraft = {
  id: string
  name: string
  quantities: Record<string, number>
  extraItems: OrderLine[]
  customItems: OrderLine[]
}

function createAccount(menus: DailyMenuItem[], index: number): AccountDraft {
  return { id: `account-${index}-${Date.now()}`, name: '', quantities: emptyQuantities(menus), extraItems: [], customItems: [] }
}

export function NewOrderView({ onOrderCreated }: NewOrderViewProps) {
  const [menus, setMenus] = useState<DailyMenuItem[]>([])
  const [extras, setExtras] = useState<Extra[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [address, setAddress] = useState('')
  const [accounts, setAccounts] = useState<AccountDraft[]>(() => [createAccount([], 0)])
  const [activeAccountId, setActiveAccountId] = useState('')
  const [extrasOpen, setExtrasOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [createdAt, setCreatedAt] = useState(getCurrentTime)
  const [promiseDate, setPromiseDate] = useState(() => getDefaultPromise().date)
  const [promiseTime, setPromiseTime] = useState(() => getDefaultPromise().time)
  const [promiseTimeError, setPromiseTimeError] = useState('')
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [notification, setNotification] = useState<{ severity: 'success' | 'error'; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [accountErrorId, setAccountErrorId] = useState<string | null>(null)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<HTMLElement | null>(null)
  const activeAccount = accounts.find((account) => account.id === activeAccountId) ?? accounts[0]
  const getAccountItems = (account: AccountDraft) => [
    ...menus.filter((product) => (account.quantities[product.id] ?? 0) > 0).map((product) => ({ id: product.menuItemId, name: product.name, price: product.price, quantity: account.quantities[product.id] })),
    ...account.extraItems,
    ...account.customItems,
  ]
  const accountSummaries = useMemo(() => accounts.map((account) => ({ id: account.id, name: account.name, items: getAccountItems(account) })), [accounts, menus])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    Promise.all([getDailyMenu(), getExtras()])
      .then(([dailyMenu, loadedExtras]) => {
        if (cancelled) return
        setMenus(dailyMenu.items)
        setExtras(loadedExtras)
        setAccounts((current) => current.map((account) => ({ ...account, quantities: emptyQuantities(dailyMenu.items) })))
        setActiveAccountId((current) => current || accounts[0]?.id || '')
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el menú de hoy')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const changeQuantity = (product: DailyMenuItem, amount: number) => {
    setNotification(null)
    if (!activeAccount) return
    if (accountErrorId === activeAccount.id) setAccountErrorId(null)
    setAccounts((current) => current.map((account) => {
      if (account.id !== activeAccount.id) return account
      const currentQuantity = account.quantities[product.id] ?? 0
      const nextQuantity = Math.max(0, Math.min(product.remainingQuantity, currentQuantity + amount))
      return { ...account, quantities: { ...account.quantities, [product.id]: nextQuantity } }
    }))
  }

  const addAccount = () => {
    const account = createAccount(menus, accounts.length)
    setAccounts((current) => [...current, account])
    setActiveAccountId(account.id)
  }

  const removeAccount = (id: string) => {
    if (accounts.length === 1) return
    const next = accounts.filter((account) => account.id !== id)
    setAccounts(next)
    setEditingAccountId((current) => current === id ? null : current)
    setAccountMenuAnchor(null)
    if (id === accountErrorId) setAccountErrorId(null)
    if (id === activeAccountId) setActiveAccountId(next[0].id)
  }

  const selectAccount = (id: string) => {
    if (id === activeAccountId) {
      setEditingAccountId(id)
      return
    }
    setActiveAccountId(id)
    setEditingAccountId(null)
  }

  const startRename = (id: string) => {
    setActiveAccountId(id)
    setEditingAccountId(id)
    setAccountMenuAnchor(null)
  }

  const saveAccountName = (id: string, name: string) => {
    setAccounts((current) => current.map((account) => account.id === id ? { ...account, name: name.trim() } : account))
    setEditingAccountId((current) => current === id ? null : current)
  }

  const handleCreate = async () => {
    if (submitting) return
    const missingFields: string[] = []
    if (!customerName.trim()) missingFields.push('el nombre del cliente')
    if (!address.trim()) missingFields.push('la dirección')
    const emptyAccountIndex = accountSummaries.findIndex((account) => account.items.length === 0)
    if (emptyAccountIndex !== -1) {
      const emptyAccount = accountSummaries[emptyAccountIndex]
      const accountLabel = emptyAccount.name.trim() ? `la cuenta ${emptyAccount.name.trim()}` : `la Cuenta ${emptyAccountIndex + 1}`
      const message = `${accountLabel} está vacía. Agrega un producto o elimina la cuenta.`
      setAccountErrorId(emptyAccount.id)
      setNotification({ severity: 'error', message: message.charAt(0).toUpperCase() + message.slice(1) })
      return
    }
    const selectedPromiseTime = promiseTime ? getLocalDateTime(promiseDate, promiseTime) : null
    if (missingFields.length > 0) {
      setNotification({ severity: 'error', message: `Completa ${missingFields.join(', ')}.` })
      return
    }
    if (!selectedPromiseTime || Number.isNaN(selectedPromiseTime.getTime()) || selectedPromiseTime < new Date()) {
      const message = 'La hora de promesa debe ser posterior a la hora actual.'
      setPromiseTimeError(message)
      setNotification({ severity: 'error', message })
      return
    }
    setSubmitting(true)
    setError('')
    setNotification(null)
    const input: CreateOrderInput = {
      customerName: customerName.trim(),
      address: address.trim(),
      promiseTime: toIsoDateTime(promiseDate, promiseTime),
      accounts: accountSummaries.map((account) => ({
        name: account.name.trim() || undefined,
        items: account.items.map((item) => {
          const menu = menus.find((product) => product.menuItemId === item.id)
          if (menu) return { type: 'MENU' as const, menuItemId: menu.menuItemId, quantity: item.quantity }
          const extra = extras.find((product) => product.id === item.id)
          if (extra) return { type: 'EXTRA' as const, extraId: extra.id, quantity: item.quantity }
          return { type: 'CUSTOM' as const, description: item.name, unitPrice: item.price, quantity: item.quantity }
        }),
      })),
    }

    try {
      await createOrder(input)
      setNotification({ severity: 'success', message: 'Pedido creado correctamente' })
      setCustomerName('')
      setAddress('')
      setAccounts([createAccount(menus, 0)])
      setActiveAccountId('')
      setAccountErrorId(null)
      setEditingAccountId(null)
      setAccountMenuAnchor(null)
      setCreatedAt(getCurrentTime())
      const nextPromise = getDefaultPromise()
      setPromiseDate(nextPromise.date)
      setPromiseTime(nextPromise.time)
      setPromiseTimeError('')
      try {
        const latestMenu = await getDailyMenu()
        setMenus(latestMenu.items)
        setAccounts((current) => current.map((account) => ({ ...account, quantities: emptyQuantities(latestMenu.items) })))
        await onOrderCreated?.()
      } catch {
        console.error('No se pudo actualizar el menú del día después de crear el pedido')
        setNotification({ severity: 'error', message: 'El pedido se creó, pero no se pudo actualizar la disponibilidad en pantalla.' })
      }
    } catch (requestError: unknown) {
      console.error(requestError)
      setNotification({ severity: 'error', message: requestError instanceof Error ? requestError.message : 'No se pudo crear el pedido' })
    } finally {
      setSubmitting(false)
    }
  }

  const resetDraft = () => {
    const nextPromise = getDefaultPromise()
    setCustomerName('')
    setAddress('')
    setAccounts([createAccount(menus, 0)])
    setActiveAccountId('')
    setAccountErrorId(null)
    setEditingAccountId(null)
    setAccountMenuAnchor(null)
    setCreatedAt(getCurrentTime())
    setPromiseDate(nextPromise.date)
    setPromiseTime(nextPromise.time)
    setPromiseTimeError('')
    setNotification(null)
    setError('')
    setClearDialogOpen(false)
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress color="primary" /></Box>

  return (
    <Box component="section" aria-labelledby="new-order-title">
      <Typography id="new-order-title" variant="h4" sx={{ fontWeight: 800, fontSize: { xs: '2rem', md: '2.25rem' } }}>Nuevo pedido</Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>Registra rápidamente un pedido para el comedor.</Typography>
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={{ xs: 3, lg: 4 }}>
        <Grid item xs={12} lg={8}>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField fullWidth label="Nombre del cliente" value={customerName} onChange={(event) => setCustomerName(event.target.value)} inputProps={{ maxLength: 80 }} />
              <TextField fullWidth label="Dirección" value={address} onChange={(event) => setAddress(event.target.value)} inputProps={{ maxLength: 120 }} />
            </Stack>
            <Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={1.5} sx={{ mb: 1.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Menú principal</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2, overflowX: 'auto', p: 0.5, bgcolor: 'background.secondary', borderRadius: 2 }}>
                {accounts.map((account, index) => {
                  const isActive = account.id === activeAccount?.id
                  const accountLabel = account.name.trim() || `Cuenta ${index + 1}`
                  const accountControl = editingAccountId === account.id
                    ? <TextField autoFocus size="small" value={account.name} error={accountErrorId === account.id} placeholder={accountLabel} onClick={(event) => event.stopPropagation()} onChange={(event) => setAccounts((current) => current.map((item) => item.id === account.id ? { ...item, name: event.target.value } : item))} onBlur={() => saveAccountName(account.id, account.name)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); saveAccountName(account.id, account.name) } }} inputProps={{ 'aria-label': `Nombre de la cuenta ${index + 1}`, maxLength: 80 }} sx={{ width: 132, '& .MuiInputBase-root': { minHeight: 36, bgcolor: 'background.paper' }, '& input': { py: 0.75, px: 1.25 } }} />
                    : <Button color={accountErrorId === account.id ? 'error' : 'primary'} variant="text" onClick={() => selectAccount(account.id)} sx={{ minHeight: 36, px: 1.5, whiteSpace: 'nowrap', borderRadius: 1.5, fontWeight: isActive ? 800 : 600, '&:hover': { bgcolor: 'rgba(98, 105, 184, 0.06)' } }}>{accountLabel}</Button>

                  return <Stack key={account.id} direction="row" alignItems="center" sx={{ flexShrink: 0, borderRadius: 1.5, bgcolor: isActive ? 'background.paper' : 'transparent', boxShadow: isActive ? '0 2px 8px rgba(70, 75, 130, 0.10)' : 'none' }}>
                    {accountControl}
                    {isActive && <>
                      <IconButton size="small" aria-label="Opciones de cuenta" onClick={(event) => { event.stopPropagation(); setAccountMenuAnchor(event.currentTarget) }} sx={{ mr: 0.25, color: 'text.secondary', minWidth: 30, minHeight: 30 }}><MoreVertRounded fontSize="small" /></IconButton>
                      <Menu anchorEl={accountMenuAnchor} open={Boolean(accountMenuAnchor)} onClose={() => setAccountMenuAnchor(null)}>
                        <MenuItem onClick={() => startRename(account.id)}>Renombrar</MenuItem>
                        <MenuItem onClick={() => removeAccount(account.id)}>Eliminar cuenta</MenuItem>
                      </Menu>
                    </>}
                  </Stack>
                })}
                <Button size="small" startIcon={<PersonAddAltRounded />} onClick={addAccount} sx={{ minHeight: 36, px: 1.25, whiteSpace: 'nowrap', borderLeft: '1px solid', borderColor: 'divider', borderRadius: 0 }}>Nueva cuenta</Button>
              </Stack>
              <Grid container spacing={1.5}>{menus.length > 0 ? menus.map((product) => <Grid item xs={12} sm={4} key={product.id}><ProductCard product={product} quantity={activeAccount?.quantities[product.id] ?? 0} onIncrease={() => changeQuantity(product, 1)} onDecrease={() => changeQuantity(product, -1)} /></Grid>) : <Grid item xs={12}><Typography color="text.secondary">No hay platillos disponibles para hoy.</Typography></Grid>}</Grid>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
                <Card elevation={0} sx={{ flex: 1, border: '1px dashed', borderColor: 'primary.main', bgcolor: 'primary.light' }}>
                  <Button fullWidth size="large" startIcon={<AddCircleOutlineRounded />} onClick={() => setExtrasOpen(true)} disabled={!activeAccount} sx={{ minHeight: 64, fontWeight: 800 }}>Agregar extras</Button>
                </Card>
                <Card elevation={0} sx={{ flex: 1, border: '1px dashed', borderColor: 'divider', bgcolor: 'background.paper' }}>
                  <Button fullWidth size="large" startIcon={<PersonAddAltRounded />} onClick={() => setCustomOpen(true)} disabled={!activeAccount} sx={{ minHeight: 64, fontWeight: 800 }}>Agregar personalizado</Button>
                </Card>
              </Stack>
            </Box>
          </Stack>
        </Grid>
        <Grid item xs={12} lg={4}>
          <NewOrderSummary accounts={accountSummaries} createdAt={createdAt} promiseTime={promiseTime} promiseTimeError={promiseTimeError} onPromiseTimeChange={(value) => { setPromiseTime(value); setPromiseDate(getLocalDate(new Date())); setPromiseTimeError('') }} onCreate={handleCreate} onClear={() => setClearDialogOpen(true)} loading={submitting} />
        </Grid>
      </Grid>
      <ExtrasDialog open={extrasOpen} extras={extras.filter((extra) => extra.active)} onClose={() => setExtrasOpen(false)} onConfirm={(items) => { if (activeAccount) setAccounts((current) => current.map((account) => account.id === activeAccount.id ? { ...account, extraItems: items } : account)); setAccountErrorId(null); setExtrasOpen(false); setNotification(null) }} />
      <CustomProductDialog open={customOpen} onClose={() => setCustomOpen(false)} onAdd={(item) => { if (activeAccount) setAccounts((current) => current.map((account) => account.id === activeAccount.id ? { ...account, customItems: [...account.customItems, item] } : account)); setAccountErrorId(null); setNotification(null) }} />
      <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)} aria-labelledby="clear-order-dialog-title">
        <DialogTitle id="clear-order-dialog-title">Limpiar pedido</DialogTitle>
        <DialogContent>
          <DialogContentText>Se eliminarán todos los datos ingresados en este pedido y las cantidades volverán a 0.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialogOpen(false)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={resetDraft}>Limpiar pedido</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={Boolean(notification)} autoHideDuration={4000} onClose={() => setNotification(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} sx={{ maxWidth: 'calc(100vw - 32px)' }}><Alert severity={notification?.severity ?? 'success'} onClose={() => setNotification(null)} sx={{ width: '100%' }}>{notification?.message}</Alert></Snackbar>
    </Box>
  )
}
