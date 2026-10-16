import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import App from './App'

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
  typography: { fontFamily: 'Inter, Roboto, Arial, sans-serif' },
  shape: { borderRadius: 16 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: 12, minHeight: 44, boxShadow: 'none' } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 16, boxShadow: 'none' } } },
    MuiPaper: { styleOverrides: { root: { borderRadius: 20 } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#D9DCE8' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#D9DCE8' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#787FC3' },
        },
      },
    },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 999 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 24 } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 700 } } },
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
