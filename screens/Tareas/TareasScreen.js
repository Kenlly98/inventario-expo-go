/* eslint-disable react-native/no-unused-styles */
// screens/Tareas/TareasScreen.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useSession } from '../../app/store/session';
import { can } from '../../utils/permits';
import Toast from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import FAB from '../../components/ui/FAB';
import { tareasRepository } from '../../data/repositories/tareasRepository';
import { useDebounce } from '../../utils/useDebounce';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from '../../navigation/routes';

const ESTADOS = ['pendiente','en_proceso','completada','cancelada'];
const PRIORIDADES = ['baja','media','alta','critica'];

/* util: hex -> rgba con opacidad */
function alpha(hex = '#000000', a = 0.16) {
  const h = hex.replace('#','');
  const r = parseInt(h.length === 3 ? h[0]+h[0] : h.slice(0,2), 16);
  const g = parseInt(h.length === 3 ? h[1]+h[1] : h.slice(2,4), 16);
  const b = parseInt(h.length === 3 ? h[2]+h[2] : h.slice(4,6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ✅ Estilos estáticos (sin colores)
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12, gap: 10 },
  h1Row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { fontSize: 20, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  item: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 6 },
  title: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, marginRight: 6 },
  btn: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  btnText: { fontWeight: '700' },
  headerBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  footer: { height: 80 },
});

