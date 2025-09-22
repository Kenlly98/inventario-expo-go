// screens/Inventario/ListScreen.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { equiposRepository } from "../../data/repositories";
import { ROUTES } from "../../navigation/routes";

const ESTADOS = ["disponible", "en_uso", "reservado", "mantenimiento", "fuera_servicio", "baja"];

export default function InventarioList() {
  const nav = useNavigation();

  // datos y estado UI
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(30);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [error, setError] = useState(null);

  // filtros
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [fromCounts, setFromCounts] = useState({}); // contadores por estado

  // debounce de búsqueda / filtros
  const debounceRef = useRef(null);
  const filtrosHash = useMemo(() => JSON.stringify({ q, estado }), [q, estado]);

  // ─────────── helpers contadores
  const computeCountsClient = useCallback((arr) => {
    const acc = { disponible:0, en_uso:0, reservado:0, mantenimiento:0, fuera_servicio:0, baja:0 };
    for (const it of arr) {
      const e = String(it.estado_name || it.estado || "").toLowerCase();
      if (acc[e] !== undefined) acc[e] += 1;
    }
    return acc;
  }, []);

  const loadCounts = useCallback(async () => {
    if (typeof equiposRepository.counts === "function") {
      try {
        const c = await equiposRepository.counts();
        setFromCounts(c || {});
        return;
      } catch {
        // si falla, calculamos en cliente con lo cargado
      }
    }
    setFromCounts((prev) => ({ ...prev, ...computeCountsClient(items) }));
  }, [items, computeCountsClient]);

  // ─────────── load de página
  const loadPage = useCallback(async (pageToLoad = 1, opts = { append: false }) => {
    try {
      setLoading(true);
      setError(null);
      const res = await equiposRepository.list({ page: pageToLoad, page_size: pageSize /*, q, estado*/ });
      const data = Array.isArray(res.data) ? res.data : [];
      setItems((prev) => (opts.append ? [...prev, ...data] : data));
      setTotal(res.total ?? (opts.append ? items.length + data.length : data.length));
      setPage(pageToLoad);
    } catch (e) {
      setError(e?.message || "Error al cargar inventario");
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [pageSize, items.length]);

  // ─────────── refrescar lista completa (botón + pull-to-refresh)
  const refreshList = useCallback(async () => {
    setItems([]);
    setPage(1);
    setTotal(0);
    await loadPage(1, { append:false });
    await loadCounts();
  }, [loadPage, loadCounts]);

  // carga inicial
  useEffect(() => {
    loadPage(1, { append: false });
  }, [loadPage]);

  // recarga contadores cuando cambian items o si tienes endpoint de counts()
  useEffect(() => { loadCounts(); }, [loadCounts]);

  // recarga por filtros (debounce)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      // Si quieres server-side filters:
      // loadPage(1, { append:false });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [filtrosHash]);

  // filtrado en cliente (mientras tu API no filtre por q/estado)
  const filtered = useMemo(() => {
    let arr = items;
    if (q) {
      const needle = q.toLowerCase();
      arr = arr.filter((x) => {
        const brandModel = [x.marca_name || x.marca_original, x.modelo_name || x.modelo].filter(Boolean).join(" ");
        const s = [
          x.id_interno,
          x.serial,
          brandModel,
          x.ubicacion_name || x.ubicacion,
          x.estado_name || x.estado,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return s.includes(needle);
      });
    }
    if (estado) {
      arr = arr.filter((x) => String(x.estado_name || x.estado || "").toLowerCase() === estado);
    }
    return arr;
  }, [items, q, estado]);

  // paginación infinita
  const onEndReached = () => {
    if (loading) return;
    if (items.length < total) loadPage(page + 1, { append: true });
  };

  // escáner
  const onScan = () => {
    try {
      nav.navigate(ROUTES.SCANNER, {
        onResult: async (code) => Alert.alert("Escáner", `Leído: ${code}`),
      });
    } catch {
      Alert.alert("Escáner", "Conecta tu ScannerScreen a ROUTES.SCANNER.");
    }
  };

  // render de fila
  const renderItem = ({ item }) => {
    const titleLeft = item.id_interno || item.serial || "—";
    const brandModel = [item.marca_name || item.marca_original, item.modelo_name || item.modelo].filter(Boolean).join(" ");
    const ubic = item.ubicacion_name || item.ubicacion || "Sin ubicación";
    const est = item.estado_name || item.estado || "";

    return (
      <Pressable
        style={styles.item}
        onPress={() => nav.navigate(ROUTES.INVENTARIO_DETAIL, { id: item.id_interno || item.id || item.serial })}
      >
        <Text style={styles.title}>{titleLeft} {!!brandModel && "— "} {brandModel}</Text>
        <View style={styles.row}>
          <Text style={styles.sub}>{item.serial || "s/n"} · {ubic}</Text>
          {!!est && <EstadoPill estado={est} />}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.wrap}>
        {/* Header: búsqueda + escáner + actualizar */}
        <View style={styles.headerRow}>
          <TextInput
            placeholder="Buscar por ID, serial, marca, modelo o ubicación…"
            value={q}
            onChangeText={setQ}
            style={styles.search}
            autoCorrect={false}
          />
          <Pressable style={styles.scanBtn} onPress={onScan}>
            <Text style={styles.scanTxt}>Escanear</Text>
          </Pressable>
          <Pressable style={styles.refreshBtn} onPress={refreshList}>
            <Text style={styles.refreshTxt}>Actualizar</Text>
          </Pressable>
        </View>

        {/* Contadores por estado */}
        <View style={styles.countsRow}>
          {["disponible", "en_uso", "mantenimiento", "fuera_servicio", "baja"].map((key) => (
            <Pressable
              key={key}
              style={[styles.countChip, estado === key && styles.countChipActive]}
              onPress={() => setEstado(estado === key ? "" : key)}
            >
              <Text style={[styles.countTxt, estado === key && styles.countTxtActive]}>
                {labelEstado(key)} ({fromCounts[key] ?? 0})
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Lista */}
        {firstLoad && loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.hint}>Cargando inventario…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>⚠️ {error}</Text>
            <Pressable style={styles.retryBtn} onPress={refreshList}>
              <Text style={styles.retryTxt}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item, idx) => `eq:${item.id_interno || item.serial || item.id || idx}`}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={refreshList} />
            }
            renderItem={renderItem}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              items.length < total && (
                <View style={styles.footer}>
                  <ActivityIndicator />
                  <Text style={styles.hint}>{items.length}/{total}</Text>
                </View>
              )
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{q || estado ? "Sin resultados" : "Sin equipos"}</Text>
                <Text style={styles.emptySub}>
                  {q || estado ? "Prueba otro término de búsqueda o limpia filtros." : "Agrega equipos en tu hoja 'equipos'."}
                </Text>
              </View>
            }
            contentContainerStyle={filtered.length === 0 && styles.listPad}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* ─────────── UI helpers ─────────── */

function labelEstado(e) {
  return (
    {
      disponible: "Disponibles",
      en_uso: "En uso",
      reservado: "Reservado",
      mantenimiento: "Manten.",
      fuera_servicio: "Fuera",
      baja: "Baja",
    }[e] || e
  );
}

function EstadoPill({ estado = "" }) {
  const e = String(estado).toLowerCase();
  const palette = {
    disponible: { bg: "#E8FAF0", fg: "#0F9155" },
    en_uso: { bg: "#E8F1FF", fg: "#1E40AF" },
    reservado: { bg: "#F1F5F9", fg: "#475569" },
    mantenimiento: { bg: "#FFF4E5", fg: "#B15C00" },
    fuera_servicio: { bg: "#FDECEC", fg: "#B42318" },
    baja: { bg: "#EEE", fg: "#6B7280" },
    default: { bg: "#EEF2FF", fg: "#3730A3" },
  };
  const sty = palette[e] || palette.default;
  return (
    <View style={[styles.pill, { backgroundColor: sty.bg }]}>
      <Text style={[styles.pillTxt, { color: sty.fg }]} numberOfLines={1}>
        {estado}
      </Text>
    </View>
  );
}

/* ─────────── estilos ─────────── */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  wrap: { flex: 1, padding: 12 },

  headerRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  search: { flex: 1, backgroundColor: "#f3f4f6", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  scanBtn: { backgroundColor: "#111827", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  scanTxt: { color: "#fff", fontWeight: "700" },
  refreshBtn: { backgroundColor: "#2563EB", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  refreshTxt: { color: "#fff", fontWeight: "700" },

  countsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  countChip: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  countChipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  countTxt: { color: "#111827" },
  countTxtActive: { color: "#fff", fontWeight: "800" },

  item: { paddingVertical: 12, borderBottomWidth: 1, borderColor: "#eee", gap: 4 },
  title: { fontWeight: "700" },
  sub: { fontSize: 12, opacity: 0.7 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginLeft: 8 },
  pillTxt: { fontSize: 11, fontWeight: "600" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  hint: { opacity: 0.7 },
  error: { color: "#B42318", textAlign: "center" },
  retryBtn: { backgroundColor: "#111827", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  retryTxt: { color: "#fff", fontWeight: "600" },

  empty: { alignItems: "center", paddingTop: 40, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySub: { opacity: 0.7, textAlign: "center", paddingHorizontal: 24 },
  listPad: { flexGrow: 1 },

  footer: { alignItems: "center", paddingVertical: 12, gap: 6 },
});
