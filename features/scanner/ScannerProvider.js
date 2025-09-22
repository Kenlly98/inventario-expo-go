// features/scanner/ScannerProvider.js
import React, { createContext, useContext } from "react";
import { useScanner } from "./useScanner";
import ScanSheet from "./ScanSheet";

const ScannerContext = createContext(null);

export function ScannerProvider({ children }) {
  const scanner = useScanner();
  return (
    <ScannerContext.Provider value={scanner}>
      {/* Montamos una única hoja de escaneo global */}
      <ScanSheet />
      {children}
    </ScannerContext.Provider>
  );
}

export function useScannerCtx() {
  const ctx = useContext(ScannerContext);
  if (!ctx) throw new Error("useScannerCtx debe usarse dentro de <ScannerProvider>");
  return ctx;
}
