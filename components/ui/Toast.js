import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useAppTheme, withOpacity } from '../../theme/ThemeProvider';

export default function Toast({ message, type = 'info', onDone, duration = 1800 }) {
  const { colors, theme } = useAppTheme();
  const y = useRef(new Animated.Value(-80)).current;
  const bg = {
    info: withOpacity(colors.info || colors.primary, 0.2),
    success: withOpacity(colors.success || colors.primary, 0.2),
    danger: withOpacity(colors.danger || colors.primary, 0.2),
    warning: withOpacity(colors.warning || colors.primary, 0.2),
  }[type] || withOpacity(colors.primary, 0.2);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(y, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.delay(duration),
      Animated.timing(y, { toValue: -80, duration: 220, useNativeDriver: true }),
    ]).start(() => onDone?.());
  }, [y, duration, onDone]);

  return (
    <Animated.View style={{ position: 'absolute', top: 12, left: 12, right: 12, transform: [{ translateY: y }] }}>
      <View style={{
        paddingVertical: 10, paddingHorizontal: 14,
        borderRadius: theme.radii.md,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: withOpacity(colors.text, 0.08),
      }}>
        <Text style={{ color: colors.text, fontWeight: '600' }}>{message}</Text>
      </View>
    </Animated.View>
  );
}