export default function TareasScreen() {
  const nav = useNavigation();
  const theme = useAppTheme();
  const { colors, palette: p } = theme ?? {};

  // 🎨 Paleta UI del tema con fallbacks suaves
  const ui = useMemo(() => ({
    bg: colors?.background ?? '#0B0B0B',
    text: colors?.text ?? '#FFFFFF',
    textMuted: p?.textMuted ?? '#9AA0A6',
    surface: colors?.surface ?? '#131313',
    border: colors?.border ?? '#22252B',
    inputBg: p?.inputBg ?? colors?.surface ?? '#111317',
    inputBorder: p?.inputBorder ?? colors?.border ?? '#22252B',
    divider: colors?.border ?? '#22252B',
    buttonBg: colors?.surface ?? '#1E2026',
    buttonBorder: colors?.border ?? '#2C2F36',
    buttonText: colors?.text ?? '#FFFFFF',
    primary: colors?.primary ?? '#2EE88A',
    onPrimary: p?.onPrimary ?? '#0A0A0A',
    primarySoft: alpha(colors?.primary ?? '#2EE88A', 0.16),
  }), [colors, p]);

  const session = useSession();
  const user = session?.user || { id: 'anon', role: 'tecnico' };

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // filtros
  const [estado, setEstado] = useState('');
  const [prioridad, setPrioridad] = useState('');
  const [responsableId, setResponsableId] = useState('');
  const [equipoId, setEquipoId] = useState('');
  const [eventoId, setEventoId] = useState('');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);

  const [fromCache, setFromCache] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const canCreate = can(user, 'task.create');

  const themed = {
    screen: { backgroundColor: ui.bg },
    text: { color: ui.text },
    textMuted: { color: ui.textMuted },
    input: { backgroundColor: ui.inputBg, color: ui.text, borderColor: ui.inputBorder },
    divider: { borderColor: ui.divider },
    button: { backgroundColor: ui.buttonBg, borderColor: ui.buttonBorder },
    buttonText: { color: ui.buttonText },
    chip: { borderColor: ui.inputBorder },
    chipActive: { backgroundColor: ui.primarySoft, borderColor: ui.primary },
    chipText: { color: ui.text },
    chipTextActive: { color: ui.primary, fontWeight: '700' },
    badge: { borderColor: ui.inputBorder },
    title: { color: ui.text },
    sub: { color: ui.textMuted },
  };

  const load = useCallback(async (pnum = 1) => {
    try {
      setLoading(true);
      const res = await tareasRepository.list({
        estado, prioridad,
        responsable_id: responsableId || '',
        equipo_id: equipoId || '',
        evento_id: eventoId || '',
        search: debounced || '',
        page: pnum, page_size: 50,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
      setPage(res.page || 1);
      setFromCache(!!res._fromCache);
      setLastSync(res._lastSync || null);
    } catch (e) {
      Toast.show(e.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [estado, prioridad, responsableId, equipoId, eventoId, debounced]);

  useEffect(() => { load(1); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(1);
    setRefreshing(false);
  }, [load]);

  // 👉 Usar ROUTES.* y pasar preset desde filtros
  const openCreate = useCallback(() => {
    nav.navigate(ROUTES.TAREA_FORM, {
      mode: 'create',
      preset: {
        asignado_a_usuario: responsableId || '',
        equipo_id: equipoId || '',
        evento_id: eventoId || '',
      },
    });
  }, [nav, responsableId, equipoId, eventoId]);

  const openDetail = useCallback((item) => {
    nav.navigate(ROUTES.TAREA_DETAIL, { id: item.id, item });
  }, [nav]);

  const Chip = ({ label, active, onPress }) => (
    <Pressable
      onPress={onPress}
      style={[styles.chip, themed.chip, active && themed.chipActive]}
    >
      <Text style={[themed.chipText, active && themed.chipTextActive]}>{label}</Text>
    </Pressable>
  );

  const renderItem = ({ item }) => {
    const p = item.prioridad || 'media';
    const e = item.estado || 'pendiente';
    return (
      <Pressable
        onPress={() => openDetail(item)}
        style={[styles.item, themed.divider, { borderBottomColor: themed.divider.borderColor }]}
      >
        <Text style={[styles.title, themed.title]}>{item.titulo}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.badge, themed.badge]}><Text style={[styles.sub, themed.sub]}>prio: {p}</Text></View>
          <View style={[styles.badge, themed.badge]}><Text style={[styles.sub, themed.sub]}>estado: {e}</Text></View>
          {item.equipo_id ? <View style={[styles.badge, themed.badge]}><Text style={[styles.sub, themed.sub]}>equipo</Text></View> : null}
          {item.evento_id ? <View style={[styles.badge, themed.badge]}><Text style={[styles.sub, themed.sub]}>evento</Text></View> : null}
        </View>
        <Text style={[styles.sub, themed.sub]}>
          {item.asignado_a_usuario || '—'} · vence {item.fecha_limite || '—'}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, themed.screen]}>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.h1Row}>
              <Text style={[styles.h1, themed.text]}>Tareas</Text>

              {/* 👉 Botón “Nueva tarea” en el header */}
              <Pressable
                onPress={openCreate}
                style={[styles.headerBtn, { borderColor: ui.primary, backgroundColor: ui.primarySoft }]}
              >
                <Text style={{ color: ui.primary, fontWeight: '800' }}>Nueva tarea</Text>
              </Pressable>
            </View>

            {fromCache ? (
              <Text style={[styles.sub, themed.sub]}>
                Mostrando cache • Última sync: {lastSync ? new Date(lastSync).toLocaleString() : '—'}
              </Text>
            ) : null}

            <TextInput
              placeholder="Buscar…"
              placeholderTextColor={ui.textMuted}
              value={search}
              onChangeText={setSearch}
              style={[styles.input, themed.input]}
            />

            <View style={styles.chipRow}>
              <Chip label="Todos" active={!estado} onPress={() => setEstado('')} />
              {ESTADOS.map(st => (
                <Chip key={st} label={st} active={estado === st} onPress={() => setEstado(estado === st ? '' : st)} />
              ))}
            </View>

            <View style={styles.chipRow}>
              <Chip label="prio: todas" active={!prioridad} onPress={() => setPrioridad('')} />
              {PRIORIDADES.map(pr => (
                <Chip key={pr} label={pr} active={prioridad === pr} onPress={() => setPrioridad(prioridad === pr ? '' : pr)} />
              ))}
            </View>

            <View style={styles.row}>
              <TextInput
                value={responsableId}
                onChangeText={setResponsableId}
                style={[styles.input, themed.input]}
                placeholder="Responsable (usr_*)"
                placeholderTextColor={ui.textMuted}
              />
              <TextInput
                value={equipoId}
                onChangeText={setEquipoId}
                style={[styles.input, themed.input]}
                placeholder="Equipo (EQ-*)"
                placeholderTextColor={ui.textMuted}
              />
            </View>
            <View style={styles.row}>
              <TextInput
                value={eventoId}
                onChangeText={setEventoId}
                style={[styles.input, themed.input]}
                placeholder="Evento (evt_*)"
                placeholderTextColor={ui.textMuted}
              />
              <Pressable onPress={onRefresh} style={[styles.btn, themed.button]}>
                <Text style={[styles.btnText, themed.buttonText]}>Actualizar</Text>
              </Pressable>
            </View>
          </View>
        }
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        ListEmptyComponent={!loading ? <EmptyState title="Sin tareas" subtitle="Crea la primera tarea" /> : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ui.text}
            colors={[ui.primary]}
            progressBackgroundColor={ui.bg}
          />
        }
        ListFooterComponent={<View style={styles.footer} />}
      />

      {loading ? <ActivityIndicator color={ui.primary} style={{ position: 'absolute', top: 10, right: 10 }} /> : null}

      {/* FAB sigue disponible */}
      {canCreate && (
        <FAB label="Nueva tarea" onPress={openCreate} />
      )}
    </SafeAreaView>
  );
}
