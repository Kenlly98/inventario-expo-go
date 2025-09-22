// data/repositories/equiposRepository.js
import api from "../api/client";

// Normaliza nombre de columnas según tu Sheet
function normalizeEquipo(raw) {
  if (!raw || typeof raw !== "object") return {};
  const pick = (keys, def = "") => {
    for (const k of keys) {
      const v = raw[k];
      if (v !== undefined && v !== null && String(v).length) return v;
    }
    return def;
  };
  return {
    id_interno:     pick(["id_interno", "id", "equipo_id"]),
    serial:         pick(["serial", "n_serie", "serie"]),
    marca_original: pick(["marca_original", "marca"]),
    modelo:         pick(["modelo", "model"]),
    ubicacion:      pick(["ubicacion", "location"]),
    estado:         pick(["estado", "status"]),
    // mantiene el resto de campos por si los usas
    ...raw,
  };
}

export const equiposRepository = {
  async list({ page = 1, page_size = 100, updated_after } = {}) {
    const r = await api.equipos.list({ page, page_size, updated_after });
    if (!r.ok) throw new Error(r.error || "API_ERROR");
    const arr = Array.isArray(r.data) ? r.data : [];
    const data = arr.map(normalizeEquipo);
    // El client descarta "total"; si lo necesitas, calcula o cambia el client.
    return { data, total: data.length, page };
  },

  async getById(id) {
    const r = await api.equipos.getById(id);
    if (!r.ok) throw new Error(r.error || "API_ERROR");
    return normalizeEquipo(r.data);
  },

  async getBySerial(serial) {
    const r = await api.equipos.getBySerial(serial);
    if (!r.ok) throw new Error(r.error || "API_ERROR");
    return normalizeEquipo(r.data);
  },

  async getByQr(qr) {
    const r = await api.equipos.getByQr(qr);
    if (!r.ok) throw new Error(r.error || "API_ERROR");
    return normalizeEquipo(r.data);
  },

  async updateState({ equipo_id, new_state, motivo, evento_id, usuario_id }) {
    const r = await api.equipos.updateState({ equipo_id, new_state, motivo, evento_id, usuario_id });
    if (!r.ok) throw new Error(r.error || "API_ERROR");
    return true;
  },
};
