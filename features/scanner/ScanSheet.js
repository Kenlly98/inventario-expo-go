/* eslint-disable react-native/no-unused-styles */
// features/scanner/ScanSheet.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, View, Text, Pressable, StyleSheet, Platform, TextInput } from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";
import { Camera } from "expo-camera";
import { useAppTheme } from "../../theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScannerCtx } from "./ScannerProvider";
import { loadHistory } from "./prefs";

const BARCODE_TYPES = [
  BarCodeScanner.Constants.BarCodeType.qr,
  BarCodeScanner.Constants.BarCodeType.code128,
  BarCodeScanner.Constants.BarCodeType.ean13,
];

function OverlayFrame({ color = "#00D2FF" }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} />
      <View style={{ flexDirection: "row" }}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} />
        <View
          style={{
            width: 260,
            height: 260,
            borderWidth: 3,
            borderColor: color,
            borderRadius: 14,
          }}
        />
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} />
      </View>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)" }} />
    </View>
  );
}

export default function ScanSheet({ visible: externalVisible, onRequestClose, helpText }) {
  const scanner = useScannerCtx();
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [manual, setManual] = useState("");
  const [history, setHistory] = useState([]);

  const visible = externalVisible ?? scanner.isOpen;

  useEffect(() => {
    if (visible) loadHistory().then(setHistory);
  }, [visible]);

  const onClose = useCallback(() => {
    onRequestClose ? onRequestClose() : scanner.closeScanSheet();
  }, [onRequestClose, scanner]);

  const onBarCodeScanned = useCallback(
    ({ data }) => {
      scanner.handleDetection(String(data || ""));
    },
    [scanner]
  );

  const onManualSubmit = useCallback(() => {
    const raw = manual.trim();
    if (!raw) return;
    scanner.handleDetection(raw);
    setManual("");
  }, [manual, scanner]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        modal: { flex: 1, backgroundColor: "#000" },
        header: {
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          paddingHorizontal: 12,
          backgroundColor: "rgba(0,0,0,0.35)",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        title: { color: "#fff", fontSize: 18, fontWeight: "700" },
        subtitle: { color: "#fff", fontSize: 12, opacity: 0.9 },
        btn: {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.35)",
        },
        btnText: { color: "#fff", fontWeight: "600" },
        camera: { flex: 1 },
        footer: { padding: 12, gap: 8, backgroundColor: "rgba(0,0,0,0.35)" },
        manualRow: { flexDirection: "row", gap: 8 },
        input: {
          flex: 1,
          backgroundColor: "#111",
          color: "#fff",
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: "#333",
        },
        historyRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
        chip: {
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.3)",
        },
        chipText: { color: "#fff" },
        help: { color: "#eee", fontSize: 12 },
      }),
    [insets]
  );

  if (!visible) return null;

  const canTorch = scanner.engine === "camera";

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{scanner.title}</Text>
            <Text style={styles.subtitle}>{scanner.subtitle}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              style={styles.btn}
              onPress={() => canTorch && scanner.setTorch(!scanner.torch)}
            >
              <Text style={styles.btnText}>
                {canTorch ? (scanner.torch ? "Linterna ON" : "Linterna OFF") : "Linterna"}
              </Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={onClose}>
              <Text style={styles.btnText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>

        {scanner.engine === "camera" ? (
          <Camera
            style={styles.camera}
            onBarCodeScanned={onBarCodeScanned}
            barCodeScannerSettings={{ barCodeTypes: BARCODE_TYPES }}
            flashMode={
              scanner.torch ? Camera.Constants.FlashMode.torch : Camera.Constants.FlashMode.off
            }
            ratio={Platform.OS === "android" ? "16:9" : undefined}
          >
            <OverlayFrame color={palette.primary} />
          </Camera>
        ) : (
          <View style={styles.camera}>
            <BarCodeScanner
              style={StyleSheet.absoluteFill}
              onBarCodeScanned={onBarCodeScanned}
              barCodeTypes={BARCODE_TYPES}
            />
            <OverlayFrame color={palette.primary} />
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.help}>
            {helpText ||
              "Alinea el código dentro del marco. También puedes escribirlo manualmente."}
          </Text>
          <View style={styles.manualRow}>
            <TextInput
              placeholder="Ingresar serial o ID"
              placeholderTextColor="#aaa"
              style={styles.input}
              value={manual}
              onChangeText={setManual}
              onSubmitEditing={onManualSubmit}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Pressable style={styles.btn} onPress={onManualSubmit}>
              <Text style={styles.btnText}>Usar</Text>
            </Pressable>
          </View>
          {!!history.length && (
            <View style={styles.historyRow}>
              {history.map((h) => (
                <Pressable
                  key={h}
                  style={styles.chip}
                  onPress={() => scanner.handleDetection(h)}
                >
                  <Text style={styles.chipText}>{h}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
