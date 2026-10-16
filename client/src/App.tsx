import { useMemo, useState } from 'react'
import { Box, Grid } from '@mui/material'
import { OrderDetail } from './components/OrderDetail'
import { NewOrderView } from './components/NewOrderView'
import { MenuManagementView } from './components/MenuManagementView'
import { HomeView } from './components/HomeView'
import { HistoryView } from './components/HistoryView'
import { historyOrders } from './data/historyData'
import { OrdersList } from './components/OrdersList'
import { Sidebar, SidebarSection } from './components/Sidebar'
import { addMinutesToTime, Order, OrderStatus } from './types/order'
import { ExtraProduct, MenuProduct, OrderLine } from './types/menu'
import { dashboardData } from './data/dashboardData'

const initialMenus: MenuProduct[] = [
  { id: 'pepian', name: 'Pepián', description: 'Carne con recado, arroz y tortillas', price: 25, availableQuantity: 20, availableToday: true },
  { id: 'pollo-dorado', name: 'Pollo dorado', description: 'Pollo dorado con arroz y ensalada', price: 28, availableQuantity: 15, availableToday: true },
  { id: 'caldo-res', name: 'Caldo de res', description: 'Caldo de res con verduras y arroz', price: 22, availableQuantity: 12, availableToday: true },
  { id: 'hilachas', name: 'Hilachas', description: 'Carne deshebrada en recado rojo', price: 26, availableQuantity: 0, availableToday: false },
  { id: 'chuleta', name: 'Chuleta', description: 'Chuleta a la plancha con guarnición', price: 30, availableQuantity: 0, availableToday: false },
]

const initialExtras: ExtraProduct[] = [
  { id: 'bebida', name: 'Bebida', price: 5, active: true },
  { id: 'tortillas', name: 'Tortillas', price: 2, active: true },
  { id: 'aguacate', name: 'Aguacate', price: 5, active: true },
]

const initialOrders: Order[] = [
  { id: '#024', customerName: 'Juan Pérez', address: 'Zona 3, Quetzaltenango', createdAt: '12:30', promiseTime: addMinutesToTime('12:30', 20), status: 'in-progress', items: [{ name: 'Pepián', quantity: 2, price: 25 }, { name: 'Bebida', quantity: 1, price: 5 }] },
  { id: '#025', customerName: 'María López', address: 'Zona 1, Quetzaltenango', createdAt: '12:34', promiseTime: addMinutesToTime('12:34', 20), status: 'in-progress', items: [{ name: 'Almuerzo del día', quantity: 1, price: 28 }] },
  { id: '#026', customerName: 'Carlos Ramírez', address: 'Zona 8, Quetzaltenango', createdAt: '12:40', promiseTime: addMinutesToTime('12:40', 20), status: 'in-progress', items: [{ name: 'Pollo guisado', quantity: 2, price: 30 }, { name: 'Tortillas', quantity: 1, price: 15 }] },
  { id: '#023', customerName: 'Ana Gómez', address: 'Zona 5, Quetzaltenango', createdAt: '12:20', promiseTime: addMinutesToTime('12:20', 20), status: 'completed', items: [{ name: 'Pepián', quantity: 2, price: 25 }] },
  { id: '#022', customerName: 'Luis Morales', address: 'Zona 7, Quetzaltenango', createdAt: '12:10', promiseTime: addMinutesToTime('12:10', 20), status: 'cancelled', items: [{ name: 'Almuerzo del día', quantity: 1, price: 28 }] },
]

function App() {
  const [activeSection, setActiveSection] = useState<SidebarSection>('new-order')
  const [menus, setMenus] = useState(initialMenus)
  const [extras, setExtras] = useState(initialExtras)
  const [orders, setOrders] = useState(initialOrders)
  const [filter, setFilter] = useState<OrderStatus>('in-progress')
  const [selectedId, setSelectedId] = useState('#024')
  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedId), [orders, selectedId])

  const handleFilterChange = (nextFilter: OrderStatus) => {
    setFilter(nextFilter)
    const firstVisibleOrder = orders.find((order) => order.status === nextFilter)
    if (firstVisibleOrder) setSelectedId(firstVisibleOrder.id)
  }

  const handleComplete = () => {
    setOrders((currentOrders) => currentOrders.map((order) => order.id === selectedId ? { ...order, status: 'completed' } : order))
    setFilter('completed')
  }

  const handleReopen = () => {
    setOrders((currentOrders) => currentOrders.map((order) => order.id === selectedId ? { ...order, status: 'in-progress' } : order))
    setFilter('in-progress')
  }

  const handleCancel = () => {
    setOrders((currentOrders) => currentOrders.map((order) => order.id === selectedId ? { ...order, status: 'cancelled' } : order))
    setFilter('cancelled')
  }

  const handleNavigate = (section: SidebarSection) => {
    if (section === 'history' || section === 'home' || section === 'new-order' || section === 'menu' || section === 'orders') setActiveSection(section)
  }

  const handleOrderCreated = (items: OrderLine[]) => {
    setMenus((currentMenus) => currentMenus.map((menu) => {
      const item = items.find((orderItem) => orderItem.id === menu.id)
      return item ? { ...menu, availableQuantity: Math.max(0, menu.availableQuantity - item.quantity) } : menu
    }))
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, bgcolor: 'background.default' }}>
      <Sidebar activeSection={activeSection} onNavigate={handleNavigate} />
      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, sm: 3, lg: 4 } }}>
        {activeSection === 'history' ? <HistoryView orders={historyOrders} /> : activeSection === 'home' ? <HomeView data={dashboardData} /> : activeSection === 'new-order' ? <NewOrderView menus={menus} extras={extras} onOrderCreated={handleOrderCreated} /> : activeSection === 'menu' ? <MenuManagementView menus={menus} extras={extras} onMenusChange={setMenus} onExtrasChange={setExtras} /> : <Grid container spacing={{ xs: 3, lg: 4 }}>
          <Grid item xs={12} lg={8}>
            <OrdersList orders={orders} filter={filter} selectedId={selectedId} onFilterChange={handleFilterChange} onSelect={setSelectedId} />
          </Grid>
          <Grid item xs={12} lg={4}>
            <OrderDetail order={selectedOrder} onComplete={handleComplete} onReopen={handleReopen} onCancel={handleCancel} />
          </Grid>
        </Grid>}
      </Box>
    </Box>
  )
}

export default App
