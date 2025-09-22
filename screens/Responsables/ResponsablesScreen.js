// screens/Responsables/ResponsablesScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../theme/ThemeProvider';
import { ROUTES } from '../../navigation/routes';
import { useSession } from '../../app/store/session';
import { can } from '../../utils/permits';
import * as respRepo from '../../data/repositories/responsablesRepository';
import { catalogsRepository } from '../../data/repositories';

/* util: hex -> rgba con opacidad */
function alpha(hex = '#000000', a = 0.16) {
  const h = hex.replace('#','');
  const r = parseInt(h.length === 3 ? h[0]+h[0] : h.slice(0,2), 16);
  const g = parseInt(h.length === 3 ? h[1]+h[1] : h.slice(2,4), 16);
  const b = parseInt(h.length === 3 ? h[2]+h[2] : h.slice(4,6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ------------------------------ Item de la lista ------------------------------ */
function Item({ item, ui, onPress }) {
  const modelos = (item.modelos_asignados || '').split('|').filter(Boolean);
  const extra = modelos.length > 2 ? ` +${modelos.length - 2}` : '';
  const modelosText = (modelos.slice(0, 2).join(' · ') + extra) || '—';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? ui.cardHover : ui.card,
          borderColor: ui.cardBorder,
          borderWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: ui.text }]} numberOfLines={1}>
          {item.familia} • {item.usuario_nombre || item.usuario_id}
        </Text>
        <Text style={[styles.sub, { color: ui.textMuted }]} numberOfLines={1}>
          {modelosText}
        </Text>
        <Text style={[styles.meta, { color: ui.textMuted }]} numberOfLines={1}>
          SLA {item.kpi_objetivo_sla_horas ?? '—'}h · MTTR {item.kpi_objetivo_mttr_h ?? '—'}h · DISP{' '}
          {item.kpi_objetivo_disponibilidad_pct ?? '—'}%
        </Text>
      </View>
    </Pressable>
  );
}

