// components/Screen.js
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";

export default function Screen({ children, withBottom = false, style }) {
  const { colors } = useTheme();
  const edges = withBottom ? ["top", "bottom", "left", "right"] : ["top", "left", "right"];
  return (
    <SafeAreaView
      edges={edges}
      style={[{ flex: 1, backgroundColor: colors.bg }, style]}
    >
      {children}
    </SafeAreaView>
  );
}
