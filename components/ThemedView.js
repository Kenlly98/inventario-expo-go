// components/ThemedView.js
import React from "react";
import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export default function ThemedView({ card = false, style, ...props }) {
  const { colors, radius, spacing } = useTheme();
  if (card) {
    return (
      <View
        style={[
          {
            backgroundColor: colors.card,
            borderRadius: radius,
            borderColor: colors.border,
            borderWidth: 1,
            padding: spacing(1.25),
          },
          style,
        ]}
        {...props}
      />
    );
  }
  return <View style={[{ backgroundColor: colors.bg }, style]} {...props} />;
}
