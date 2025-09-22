// screens/Eventos/EventosScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { eventosRepository } from '../../data/repositories/eventosRepository';
import EventoFormModal from './EventoFormModal';
import EventoDetailModal from './EventoDetailModal';
import { can } from '../../utils/permits';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useSession } from '../../app/store/session';

const ESTADOS = ['planificado', 'en_curso', 'cerrado'];
const PAGE_SIZE = 50;

function hashFilters(f) {
  const s = JSON.stringify(f || {});
  let h = 0; for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return Math.abs(h).toString(36);
}

export default function EventosScreen({ user: userProp }) {
  // Usuario desde Session como fallback (ver FAB según permisos)
  const session = useSession?.();
  const user = userProp ?? session?.user ?? { id: 'anon', name: 'Invitado', role: 'super admin' };

  const { colors = {} } = useAppTheme?.() || {};

  // Paleta (incluye tokens estilo Documentos)
  const palette = useMemo(() => ({
    bg:            colors.background ?? '#0b0b0b',
    card:          colors.card ?? '#111',
    border:        colors.border ?? '#1d1d1d',
    surface2:      colors.surface2 ?? '#1a1a1a',
    text:          colors.text ?? '#fff',
    textMuted:     colors.textMuted ?? '#aaa',
    textHint:      colors.textHint ?? '#777',
    shadow:        colors.shadow ?? '#000',
    accent:        colors.primary ?? '#00BCD4', // borde cian estilo screenshot
    accentFg:      colors.onPrimary ?? '#fff',

    // Inputs “outline” como Documentos
    inputBg:       colors.surface ?? '#101214',
    inputFg:       colors.text ?? '#e9eef4',
    inputBorder:   colors.primary ?? '#00BCD4',

    // Chips
    chipBg:        colors?.chip?.bg ?? '#16181a',
    chipBorder:    colors?.chip?.border ?? (colors.primary ?? '#00BCD4'),
    chipFg:        colors?.chip?.fg ?? '#d8dde3',
    chipActiveBg:  colors?.chip?.activeBg ?? (colors.primary ?? '#00BCD4'),
    chipActiveFg:  colors?.chip?.activeFg ?? (colors.onPrimary ?? '#001015'),

    // Botones
    btnPrimaryBg:  (colors?.button?.primary?.bg) ?? (colors.primary ?? '#00BCD4'),
    btnPrimaryFg:  (colors?.button?.primary?.fg) ?? (colors.onPrimary ?? '#001015'),
    btnSecondaryBg:(colors?.button?.secondary?.bg) ?? (colors.surface2 ?? '#1e1e1e'),
    btnSecondaryFg:(colors?.button?.secondary?.fg) ?? (colors.text ?? '#fff'),
    btnSecondaryBd:(colors?.button?.secondary?.border) ?? (colors.border ?? '#2a2a2a'),

    // Badges por estado
    estado_planificado: colors?.statuses?.planned    ?? '#1f6f82',
    estado_en_curso:    colors?.statuses?.inProgress ?? '#2a9d8f',
    estado_cerrado:     colors?.statuses?.closed     ?? '#6c757d',
  }), [colors]);

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.bg },

    // Header estilo Documentos (outline cian)
    headerWrap: {
      paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10,
      borderBottomWidth: 1, borderBottomColor: palette.border,
      backgroundColor: palette.bg,
    },
    h1: { color: palette.text, fontSize: 18, fontWeight: '800', marginBottom: 8 },
    cache: { color: palette.textMuted, fontSize: 12, marginLeft: 6 },
    row: { flexDirection: 'row', gap: 8 },

    input: {
      flex: 1,
      backgroundColor: palette.inputBg,
      color: palette.inputFg,
      borderRadius: 8,
      paddingHorizontal: 12, paddingVertical: 10,
      borderWidth: 1.5,
      borderColor: palette.inputBorder,
    },

    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    chip: {
      paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 999, borderWidth: 1.5,
      backgroundColor: palette.chipBg, borderColor: palette.chipBorder,
    },
    chipActive: { backgroundColor: palette.chipActiveBg, borderColor: palette.chipActiveBg },
    chipText: { color: palette.chipFg, fontSize: 12, fontWeight: '600' },
    chipTextActive: { color: palette.chipActiveFg },

    toolsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    countText: { color: palette.textMuted, fontSize: 12 },
    clearBtn: {
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
      borderWidth: 1.5, borderColor: palette.btnSecondaryBd, backgroundColor: 'transparent'
    },
    clearTxt: { color: palette.textMuted, fontSize: 12 },

    listContainer: { padding: 12, paddingBottom: 96 },
    card: {
      backgroundColor: palette.card, borderRadius: 12, padding: 12, marginBottom: 10,
      borderWidth: 1, borderColor: palette.border,
      shadowColor: palette.shadow, shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    },
    title: { color: palette.text, fontWeight: '700', fontSize: 16 },
    sub: { color: palette.textMuted, marginTop: 4 },

    badge: {
      color: '#fff', paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: 999, textTransform: 'capitalize', marginRight: 8, marginTop: 8, overflow: 'hidden',
    },
    badgeMuted: {
      color: palette.textMuted, backgroundColor: palette.chipBg,
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginTop: 8,
    },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    empty: { color: palette.textMuted, marginTop: 6 },

    pagination: {
      position: 'absolute', left: 0, right: 0, bottom: 0, height: 60,
      backgroundColor: palette.bg, borderTopWidth: 1, borderTopColor: palette.border,
      alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 12,
    },
    pgBtn: {
      backgroundColor: palette.btnSecondaryBg,
      borderColor: palette.btnSecondaryBd, borderWidth: 1.5,
      paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    },
    pgBtnDisabled: { opacity: 0.45 },
    pgText: { color: palette.btnSecondaryFg, fontWeight: '600' },
    pgInfo: { color: palette.textMuted },

    fab: {
      position: 'absolute', right: 16, bottom: 76,
      backgroundColor: palette.btnPrimaryBg,
      width: 56, height: 56, borderRadius: 28,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: palette.shadow, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 6 },
    },
    fabText: { color: palette.btnPrimaryFg, fontSize: 22, fontWeight: '800' },
    ctaInline: {
      paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
      backgroundColor: palette.btnPrimaryBg, marginTop: 12,
    },
    ctaInlineText: { color: palette.btnPrimaryFg, fontWeight: '700' },
  });

  const getEstadoBg = useCallback((estado) => {
    switch (estado) {
      case 'planificado': return { backgroundColor: palette.estado_planificado };
      case 'en_curso':    return { backgroundColor: palette.estado_en_curso };
      case 'cerrado':     return { backgroundColor: palette.estado_cerrado };
      default:            return { backgroundColor: '#444' };
    }
  }, [palette]);

  // Estado de filtros (agregamos sede/responsable)
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [estado, setEstado] = useState('');
  const [sede, setSede] = useState('');           // NUEVO
  const [responsable, setResponsable] = useState(''); // NUEVO

  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isCache, setIsCache] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState(null);

  // Combinar sede/responsable al search si backend no filtra por separado
  const effectiveSearch = useMemo(() => {
    const tags = [];
    if (sede.trim()) tags.push(`sede:${sede.trim()}`);
    if (responsable.trim()) tags.push(`resp:${responsable.trim()}`);
    return [search, ...tags].filter(Boolean).join(' ');
  }, [search, sede, responsable]);

  const filters = useMemo(
    () => ({ from, to, estado, search: effectiveSearch, page, page_size: PAGE_SIZE }),
    [from, to, estado, effectiveSearch, page]
  );

  const cacheKey = useMemo(() => `events.cache.${hashFilters({ ...filters, page })}`, [filters, page]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const net = await NetInfo.fetch();
      if (!net?.isConnected) {
        const raw = await AsyncStorage.getItem(cacheKey);
        const cached = raw ? JSON.parse(raw) : { items: [], total: 0, page };
        setItems(cached.items || []);
        setTotal(cached.total || 0);
        setIsCache(true);
        return;
      }
      const { items: it, total: tt, page: pp } = await eventosRepository.list(filters);
      setItems(it);
      setTotal(tt);
      setIsCache(false);
      await AsyncStorage.setItem(cacheKey, JSON.stringify({ items: it, total: tt, page: pp }));
    } catch (e) {
      if (e.code === 'NETWORK_ERROR') {
        const raw = await AsyncStorage.getItem(cacheKey);
        const cached = raw ? JSON.parse(raw) : { items: [], total: 0, page };
        setItems(cached.items || []);
        setTotal(cached.total || 0);
        setIsCache(true);
      }
    } finally {
      setLoading(false);
    }
  }, [cacheKey, filters, page]);

  useEffect(() => { setPage(1); }, [search, from, to, estado, sede, responsable]);
  useEffect(() => { load(); }, [load, page]);

  const canCreate = can(user, 'event.create');

  const clearFilters = () => {
    setSearch(''); setFrom(''); setTo(''); setEstado(''); setSede(''); setResponsable('');
  };

  const renderItem = ({ item }) => (
    <Pressable onPress={() => setDetail(item)} style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.nombre}</Text>
        <Text style={styles.sub}>
          {item.fecha_inicio}{item.fecha_fin ? ` — ${item.fecha_fin}` : ''} · {item.sede || '—'}
        </Text>
        <View style={styles.row}>
          {!!item.estado && <Text style={[styles.badge, getEstadoBg(item.estado)]}>{item.estado}</Text>}
          {!!item.responsable && <Text style={styles.badgeMuted}>{item.responsable}</Text>}
        </View>
      </View>
    </Pressable>
  );

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <SafeAreaView style={styles.root} edges={['top','right','left']}>
      {/* Header filtros estilo Documentos */}
      <View style={styles.headerWrap}>
        <View style={{ flexDirection:'row', alignItems:'center' }}>
          <Text style={styles.h1}>Eventos</Text>
          {isCache && <Text style={styles.cache}>(cache)</Text>}
        </View>

        <TextInput
          placeholder="Nombre, sede o notas…"
          placeholderTextColor={palette.textHint}
          style={[styles.input, { marginBottom: 8 }]}
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.chipsRow}>
          {ESTADOS.map((e) => {
            const active = estado === e;
            return (
              <Pressable
                key={e}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setEstado(active ? '' : e)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{e}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.row, { marginTop: 8 }]}>
          <TextInput
            placeholder="Desde (YYYY-MM-DD)"
            placeholderTextColor={palette.textHint}
            style={styles.input}
            value={from}
            onChangeText={setFrom}
          />
          <TextInput
            placeholder="Hasta (YYYY-MM-DD)"
            placeholderTextColor={palette.textHint}
            style={styles.input}
            value={to}
            onChangeText={setTo}
          />
        </View>

        {/* Filtros extra como Documentos */}
        <TextInput
          placeholder="Sede (contiene)"
          placeholderTextColor={palette.textHint}
          style={[styles.input, { marginTop: 8 }]}
          value={sede}
          onChangeText={setSede}
        />
        <TextInput
          placeholder="Responsable (contiene)"
          placeholderTextColor={palette.textHint}
          style={[styles.input, { marginTop: 8 }]}
          value={responsable}
          onChangeText={setResponsable}
        />

        <View style={styles.toolsRow}>
          <Text style={styles.countText}>{total} resultado{total === 1 ? '' : 's'}</Text>
          <Pressable onPress={clearFilters} style={styles.clearBtn}>
            <Text style={styles.clearTxt}>Limpiar filtros</Text>
          </Pressable>
        </View>
      </View>

      {/* Lista / Empty */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Sin resultados</Text>
          {canCreate && (
            <Pressable onPress={() => setShowForm(true)} style={styles.ctaInline}>
              <Text style={styles.ctaInlineText}>Nuevo evento</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Paginación secundaria */}
      <View style={styles.pagination}>
        <Pressable
          onPress={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          style={[styles.pgBtn, page <= 1 && styles.pgBtnDisabled]}
        >
          <Text style={styles.pgText}>Anterior</Text>
        </Pressable>
        <Text style={styles.pgInfo}>{page} / {pages}</Text>
        <Pressable
          onPress={() => setPage((p) => Math.min(pages, p + 1))}
          disabled={page >= pages}
          style={[styles.pgBtn, page >= pages && styles.pgBtnDisabled]}
        >
          <Text style={styles.pgText}>Siguiente</Text>
        </Pressable>
      </View>

      {/* FAB crear */}
      {canCreate && (
        <Pressable onPress={() => setShowForm(true)} style={styles.fab}>
          <Text style={styles.fabText}>＋</Text>
        </Pressable>
      )}

      {/* Modales */}
      {showForm && (
        <EventoFormModal
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); load(); }}
        />
      )}
      {!!detail && (
        <EventoDetailModal item={detail} onClose={() => setDetail(null)} />
      )}
    </SafeAreaView>
  );
}
