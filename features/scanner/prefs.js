// features/scanner/prefs.js
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFS_KEY = "scanner.prefs.v1";
const HISTORY_KEY = "scanner.history.v1";

export async function loadScannerPrefs() {
  try {
    const json = await AsyncStorage.getItem(PREFS_KEY);
    return (
      JSON.parse(json) || {
        beep: false,
        haptics: true,
        acceptTypes: ["qr", "code128", "ean13"],
        engine: "barcode",
        torchDefault: false,
      }
    );
  } catch (_) {
    return {
      beep: false,
      haptics: true,
      acceptTypes: ["qr", "code128", "ean13"],
      engine: "barcode",
      torchDefault: false,
    };
  }
}

export async function saveScannerPrefs(p) {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(p || {}));
}

export async function pushHistory(serialOrId) {
  try {
    const json = await AsyncStorage.getItem(HISTORY_KEY);
    const arr = (JSON.parse(json) || []).filter((x) => x !== serialOrId);
    arr.unshift(serialOrId);
    const trimmed = arr.slice(0, 10);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch {
    return [];
  }
}

export async function loadHistory() {
  try {
    const json = await AsyncStorage.getItem(HISTORY_KEY);
    return JSON.parse(json) || [];
  } catch {
    return [];
  }
}
