// screens/OrdenesTrabajo/OTDetail.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';

import { useAppTheme } from '../../theme/ThemeProvider';
import { otsRepository } from '../../data/repositories/otsRepository';
import { useCatalog } from '../../hooks/useCatalogs';

/* -------------------------------- UI helpers -------------------------------- */
function Row({ label, value, palette }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: palette.text }]}>{value || '—'}</Text>
    </View>
  );
}

function Chip({ text, palette, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, { borderColor: palette.inputBorder }]}>
      <Text style={[styles.chipText, { color: palette.textMuted }]}>{text}</Text>
    </Pressable>
  );
}

function ListModal({ visible, title, items, onPick, onClose, palette }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () => (items || []).filter((x) => String(x).toLowerCase().includes(q.toLowerCase())),
    [items, q]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: palette.bg,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 12,
            maxHeight: '80%',
          }}
        >
          <Text style={{ color: palette.text, fontWeight: '800', fontSize: 16, marginBottom: 8 }}>
            {title}
          </Text>
          <TextInput
            placeholder="Buscar…"
            placeholderTextColor={palette.textMuted}
            value={q}
            onChangeText={setQ}
            style={[
              styles.input,
              {
                backgroundColor: palette.inputBg,
                color: palette.text,
                borderColor: palette.inputBorder,
                marginBottom: 8,
              },
            ]}
          />
          <FlatList
            data={filtered}
            keyExtractor={(it, i) => String(it || i)}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onPick(String(item));
                  onClose();
                }}
                style={{ paddingVertical: 10 }}
              >
                <Text style={{ color: palette.text }}>{String(item)}</Text>
              </Pressable>
            )}
          />
          <Pressable onPress={onClose} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
            <Text style={{ color: palette.primary, fontWeight: '700' }}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* --------------------------------- Screen ---------------------------------- */
