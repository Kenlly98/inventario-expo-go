// screens/Home/HomeScreen.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Pressable,
  Animated,
  Vibration,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { dashboardRepository } from '../../data/repositories';
import { saveDashboard, loadDashboard } from '../../utils/dashboardCache';
import useRole from '../../hooks/useRole';
import { useAppTheme, withOpacity } from '../../theme/ThemeProvider';
import FAB from '../../components/ui/FAB';
import Toast from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';

/* ------------------------- utils ------------------------- */
function toPeriod(date = new Date()) { return date.toISOString().slice(0, 7); }
function shiftMonth(periodYYYYMM, delta) {
  const [y, m] = periodYYYYMM.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return toPeriod(d);
}
function prettyDate(d = new Date()) {
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: '2-digit' });
}
function ratio(part, total) {
  const p = Number(part); const t = Number(total);
  if (!isFinite(p) || !isFinite(t) || t <= 0) return 0;
  return p / t;
}
async function postJSON(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json().catch(() => ({}));
  if (json?.ok === false) throw new Error(json.error || 'Error API');
  return json;
}

/* ---- Normalizador de payload (acepta formato nuevo y antiguo) ---- */
function normalizeDashboardPayload(raw) {
  if (!raw || typeof raw !== 'object') return null;

  // Formato nuevo (preferido): { kpis: {...}, deltas, series, proximos_eventos, alertas, meta }
  const hasNew = raw.kpis && typeof raw.kpis === 'object';

  const kpis = hasNew ? raw.kpis : {
    total_equipos:           raw.total_equipos,
    disponibles:             raw.disponibles,
    en_mantenimiento:        raw.en_mantenimiento,
    fuera_servicio:          raw.fuera_servicio,
    gasto_mant_mensual_usd:  raw.gasto_mant_mensual_usd,
  };

  // Valida que haya al menos algún número razonable
  const valid =
    kpis &&
    ['total_equipos','disponibles','en_mantenimiento','fuera_servicio']
      .some(k => Number.isFinite(Number(kpis?.[k])));

  if (!valid) return null;

  return {
    kpis,
    deltas: hasNew ? (raw.deltas || {}) : (raw.deltas || {}),
    series: hasNew ? (raw.series || {}) : (raw.series || {}),
    proximos_eventos: raw.proximos_eventos || raw.events || [],
    alertas: raw.alertas || {},
    meta: raw.meta || {},
  };
}

