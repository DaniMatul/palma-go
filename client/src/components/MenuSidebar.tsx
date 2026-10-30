import { Box, Stack, Typography } from '@mui/material'

const menuSections = ['Menús', 'Desayunos', 'Refacciones', 'Almuerzos', 'Cenas', 'Extras'] as const

export type MenuSection = typeof menuSections[number]

type MenuSidebarProps = { selectedSection: MenuSection; onSectionChange: (section: MenuSection) => void }

export function MenuSidebar({ selectedSection, onSectionChange }: MenuSidebarProps) {

  return (
    <Box component="aside" aria-label="Navegación de menú" sx={{ width: { xs: '100%', md: 190 }, flexShrink: 0, bgcolor: '#F8F8FC', zIndex: 1, position: { md: 'sticky' }, top: { md: 0 }, height: { md: '100dvh' }, alignSelf: { md: 'flex-start' }, borderBottom: { xs: '1px solid', md: 0 }, borderColor: 'rgba(229, 231, 240, 0.7)', px: 0, py: { xs: 1, md: 3 }, display: 'flex', flexDirection: { xs: 'row', md: 'column' }, alignItems: { xs: 'center', md: 'stretch' } }}>
      <Typography variant="overline" sx={{ display: { xs: 'none', md: 'block' }, px: 2, mb: 1, color: '#74798A', fontWeight: 700, letterSpacing: '0.08em' }}>Menú</Typography>
      <Stack component="nav" direction={{ xs: 'row', md: 'column' }} spacing={0.5} sx={{ width: '100%', overflowX: 'auto' }}>
        {menuSections.map((section) => {
          const selected = selectedSection === section
          return <Box key={section} component="button" type="button" onClick={() => onSectionChange(section)} aria-current={selected ? 'page' : undefined} sx={{ border: 0, cursor: 'pointer', width: '100%', flexShrink: 0, bgcolor: selected ? '#E8E9F8' : 'transparent', color: selected ? '#555DA8' : '#7C8092', borderRadius: 0, px: 3, py: 1, minHeight: 48, textAlign: 'left', font: 'inherit', fontSize: '15px', fontWeight: selected ? 600 : 500, lineHeight: 1.45, whiteSpace: 'nowrap', '&:hover': { bgcolor: '#F0F0FA', color: '#62687B' }, '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.light' } }}>{section}</Box>
        })}
      </Stack>
    </Box>
  )
}
