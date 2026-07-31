import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#06b6d4',
      light: '#22d3ee',
      dark: '#0891b2',
    },
    secondary: {
      main: '#818cf8',
      light: '#a5b4fc',
      dark: '#6366f1',
    },
    background: {
      default: '#000000',
      paper: 'rgba(30, 41, 59, 0.5)',
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
    },
    error: {
      main: '#f43f5e',
    },
  },
  typography: {
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCard: {
      defaultProps: {
        raised: false,
      },
      styleOverrides: {
        root: {
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          backgroundColor: 'rgba(30, 41, 59, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 24,
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(6, 182, 212, 0.05)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              '& fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.25)',
              },
            },
            '&.Mui-focused': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              boxShadow: '0 0 0 2px rgba(6, 182, 212, 0.15)',
              '& fieldset': {
                borderColor: '#06b6d4',
                borderWidth: 2,
              },
            },
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.15)',
              transition: 'border-color 0.2s ease-in-out',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#94a3b8',
            fontWeight: 500,
            '&.Mui-focused': {
              color: '#06b6d4',
            },
          },
          '& .MuiInputAdornment-root': {
            color: '#94a3b8',
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        variant: 'contained',
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 700,
          padding: '14px 24px',
          fontSize: '1rem',
          letterSpacing: '0.01em',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCheckbox: {
      defaultProps: {
        color: 'primary',
      },
      styleOverrides: {
        root: {
          color: 'rgba(255, 255, 255, 0.3)',
          '&.Mui-checked': {
            color: '#06b6d4',
          },
          '&:hover': {
            backgroundColor: 'rgba(6, 182, 212, 0.08)',
          },
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          marginLeft: 0,
          marginRight: 0,
        },
        label: {
          fontSize: '0.875rem',
          fontWeight: 500,
          color: '#94a3b8',
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#818cf8',
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'color 0.2s ease-in-out',
          '&:hover': {
            color: '#a5b4fc',
          },
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: '#06b6d4',
        },
      },
    },
  },
});

export default theme;
