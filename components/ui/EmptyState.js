import React from 'react';
import { View, Text } from 'react-native';
import { useAppTheme, withOpacity } from '../../theme/ThemeProvider';

export default function EmptyState({ title = 'Sin datos', subtitle = 'Aún no hay información para mostrar.', action }) {
  const { colors, theme } = useAppTheme();
  return (
    <View style={{ alignItems: 'center', padding: theme.spacing.lg }}>
      <View style={{
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: withOpacity(colors.primary, 0.12),
        alignItems: 'center', justifyContent: 'center', marginBottom: 12
      }}>
        <Text style={{ fontSize: 36, color: colors.primary }}>ℹ️</Text>
      </View>
      <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>{title}</Text>
      <Text style={{ color: colors.textMuted, marginTop: 6, textAlign: 'center' }}>{subtitle}</Text>
      {action}
    </View>
  );
}