/* ------------------------- main ------------------------- */
export default function HomeScreen() {
  const role = useRole();
  const { colors, theme } = useAppTheme();

  // Estado dashboard (payload unificado)
  const [kpi, setKpi] = useState(null);            // { total_equipos, disponibles, ... }
  const [events, setEvents] = useState([]);        // proximos_eventos
  const [alerts, setAlerts] = useState({});        // alertas{...}
  const [meta, setMeta] = useState(null);          // { generated_at, source, version }
  const [source, setSource] = useState('fresh');   // 'fresh' | 'cache'

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [toast, setToast] = useState(null);
  const [period, setPeriod] = useState(toPeriod());
  const [lastUpdated, setLastUpdated] = useState(null);

  // Debug modal (tester)
  const [showDebug, setShowDebug] = useState(false);
  const [debugJson, setDebugJson] = useState(null);
  const [debugMeta, setDebugMeta] = useState(null); // { format: 'new'|'old'|'error', color, notes }

  // modal incidencia
  const [showIncModal, setShowIncModal] = useState(false);

  // animaciones
  const fade = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  const today = useMemo(() => prettyDate(new Date()), []);
  const periodDate = useMemo(() => new Date(period + '-01T00:00:00'), [period]);
  const periodLabel = useMemo(
    () => periodDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long' }),
    [periodDate]
  );

  const mapError = (codeOrMsg) => {
    const code = String(codeOrMsg || '').toUpperCase();
    if (code.includes('UNAUTHORIZED')) return 'No autorizado. Revisa la API Key.';
    if (code.includes('SHEETS')) return 'Error de datos (Sheets). Intenta más tarde.';
    if (code.includes('NETWORK') || code.includes('FAILED TO FETCH') || code.includes('TIMEOUT')) return 'Sin conexión — mostrando cache si existe.';
    if (code.includes('MISSING_PERIOD')) return 'Falta el periodo (YYYY-MM).';
    return 'Error interno. Intenta más tarde.';
  };

  /** load estable (con fallback cache) */
  const load = useCallback(async (p) => {
    try {
      setLoading(true);
      setErr(null);
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }).start();

      // 1) Intenta fresh
      const raw = await dashboardRepository.owners(p);
      const data = normalizeDashboardPayload(raw);
      if (!data) throw new Error('SHEETS_ERROR'); // fuerza fallback o mensaje estándar

      setKpi(data.kpis);
      setEvents(data.proximos_eventos);
      setAlerts(data.alertas);
      setMeta(data.meta);
      setSource('fresh');
      await saveDashboard(p, { ...data, period: p });

      setLastUpdated(new Date());
      Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (e) {
      // 2) Fallback cache
      const cache = await loadDashboard(p);
      if (cache?.kpi) { // cache guarda {kpis,deltas,series} dentro de kpi
        setKpi(cache.kpi.kpis || null);
        setEvents(cache.events || []);
        setAlerts(cache.alerts || {});
        setMeta(cache.meta || null);
        setSource('cache');
        setLastUpdated(new Date());
        Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      } else {
        setErr(mapError(e?.code || e?.message));
      }
    } finally {
      setLoading(false);
    }
  }, [fade]);

  // shimmer loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    ).start();
  }, [shimmer]);

  // cargar al montar y cuando cambie el periodo
  useEffect(() => { load(period); }, [period, load]);

  // animación botón refresco
  useEffect(() => {
    if (loading) {
      Animated.loop(Animated.timing(spin, { toValue: 1, duration: 800, useNativeDriver: true })).start();
    } else {
      spin.stopAnimation(); spin.setValue(0);
    }
  }, [loading, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  function onRefreshPress() { Vibration?.vibrate?.(10); load(period); }
  function prevMonth() { setPeriod((p) => shiftMonth(p, -1)); }
  function nextMonth() { setPeriod((p) => shiftMonth(p, +1)); }

  /* ----- FAB actions ----- */
  function onNewIncidencia() { setShowIncModal(true); }
  function onNewOT() { setToast({ message: 'Orden de trabajo creada ✔️', type: 'success' }); }
  function onNewEquipo() { setToast({ message: 'Equipo añadido ✔️', type: 'success' }); }

  /* ----- Header Tester: fetch directo al endpoint ----- */
  async function testEndpoint() {
    try {
      const base = process.env.EXPO_PUBLIC_API_BASE;
      const apiKey = process.env.EXPO_PUBLIC_API_KEY;
      if (!base || !apiKey) throw new Error('Faltan EXPO_PUBLIC_API_BASE / EXPO_PUBLIC_API_KEY');
      const url = `${base}?route=dashboard/owners&period=${encodeURIComponent(period)}&apiKey=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url);
      const txt = await res.text();

      let json = null;
      try { json = JSON.parse(txt); } catch { json = { raw: txt }; }

      // Detectar formato
      // new: { ok:true, data:{ kpis:{...} } }
      // old: { ok:true, total_equipos:... } o { kpis:{...} } a raíz
      let format = 'error';
      let notes = [];
      if (json && typeof json === 'object') {
        const inner = json.data && typeof json.data === 'object' ? json.data : json;
        if (inner && inner.kpis && typeof inner.kpis === 'object') {
          format = 'new';
          notes.push('Se detectó bloque kpis en data.kpis');
        } else if (
          Number.isFinite(Number(inner?.total_equipos)) ||
          Number.isFinite(Number(inner?.disponibles)) ||
          (inner?.kpis && typeof inner.kpis === 'object') // por si viene al root
        ) {
          format = 'old';
          notes.push('KPIs detectados en nivel raíz (o data sin envolver)');
        } else if (json?.error) {
          notes.push(`Error: ${json.error}`);
        } else {
          notes.push('No se detectaron KPIs');
        }
      }
      const color = format === 'new' ? '#16A34A' : (format === 'old' ? '#F59E0B' : '#DC2626');

      setDebugJson(json);
      setDebugMeta({ format, color, notes });
      setShowDebug(true);
    } catch (e) {
      setDebugJson({ error: String(e?.message || e) });
      setDebugMeta({ format: 'error', color: '#DC2626', notes: ['Excepción en fetch directo'] });
      setShowDebug(true);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(period)} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.h1, { color: colors.text }]}>
              Panel <Text style={{ opacity: 0.6 }}>( {role} )</Text>
            </Text>
            <Text style={{ color: colors.textMuted, marginTop: 2 }}>{today}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Origen */}
            <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: withOpacity(colors.primary, 0.12), borderWidth: 1, borderColor: withOpacity(colors.primary, 0.28) }}>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>Origen: {source}{source === 'cache' ? ' (cache)' : ''}</Text>
            </View>
            {/* Test */}
            <Pressable onPress={testEndpoint} style={[styles.refreshBtn, { borderColor: colors.border, width: undefined, paddingHorizontal: 12 }]}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>Test</Text>
            </Pressable>
            {/* Refresh */}
            <Pressable onPress={onRefreshPress} style={[styles.refreshBtn, { borderColor: colors.border }]}>
              <Animated.Text style={{ transform: [{ rotate }], color: colors.text, fontWeight: '800' }}>↻</Animated.Text>
            </Pressable>
          </View>
        </View>

        {/* Selector periodo */}
        <View style={[styles.periodBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <PeriodButton onPress={prevMonth} label="◀" />
          <Text style={{ color: colors.text, fontWeight: '700' }}>{periodLabel}</Text>
          <PeriodButton onPress={nextMonth} label="▶" />
        </View>

        {/* Estado error / generación */}
        <View style={{ marginTop: 6, marginBottom: 8 }}>
          {err ? (
            <Text style={{ color: colors.danger || '#DC2626' }}>⚠️ {String(err)} — toca “↻” para reintentar</Text>
          ) : meta?.generated_at ? (
            <Text style={{ color: colors.textMuted }}>Generado: {new Date(meta.generated_at).toLocaleString()}</Text>
          ) : lastUpdated ? (
            <Text style={{ color: colors.textMuted }}>Última actualización: {lastUpdated.toLocaleTimeString()}</Text>
          ) : null}
        </View>

        {/* KPIs */}
        <Animated.View style={{ opacity: loading ? 0.5 : 1 }}>
          {kpi ? (
            <View style={styles.grid}>
              <KpiCard label="Total equipos" value={kpi.total_equipos} colorKey="primary" wide progress={1} />
              <KpiCard label="Disponibles" value={kpi.disponibles} colorKey="success" progress={ratio(kpi.disponibles, kpi.total_equipos)} />
              <KpiCard label="En mantenimiento" value={kpi.en_mantenimiento} colorKey="warning" progress={ratio(kpi.en_mantenimiento, kpi.total_equipos)} />
              <KpiCard label="Fuera de servicio" value={kpi.fuera_servicio} colorKey="danger" progress={ratio(kpi.fuera_servicio, kpi.total_equipos)} />
              <KpiCard label="Gasto mant. mensual (USD)" value={kpi.gasto_mant_mensual_usd} colorKey="info" wide format="money" progress={null} />
            </View>
          ) : !loading ? (
            <EmptyState
              title="Aún no hay KPIs"
              subtitle="Refresca o ajusta el periodo para ver datos."
              action={
                <Pressable onPress={() => load(period)} style={{ marginTop: 12 }}>
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>Intentar de nuevo</Text>
                </Pressable>
              }
            />
          ) : (
            <View style={styles.skeletonWrap}>
              <SkeletonCard shimmer={shimmer} />
              <SkeletonCard shimmer={shimmer} />
              <SkeletonCard shimmer={shimmer} wide />
            </View>
          )}
        </Animated.View>

        {/* Próximos eventos (14 días) */}
        <View style={{ marginTop: 16 }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16, marginBottom: 8 }}>Próximos eventos (14 días)</Text>
          {(events || []).length === 0 ? (
            <Text style={{ color: colors.textMuted }}>No hay eventos próximos.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {events.map(ev => {
                const riesgo = (alerts?.checklists_incompletos || []).some(x => x.evento_id === ev.id);
                return (
                  <View key={ev.id} style={[styles.alertItem, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{ev.nombre}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{ev.fecha_inicio} · {ev.sede} · {ev.estado}</Text>
                    {riesgo && <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>Riesgo</Text>}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Alertas & pendientes */}
        <View style={{ marginTop: 16 }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16, marginBottom: 8 }}>Alertas & pendientes</Text>

          {/* Incidencias críticas */}
          {(alerts?.incidencias_criticas || []).slice(0, 5).map(a => (
            <View key={`inc_${a.id}`} style={[styles.alertItem, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.danger, fontWeight: '800' }}>Incidencia crítica — {a.equipo_id}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{a.fecha}</Text>
            </View>
          ))}

          {/* OTs pendientes */}
          {(alerts?.ots_pendientes || []).slice(0, 5).map(a => (
            <View key={`ot_${a.id}`} style={[styles.alertItem, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.warning, fontWeight: '800' }}>OT pendiente — {a.equipo_id}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{a.fecha} · $ {a.monto_usd}</Text>
            </View>
          ))}

          {/* Checklists incompletos */}
          {(alerts?.checklists_incompletos || []).slice(0, 5).map(a => (
            <View key={`chk_${a.evento_id}`} style={[styles.alertItem, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>Checklist incompleto — {a.evento_id}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Faltantes: {a.faltantes}</Text>
            </View>
          ))}

          {/* Docs faltantes */}
          {(alerts?.docs_faltantes || []).slice(0, 5).map(a => (
            <View key={`doc_${a.equipo_id}_${a.tipo}`} style={[styles.alertItem, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>Doc. faltante — {a.equipo_id}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{a.tipo}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* FAB */}
      <FAB
        visible={['admin', 'owner', 'super'].includes(String(role).toLowerCase())}
        actions={[
          { key: 'inc', label: 'Nueva incidencia', icon: '!', color: colors.warning, onPress: onNewIncidencia },
          { key: 'ot', label: 'Nueva OT', icon: '#', color: colors.info, onPress: onNewOT },
          { key: 'eq', label: 'Nuevo equipo', icon: '+', color: colors.success, onPress: onNewEquipo },
        ]}
      />

      {/* Modal Nueva Incidencia */}
      <NuevaIncidenciaModal
        visible={showIncModal}
        onClose={() => setShowIncModal(false)}
        onCreated={() => { setShowIncModal(false); setToast({ message: 'Incidencia creada ✔️', type: 'success' }); load(period); }}
      />

      {/* Debug Modal */}
      <DebugJsonModal
        visible={showDebug}
        json={debugJson}
        meta={debugMeta}
        onClose={()=>{ setShowDebug(false); setDebugJson(null); setDebugMeta(null); }}
      />

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </View>
  );
}

/* ------------------------- UI subcomp ------------------------- */

function PeriodButton({ label, onPress }) {
  const { colors, theme } = useAppTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: theme.radii.sm, backgroundColor: pressed ? withOpacity(colors.surface2, 0.8) : colors.surface2, borderWidth: 1, borderColor: colors.border, minWidth: 40, alignItems: 'center' }]}>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}
function KpiCard({ label, value, colorKey = 'primary', wide = false, format, progress }) {
  const { colors, theme } = useAppTheme();
  const accent = colors[colorKey] || colors.primary;
  const display = useMemo(() => {
    if (value == null) return '—';
    if (format === 'money') {
      try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value)); }
      catch { return `$ ${Number(value).toLocaleString()}`; }
    }
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  }, [value, format]);
  const p = typeof progress === 'number' ? Math.max(0, Math.min(1, progress)) : null;

  return (
    <View style={[styles.card, { width: wide ? '100%' : '48%', backgroundColor: colors.surface, borderColor: withOpacity(accent, 0.4), shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: theme.elevation.md, shadowOffset: { width: 0, height: 4 }, elevation: theme.elevation.md }]}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: colors.textMuted }}>{label}</Text>
        <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, marginTop: 6 }}>{display}</Text>
        {p != null && (
          <View style={{ height: 8, backgroundColor: withOpacity(accent, 0.16), borderRadius: theme.radii.xs, marginTop: theme.spacing.sm, overflow: 'hidden', borderWidth: 1, borderColor: withOpacity(accent, 0.28) }}>
            <View style={{ width: `${Math.round(p * 100)}%`, height: '100%', backgroundColor: accent }} />
          </View>
        )}
      </View>
    </View>
  );
}
function SkeletonCard({ wide = false, shimmer }) {
  const { colors, theme } = useAppTheme();
  const a = shimmer?.interpolate ? shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.16] }) : 0.1;
  return (
    <View style={[styles.card, { width: wide ? '100%' : '48%', backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.accent, { backgroundColor: colors.border }]} />
      <View style={{ flex: 1 }}>
        <Animated.View style={{ height: 10, width: '40%', backgroundColor: withOpacity(colors.text, a), borderRadius: 6 }} />
        <Animated.View style={{ height: 22, width: '65%', backgroundColor: withOpacity(colors.text, a), borderRadius: 6, marginTop: 8 }} />
        <Animated.View style={{ height: 8, width: '100%', backgroundColor: withOpacity(colors.text, a), borderRadius: 6, marginTop: 12 }} />
      </View>
    </View>
  );
}

/* --------------------- Modal Nueva Incidencia --------------------- */
function NuevaIncidenciaModal({ visible, onClose, onCreated }) {
  const { colors, theme } = useAppTheme();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    equipo_id: '',
    severidad: 'media',
    estado: 'abierta',
    responsable: '',
    costo_usd: '',
    notas: '',
    fecha: new Date().toISOString().slice(0, 10),
  });
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  async function submit() {
    if (!form.titulo.trim()) return alert('Ingresa un título');
    setSaving(true);
    try {
      const base = process.env.EXPO_PUBLIC_API_BASE;
      const apiKey = process.env.EXPO_PUBLIC_API_KEY;
      if (!base || !apiKey) throw new Error('Faltan variables EXPO_PUBLIC_API_BASE/API_KEY');

      const url = `${base}?route=incidencias/create&apiKey=${apiKey}`;
      const payload = {
        titulo: form.titulo.trim(),
        equipo_id: form.equipo_id.trim() || null,
        severidad: form.severidad,
        estado: form.estado,
        responsable: form.responsable.trim() || null,
        costo_usd: form.costo_usd ? Number(form.costo_usd) : null,
        notas: form.notas.trim() || null,
        fecha: form.fecha,
      };

      await postJSON(url, payload);
      onCreated?.();
      setForm((s) => ({ ...s, titulo: '', equipo_id: '', notas: '' }));
    } catch (e) {
      alert(`No se pudo crear: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: theme.spacing.lg, borderTopWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 8 }}>Nueva incidencia</Text>

          <Field label="Título" value={form.titulo} onChangeText={(v) => set('titulo', v)} autoFocus />

          <Row>
            <Field style={{ flex: 1 }} label="Equipo ID" value={form.equipo_id} onChangeText={(v) => set('equipo_id', v)} placeholder="Opcional" />
            <Field style={{ flex: 1 }} label="Fecha" value={form.fecha} onChangeText={(v) => set('fecha', v)} placeholder="YYYY-MM-DD" />
          </Row>

          <Row>
            <Select style={{ flex: 1 }} label="Severidad" value={form.severidad}
              options={[{ label: 'Baja', value: 'baja' }, { label: 'Media', value: 'media' }, { label: 'Alta', value: 'alta' }]}
              onChange={(v) => set('severidad', v)}
            />
            <Select style={{ flex: 1 }} label="Estado" value={form.estado}
              options={[{ label: 'Abierta', value: 'abierta' }, { label: 'En proceso', value: 'en_proceso' }, { label: 'Cerrada', value: 'cerrada' }]}
              onChange={(v) => set('estado', v)}
            />
          </Row>

          <Row>
            <Field style={{ flex: 1 }} label="Responsable" value={form.responsable} onChangeText={(v) => set('responsable', v)} placeholder="Opcional" />
            <Field style={{ flex: 1 }} label="Costo (USD)" value={String(form.costo_usd)} onChangeText={(v) => set('costo_usd', v.replace(/[^0-9.]/g, ''))} placeholder="0" keyboardType="numeric" />
          </Row>

          <Field label="Notas" value={form.notas} onChangeText={(v) => set('notas', v)} placeholder="Detalles adicionales…" multiline />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: theme.spacing.md }}>
            <Pressable onPress={onClose} style={({ pressed }) => [{ flex: 1, paddingVertical: 12, borderRadius: theme.radii.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: pressed ? withOpacity(colors.surface2, 0.8) : colors.surface2 }]}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
            </Pressable>
            <Pressable disabled={saving} onPress={submit} style={({ pressed }) => [{ flex: 1, paddingVertical: 12, borderRadius: theme.radii.md, alignItems: 'center', backgroundColor: pressed ? withOpacity(colors.primary, 0.9) : colors.primary }]}>
              <Text style={{ color: colors.primaryContrast, fontWeight: '800' }}>{saving ? 'Guardando…' : 'Crear'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ----- Inputs básicos temáticos ----- */
function Row({ children }) { return <View style={{ flexDirection: 'row', gap: 10 }}>{children}</View>; }
function Field({ label, style, multiline, ...props }) {
  const { colors, theme } = useAppTheme();
  return (
    <View style={[{ marginTop: theme.spacing.sm, flex: 1 }, style]}>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={withOpacity(colors.text, 0.35)}
        style={{
          backgroundColor: colors.surface2,
          borderWidth: 1,
          borderColor: colors.border,
          color: colors.text,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 10 : 8,
          borderRadius: theme.radii.md,
          minHeight: multiline ? 84 : undefined,
        }}
      />
    </View>
  );
}
function Select({ label, value, options, onChange, style }) {
  const { colors, theme } = useAppTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label || 'Selecciona…';
  return (
    <View style={[{ marginTop: theme.spacing.sm, flex: 1 }, style]}>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>{label}</Text>
      <Pressable onPress={() => setOpen((s) => !s)} style={({ pressed }) => [{ backgroundColor: pressed ? withOpacity(colors.surface2, 0.85) : colors.surface2, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, borderRadius: theme.radii.md }]}>
        <Text style={{ color: colors.text, fontWeight: '600' }}>{current}</Text>
      </Pressable>
      {open && (
        <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: theme.radii.md, marginTop: 6, overflow: 'hidden' }}>
          {options.map((o) => (
            <Pressable key={o.value} onPress={() => { onChange?.(o.value); setOpen(false); }} style={({ pressed }) => [{ paddingVertical: 10, paddingHorizontal: 12, backgroundColor: pressed ? withOpacity(colors.primary, 0.08) : colors.surface }]}>
              <Text style={{ color: colors.text, fontWeight: o.value === value ? '800' : '500' }}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/* --------------------- Debug JSON Modal --------------------- */
function DebugJsonModal({ visible, json, meta, onClose }) {
  const { colors } = useAppTheme();
  const fmt = meta?.format || 'error';
  const chipBg = withOpacity(meta?.color || '#DC2626', 0.12);
  const chipBorder = withOpacity(meta?.color || '#DC2626', 0.35);
  const label =
    fmt === 'new' ? 'Formato nuevo (data.kpis)'
    : fmt === 'old' ? 'Formato antiguo (KPIs en raíz)'
    : 'Sin datos / Error';

  const notes = (meta?.notes || []).join(' · ');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex:1, backgroundColor: withOpacity('#000',0.5), justifyContent:'flex-end' }}>
        <View style={{ maxHeight: '75%', backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12, borderTopWidth:1, borderColor: colors.border }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <Text style={{ color: colors.text, fontWeight:'800', fontSize:16 }}>Respuesta cruda</Text>
            <Pressable onPress={onClose} style={({pressed})=>[{ padding:8, borderRadius:8, backgroundColor: pressed? withOpacity(colors.surface2,0.8): colors.surface2, borderWidth:1, borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontWeight:'800' }}>Cerrar</Text>
            </Pressable>
          </View>

          {/* Chip estado formato */}
          <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginBottom:8 }}>
            <View style={{ paddingVertical:6, paddingHorizontal:10, borderRadius:999, backgroundColor: chipBg, borderWidth:1, borderColor: chipBorder }}>
              <Text style={{ color: meta?.color || '#DC2626', fontWeight:'800', fontSize:12 }}>{label}</Text>
            </View>
            {!!notes && <Text style={{ color: colors.textMuted, fontSize:12 }}>{notes}</Text>}
          </View>

          <ScrollView style={{ borderWidth:1, borderColor: colors.border, borderRadius: 10, padding: 10 }}>
            <Text selectable style={{ color: colors.text, fontFamily: Platform.select({ ios:'Menlo', android:'monospace', default:'monospace' }), fontSize:12 }}>
              {JSON.stringify(json, null, 2)}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------- styles ------------------------- */
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  h1: { fontSize: 24, fontWeight: '900', letterSpacing: 0.2 },
  periodBar: {
    marginTop: 6, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 16, borderWidth: 1, flexDirection: 'row',
    alignItems: 'center', gap: 10, justifyContent: 'space-between',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  skeletonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  card: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  accent: { width: 6, borderRadius: 8, alignSelf: 'stretch' },
  refreshBtn: { height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  alertItem: { padding: 12, borderRadius: 12, borderWidth: 1 },
});
