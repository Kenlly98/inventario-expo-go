// theme/ThemeProvider.js
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultTheme, DarkTheme } from '@react-navigation/native';
import { THEMES, THEME_ORDER } from './themes';

const STORAGE_KEY = 'app.theme.mode.v1';

// Contexto
const ThemeCtx = createContext(null);

// Mapea el objeto de THEMES[mode] a { colors, palette }
function buildTheme(mode = 'light') {
  const t = THEMES[mode] ?? THEMES.light;

  const colors = {
    bg: t.colors.background,
    surface: t.colors.surface,
    surface2: t.colors.surface2,
    text: t.colors.text,
    textMuted: t.colors.textMuted,
    primary: t.colors.primary,
    primaryContrast: t.colors.primaryContrast,
    success: t.colors.success,
    warning: t.colors.warning,
    danger: t.colors.danger,
    info: t.colors.info,
    inputBg: t.colors.inputBg ?? t.colors.surface,
    inputBorder: t.colors.inputBorder ?? (t.colors.border || '#E5E7EB'),
    card: t.colors.surface,
    border: t.colors.border ?? '#E5E7EB',
    notification: t.colors.primary,
  };

  const palette = {
    bg: colors.bg,
    text: colors.text,
    textMuted: colors.textMuted,
    primary: colors.primary,
    onPrimary: colors.primaryContrast,
    surface: colors.surface,
    surface2: colors.surface2,
    border: colors.border,
    inputBg: colors.inputBg,
    inputBorder: colors.inputBorder,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    info: colors.info,
  };

  const radii = t.radii ?? { xs: 8, sm: 12, md: 16, lg: 22, xl: 30 };
  const spacing = t.spacing ?? { xs: 6, sm: 10, md: 16, lg: 24, xl: 32 };
  const elevation = t.elevation ?? { sm: 2, md: 6, lg: 12 };

  return { mode, colors, palette, radii, spacing, elevation };
}

// Tema de navegación compatible con @react-navigation/native
export function getNavTheme(mode = 'light') {
  const t = buildTheme(mode);
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: t.colors.bg,
      card: t.colors.card,
      text: t.colors.text,
      primary: t.colors.primary,
      border: t.colors.border,
      notification: t.colors.notification,
    },
  };
}

// Utilidad rgba segura
export const withOpacity = (hex, alpha = 0.2) => {
  try {
    const c = String(hex || '#000000').replace('#', '');
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return `rgba(0,0,0,${alpha})`;
  }
};

export function ThemeProvider({ children, initialMode }) {
  const system = Appearance.getColorScheme?.() || 'light';
  const [mode, setMode] = useState(initialMode || system || 'light');

  // Cargar preferencia guardada
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setMode(saved);
      } catch (err) {
        // ignorar error de lectura de AsyncStorage
      }
    })();
  }, []);

  // Persistir cambios
  const setModeSafe = useCallback(async (m) => {
    setMode(m);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, m);
    } catch (err) {
      // ignorar error de escritura de AsyncStorage
    }
  }, []);

  const theme = useMemo(() => buildTheme(mode), [mode]);
  const navTheme = useMemo(() => getNavTheme(mode), [mode]);

  const value = useMemo(() => ({
    mode,
    setMode: setModeSafe,
    availableModes: THEME_ORDER,
    theme,
    colors: theme.colors,
    palette: theme.palette,
    radii: theme.radii,
    spacing: theme.spacing,
    elevation: theme.elevation,
    navTheme,
  }), [mode, setModeSafe, theme, navTheme]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) {
    const t = buildTheme('light');
    return {
      ...t,
      colors: t.colors,
      palette: t.palette,
      mode: 'light',
      setMode: () => {},
      availableModes: THEME_ORDER,
      navTheme: getNavTheme('light'),
    };
  }
  return ctx;
}

export function useTheme() {
  const ctx = useAppTheme();
  return { colors: ctx.colors, palette: ctx.palette, mode: ctx.mode };
}
