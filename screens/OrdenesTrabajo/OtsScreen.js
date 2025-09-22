// screens/OrdenesTrabajo/OtsScreen.js
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useAppTheme } from '../../theme/ThemeProvider';
import { can } from '../../utils/permits';
import { otsRepository } from '../../data/repositories/otsRepository';
import { useCatalog } from '../../hooks/useCatalogs';

// (Opcionales si los tienes; si no, elimina estos imports y sus usos)
import FAB from '../../components/ui/FAB';
import EmptyState from '../../components/ui/EmptyState';

/* ----------------------- resolver hook de sesión (módulo) ----------------------- */
let useSession = () => ({ user: { role: 'super_admin' } });
try {
  const modA = require('../../store/session');
  if (modA?.useSession) useSession = modA.useSession;
} catch {
  // ignore
}
try {
  const modB = require('../../app/store/session');
  if (modB?.useSession) useSession = modB.useSession;
} catch {
  // ignore
}

/* --------------------------------- helpers UI --------------------------------- */
function Chip({ text, palette, colors }) {
  return (
    <View
      style={[
        styles.chip,
        {
          borderColor: palette.inputBorder ?? colors.border,
          backgroundColor: 'transparent',
        },
      ]}
    >
      <Text style={[styles.chipText, { color: palette.textMuted ?? colors.text }]}>{text}</Text>
    </View>
  );
}

export default function OtsScreen() {
  const nav = useNavigation();
  const theme = useAppTheme();
  const { colors, palette: p } = theme ?? {};

  // 🎨 Fallbacks SUAVES (si el tema no define algo)
  const palette = useMemo(
    () => ({
      bg: colors?.background ?? '#0B0B0B',
      cardBg: p?.card ?? colors?.surface ?? '#121212',
      cardBorder: p?.cardBorder ?? colors?.border ?? '#242424',
      inputBg: p?.inputBg ?? colors?.surface ?? '#141414',
      inputBorder: p?.inputBorder ?? colors?.border ?? '#2A2A2A',
      text: colors?.text ?? '#FFFFFF',
      textMuted: p?.textMuted ?? '#9CA3AF',
      primary: colors?.primary ?? '#4F46E5',
      warning: p?.warning ?? '#F59E0B',
      danger: p?.danger ?? '#EF4444',
    }),
    [colors, p]
  );

  // ✅ hooks siempre, sin condicionales
  const session = useSession();
  const allowCreate = can(session?.user?.role, 'ots.create') ?? true;

  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [fEstado, setFEstado] = useState('');
  const [fResp, setFResp] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { items: responsables = [], offline: offR } = useCatalog('responsables');

  // si luego migras a catálogo:
  const estadosOT = ['abierta', 'asignada', 'en_proceso', 'en_espera', 'cerrada'];
  const offE = false;

  const load = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setLoading(true);
        const { data } = await otsRepository.list({
          page: 1,
          page_size: 200,
          q,
          estado: fEstado,
          responsable: fResp,
        });
        setItems(data || []);
      } catch (e) {
        Alert.alert('OTs', e?.message || 'No se pudo cargar OTs');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [q, fEstado, fResp]
  );

  useEffect(() => {
    load();
  }, [load]);

  // debounce simple
  useEffect(() => {
    const t = setTimeout(() => load({ silent: true }), 350);
    return () => clearTimeout(t);
  }, [q, fEstado, fResp, load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load({ silent: true });
  }, [load]);

  function pickEstado() {
    Alert.alert('Estado', '', [
      { text: 'Todos', onPress: () => setFEstado('') },
      ...estadosOT.map((v) => ({ text: v, onPress: () => setFEstado(v) })),
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }
  function pickResp() {
    Alert.alert('Responsable', '', [
      { text: 'Todos', onPress: () => setFResp('') },
      ...responsables.map((v) => ({ text: String(v), onPress: () => setFResp(String(v)) })),
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function renderItem({ item }) {
    return (
      <Pressable
        onPress={() => nav.navigate('OTForm', { mode: 'edit', initial: item })}
        style={[
          styles.item,
          { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
        ]}
      >
        <Text style={[styles.title, { color: palette.text }]}>
          {item.titulo || '(sin título)'}
        </Text>
        <Text style={[styles.meta, { color: palette.textMuted }]}>
          Equipo: {item.equipo_id || '—'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          <Chip text={item.estado || 'abierta'} palette={palette} colors={colors} />
          {!!item.responsable && <Chip text={item.responsable} palette={palette} colors={colors} />}
          {!!item.proveedor && <Chip text={item.proveedor} palette={palette} colors={colors} />}
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <FlatList
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.h1, { color: palette.text }]}>Órdenes de Trabajo</Text>

            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Buscar por título, equipo, notas…"
              placeholderTextColor={palette.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: palette.inputBg,
                  color: palette.text,
                  borderColor: palette.inputBorder,
                },
              ]}
            />

            <View style={styles.row}>
              <Pressable onPress={pickEstado} style={[styles.btn, { borderColor: palette.primary }]}>
                <Text style={{ color: palette.primary, fontWeight: '800' }}>
                  Estado {offE ? '(cache)' : ''}: {fEstado || 'Todos'}
                </Text>
              </Pressable>

              <Pressable onPress={pickResp} style={[styles.btn, { borderColor: palette.primary }]}>
                <Text style={{ color: palette.primary, fontWeight: '800' }}>
                  Resp. {offR ? '(cache)' : ''}: {fResp || 'Todos'}
                </Text>
              </Pressable>

              {allowCreate && (
                <Pressable
                  onPress={() => nav.navigate('OTForm', { mode: 'create' })}
                  style={[styles.btn, { borderColor: palette.primary }]}
                >
                  <Text style={{ color: palette.primary, fontWeight: '800' }}>Nueva OT</Text>
                </Pressable>
              )}
            </View>
          </View>
        }
        data={items}
        keyExtractor={(it, i) => String(it.id || i)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            tintColor={palette.text}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={palette.primary} />
          ) : EmptyState ? (
            <EmptyState
              title="Sin OTs"
              subtitle="Crea tu primera orden de trabajo"
              actionLabel="Nueva OT"
              onAction={() => nav.navigate('OTForm', { mode: 'create' })}
            />
          ) : (
            <Text style={{ color: palette.textMuted, textAlign: 'center', marginTop: 20 }}>
              Sin OTs
            </Text>
          )
        }
      />

      {allowCreate && FAB && (
        <FAB label="Nueva OT" onPress={() => nav.navigate('OTForm', { mode: 'create' })} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12, gap: 8 },
  h1: { fontSize: 20, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, flex: 1 },
  item: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  title: { fontWeight: '800', fontSize: 16 },
  meta: { fontSize: 12 },
  list: { padding: 12, gap: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
  chipText: { fontSize: 12, fontWeight: '700' },
  btn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start' },
});
