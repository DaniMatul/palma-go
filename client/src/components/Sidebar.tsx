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
import palmaGoSmallLogo from '../assets/palma-go-peque.png'

export type SidebarSection = 'home' | 'new-order' | 'menu' | 'orders' | 'history'

const navigation: { label: string; icon: typeof HomeRounded; section: SidebarSection }[] = [
  { label: 'Inicio', icon: HomeRounded, section: 'home' },
  { label: 'Nuevo pedido', icon: AddCircleOutlineRounded, section: 'new-order' },
  { label: 'Menú', icon: RestaurantMenuRounded, section: 'menu' },
  { label: 'Pedidos', icon: ShoppingBagRounded, section: 'orders' },
  { label: 'Historial', icon: HistoryRounded, section: 'history' },
]

type SidebarProps = { activeSection: SidebarSection; onNavigate: (section: SidebarSection) => void; compact?: boolean }

export function Sidebar({ activeSection, onNavigate, compact = false }: SidebarProps) {
  const { date } = useCurrentDateTime()
  const logo = compact ? palmaGoSmallLogo : palmaGoLogo

  return (
    <Box component="aside" sx={{ width: { xs: '100%', md: compact ? 88 : 220 }, flexShrink: 0, bgcolor: 'background.paper', border: 0, overflow: 'visible', zIndex: { md: compact ? 2 : 'auto' }, px: { xs: compact ? 1 : 2, md: 2.5 }, py: { xs: 1.5, md: 3 }, display: 'flex', flexDirection: { xs: 'row', md: 'column' }, flexWrap: { xs: 'wrap', md: 'nowrap' }, gap: { xs: 2, md: 0 }, position: { md: 'sticky' }, top: { md: 0 }, height: { md: '100dvh' }, alignSelf: 'flex-start' }}>
      <Box sx={{ width: { xs: '100%', md: compact ? 52 : '100%' }, height: { xs: 'auto', md: 84 }, display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', md: compact ? 'center' : 'center' }, pl: 0, overflow: 'visible', flexShrink: 0 }}><Box component="img" src={logo} alt="Palma GO" sx={{ display: 'block', width: { xs: compact ? 58 : 160, md: compact ? 40 : 250 }, maxWidth: { md: compact ? 'none' : '100%' }, maxHeight: { md: compact ? 'none' : 76 }, height: 'auto', objectFit: 'contain', transform: { md: compact ? 'translateX(-2px) translateY(-4px)' : 'none' } }} /></Box>
      <Stack component="nav" direction={{ xs: 'row', md: 'column' }} spacing={0.75} sx={{ overflowX: compact ? 'visible' : 'auto', overflowY: 'visible', minHeight: 0, alignItems: { md: compact ? 'flex-start' : 'stretch' }, flex: { xs: 1, md: '0 1 auto' }, mt: { md: 3.5 } }}>
        {navigation.map(({ label, icon: Icon, section }) => {
          const active = activeSection === section
          return <Box key={label} component="button" type="button" aria-current={active ? 'page' : undefined} onClick={() => onNavigate(section)} sx={{ border: 0, cursor: 'pointer', position: 'relative', overflow: 'visible', boxSizing: 'border-box', color: active ? 'primary.dark' : 'text.secondary', bgcolor: compact ? 'transparent' : active ? 'action.selected' : 'transparent', borderRadius: 999, width: { md: compact ? 52 : 'auto' }, minWidth: { xs: compact ? 52 : 96, md: compact ? 52 : 'auto' }, paddingLeft: 1.625, paddingRight: 1.5, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1.25, textAlign: 'left', font: 'inherit', fontWeight: active ? 700 : 500, '&::before': compact ? { content: '""', position: 'absolute', zIndex: 0, width: 52, height: 52, left: -2, top: '50%', transform: 'translateY(-50%)', borderRadius: '50%', bgcolor: active ? 'action.selected' : 'transparent', pointerEvents: 'none' } : undefined, '&:hover::before': compact ? { bgcolor: 'action.hover' } : undefined, '& > *': { position: 'relative', zIndex: 1 }, '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.light' } }}>
            <Icon sx={{ fontSize: 22 }} />
            <Typography component="span" variant="body2" sx={{ display: compact ? 'none' : 'inline', fontWeight: 'inherit', whiteSpace: 'nowrap' }}>{label}</Typography>
          </Box>
        })}
      </Stack>
      <Box sx={{ px: compact ? 0 : 1.5, mt: 'auto', flexShrink: 0, width: '100%' }}>
        <Stack direction="row" alignItems="center" justifyContent={compact ? 'flex-start' : 'space-between'} sx={{ pl: compact ? '6px' : 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: compact ? 'none' : 'block' }}>{date}</Typography>
          <IconButton component="a" href="/settings" aria-label="Configuración" size="small" sx={{ width: 36, height: 36, color: 'text.secondary', bgcolor: 'transparent', '&:hover': { bgcolor: 'background.secondary', color: 'text.primary' } }}>
            <SettingsOutlined sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>
      </Box>
    </Box>
  )
}
