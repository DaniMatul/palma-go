import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import App from './App'

const notificationTones = {
  success: { background: '#F3F8F5', border: '#D7E8DE', color: '#4F5E56', icon: '#5F9278' },
  error: { background: '#FBF3F4', border: '#EED6D9', color: '#6C5558', icon: '#B36A72' },
  warning: { background: '#FBF8F0', border: '#EDE2C7', color: '#6E6250', icon: '#A8884F' },
  info: { background: '#F3F4FA', border: '#DFE1EF', color: '#555A6D', icon: '#7278B5' },
} as const

declare module '@mui/material/styles' {
  interface TypeBackground {
    secondary: string
  }

  interface Palette {
    selection: {
      background: string
      border: string
    }
    status: {
      inProgress: { background: string; color: string; border: string }
      completed: { background: string; color: string; border: string }
      cancelled: { background: string; color: string; border: string }
    }
  }

  interface PaletteOptions {
    selection?: {
      background: string
      border: string
    }
    status?: {
      inProgress: { background: string; color: string; border: string }
      completed: { background: string; color: string; border: string }
      cancelled: { background: string; color: string; border: string }
    }
  }
}

const theme = createTheme({
  palette: {
    primary: { main: '#6269B8', dark: '#4F559D', light: '#DDE0F5' },
    secondary: { main: '#969BD3', light: '#EEF0FA' },
    background: { default: '#F4F6FC', secondary: '#EEF0FA', paper: '#FFFFFF' },
    text: { primary: '#33364A', secondary: '#85899B' },
    divider: '#E5E7F0',
    selection: { background: '#F3F4FB', border: '#C9CDEA' },
    status: {
      inProgress: { background: '#FFF7D6', color: '#9A6B16', border: '#F1E2A8' },
      completed: { background: '#E1F3EA', color: '#417C60', border: '#C9E5D8' },
      cancelled: { background: '#FBE5E7', color: '#A85A62', border: '#F0C9CE' },
    },
    action: { selected: '#E8EAF8' },
    success: { main: '#417C60', light: '#E1F3EA' },
    warning: { main: '#A56C18', light: '#FFF2D9' },
    error: { main: '#A85A62', light: '#FBE5E7' },
  },
  typography: {
    fontFamily: 'Inter, Roboto, Arial, sans-serif',
    htmlFontSize: 16,
    fontSize: 16,
    body1: { fontSize: '1.125rem', lineHeight: 1.55 },
    body2: { fontSize: '1rem', lineHeight: 1.5 },
    caption: { fontSize: '1rem', lineHeight: 1.4 },
    button: { fontSize: '1.125rem', lineHeight: 1.45, fontWeight: 600 },
    h1: { fontSize: '2.25rem', lineHeight: 1.2 },
    h2: { fontSize: '2.125rem', lineHeight: 1.2 },
    h3: { fontSize: '2rem', lineHeight: 1.25 },
    h4: { fontSize: '2.25rem', lineHeight: 1.2 },
    h5: { fontSize: '1.625rem', lineHeight: 1.25 },
    h6: { fontSize: '1.5rem', lineHeight: 1.3 },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: 12, minHeight: 48, boxShadow: 'none', fontSize: '1.125rem', lineHeight: 1.45 }, sizeSmall: { minHeight: 44, paddingTop: 9, paddingBottom: 9 }, sizeLarge: { minHeight: 52 } } },
    MuiInputBase: { styleOverrides: { root: { fontSize: '1.125rem', lineHeight: 1.45, minHeight: 52 }, input: { fontSize: '1.125rem', lineHeight: 1.45 } } },
    MuiInputLabel: { styleOverrides: { root: { fontSize: '1.125rem', lineHeight: 1.4 } } },
    MuiFormHelperText: { styleOverrides: { root: { fontSize: '1rem', lineHeight: 1.4 } } },
    MuiMenuItem: { styleOverrides: { root: { fontSize: '1.125rem', lineHeight: 1.45, minHeight: 48 } } },
    MuiFormControlLabel: { styleOverrides: { label: { fontSize: '1.125rem' } } },
    MuiTableCell: { styleOverrides: { root: { fontSize: '1.125rem', lineHeight: 1.45 } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 700, fontSize: '1.125rem', minHeight: 48 } } },
    MuiPaginationItem: { styleOverrides: { root: { fontSize: '1.125rem', minWidth: 40, height: 40 } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 16, boxShadow: 'none' } } },
    MuiPaper: { styleOverrides: { root: { borderRadius: 20 } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          '&.MuiInputBase-sizeSmall': { minHeight: 44 },
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#D9DCE8' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#D9DCE8' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#787FC3' },
        },
      },
    },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 999 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 24 } } },
    MuiAlert: {
      styleOverrides: {
        root: ({ ownerState }) => {
          const tone = notificationTones[ownerState.severity ?? 'info']
          return {
            backgroundColor: tone.background,
            border: `1px solid ${tone.border}`,
            borderRadius: 14,
            color: tone.color,
            boxShadow: '0 6px 18px rgba(50, 55, 80, 0.08)',
            '& .MuiAlert-icon': { color: tone.icon },
            '& .MuiAlert-action': { color: tone.color },
          }
        },
      },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