export default function OTDetail() {
  const nav = useNavigation();
  const route = useRoute();
  const themeCtx = useAppTheme?.();

  // paleta segura (fallbacks) para evitar crashes si el provider aún no montó
  const palette = useMemo(() => {
    const p = themeCtx?.palette || themeCtx || {};
    const d = {
      bg: '#0B0B0B',
      cardBg: '#121212',
      cardBorder: '#242424',
      inputBg: '#141414',
      inputBorder: '#2A2A2A',
      text: '#FFFFFF',
      textMuted: '#9CA3AF',
      primary: '#4F46E5',
      warning: '#F59E0B',
      danger: '#EF4444',
    };
    return { ...d, ...p };
  }, [themeCtx]);

  const id = route.params?.id || route.params?.initial?.id || null;
  const initial = route.params?.initial || null;

  const [ot, setOt] = useState(initial || null);
  const [hist, setHist] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cerrar OT
  const [closing, setClosing] = useState(false);
  const [showCausa, setShowCausa] = useState(false);
  const [showCausaList, setShowCausaList] = useState(false);
  const [closeForm, setCloseForm] = useState({ notas_cierre: '', causa: '' });

  const { items: causas, offline: offCausa } = useCatalog('causas_falla');

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const got = id ? await otsRepository.get(id) : { ok: true, data: initial };
      setOt(got?.data || initial || null);

      if (id) {
        const h = await otsRepository.history(id);
        setHist(Array.isArray(h?.data) ? h.data : []);
      } else {
        setHist([]);
      }
    } catch (e) {
      Alert.alert('OT', e?.message || 'No se pudo cargar el detalle');
    } finally {
      setLoading(false);
    }
  }, [id, initial]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function onCloseOT() {
    try {
      if (!id && !ot?.id) throw new Error('OT sin id');
      if (!closeForm.notas_cierre.trim()) throw new Error('Notas de cierre obligatorias');
      setClosing(true);
      const res = await otsRepository.close(id || ot.id, closeForm);
      if (res?.queued) Alert.alert('OT', 'Cierre encolado (offline). Se enviará al reconectar.');
      setCloseForm({ notas_cierre: '', causa: '' });
      setShowCausa(false);
      await loadAll();
    } catch (e) {
      const msg =
        /UNAUTHORIZED/.test(e?.code || '') ? 'No autorizado. Revisa tu configuración.' :
        /SHEETS_ERROR/.test(e?.code || '') ? 'Error en datos (Sheets).' :
        /NETWORK/.test(e?.code || '') ? 'Sin conexión — usando cache.' :
        e?.message || 'No se pudo cerrar la OT';
      Alert.alert('Cerrar OT', msg);
    } finally {
      setClosing(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: palette.bg, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!ot) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: palette.bg, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Text style={{ color: palette.textMuted }}>No se encontró la OT.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <View style={[styles.header, { borderColor: palette.cardBorder }]}>
        <Text style={[styles.h1, { color: palette.text }]}>OT #{ot.id || '—'}</Text>
        <Text style={{ color: palette.textMuted }}>{ot.titulo || '—'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Resumen */}
        <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>Resumen</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <Chip text={ot.estado || 'abierta'} palette={palette} />
            {!!ot.responsable && <Chip text={ot.responsable} palette={palette} />}
            {!!ot.proveedor && <Chip text={ot.proveedor} palette={palette} />}
          </View>
          <Row label="Equipo" value={ot.equipo_id} palette={palette} />
          <Row label="Fecha programada" value={ot.fecha_programada} palette={palette} />
          <Row label="Notas" value={ot.notas} palette={palette} />
          <Text style={[styles.sub, { color: palette.textMuted, marginTop: 8 }]}>Repuestos</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
            {(ot.repuestos || []).length ? (
              (ot.repuestos || []).map((r) => (
                <View key={String(r)} style={[styles.chip, { borderColor: palette.inputBorder }]}>
                  <Text style={[styles.chipText, { color: palette.textMuted }]}>{String(r)}</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: palette.textMuted }}>—</Text>
            )}
          </View>
        </View>

        {/* Historial */}
        <View style={[styles.card, { backgroundColor: palette.cardBg, borderColor: palette.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: palette.text }]}>Historial</Text>
          {!hist?.length && <Text style={{ color: palette.textMuted }}>Sin eventos</Text>}
          {hist.map((h, i) => (
            <View key={i} style={[styles.timelineItem, { borderColor: palette.cardBorder }]}>
              <Text style={{ color: palette.text, fontWeight: '700' }}>{h.action || 'evento'}</Text>
              <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                {h.at ? new Date(h.at).toLocaleString() : '—'} {h.by ? `— ${h.by}` : ''}
              </Text>
              {h.meta && (
                <Text style={{ color: palette.textMuted, marginTop: 4 }}>
                  {typeof h.meta === 'string' ? h.meta : JSON.stringify(h.meta)}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Acciones */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={() => nav.navigate('OTForm', { mode: 'edit', initial: ot })}
            style={[styles.btn, { borderColor: palette.primary }]}
          >
            <Text style={{ color: palette.primary, fontWeight: '800' }}>Editar</Text>
          </Pressable>

          <Pressable onPress={() => setShowCausa(true)} style={[styles.btn, { borderColor: palette.danger }]}>
            <Text style={{ color: palette.danger, fontWeight: '800' }}>Cerrar OT</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Modal de cierre */}
      <Modal visible={showCausa} transparent animationType="slide" onRequestClose={() => setShowCausa(false)}>
        <View style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: palette.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12 }}>
            <Text style={{ color: palette.text, fontWeight: '800', fontSize: 16, marginBottom: 8 }}>
              Cerrar OT {offCausa ? '(cache)' : ''}
            </Text>

            <Text style={[styles.label, { color: palette.textMuted }]}>Causa</Text>
            <Pressable
              onPress={() => setShowCausaList(true)}
              style={[
                styles.input,
                { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, justifyContent: 'center' },
              ]}
            >
              <Text style={{ color: closeForm.causa ? palette.text : palette.textMuted }}>
                {closeForm.causa || 'Seleccionar…'}
              </Text>
            </Pressable>

            <Text style={[styles.label, { color: palette.textMuted, marginTop: 8 }]}>Notas de cierre *</Text>
            <TextInput
              value={closeForm.notas_cierre}
              onChangeText={(v) => setCloseForm((f) => ({ ...f, notas_cierre: v }))}
              placeholder="¿Qué se hizo? Recomendaciones, pendientes, etc."
              placeholderTextColor={palette.textMuted}
              multiline
              style={[
                styles.input,
                { minHeight: 80, backgroundColor: palette.inputBg, color: palette.text, borderColor: palette.inputBorder },
              ]}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <Pressable onPress={() => !closing && onCloseOT()} style={[styles.btn, { borderColor: palette.primary }]}>
                {closing ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={{ color: palette.primary, fontWeight: '800' }}>Confirmar cierre</Text>
                )}
              </Pressable>
              <Pressable onPress={() => setShowCausa(false)} style={[styles.btn, { borderColor: palette.inputBorder }]}>
                <Text style={{ color: palette.text }}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Selector de causa */}
      <ListModal
        visible={showCausaList}
        title="Selecciona causa"
        items={causas}
        onPick={(c) => setCloseForm((f) => ({ ...f, causa: c }))}
        onClose={() => setShowCausaList(false)}
        palette={palette}
      />
    </SafeAreaView>
  );
}

/* --------------------------------- styles ---------------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12, borderBottomWidth: 1 },
  h1: { fontSize: 18, fontWeight: '800' },
  body: { padding: 12, gap: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowLabel: { fontSize: 13, fontWeight: '600' },
  rowValue: { fontSize: 14 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
  chipText: { fontSize: 12, fontWeight: '700' },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  label: { fontSize: 13, fontWeight: '600' },
  btn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start' },
  timelineItem: { borderLeftWidth: 2, paddingLeft: 10, marginVertical: 6 },
});
