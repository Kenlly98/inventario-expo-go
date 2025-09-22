// features/scanner/parser.js
export function sanitizeText(s = "") {
  return String(s).trim().replace(/\s+/g, " ");
}

const SERIAL_RE = /^[A-Z0-9\-_]{5,32}$/i;

export function parseScanPayload(raw = "") {
  const text = sanitizeText(decodeURIComponent(String(raw || "")));
  const result = { raw: text, equip_id: null, serial: null, type: "unknown" };
  try {
    // inv://equip/EQ-0001?serial=SN123
    if (text.startsWith("inv://")) {
      const url = new URL(text);
      const pathname = url.pathname || "";
      const [, first, second] = pathname.split("/");
      if (first === "equip" && second) {
        result.equip_id = second;
        result.type = "equip";
      }
      const serial = url.searchParams.get("serial");
      if (serial && SERIAL_RE.test(serial)) result.serial = serial;
      return result;
    }

    // URL con serial en query
    if (/^https?:\/\//i.test(text)) {
      try {
        const url = new URL(text);
        const serial = url.searchParams.get("serial");
        if (serial && SERIAL_RE.test(serial)) {
          result.serial = serial;
          result.type = "serial";
          return result;
        }
        result.type = "unknown";
        return result;
      } catch (_) {
        // noop: URL inválida
      }
    }

    // serial crudo
    if (SERIAL_RE.test(text)) {
      result.serial = text;
      result.type = "serial";
      return result;
    }

    // equip_id estilo EQ-0001
    if (/^[A-Z]{2,5}-?\d{1,6}$/i.test(text)) {
      result.equip_id = text;
      result.type = "equip";
      return result;
    }

    return result;
  } catch {
    return result;
  }
}
