import {
  AddCircleOutlineRounded,
  HomeRounded,
  HistoryRounded,
  RestaurantMenuRounded,
  SettingsOutlined,
  ShoppingBagRounded,
} from '@mui/icons-material'
import { Box, IconButton, Stack, Typography } from '@mui/material'
import { useCurrentDateTime } from '../hooks/useCurrentDateTime'
import palmaGoLogo from '../assets/palma-go-logo.png'

export type SidebarSection = 'home' | 'new-order' | 'menu' | 'orders' | 'history'

const navigation: { label: string; icon: typeof HomeRounded; section: SidebarSection }[] = [
  { label: 'Inicio', icon: HomeRounded, section: 'home' },
  { label: 'Nuevo pedido', icon: AddCircleOutlineRounded, section: 'new-order' },
  { label: 'Menú', icon: RestaurantMenuRounded, section: 'menu' },
  { label: 'Pedidos', icon: ShoppingBagRounded, section: 'orders' },
  { label: 'Historial', icon: HistoryRounded, section: 'history' },
]

type SidebarProps = { activeSection: SidebarSection; onNavigate: (section: SidebarSection) => void }

export function Sidebar({ activeSection, onNavigate }: SidebarProps) {
  const { date } = useCurrentDateTime()

  return (
    <Box component="aside" sx={{ width: { xs: '100%', md: 220 }, flexShrink: 0, bgcolor: 'background.paper', border: 0, px: { xs: 2, md: 2.5 }, py: { xs: 1.5, md: 3 }, display: 'flex', flexDirection: { xs: 'row', md: 'column' }, flexWrap: { xs: 'wrap', md: 'nowrap' }, gap: { xs: 2, md: 0 }, position: { md: 'sticky' }, top: { md: 0 }, height: { md: '100dvh' }, alignSelf: 'flex-start' }}>
      <Box component="img" src={palmaGoLogo} alt="Palma GO" sx={{ display: 'block', width: { xs: 160, md: 250 }, maxWidth: '100%', height: 'auto', objectFit: 'contain', alignSelf: { xs: 'flex-start', md: 'center' } }} />
      <Stack component="nav" direction={{ xs: 'row', md: 'column' }} spacing={0.75} sx={{ overflowX: 'auto', minHeight: 0, flex: { xs: 1, md: '0 1 auto' }, mt: { md: 3.5 } }}>
        {navigation.map(({ label, icon: Icon, section }) => {
          const active = activeSection === section
          return <Box key={label} component="button" type="button" aria-current={active ? 'page' : undefined} onClick={() => onNavigate(section)} sx={{ border: 0, cursor: 'pointer', color: active ? 'primary.dark' : 'text.secondary', bgcolor: active ? 'action.selected' : 'transparent', borderRadius: 999, minWidth: { xs: 96, md: 'auto' }, px: 1.5, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.25, textAlign: 'left', font: 'inherit', fontWeight: active ? 700 : 500, '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.light' } }}>
            <Icon sx={{ fontSize: 22 }} />
            <Typography component="span" variant="body2" sx={{ fontWeight: 'inherit', whiteSpace: 'nowrap' }}>{label}</Typography>
          </Box>
        })}
      </Stack>
      <Box sx={{ px: 1.5, mt: 'auto', flexShrink: 0, width: '100%' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">{date}</Typography>
          <IconButton component="a" href="/settings" aria-label="Configuración" size="small" sx={{ width: 36, height: 36, color: 'text.secondary', bgcolor: 'transparent', '&:hover': { bgcolor: 'background.secondary', color: 'text.primary' } }}>
            <SettingsOutlined sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>
      </Box>
    </Box>
  )
}
