// features/scanner/useScanner.js
import { useCallback, useMemo, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { BarCodeScanner } from "expo-barcode-scanner";
import { Camera } from "expo-camera";
import NetInfo from "@react-native-community/netinfo";
import { Audio } from "expo-av"; // beep real
import { parseScanPayload } from "./parser";
import { loadScannerPrefs, pushHistory } from "./prefs";

export function useScanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("Escanear");
  const [subtitle, setSubtitle] = useState("");
  const [mode, setMode] = useState("equipo"); // equipo | serial | qr-only
  const [acceptTypes, setAcceptTypes] = useState(["qr", "code128", "ean13"]);
  const [hasPermission, setHasPermission] = useState(null);
  const [torch, setTorch] = useState(false);
  const [engine, setEngine] = useState("barcode");

  const debounceRef = useRef(0);
  const onResultRef = useRef(null);

  const requestPermission = useCallback(async () => {
    const prefs = await loadScannerPrefs();
    setEngine(prefs.engine || "barcode");
    if (prefs.engine === "camera") {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
      return status === "granted";
    } else {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
      return status === "granted";
    }
  }, []);

  const openScanSheet = useCallback(
    async ({ mode = "equipo", onResult, title, subtitle, acceptTypes } = {}) => {
      setMode(mode);
      setTitle(title || (mode === "serial" ? "Escanear serial" : "Escanear equipo"));
      setSubtitle(subtitle || "Alinea el código dentro del marco");
      if (acceptTypes) setAcceptTypes(acceptTypes);
      onResultRef.current = onResult;
      const prefs = await loadScannerPrefs();
      setEngine(prefs.engine || "barcode");
      setTorch(!!prefs.torchDefault);
      if (hasPermission == null) await requestPermission();
      setIsOpen(true);
    },
    [hasPermission, requestPermission]
  );

  const closeScanSheet = useCallback(() => {
    setIsOpen(false);
    onResultRef.current = null;
  }, []);

  const handleDetection = useCallback(
    async (rawValue) => {
      const now = Date.now();
      if (now - debounceRef.current < 1200) return;

      const net = await NetInfo.fetch();
      try {
        const prefs = await loadScannerPrefs();

        if (prefs.haptics) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        if (prefs.beep) {
          try {
            const { sound } = await Audio.Sound.createAsync(
              require("../../assets/beep.mp3"), // ← ruta correcta (assets/ en raíz)
              { shouldPlay: true }
            );
            sound.setOnPlaybackStatusUpdate((status) => {
              if (status.didJustFinish) sound.unloadAsync();
            });
          } catch (err) {
            console.warn("Beep error:", err);
          }
        }
      } catch (err) {
        console.warn("Scanner haptics/beep error:", err);
      }

      const parsed = parseScanPayload(rawValue);

      if (mode === "qr-only") {
        debounceRef.current = now;
        onResultRef.current?.({ type: "qr", raw: parsed.raw });
        return;
      }

      if (!net.isConnected) {
        debounceRef.current = now;
        const serial = parsed.serial || null;
        if (serial) await pushHistory(serial);
        onResultRef.current?.({
          type: "serial",
          serial: serial || parsed.raw,
          offline: true,
          manual: false,
        });
        return;
      }

      if (mode === "serial") {
        debounceRef.current = now;
        const serial = parsed.serial || parsed.raw;
        if (serial) await pushHistory(serial);
        onResultRef.current?.({ type: "serial", serial, offline: false, manual: false });
        return;
      }

      try {
        const { equiposRepository } = await import("../../data/repositories");
        let equipo = null;
        if (parsed.type === "equip" && parsed.equip_id) {
          if (equiposRepository.getByQr) equipo = await equiposRepository.getByQr(parsed.raw);
          if (!equipo && equiposRepository.getById)
            equipo = await equiposRepository.getById(parsed.equip_id);
        }
        if (!equipo && parsed.serial && equiposRepository.getBySerial) {
          equipo = await equiposRepository.getBySerial(parsed.serial);
        }

        debounceRef.current = now;
        if (equipo) {
          await pushHistory(parsed.serial || parsed.equip_id || parsed.raw);
          onResultRef.current?.({ type: "equipo", equipo });
        } else {
          onResultRef.current?.({ type: "not_found", raw: parsed.raw });
        }
      } catch (err) {
        debounceRef.current = now;
        const code = err?.code || "UNKNOWN";
        if (code === "UNAUTHORIZED") {
          onResultRef.current?.({ type: "error", code, message: "No autorizado. Revisa API Key." });
        } else if (code === "NETWORK_ERROR") {
          onResultRef.current?.({ type: "error", code, message: "Offline: se usará el serial sin validar." });
        } else {
          onResultRef.current?.({ type: "error", code, message: "Error de escaneo." });
        }
      }
    },
    [mode]
  );

  return useMemo(
    () => ({
      openScanSheet,
      closeScanSheet,
      isOpen,
      hasPermission,
      requestPermission,
      torch,
      setTorch,
      title,
      subtitle,
      mode,
      acceptTypes,
      engine,
      handleDetection,
    }),
    [
      openScanSheet,
      closeScanSheet,
      isOpen,
      hasPermission,
      requestPermission,
      torch,
      title,
      subtitle,
      mode,
      acceptTypes,
      engine,
      handleDetection,
    ]
  );
}
