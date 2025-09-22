// components/ui/FAB.js
import React, { useRef, useState } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, withOpacity } from '../../theme/ThemeProvider';

export default function FAB({ visible = true, actions = [], label = '+', onMainPress }) {
  const { colors, theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);
  const scale = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  function toggle() {
    const to = open ? 0 : 1;
    setOpen(!open);
    Animated.parallel([
      Animated.spring(scale, { toValue: to, useNativeDriver: true }),
      Animated.timing(rotate, { toValue: to, duration: 180, useNativeDriver: true })
    ]).start();
  }

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  if (!visible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: (insets.bottom || 0) + 20,
        right: 20,
        zIndex: 999,          // asegura estar arriba
        elevation: 999,
      }}
    >
      {/* Acciones del speed-dial */}
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={{
          transform: [{ scale }],
          opacity: scale,
          marginBottom: 12,
          alignItems: 'flex-end',
          gap: 10,
        }}
      >
        {actions.map((a) => (
          <Pressable
            key={a.key}
            onPress={() => { a.onPress?.(); toggle(); }}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: theme.radii.md,
                backgroundColor: pressed ? withOpacity(colors.surface, 0.9) : colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: '#000',
                shadowOpacity: 0.12,
                shadowRadius: theme.elevation.sm,
                shadowOffset: { width: 0, height: 2 },
                elevation: theme.elevation.sm,
              },
            ]}
          >
            <View style={{
              width: 24, height: 24, borderRadius: 12,
              backgroundColor: a.color || colors.primary,
              alignItems: 'center', justifyContent: 'center'
            }}>
              <Text style={{ color: colors.primaryContrast || '#fff', fontWeight: '900' }}>
                {a.icon || '•'}
              </Text>
            </View>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{a.label}</Text>
          </Pressable>
        ))}
      </Animated.View>

      {/* Botón principal */}
      <Pressable
        onPress={actions?.length ? toggle : onMainPress}
        style={({ pressed }) => [
          {
            width: 56, height: 56, borderRadius: 28,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: pressed ? withOpacity(colors.primary, 0.85) : colors.primary,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: theme.elevation.md,
            shadowOffset: { width: 0, height: 6 },
            elevation: theme.elevation.lg,
          }
        ]}
      >
        <Animated.Text style={{ color: colors.primaryContrast, fontSize: 24, fontWeight: '900', transform: [{ rotate: spin }] }}>
          {label}
        </Animated.Text>
      </Pressable>
    </View>
  );
}
