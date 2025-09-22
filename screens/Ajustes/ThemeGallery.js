// screens/Ajustes/ThemeGallery.js
import React from 'react';
import { View, FlatList } from 'react-native';
import { useAppTheme } from '../../theme/ThemeProvider';
import { ThemedText, ThemedView, ThemedButton, StatBadge } from '../../components/ui/ThemedPrimitives';
import { THEMES, THEME_ORDER } from '../../theme/themes';

export default function ThemeGallery() {
  const { mode, setModeIfExists, nextMode, colors, theme } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: theme.spacing.lg }}>
      <ThemedText style={{ fontSize: 22, fontWeight: '800', marginBottom: 12 }}>Temas</ThemedText>
      <ThemedText muted style={{ marginBottom: 16 }}>
        Selecciona un estilo visual optimizado para contraste, legibilidad y métricas.
      </ThemedText>

      <FlatList
        data={THEME_ORDER}
        keyExtractor={(k) => k}
        renderItem={({ item }) => {
          const t = THEMES[item];
          const active = item === mode;
          return (
            <ThemedView
              elevated
              style={{ marginBottom: 12, borderColor: active ? t.colors.primary : t.colors.border }}
            >
              <ThemedText style={{ fontWeight: '700', marginBottom: 8 }}>
                {t.meta.emoji} {t.meta.label} {active ? '· actual' : ''}
              </ThemedText>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View
                  style={{
                    flex: 1,
                    height: 48,
                    backgroundColor: t.colors.primary,
                    borderRadius: theme.radii.sm,
                  }}
                />
                <View
                  style={{
                    flex: 1,
                    height: 48,
                    backgroundColor: t.colors.surface2,
                    borderRadius: theme.radii.sm,
                    borderWidth: 1,
                    borderColor: t.colors.border,
                  }}
                />
                <View
                  style={{
                    flex: 1,
                    height: 48,
                    backgroundColor: t.colors.background,
                    borderRadius: theme.radii.sm,
                    borderWidth: 1,
                    borderColor: t.colors.border,
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <StatBadge label="OK" value="1,248" colorKey="success" />
                <StatBadge label="Warn" value="32" colorKey="warning" />
                <StatBadge label="Fail" value="4" colorKey="danger" />
              </View>

              <ThemedButton
                title={active ? 'Seleccionado' : 'Usar este tema'}
                onPress={() => setModeIfExists(item)}
                variant={active ? 'secondary' : 'primary'}
              />
            </ThemedView>
          );
        }}
      />

      <ThemedButton title="Siguiente tema ▶" onPress={nextMode} style={{ marginTop: 8 }} />
    </View>
  );
}
