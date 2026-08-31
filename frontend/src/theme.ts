import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#2563EB', light: '#3B82F6', dark: '#1D4ED8' },
    background: { default: '#09090B', paper: '#1C1C1F' },
    text: { primary: '#FAFAFA', secondary: '#A1A1AA' },
  },
  typography: {
    fontFamily: "'Inter',system-ui,sans-serif",
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 600, letterSpacing: '-0.01em' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1C1C1F',
          border: '1px solid #27272A',
          borderRadius: 12,
          boxShadow: 'none',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, textTransform: 'none', fontWeight: 600, fontSize: '13px' },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#09090B',
            '& fieldset': { borderColor: '#27272A' },
            '&.Mui-focused fieldset': { borderColor: '#2563EB' },
          },
        },
      },
    },
  },
});
export default theme;
