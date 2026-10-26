import { Box, Stack, Typography } from '@mui/material'
import { useState } from 'react'

const menuSections = ['Menús', 'Desayunos', 'Refacciones', 'Almuerzos', 'Extras']

export function MenuSidebar() {
  const [selectedSection, setSelectedSection] = useState('Menús')

  return (
    <Box component="aside" aria-label="Navegación de menú" sx={{ width: { xs: '100%', md: 190 }, flexShrink: 0, bgcolor: '#F7F8FC', boxShadow: { md: '4px 0 12px rgba(31, 41, 55, 0.06)' }, zIndex: 1, position: { md: 'sticky' }, top: { md: 0 }, height: { md: '100dvh' }, alignSelf: { md: 'flex-start' }, borderBottom: { xs: '1px solid', md: 0 }, borderColor: 'rgba(229, 231, 240, 0.7)', px: 0, py: { xs: 1, md: 3 }, display: 'flex', flexDirection: { xs: 'row', md: 'column' }, alignItems: { xs: 'center', md: 'stretch' } }}>
      <Typography variant="overline" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' }, px: 2, mb: 1, fontWeight: 700, letterSpacing: '0.08em' }}>Menú</Typography>
      <Stack component="nav" direction={{ xs: 'row', md: 'column' }} spacing={0.5} sx={{ width: '100%', overflowX: 'auto' }}>
        {menuSections.map((section) => {
          const selected = selectedSection === section
          return <Box key={section} component="button" type="button" onClick={() => setSelectedSection(section)} aria-current={selected ? 'page' : undefined} sx={{ border: 0, cursor: 'pointer', width: '100%', flexShrink: 0, bgcolor: selected ? '#EEF0FF' : 'transparent', color: selected ? 'primary.dark' : 'text.secondary', borderRadius: 0, px: 3, py: 1, minHeight: 42, textAlign: 'left', font: 'inherit', fontWeight: selected ? 700 : 500, whiteSpace: 'nowrap', '&:hover': { bgcolor: selected ? '#EEF0FF' : '#F4F5FF' }, '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.light' } }}>{section}</Box>
        })}
      </Stack>
    </Box>
  )
}
