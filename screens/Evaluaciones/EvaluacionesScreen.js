// screens/Evaluaciones/EvaluacionesScreen.js
import React, { useEffect, useMemo, useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator } from 'react-native';
import * as evaluaciones from '../../data/repositories/evaluacionesRepository';
import { can } from '../../utils/permits';
import { useSession } from '../../app/store/session';
import { useNavigation } from '@react-navigation/native';
import { useDebounce } from '../../utils/useDebounce';
import { useAppTheme } from '../../theme/ThemeProvider';

const TYPES = ['equipo','responsable','evento'];

// Contraste automático del texto del botón
function pickTextOn(bg = '#2EE88A') {
  const c = bg.replace('#','');
  const r = parseInt(c.slice(0,2),16)/255;
  const g = parseInt(c.slice(2,4),16)/255;
  const b = parseInt(c.slice(4,6),16)/255;
  const L = 0.2126*r + 0.7152*g + 0.0722*b;
  return L > 0.6 ? '#0B0B0C' : '#FFFFFF';
}

export default function EvaluacionesScreen(){
  const nav = useNavigation();
  const session = useSession();
  const user = session?.user || { role: 'super admin' };

  const { colors } = useAppTheme();
  const dyn = useMemo(() => makeDynamicStyles(colors), [colors]); // objeto plano

  // Título del header (tematizado)
  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Evaluaciones',
      headerShown: true,
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text },
    });
  }, [nav, colors]);

  // Filtros
  const [type, setType] = useState(''); // vacío = todos
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [minScore, setMinScore] = useState('');
  const [search, setSearch] = useState('');

  // Debounce a la búsqueda
  const searchDeb = useDebounce(search, 400);

  // Datos
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Permiso de creación (técnico solo si type === 'equipo')
  const canCreateBase = can(user, 'eval.create', { target_type: type || 'equipo' });
  const canCreate = useMemo(() => {
    const role = (user?.role || '').toLowerCase();
    if (role === 'tecnico') return (type || 'equipo') === 'equipo';
    return canCreateBase;
  }, [user?.role, type, canCreateBase]);

  // Carga (memoizada)
  const load = useCallback(async (p = 1, append = false) => {
    setLoading(true);
    try {
      const { items: rows, total: t } = await evaluaciones.list({
        target_type: type || undefined,
        from: from || undefined,
        to: to || undefined,
        min_score: minScore || undefined,
        search: searchDeb || undefined,
        page: p,
        page_size: 50,
      });
      setPage(p);
      setTotal(t);
      setItems(prev => append ? [...prev, ...rows] : rows);
    } catch (e) {
      console.warn('eval list', e.code || e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [type, from, to, minScore, searchDeb]);

  useEffect(() => { load(1, false); }, [load]);

  // Handlers
  const onRefresh = useCallback(() => { setRefreshing(true); load(1, false); }, [load]);
  const onEndReached = useCallback(() => { if (items.length < total && !loading) load(page + 1, true); }, [items.length, total, loading, page, load]);

  const openCreate = useCallback(() => {
    const params = { defaultType: type || 'equipo' };
    nav.navigate('EvaluacionFormModal', params);
    nav.getParent()?.navigate('EvaluacionFormModal', params);
  }, [nav, type]);

  const openDetail = useCallback((item) => {
    const params = { eval: item };
    nav.navigate('EvaluacionDetailModal', params);
    nav.getParent()?.navigate('EvaluacionDetailModal', params);
  }, [nav]);

  // Input con borde (color primario) + grosor al foco (sin halo)
  function ThemedInput(props){
    const [f, setF] = useState(false);
    return (
      <TextInput
        {...props}
        style={[base.input, dyn.input, f && dyn.inputFocus, props.style]}
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        onFocus={(e)=>{ setF(true); props.onFocus?.(e); }}
        onBlur={(e)=>{ setF(false); props.onBlur?.(e); }}
      />
    );
  }

  const renderItem = ({ item }) => (
    <Pressable style={[base.card, dyn.card]} onPress={() => openDetail(item)}>
      <View style={base.row}>
        <Text style={[base.h, dyn.h]}>{item.target_label || item.target_id}</Text>
        <View style={[base.badge, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Text style={[base.badgeTxt, { color: colors.textMuted }]}>{item.target_type} · {item.promedio || '-'}</Text>
        </View>
      </View>
      <Text style={[base.sub, { color: colors.textMuted }]}>{item.fecha} · {item.evaluador_nombre || '—'}</Text>
      <Text style={[base.hl, { color: colors.text }]}>{highlight(item)}</Text>
    </Pressable>
  );

  return (
    <View style={[base.wrap, dyn.wrap]}>
      {/* Selector de tipo (chips) */}
      <TypeChips value={type} onChange={setType} colors={colors} />

      {/* Filtros */}
      <View style={base.filters}>
        <ThemedInput
          placeholder="Equipo, responsable, evento o comentario…"
          value={search}
          onChangeText={setSearch}
        />
        <View style={base.row}>
          <ThemedInput
            placeholder="Mín. nota"
            keyboardType="numeric"
            value={minScore}
            onChangeText={setMinScore}
            style={{ width: 110, marginRight: 8 }}
          />
          <ThemedInput
            placeholder="Desde (YYYY-MM-DD)"
            value={from}
            onChangeText={setFrom}
            autoCapitalize="none"
            style={[base.flex1, { marginRight: 8 }]}
          />
          <ThemedInput
            placeholder="Hasta (YYYY-MM-DD)"
            value={to}
            onChangeText={setTo}
            autoCapitalize="none"
            style={base.flex1}
          />
        </View>
      </View>

      {/* CTA Nueva evaluación */}
      {canCreate && (
        <Pressable style={[base.btn, dyn.btn]} onPress={openCreate}>
          <Text style={[base.btnTxt, { color: pickTextOn(colors.primary) }]}>Nueva evaluación</Text>
        </Pressable>
      )}

      {/* Lista */}
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={!loading ? (
          <View style={base.empty}>
            <Text style={[base.emptyH, { color: colors.textMuted }]}>Sin evaluaciones</Text>
            {canCreate && (
              <Pressable style={[base.btn, dyn.btn]} onPress={openCreate}>
                <Text style={[base.btnTxt, { color: pickTextOn(colors.primary) }]}>Crear la primera</Text>
              </Pressable>
            )}
          </View>
        ) : null}
        ListFooterComponent={loading ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
      />
    </View>
  );
}

function highlight(it){
  const keys = {
    equipo: ['fiabilidad','estado_fisico','limpieza','documentacion'],
    responsable: ['puntualidad','cumplimiento','comunicacion','proactividad'],
    evento: ['planeacion','logistica','tiempo_respuesta','seguridad']
  }[it.target_type] || [];
  const scored = keys.map(k => [k, Number(it[k])]).filter(([,v]) => v>=1);
  if (!scored.length) return '';
  scored.sort((a,b)=> a[1]-b[1]);
  const [k,v] = scored[0];
  return `${k} ${v}/5`;
}

/** Chips selector de tipo */
function TypeChips({ value, onChange, colors }){
  return (
    <View style={base.chipsWrap}>
      <Chip label="Todos" active={!value} onPress={() => onChange('')} colors={colors} />
      {TYPES.map(t => (<Chip key={t} label={t} active={value === t} onPress={() => onChange(t)} colors={colors} />))}
    </View>
  );
}
function Chip({ label, active, onPress, colors }){
  return (
    <Pressable
      onPress={onPress}
      style={[
        base.chipBase,
        { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
        active && { backgroundColor: colors.primary }
      ]}
    >
      <Text style={[base.chipTxt, { color: active ? '#000' : colors.textMuted }]}>{label || 'Todos'}</Text>
    </Pressable>
  );
}

/* ======================= ESTILOS ======================= */
const base = StyleSheet.create({
  wrap:{ flex:1, padding:12 },
  filters:{ marginBottom:8 },
  input:{ borderRadius:10, paddingHorizontal:12, paddingVertical:10, marginBottom:10 },
  row:{ flexDirection:'row', alignItems:'center' },
  flex1:{ flex:1 },

  btn:{ padding:12, borderRadius:10, alignItems:'center', marginBottom:8 },
  btnTxt:{ fontWeight:'700' },

  card:{ borderRadius:12, padding:12, marginBottom:10 },
  h:{ fontSize:16, fontWeight:'700', flex:1 },
  sub:{ marginTop:2 },
  hl:{ marginTop:6, fontStyle:'italic' },

  badge:{ paddingHorizontal:8, paddingVertical:4, borderRadius:8, borderWidth: StyleSheet.hairlineWidth },
  badgeTxt:{ fontSize:12, textTransform:'capitalize' },

  empty:{ alignItems:'center', paddingVertical:32 },
  emptyH:{ marginBottom:8, fontWeight:'700' },

  chipsWrap:{ flexDirection:'row', marginTop:8, marginBottom:8, flexWrap:'wrap' },
  chipBase:{ paddingVertical:6, paddingHorizontal:12, borderRadius:999, marginRight:6, marginBottom:6, borderWidth: StyleSheet.hairlineWidth },
  chipTxt:{ textTransform:'capitalize', fontWeight:'700' },
});

/** Dinámicos (depende del tema) — objeto plano */
function makeDynamicStyles(colors){
  return {
    wrap: { backgroundColor: colors.bg || colors.background },
    // Bordes del color del tema
    input: {
      backgroundColor: colors.inputBg,
      color: colors.text,
      borderColor: colors.primary,
      borderWidth: 1.5,
    },
    // en foco: solo aumenta el grosor
    inputFocus: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    btn:  { backgroundColor: colors.primary },
    card: { backgroundColor: colors.surface },
    h:    { color: colors.text },
  };
}
