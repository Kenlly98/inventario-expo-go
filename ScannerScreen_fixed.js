// screens/Scanner/ScannerScreen.js
import React, { useMemo } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useAppTheme } from '../../theme/ThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScannerScreen() {
  const { palette } = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.bg },
    wrap: { padding: 16 },
    h1: { fontSize: 20, fontWeight: '700', marginBottom: 8, color: palette.text },
    p: { opacity: 0.8, marginBottom: 12, color: palette.textMuted },
    box: { padding: 10, borderRadius: 12, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
    mono: { fontFamily: 'monospace', color: palette.textMuted },
  }), [palette]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.h1}>Scanner</Text>
        <Text style={styles.p}>Pronto: lector QR/Barcode para equipos.</Text>
        <View style={styles.box}>
          <Text style={styles.mono}>screens/Scanner/ScannerScreen.js</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
