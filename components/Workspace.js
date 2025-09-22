// components/Workspace.js
import React from "react";
import { View, ScrollView } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

/**
 * type: "flat" | "scroll"
 * pad:  true para padding estándar del tema
 */
export default function Workspace({ children, type = "flat", pad = true, style, contentContainerStyle }) {
  const { colors, spacing } = useTheme();
  const padding = pad ? spacing(1.5) : 0;

  if (type === "scroll") {
    return (
      <ScrollView
        style={[{ flex: 1, backgroundColor: colors.bg }, style]}
        contentContainerStyle={[{ padding }, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }
  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg, padding }, style]}>
      {children}
    </View>
  );
}
