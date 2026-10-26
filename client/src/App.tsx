import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, CircularProgress, Grid } from '@mui/material'
import { OrderDetail } from './components/OrderDetail'
import { NewOrderView } from './components/NewOrderView'
import { MenuManagementView } from './components/MenuManagementView'
import { HomeView } from './components/HomeView'
import { HistoryView } from './components/HistoryView'
import { OrdersList } from './components/OrdersList'
import { Sidebar, SidebarSection } from './components/Sidebar'
import { MenuSidebar } from './components/MenuSidebar'
import { Order, OrderStatus } from './types/order'
import { getOrders, updateOrderStatus } from './services/orderService'

function App() {
  const [activeSection, setActiveSection] = useState<SidebarSection>('new-order')
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')
  const [filter, setFilter] = useState<OrderStatus>('in-progress')
  const [selectedId, setSelectedId] = useState('#024')
  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedId), [orders, selectedId])

  const loadOrders = async () => {
    setOrdersLoading(true)
    setOrdersError('')
    try {
      const loadedOrders = await getOrders({ activeOnly: true })
      setOrders(loadedOrders)
      setSelectedId((currentId) => loadedOrders.some((order) => order.id === currentId) ? currentId : loadedOrders[0]?.id ?? '')
    } catch (error: unknown) {
      setOrdersError(error instanceof Error ? error.message : 'No se pudieron cargar los pedidos')
    } finally {
      setOrdersLoading(false)
    }
  }

  useEffect(() => {
    if (activeSection === 'orders') void loadOrders()
  }, [activeSection])

  const handleFilterChange = (nextFilter: OrderStatus) => {
    setFilter(nextFilter)
    const firstVisibleOrder = orders.find((order) => order.status === nextFilter)
    if (firstVisibleOrder) setSelectedId(firstVisibleOrder.id)
  }

  const handleComplete = async () => {
    if (!selectedId) return
    try {
      await updateOrderStatus(selectedId, 'completed')
      await loadOrders()
      setFilter('completed')
    } catch (error: unknown) {
      setOrdersError(error instanceof Error ? error.message : 'No se pudo completar el pedido')
    }
  }

  const handleReopen = async () => {
    if (!selectedId) return
    try {
      await updateOrderStatus(selectedId, 'in-progress')
      await loadOrders()
      setFilter('in-progress')
    } catch (error: unknown) {
      setOrdersError(error instanceof Error ? error.message : 'No se pudo reabrir el pedido')
    }
  }

  const handleCancel = async () => {
    if (!selectedId) return
    try {
      await updateOrderStatus(selectedId, 'cancelled')
      await loadOrders()
      setFilter('cancelled')
    } catch (error: unknown) {
      setOrdersError(error instanceof Error ? error.message : 'No se pudo cancelar el pedido')
    }
  }

  const handleNavigate = (section: SidebarSection) => {
    if (section === 'history' || section === 'home' || section === 'new-order' || section === 'menu' || section === 'orders') setActiveSection(section)
  }

  return (
    <Box sx={{ height: { xs: 'auto', md: '100dvh' }, minHeight: { xs: '100vh', md: 0 }, overflow: { xs: 'visible', md: 'hidden' }, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, bgcolor: 'background.default' }}>
      <Sidebar activeSection={activeSection} onNavigate={handleNavigate} compact={activeSection === 'menu'} />
      {activeSection === 'menu' && <MenuSidebar />}
      <Box component="main" sx={{ flex: 1, minWidth: 0, height: { xs: 'auto', md: '100dvh' }, overflowY: { xs: 'visible', md: 'auto' }, overflowX: 'hidden', p: { xs: 2, sm: 3, lg: 4 } }}>
        {activeSection === 'history' ? <HistoryView /> : activeSection === 'home' ? <HomeView /> : activeSection === 'new-order' ? <NewOrderView onOrderCreated={loadOrders} /> : activeSection === 'menu' ? <MenuManagementView /> : ordersLoading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress color="primary" /></Box> : <>
          {ordersError && <Alert severity="error" onClose={() => setOrdersError('')} sx={{ mb: 2 }}>{ordersError}</Alert>}
          <Grid container spacing={{ xs: 3, lg: 4 }}>
          <Grid item xs={12} lg={8}>
            <OrdersList orders={orders} filter={filter} selectedId={selectedId} onFilterChange={handleFilterChange} onSelect={setSelectedId} />
          </Grid>
          <Grid item xs={12} lg={4}>
            <OrderDetail order={selectedOrder} onComplete={handleComplete} onReopen={handleReopen} onCancel={handleCancel} />
          </Grid>
          </Grid>
        </>}
      </Box>
    </Box>
  )
}

export default App
