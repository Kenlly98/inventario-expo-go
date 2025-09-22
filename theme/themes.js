// theme/themes.js

export const THEMES = {
  light: {
    meta: { label: 'Light', emoji: '☀️' },
    colors: {
      // base
      background: '#FFFFFF',
      surface: '#F7F7F8',
      surface2: '#ECEFF1',
      text: '#111827',
      textMuted: '#4B5563',
      primary: '#2563EB',
      primaryContrast: '#FFFFFF',
      success: '#16A34A',
      warning: '#D97706',
      danger: '#DC2626',
      info: '#0EA5E9',
      border: '#E5E7EB',
      overlay: 'rgba(17,24,39,0.5)',

      // nuevos tokens
      bg: '#FFFFFF',                         // alias para comodidad en estilos
      inputBg: '#F4F6F8',
      inputBorder: '#E2E6EA',
      placeholder: '#8A8F98',
      primaryText: '#FFFFFF',                // texto sobre primary
    },
    radii: { xs: 6, sm: 10, md: 14, lg: 20, xl: 28 },
    spacing: { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 },
    elevation: { sm: 2, md: 6, lg: 12 },
    chart: {
      series: ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#F43F5E'],
      grid: '#E5E7EB',
      axis: '#9CA3AF',
    },
  },

  dark: {
    meta: { label: 'Dark', emoji: '🌙' },
    colors: {
      background: '#0B0F14',
      surface: '#121821',
      surface2: '#1B2430',
      text: '#E5E7EB',
      textMuted: '#A1A1AA',
      primary: '#60A5FA',
      primaryContrast: '#0B0F14',
      success: '#22C55E',
      warning: '#F59E0B',
      danger: '#F87171',
      info: '#38BDF8',
      border: '#263043',
      overlay: 'rgba(0,0,0,0.55)',

      // nuevos tokens
      bg: '#0B0F14',
      inputBg: 'rgba(255,255,255,0.06)',
      inputBorder: 'rgba(255,255,255,0.12)',
      placeholder: 'rgba(229,231,235,0.55)',
      primaryText: '#0B0F14',
    },
    radii: { xs: 6, sm: 10, md: 14, lg: 20, xl: 28 },
    spacing: { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 },
    elevation: { sm: 2, md: 6, lg: 12 },
    chart: {
      series: ['#60A5FA', '#34D399', '#F59E0B', '#F87171', '#A78BFA', '#2DD4BF', '#FB7185'],
      grid: '#1F2937',
      axis: '#64748B',
    },
  },

  neon: {
    meta: { label: 'Neon', emoji: '💡' },
    colors: {
      background: '#0A0A0F',
      surface: '#101018',
      surface2: '#171726',
      text: '#F3F4F6',
      textMuted: '#B4B8C7',
      primary: '#00E6FF',
      primaryContrast: '#001015',
      success: '#22F08B',
      warning: '#FFB02E',
      danger: '#FF4D6D',
      info: '#6EE7FF',
      border: '#1E2235',
      overlay: 'rgba(5,12,20,0.6)',

      // nuevos tokens
      bg: '#0A0A0F',
      inputBg: 'rgba(255,255,255,0.06)',
      inputBorder: 'rgba(255,255,255,0.12)',
      placeholder: 'rgba(240,244,255,0.6)',
      primaryText: '#001015',
    },
    radii: { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 },
    spacing: { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 },
    elevation: { sm: 3, md: 8, lg: 16 },
    chart: {
      series: ['#00E6FF', '#22F08B', '#FFB02E', '#FF4D6D', '#9E7BFF', '#2AD1D1', '#FF7AB6'],
      grid: '#1E2235',
      axis: '#A5B4FC',
    },
  },

  elite: {
    meta: { label: 'Elite', emoji: '🛡️' },
    colors: {
      background: '#0E1116',
      surface: '#151922',
      surface2: '#1E2430',
      text: '#EDEFF4',
      textMuted: '#B7C0D1',
      primary: '#7DD3FC',
      primaryContrast: '#0E1116',
      success: '#36D399',
      warning: '#FBBF24',
      danger: '#F87171',
      info: '#93C5FD',
      border: '#273142',
      overlay: 'rgba(15,19,27,0.55)',

      // nuevos tokens
      bg: '#0E1116',
      inputBg: 'rgba(255,255,255,0.06)',
      inputBorder: 'rgba(255,255,255,0.12)',
      placeholder: 'rgba(237,239,244,0.6)',
      primaryText: '#0E1116',
    },
    radii: { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 },
    spacing: { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 },
    elevation: { sm: 3, md: 8, lg: 16 },
    chart: {
      series: ['#7DD3FC', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#5EEAD4', '#FB7185'],
      grid: '#233046',
      axis: '#8EA4C8',
    },
  },

  holo: {
    meta: { label: 'Holo', emoji: '🪩' },
    colors: {
      background: '#0B0B12',
      surface: '#121224',
      surface2: '#191937',
      text: '#F5F7FA',
      textMuted: '#B9C0D9',
      primary: '#80FFEA',
      primaryContrast: '#031A19',
      success: '#7CFFB2',
      warning: '#FFD166',
      danger: '#FF6F91',
      info: '#A0C4FF',
      border: '#2B2B52',
      overlay: 'rgba(9,7,21,0.55)',

      // nuevos tokens
      bg: '#0B0B12',
      inputBg: 'rgba(255,255,255,0.06)',
      inputBorder: 'rgba(255,255,255,0.12)',
      placeholder: 'rgba(245,247,250,0.6)',
      primaryText: '#031A19',
    },
    radii: { xs: 10, sm: 14, md: 18, lg: 26, xl: 36 },
    spacing: { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 },
    elevation: { sm: 4, md: 10, lg: 18 },
    chart: {
      series: ['#80FFEA', '#7CFFB2', '#FFD166', '#FF6F91', '#CDB4DB', '#90DBF4', '#FFAFCC'],
      grid: '#2B2B52',
      axis: '#9FB7F0',
    },
  },
};

export const THEME_ORDER = ['light', 'dark', 'neon', 'elite', 'holo'];
