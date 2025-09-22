// screens/Documentos/DocumentosScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { documentosRepository } from '../../data/repositories/documentosRepository';
import { can } from '../../utils/permits';
import DocumentoFormModal from './DocumentoFormModal';
import DocumentoDetailModal from './DocumentoDetailModal';
import { useAppTheme } from '../../theme/ThemeProvider';

const PAGE_SIZE = 50;
const TIPOS = ['factura', 'guia', 'contrato', 'garantia'];

export default function DocumentosScreen({ user }) {
  const { colors } = useAppTheme();

  const [q, setQ] = useState('');
  const [tipoFilters, setTipoFilters] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [equipoId, setEquipoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, page: 1 });
  const [offlineBadge, setOfflineBadge] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);

  const isAdminCreate = can(user, 'doc.create');

  const params = useMemo(
    () => ({
      search: q,
      tipo: tipoFilters.join(','),
      from,
      to,
      equipo_id: equipoId,
      page,
      page_size: PAGE_SIZE,
    }),
    [q, tipoFilters, from, to, equipoId, page]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setOfflineBadge(false);
    try {
      const res = await documentosRepository.list(params);
      setData(res);
      if (res._fromCache) setOfflineBadge(true);
    } catch {
      setData((d) => ({ ...d, items: params.page === 1 ? [] : d.items }));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [q, tipoFilters, from, to, equipoId]);

  function toggleTipo(t) {
    setTipoFilters((curr) =>
      curr.includes(t) ? curr.filter((x) => x !== t) : [...curr, t]
    );
  }

  function renderItem({ item }) {
    const isDrive = String(item.archivo_url || '').includes('drive.google.com');
    return (
      <Pressable
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={() => {
          setSelected(item);
          setShowDetail(true);
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[styles.title, { color: colors.text }]}>
            {item.tipo || '-'}
          </Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: colors.card || colors.surface,
                borderColor: colors.border,
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: colors.text }]}>
              {item.equipo_id}
            </Text>
          </View>
        </View>
        <Text style={[styles.sub, { color: colors.text, opacity: 0.8 }]}>
          {[
            item.proveedor,
            item.fecha,
            item.monto_usd != null ? `$ ${item.monto_usd}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {isDrive ? (
          <Text style={[styles.drive, { color: colors.text, opacity: 0.6 }]}>
            drive.google.com
          </Text>
        ) : null}
      </Pressable>
    );
  }

  const emptyState = !loading && data.items.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={styles.wrap}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.h1, { color: colors.text }]}>
          Documentos{' '}
          {offlineBadge ? (
            <Text style={{ fontSize: 12, color: '#ef4444' }}>(cache)</Text>
          ) : null}
        </Text>
        <Text style={[styles.p, { color: colors.text, opacity: 0.8 }]}>
          Lista, filtros y alta rápida por URL de Drive.
        </Text>

        {/* Filtros */}
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Proveedor, tipo o notas…"
          placeholderTextColor={colors.text + '80'}
          style={[
            styles.input,
            {
              borderColor: colors.primary,
              backgroundColor: colors.card || colors.surface,
              color: colors.text,
            },
          ]}
        />
        <View style={styles.row}>
          {TIPOS.map((t) => {
            const on = tipoFilters.includes(t);
            return (
              <Pressable
                key={t}
                onPress={() => toggleTipo(t)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: on ? colors.primary : colors.surface,
                    borderColor: on ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: on ? '#fff' : colors.text,
                    fontWeight: '600',
                  }}
                >
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.row}>
          <TextInput
            value={from}
            onChangeText={setFrom}
            placeholder="Desde (YYYY-MM-DD)"
            placeholderTextColor={colors.text + '80'}
            style={[
              styles.input,
              styles.inputHalf,
              {
                borderColor: colors.primary,
                backgroundColor: colors.card || colors.surface,
                color: colors.text,
              },
            ]}
          />
          <TextInput
            value={to}
            onChangeText={setTo}
            placeholder="Hasta (YYYY-MM-DD)"
            placeholderTextColor={colors.text + '80'}
            style={[
              styles.input,
              styles.inputHalf,
              {
                borderColor: colors.primary,
                backgroundColor: colors.card || colors.surface,
                color: colors.text,
              },
            ]}
          />
        </View>
        <View style={styles.row}>
          <TextInput
            value={equipoId}
            onChangeText={(t) => setEquipoId(t.toUpperCase())}
            placeholder="Equipo (ID) • EJ: EQ-0001"
            placeholderTextColor={colors.text + '80'}
            style={[
              styles.input,
              styles.inputFull,
              {
                borderColor: colors.primary,
                backgroundColor: colors.card || colors.surface,
                color: colors.text,
              },
            ]}
          />
        </View>

        {/* Lista */}
        {loading && params.page === 1 ? (
          <ActivityIndicator style={{ marginTop: 16 }} />
        ) : null}
        {emptyState ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No hay documentos
            </Text>
            {isAdminCreate ? (
              <Pressable
                onPress={() => setShowForm(true)}
                style={[styles.btn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.btnText}>Nuevo documento</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <FlatList
            data={data.items}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            scrollEnabled={false}
            ListFooterComponent={
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: 12,
                }}
              >
                <Pressable
                  style={[
                    styles.btnNeutral,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderWidth: StyleSheet.hairlineWidth,
                    },
                    params.page <= 1 && styles.disabled,
                  ]}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={params.page <= 1}
                >
                  <Text
                    style={{
                      color:
                        params.page <= 1 ? colors.text : colors.primary,
                      fontWeight: '700',
                    }}
                  >
                    Anterior
                  </Text>
                </Pressable>

                <Text style={{ alignSelf: 'center', color: colors.text }}>
                  Página {data.page} · {data.total} registros
                </Text>

                <Pressable
                  style={[
                    styles.btnNeutral,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderWidth: StyleSheet.hairlineWidth,
                    },
                    data.page * PAGE_SIZE >= data.total && styles.disabled,
                  ]}
                  onPress={() => setPage((p) => p + 1)}
                  disabled={data.page * PAGE_SIZE >= data.total}
                >
                  <Text
                    style={{
                      color:
                        data.page * PAGE_SIZE >= data.total
                          ? colors.text
                          : colors.primary,
                      fontWeight: '700',
                    }}
                  >
                    Siguiente
                  </Text>
                </Pressable>
              </View>
            }
          />
        )}
      </ScrollView>

      {/* FAB */}
      <View style={styles.fabWrap}>
        <Pressable
          onPress={() => setShowForm(true)}
          disabled={!isAdminCreate}
          style={[
            styles.fab,
            { backgroundColor: isAdminCreate ? colors.primary : colors.border },
          ]}
        >
          <Text style={styles.fabText}>＋</Text>
        </Pressable>
        {!isAdminCreate ? (
          <Text style={[styles.tooltip, { color: colors.text, opacity: 0.6 }]}>
            Solo Admin / Super
          </Text>
        ) : null}
      </View>

      <DocumentoFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onCreated={() => load()}
        presetEquipoId={equipoId || undefined}
      />

      <DocumentoDetailModal
        visible={showDetail}
        onClose={() => setShowDetail(false)}
        item={selected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16 },
  h1: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  p: { marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  inputHalf: { flex: 1 },
  inputFull: { flex: 1 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  card: { borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1 },
  title: { fontSize: 16, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 12 },
  sub: { marginTop: 4 },
  drive: { marginTop: 4, fontSize: 12 },
  empty: { alignItems: 'center', padding: 24 },
  emptyTitle: { fontWeight: '700', marginBottom: 8 },
  btn: { padding: 8, borderRadius: 12, alignSelf: 'center' },
  btnNeutral: { padding: 8, borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.5 },
  fabWrap: { position: 'absolute', right: 16, bottom: 16, alignItems: 'center' },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  tooltip: { marginTop: 6, fontSize: 12 },
});
