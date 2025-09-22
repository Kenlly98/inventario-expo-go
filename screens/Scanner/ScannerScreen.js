// screens/Scanner/ScannerScreen.js
import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useScannerCtx } from "../../features/scanner/ScannerProvider";
import { useAppTheme } from "../../theme/ThemeProvider";

export default function ScannerScreen() {
  const scanner = useScannerCtx();
  const theme = useAppTheme?.(); // por si el hook no existe aún
  // Fallbacks seguros si no hay ThemeProvider o no trae palette
  const palette = useMemo(
    () =>
      theme?.palette ?? {
        primary: "#007AFF",
        onPrimary: "#FFFFFF",
        border: "#E5E7EB",
      },
    [theme]
  );

  const [result, setResult] = useState(null);

  const onOpenScanner = () => {
    scanner.openScanSheet({
      mode: "equipo",
      title: "Escanear equipo",
      onResult: (res) => setResult(res),
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>Escáner</Text>
      <Text style={styles.p}>
        Usa la cámara para leer QR / Code128 / EAN-13 y asociarlos a equipos.
      </Text>

      <Pressable
        style={[styles.btn, { backgroundColor: palette.primary }]}
        onPress={onOpenScanner}
      >
        <Text style={[styles.btnText, { color: palette.onPrimary }]}>
          Abrir cámara
        </Text>
      </Pressable>

      {result && (
        <View style={[styles.box, { borderColor: palette.border }]}>
          <Text style={styles.mono}>Último resultado:</Text>
          <Text style={styles.res}>{JSON.stringify(result, null, 2)}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12 },
  h1: { fontSize: 20, fontWeight: "700" },
  p: { opacity: 0.8 },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { fontWeight: "700" },
  box: { marginTop: 20, padding: 12, borderWidth: 1, borderRadius: 8 },
  mono: { fontFamily: "System", opacity: 0.8, marginBottom: 4 },
  res: { fontFamily: "Courier", fontSize: 12 },
});
