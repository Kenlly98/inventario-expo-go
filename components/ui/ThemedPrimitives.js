// components/ui/ThemedPrimitives.js
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useAppTheme, withOpacity } from '../../theme/ThemeProvider';

export function ThemedView({ style, elevated = false, ...props }) {
  const { colors, theme } = useAppTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: theme.radii.lg,
          padding: theme.spacing.md,
          shadowColor: '#000',
          shadowOpacity: elevated ? 0.2 : 0,
          shadowRadius: elevated ? theme.elevation.md : 0,
          shadowOffset: { width: 0, height: elevated ? 4 : 0 },
          elevation: elevated ? theme.elevation.md : 0,
        },
        style,
      ]}
      {...props}
    />
  );
}

export function ThemedText({ style, muted = false, ...props }) {
  const { colors } = useAppTheme();
  return (
    <Text
      style={[
        {
          color: muted ? colors.textMuted : colors.text,
        },
        style,
      ]}
      {...props}
    />
  );
}

export function ThemedButton({ title, onPress, variant = 'primary', style, textStyle }) {
  const { colors, theme } = useAppTheme();
  const bg = variant === 'primary' ? colors.primary : colors.surface2;
  const fg = variant === 'primary' ? colors.primaryContrast : colors.text;
  const border = variant === 'primary' ? withOpacity(colors.primary, 0.25) : colors.border;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: pressed ? withOpacity(bg, 0.85) : bg,
          borderColor: border,
          borderWidth: 1,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderRadius: theme.radii.md,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <ThemedText style={[{ color: fg, fontWeight: '600' }, textStyle]}>{title}</ThemedText>
    </Pressable>
  );
}

export function StatBadge({ label, value, colorKey = 'primary', style }) {
  const { colors, theme } = useAppTheme();
  const base = colors[colorKey] || colors.primary;
  return (
    <View
      style={[
        {
          backgroundColor: withOpacity(base, 0.15),
          borderColor: withOpacity(base, 0.35),
          borderWidth: 1,
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderRadius: theme.radii.sm,
        },
        style,
      ]}
    >
      <ThemedText style={{ fontSize: 12 }} muted>
        {label}
      </ThemedText>
      <ThemedText style={{ fontSize: 16, fontWeight: '700', color: base }}>{value}</ThemedText>
    </View>
  );
}