/* --------------------------------- Screen --------------------------------- */
export default function ResponsablesScreen() {
  const nav = useNavigation();
  const theme = useAppTheme();
  const { colors, palette: p } = theme ?? {};

  // 🎨 Fallbacks suaves
  const ui = useMemo(
    () => ({
      bg: colors?.background ?? '#0b0b0b',
      text: colors?.text ?? '#ffffff',
      textMuted: p?.textMuted ?? '#9aa0a6',
      inputBg: p?.inputBg ?? colors?.surface ?? '#131313',
      inputBorder: p?.inputBorder ?? colors?.border ?? '#2a2a2a',
      card: p?.card ?? colors?.surface ?? '#141414',
      cardHover: p?.cardHover ?? '#1b1b1b',
      cardBorder: p?.cardBorder ?? colors?.border ?? '#242424',
      primary: colors?.primary ?? '#2563eb',
      primaryHover: p?.primaryHover ?? '#1d4ed8',
      onPrimary: p?.onPrimary ?? '#ffffff',
      accentBg: p?.accentBg ?? '#1f2937',
      border: colors?.border ?? '#2a2a2a',
      primarySoft: alpha(colors?.primary ?? '#2563eb', 0.16),
    }),
    [colors, p]
  );

  const session = useSession();
  const user = session?.user ?? { role: 'super_admin' };
  const allowCreate = can(user, 'resp.create');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [familia, setFamilia] = useState('');
  const [usuarioId, setUsuarioId] = useState('');

  const [catalogs, setCatalogs] = useState({ familias: [], usuarios_min: [] });
  const [fromCache, setFromCache] = useState(false);

  const loadCatalogs = useCallback(async () => {
    const c = await catalogsRepository.all();
    setCatalogs(c || {});
  }, []);

  const load = useCallback(
    async (opts = {}) => {
      const filters = {
        search,
        familia,
        usuario_id: usuarioId,
        page: opts.page ?? page,
        page_size: 50,
      };

      setLoading(!!opts.skeleton);

      try {
        const res = await respRepo.list(filters);
        const merge = (opts.append ? [...items, ...(res.items || [])] : res.items || []).map((it) => {
          const u = (catalogs.usuarios_min || []).find((x) => x.id === it.usuario_id);
          return { ...it, usuario_nombre: u?.nombre || null, usuario_rol: u?.rol || null };
        });

        setItems(merge);
        setTotal(res.total ?? merge.length);
        setPage(res.page ?? 1);
        setFromCache(!!res._fromCache);
      } catch (e) {
        Alert.alert('Responsables', e.message || 'No se pudo cargar.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, familia, usuarioId, page, items, catalogs]
  );

  useEffect(() => { loadCatalogs(); }, [loadCatalogs]);
  useEffect(() => { load({ page: 1, skeleton: true, append: false }); }, [search, familia, usuarioId]); // eslint-disable-line

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load({ page: 1, append: false });
  }, [load]);

  const onEndReached = useCallback(async () => {
    if (items.length >= total) return;
    await load({ page: page + 1, append: true });
  }, [items.length, total, page, load]);

  const header = useMemo(
    () => (
      <View style={{ padding: 12, gap: 8 }}>
        <Text style={{ color: ui.text, fontSize: 20, fontWeight: '800' }}>
          Responsables {fromCache ? '(cache)' : ''}
        </Text>

        <TextInput
          placeholder="Buscar (usuario/familia/modelo)"
          placeholderTextColor={ui.textMuted}
          value={search}
          onChangeText={setSearch}
          style={[
            styles.input,
            { backgroundColor: ui.inputBg, borderColor: ui.inputBorder, color: ui.text }
          ]}
        />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {/* Chip: Todas */}
          <Pressable
            onPress={() => setFamilia('')}
            style={[
              styles.chip,
              {
                borderColor: !familia ? ui.primary : ui.inputBorder,
                backgroundColor: !familia ? ui.primarySoft : 'transparent',
              },
            ]}
          >
            <Text style={{ color: !familia ? ui.primary : ui.text }}>Todas</Text>
          </Pressable>

          {(catalogs.familias || []).map((f) => {
            const active = f === familia;
            return (
              <Pressable
                key={f}
                onPress={() => setFamilia(active ? '' : f)}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? ui.primary : ui.inputBorder,
                    backgroundColor: active ? ui.primarySoft : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: active ? ui.primary : ui.text }}>{f}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={usuarioId}
            onChangeText={setUsuarioId}
            placeholder="Usuario (id exacto) — usa el picker en el Form"
            placeholderTextColor={ui.textMuted}
            style={[
              styles.input,
              { flex: 1, backgroundColor: ui.inputBg, borderColor: ui.inputBorder, color: ui.text }
            ]}
          />
        </View>
      </View>
    ),
    [ui, catalogs.familias, familia, usuarioId, search, fromCache]
  );

  const renderItem = ({ item }) => (
    <Item
      item={item}
      ui={ui}
      onPress={() => nav.navigate(ROUTES.RESPONSABLE_DETAIL, { item })}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ui.bg }}>
      {loading && !items.length ? (
        <View style={[styles.center, { backgroundColor: ui.bg }]}>
          <ActivityIndicator color={ui.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it, i) => `${it.usuario_id}|${it.familia}|${i}`}
          renderItem={renderItem}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: 100 }}
          onEndReachedThreshold={0.2}
          onEndReached={onEndReached}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={ui.text}
              colors={[ui.primary]}
              progressBackgroundColor={ui.bg}
            />
          }
        />
      )}

      {allowCreate && (
        <Pressable
          onPress={() => nav.navigate(ROUTES.RESPONSABLE_FORM, { mode: 'create' })}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: pressed ? ui.primaryHover : ui.primary }
          ]}
        >
          <Text style={[styles.fabText, { color: ui.onPrimary }]}>
            Nueva asignación
          </Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { padding: 12, borderRadius: 12, marginHorizontal: 12, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 14, marginTop: 2 },
  meta: { fontSize: 12, marginTop: 2 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
  },
  fabText: { fontWeight: '800' },
});
