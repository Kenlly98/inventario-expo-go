// components/ui/IconButton.js
import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useThemeCtx } from '../../theme/ThemeProvider';

export default function IconButton({
  children, onPress,
  size = 40, // diámetro
  variant = 'secondary', // secondary | outline | ghost | primary
  style,
}) {
  const { colors } = useThemeCtx();
  const palette = {
    secondary: { bg: colors.card, border: colors.border },
    outline:   { bg: 'transparent', border: colors.border },
    ghost:     { bg: 'transparent', border: 'transparent' },
    primary:   { bg: colors.primary, border: colors.primary },
  }[variant] || { bg: colors.card, border: colors.border };

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.base,
      {
        width: size, height: size, borderRadius: size/2,
        backgroundColor: pressed ? palette.bg : palette.bg,
        borderWidth: variant === 'outline' || variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
        borderColor: palette.border,
      },
      style
    ]}>
      <View style={styles.center}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
