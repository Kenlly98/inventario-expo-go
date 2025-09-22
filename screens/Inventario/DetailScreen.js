// screens/Inventario/DetailScreen.js
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
  Pressable, Alert, RefreshControl, Modal, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { equiposRepository } from "../../data/repositories";
import { ROUTES } from "../../navigation/routes";

// permisos + sesión
import { can } from "../../utils/permits";
import { useSession } from "../../app/store/session";

// cola offline (badge + enqueue)
import { enqueue, hasPendingForEquipo, onQueueChange } from "../../data/offline/queue";

const ESTADOS = ["disponible", "reservado", "en_uso", "mantenimiento", "fuera_servicio", "baja"];

export default function InventarioDetail() {
  const nav = useNavigation();
  const route = useRoute();
  const id = route.params?.id;

  const session = useSession();
  const user = session?.user || { id: "U-guest", role: "tecnico" };

  const [equipo, setEquipo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  const [pendingSync, setPendingSync] = useState(false);

  const load = useCallback(async () => {
    if (!id) { setError("Falta el ID del equipo"); setLoading(false); return; }
    try {
      setError(null); setLoading(true);
      const data = await equiposRepository.getById(id);
      setEquipo(data || null);
    } catch (e) {
      setError(e?.message || "No se pudo cargar el equipo");
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // observar la cola para mostrar badge “pendiente”
  useEffect(() => {
    async function check() {
      if (!id) return;
      setPendingSync(await hasPendingForEquipo(id));
    }
    check();
    const unsubscribe = onQueueChange(check);
    return () => unsubscribe();
  }, [id]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const estadoActual = useMemo(
    () => String(equipo?.estado || equipo?.estado_name || "").toLowerCase(),
    [equipo]
  );

  // nombres bonitos con fallback
  const marcaUI     = equipo?.marca_name     || equipo?.marca_original || "Marca";
  const modeloUI    = equipo?.modelo_name    || equipo?.modelo || "";
  const ubicacionUI = equipo?.ubicacion_name || equipo?.ubicacion || "—";
  const estadoUI    = equipo?.estado_name    || equipo?.estado || "—";

  async function confirmarCambio() {
    try {
      if (!equipo?.id_interno || !nuevoEstado) return;

      // Motivo obligatorio en estos estados
      if (["mantenimiento", "fuera_servicio", "baja"].includes(nuevoEstado) && !motivo.trim()) {
        Alert.alert("Motivo requerido", "Ingresa un motivo para este cambio.");
        return;
      }
      // Doble confirmación BAJA: coloca tu modal propio si lo necesitas

      setSaving(true);
      await equiposRepository.updateState({
        equipo_id: equipo.id_interno,
        new_state: nuevoEstado,
        motivo: motivo || "",
        usuario_id: user.id,
      });

      setEquipo((prev) => ({ ...prev, estado: nuevoEstado, estado_name: nuevoEstado }));
      setModalOpen(false); setMotivo("");
      Alert.alert("Estado actualizado", `Nuevo estado: ${nuevoEstado}`);
    } catch (e) {
      const msg = e?.message || "";
      const isNetwork = /Network|fetch|timeout|Sin conexión/i.test(msg);
      if (isNetwork) {
        // Encolar offline
        await enqueue({
          id: `equipos/update_state:${equipo.id_interno}:${Date.now()}`,
          endpoint: "equipos/update_state", // tu client normaliza route
          method: "POST",
          payload: { equipo_id: equipo.id_interno, new_state: nuevoEstado, motivo: motivo || "", usuario_id: user.id },
          type: "equipos.update_state",
          meta: { equipo_id: equipo.id_interno },
        });
        setEquipo((prev) => ({ ...prev, estado: nuevoEstado, estado_name: nuevoEstado }));
        setPendingSync(true);
        setModalOpen(false); setMotivo("");
        Alert.alert("Pendiente", "Se guardará al recuperar la conexión.");
      } else {
        Alert.alert("Error", msg || "No se pudo actualizar el estado");
      }
    } finally { setSaving(false); }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top","bottom","left","right"]}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.hint}>Cargando equipo…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !equipo) {
    return (
      <SafeAreaView style={styles.safe} edges={["top","bottom","left","right"]}>
        <View style={styles.center}>
          <Text style={styles.error}>⚠️ {error || "Equipo no encontrado"}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryTxt}>Reintentar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const puedeCambiar = can(user, "equip.update_state");
  const puedeEditar  = can(user, "equip.create"); // o define equip.edit y úsalo aquí

  return (
    <SafeAreaView style={styles.safe} edges={["top","bottom","left","right"]}>
      <ScrollView
        style={styles.wrap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.card}>
          <Text style={styles.title}>
            {equipo.id_interno || equipo.id || "—"} — {marcaUI} {modeloUI}{" "}
            {pendingSync && <Text style={styles.pending}>  ⟳ Pendiente de sincronizar</Text>}
          </Text>

          <View style={styles.row}>
            <Text style={styles.label}>Serial</Text>
            <Text style={styles.value}>{equipo.serial || "s/n"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Ubicación</Text>
            <Text style={styles.value}>{ubicacionUI}</Text>
          </View>

          <View style={[styles.row, { alignItems: "center" }]}>
            <Text style={styles.label}>Estado</Text>
            <View style={styles.rowRight}>
              <EstadoPill estado={estadoUI} />

              {puedeCambiar && (
                <Pressable
                  style={styles.changeBtn}
                  onPress={() => { setNuevoEstado(estadoActual || "disponible"); setModalOpen(true); }}
                >
                  <Text style={styles.changeTxt}>Cambiar</Text>
                </Pressable>
              )}

              {puedeEditar && (
                <Pressable
                  style={[styles.changeBtn, { backgroundColor: "#374151" }]}
                  onPress={() => nav.navigate(ROUTES.INVENTARIO_EDIT, { id: equipo.id_interno })}
                >
                  <Text style={styles.changeTxt}>Editar</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Datos</Text>
          <KV k="Marca" v={marcaUI} />
          <KV k="Modelo" v={modeloUI} />
          <KV k="ID interno" v={equipo.id_interno || "—"} />
          <KV k="Notas" v={equipo.notas || "—"} />
        </View>

        <Pressable
          style={[styles.primaryBtn, { marginTop: 8 }]}
          onPress={() => nav.navigate(ROUTES.INVENTARIO_LIST)}
        >
          <Text style={styles.primaryTxt}>Volver a la lista</Text>
        </Pressable>

        <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Cambiar estado</Text>
              <View style={{ gap: 8 }}>
                {ESTADOS.map((op) => {
                  const active = op === nuevoEstado;
                  return (
                    <Pressable key={op} style={[styles.option, active && styles.optionActive]} onPress={() => setNuevoEstado(op)}>
                      <EstadoPill estado={op} />
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.label, { marginTop: 12 }]}>
                Motivo {["mantenimiento","fuera_servicio","baja"].includes(nuevoEstado) ? "(obligatorio)" : "(opcional)"}
              </Text>
              <TextInput
                placeholder="Ej. chequeo preventivo, falla, etc."
                value={motivo}
                onChangeText={setMotivo}
                style={styles.input}
                multiline
              />

              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                  <Text style={styles.cancelTxt}>Cancelar</Text>
                </Pressable>
                <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={confirmarCambio} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveTxt}>Guardar</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

function KV({ k, v }) {
  return (
    <View style={styles.kv}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v}>{v}</Text>
    </View>
  );
}

function EstadoPill({ estado = "" }) {
  const e = String(estado).toLowerCase();
  const palette = {
    disponible:      { bg: "#E8FAF0", fg: "#0F9155" },
    en_uso:          { bg: "#E8F1FF", fg: "#1E40AF" },
    reservado:       { bg: "#F1F5F9", fg: "#475569" },
    mantenimiento:   { bg: "#FFF4E5", fg: "#B15C00" },
    "fuera_servicio":{ bg: "#FDECEC", fg: "#B42318" },
    baja:            { bg: "#EEE",    fg: "#6B7280" },
    default:         { bg: "#EEF2FF", fg: "#3730A3" },
  };
  const sty = palette[e] || palette.default;
  return (
    <View style={[styles.pill, { backgroundColor: sty.bg }]}>
      <Text style={[styles.pillTxt, { color: sty.fg }]} numberOfLines={1}>
        {estado || "—"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  wrap: { flex: 1, padding: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  hint: { opacity: 0.7 },
  error: { color: "#B42318", textAlign: "center" },
  retryBtn: { backgroundColor: "#111827", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  retryTxt: { color: "#fff", fontWeight: "600" },

  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#eee" },
  title: { fontWeight: "800", fontSize: 16, marginBottom: 8 },
  pending: { color: "#B15C00", fontSize: 12 },
  section: { fontWeight: "700", marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 13, color: "#6b7280" },
  value: { fontWeight: "600" },

  kv: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderColor: "#f3f4f6" },
  k: { color: "#6b7280" }, v: { fontWeight: "600", maxWidth: "65%", textAlign: "right" },

  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillTxt: { fontSize: 11, fontWeight: "600" },

  changeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#111827" },
  changeTxt: { color: "#fff", fontWeight: "700", fontSize: 12 },

  primaryBtn: { backgroundColor: "#111827", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  primaryTxt: { color: "#fff", fontWeight: "700" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 10 },
  option: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: "#eee" },
  optionActive: { borderColor: "#111827", backgroundColor: "#f9fafb" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 10, minHeight: 60, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: "#f3f4f6" },
  cancelTxt: { fontWeight: "700" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: "#111827" },
  saveTxt: { color: "#fff", fontWeight: "700" },
});
