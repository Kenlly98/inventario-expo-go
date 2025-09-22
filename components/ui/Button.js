// components/ui/Button.js
import React, { useMemo } from 'react';
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';

const SIZES = {
  sm: { padV: 8, padH: 12, text: 13, radius: 10, gap: 6 },
  md: { padV: 10, padH: 14, text: 15, radius: 12, gap: 8 },
  lg: { padV: 12, padH: 16, text: 17, radius: 14, gap: 10 },
};

export default function Button({
  title,
  children,             // alternativa a title (puedes pasar <Text> personalizado)
  onPress,
  variant = 'primary',   // primary | secondary | outline | ghost | danger
  size = 'md',           // sm | md | lg
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon = null,       // <YourIcon />
  rightIcon = null,
  rounded = '2xl',       // 'md' | 'lg' | 'xl' | '2xl' (solo cambia el radio)
  style,
  textStyle,
  accessibilityLabel,
}) {
  const { colors } = useThemeCtx();
  const conf = SIZES[size] || SIZES.md;

  // Paleta por variante según tema
  const palette = useMemo(() => {
    const c = colors;
    const map = {
      primary: {
        bg: c.primary,
        text: '#fff',
        border: c.primary,
        bgHover: shade(c.primary, -8),
        bgActive: shade(c.primary, -16),
      },
      secondary: {
        bg: c.card,
        text: c.text,
        border: c.border,
        bgHover: Platform.OS === 'web' ? mix(c.card, c.text, 0.06) : c.card,
        bgActive: Platform.OS === 'web' ? mix(c.card, c.text, 0.12) : c.card,
      },
      outline: {
        bg: 'transparent',
        text: c.text,
        border: c.border,
        bgHover: Platform.OS === 'web' ? mix(c.background, c.text, 0.06) : 'transparent',
        bgActive: Platform.OS === 'web' ? mix(c.background, c.text, 0.12) : 'transparent',
      },
      ghost: {
        bg: 'transparent',
        text: c.text,
        border: 'transparent',
        bgHover: Platform.OS === 'web' ? mix(c.background, c.text, 0.06) : 'transparent',
        bgActive: Platform.OS === 'web' ? mix(c.background, c.text, 0.12) : 'transparent',
      },
      danger: {
        bg: '#b91c1c',
        text: '#fff',
        border: '#b91c1c',
        bgHover: '#991b1b',
        bgActive: '#7f1d1d',
      },
    };
    return map[variant] || map.primary;
  }, [variant, colors]);

  // Estilo calculado
  const borderRadius = rounded === '2xl' ? conf.radius : rounded === 'xl' ? conf.radius - 2 : rounded === 'lg' ? conf.radius - 4 : conf.radius - 6;

  const baseStyle = [
    styles.base,
    {
      paddingVertical: conf.padV,
      paddingHorizontal: conf.padH,
      borderRadius,
      backgroundColor: palette.bg,
      borderColor: palette.border,
      borderWidth: variant === 'outline' ? StyleSheet.hairlineWidth : (variant === 'secondary' ? StyleSheet.hairlineWidth : 0),
      width: fullWidth ? '100%' : undefined,
      opacity: disabled ? 0.6 : 1,
      shadowColor: variant === 'primary' ? '#000' : 'transparent',
      shadowOpacity: variant === 'primary' ? (Platform.OS === 'ios' ? 0.15 : 0.2) : 0,
      shadowRadius: variant === 'primary' ? 6 : 0,
      elevation: variant === 'primary' ? 2 : 0,
    },
    style,
  ];

  const labelStyle = [
    {
      color: palette.text,
      fontSize: conf.text,
      fontWeight: '700',
    },
    textStyle,
  ];

  function handlePress(e) {
    if (disabled || loading) return;
    onPress?.(e);
  }

  return (
    <Pressable
      onPress={handlePress}
      android_ripple={{
        color: variant === 'primary' ? shade(palette.bg, -20) : mix(palette.bg, palette.text, 0.1),
        borderless: false,
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof title === 'string' ? title : undefined)}
      style={({ pressed, hovered, focused }) => {
        const bg =
          pressed ? palette.bgActive :
          hovered ? palette.bgHover :
          palette.bg;
        return [baseStyle, Platform.OS === 'web' ? { backgroundColor: bg, outlineStyle: 'none' } : { backgroundColor: bg }];
      }}
    >
      <View style={[styles.content, { gap: conf.gap }]}>
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
        {loading ? (
          <ActivityIndicator size="small" color={palette.text} />
        ) : children ? (
          children
        ) : (
          <Text style={labelStyle} numberOfLines={1}>{title}</Text>
        )}
        {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
      </View>
    </Pressable>
  );
}

// Utilidades de color simples
function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}
function rgbToHex({ r, g, b }) {
  const toHex = (v) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function clamp(n, min=0, max=255) { return Math.max(min, Math.min(max, n)); }
function shade(hex, amount) {
  const { r, g, b } = hexToRgb(hex.startsWith('#') ? hex : '#111827');
  return rgbToHex({ r: clamp(r + amount), g: clamp(g + amount), b: clamp(b + amount) });
}
function mix(bg, fg, alpha=0.1) {
  const B = hexToRgb(bg.startsWith('#') ? bg : '#ffffff');
  const F = hexToRgb(fg.startsWith('#') ? fg : '#111827');
  const r = Math.round((1 - alpha) * B.r + alpha * F.r);
  const g = Math.round((1 - alpha) * B.g + alpha * F.g);
  const b = Math.round((1 - alpha) * B.b + alpha * F.b);
  return rgbToHex({ r, g, b });
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    transform: [{ translateZ: 0 }], // mejora hover en web
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: { alignSelf: 'center' },
});
