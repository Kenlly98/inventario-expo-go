/* eslint-disable react-native/no-unused-styles */
// screens/Incidencias/IncidenciasScreen.js
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useLayoutEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useSession } from '../../app/store/session';
import { can } from '../../utils/permits';
import Toast from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import { incidenciasRepository } from '../../data/repositories/incidenciasRepository';
import { format } from 'date-fns';
import { ROUTES } from '../../navigation/routes';

/* ------------------------- constantes ------------------------- */
const ESTADOS = ['abierta','en_revision','en_reparacion','resuelta'];
const SEVS = ['baja','media','alta','critica'];

/* ------------------------- helpers ------------------------- */
function errMsg(code) {
  switch (code) {
    case 'MISSING_FIELDS': return 'Faltan campos obligatorios.';
    case 'NOT_FOUND_EQUIPO': return 'Equipo no encontrado.';
    case 'INVALID_STATE': return 'Estado inválido.';
    case 'UNAUTHORIZED': return 'No autorizado. Revisa tu configuración.';
    case 'SHEETS_ERROR': return 'Error de datos (Sheets). Intenta luego.';
    case 'NETWORK_ERROR': return 'Sin conexión. Inténtalo de nuevo.';
    default: return 'No se pudo completar la acción.';
  }
}

function createStyles(palette) {
  return StyleSheet.create({
    container: { flex:1, backgroundColor: palette.bg },
    header: { padding:12, gap:8 },
    h1: { color: palette.text, fontSize:20, fontWeight:'800' },
    cache: { color: palette.textMuted, fontSize:12 },
    row: { flexDirection:'row', gap:8, alignItems:'center' },

    input: {
      backgroundColor: palette.inputBg,
      color: palette.text,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: palette.inputBorder,
      flex: 1,
    },
    // 🔵 Borde siempre azul
    inputOutline: {
      borderColor: palette.primary,
    },
    // Glow/borde enfoque
    inputFocused: {
      borderColor: palette.primary,
      shadowColor: palette.primary,
      shadowOpacity: 0.35,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
      elevation: 4,
    },

    chipRow: { flexDirection:'row', flexWrap:'wrap', gap:8 },
    chip: {
      paddingHorizontal:12, paddingVertical:6, borderRadius:999,
      borderWidth:1, borderColor: palette.inputBorder, backgroundColor: palette.card,
    },
    chipActive: {
      borderColor: palette.primary, backgroundColor: palette.primarySoft,
      shadowColor: palette.primary,
      shadowOpacity: 0.25,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 0 },
      elevation: 3,
    },
    chipText: { color: palette.text },

    list: { flex:1 },
    card: {
      backgroundColor: palette.card, borderRadius:12, marginHorizontal:12, marginVertical:6,
      padding:12, borderWidth:1, borderColor: palette.cardBorder
    },
    titleRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
    title: { color: palette.text, fontWeight:'700', fontSize:16 },
    sevBadge: {
      paddingHorizontal:10, paddingVertical:4, borderRadius:999, borderWidth:1,
      borderColor: palette.inputBorder, backgroundColor: palette.inputBg
    },
    sevTxt: { color: palette.textMuted, fontSize:12, fontWeight:'700', textTransform:'uppercase' },
    sub: { color: palette.textMuted, marginTop:4 },
    desc: { color: palette.text, marginTop:6 },
    footerRow: { marginTop:8, flexDirection:'row', gap:12, alignItems:'center' },
    ot: { fontSize:12, color: palette.textMuted },
    pin: { fontSize:12, color: palette.textMuted },
    badgeCache: { fontSize:12, color: palette.warning, marginTop:4 },
    emptyBox: { padding:16 },
    btn: {
      paddingHorizontal:12, paddingVertical:10, borderRadius:10,
      backgroundColor: palette.primary, borderWidth:1, borderColor: palette.primaryBorder
    },
    btnTxt: { color: palette.onPrimary, fontWeight:'700' },
    checkbox: {
      paddingHorizontal:10, paddingVertical:10, borderRadius:8, borderWidth:1,
      borderColor: palette.primary, backgroundColor: palette.card
    },
    checkboxActive: { borderColor: palette.primary },

    fabWrap: {
      position: 'absolute',
      right: 0,
      bottom: 0,
    },
    fab: {
      borderRadius: 28,
      paddingHorizontal: 16,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.primary,
      borderWidth: 1,
      borderColor: palette.primaryBorder,
      zIndex: 1000,
      elevation: 10,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    fabTxt: { color: palette.onPrimary, fontWeight: '800' },
  });
}

/* ------------------------- componente ------------------------- */
export default function IncidenciasScreen({ navigation }) {
  const { colors: palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const insets = useSafeAreaInsets();

  const session = useSession();
  const user = session?.user ?? { id: 'Kenlly', role: 'super_admin', name: 'Invitado' };
  const canCreate = can(user,'inc.create');

  // filtros
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [sev, setSev] = useState('');
  const [equipoId, setEquipoId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [hasOT, setHasOT] = useState(null);

  // focus states
  const [focusQ, setFocusQ] = useState(false);
  const [focusFrom, setFocusFrom] = useState(false);
  const [focusTo, setFocusTo] = useState(false);
  const [focusEq, setFocusEq] = useState(false);

  // listado
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async (opts = {}) => {
    const nextPage = opts.page ?? page;
    try {
      setLoading(true);
      const res = await incidenciasRepository.list({
        estado, severidad: sev, equipo_id: equipoId, from, to,
        has_ot: hasOT === null ? '' : !!hasOT, search: q,
        page: nextPage, page_size: pageSize,
      });
      setFromCache(!!res.fromCache);
      setItems(nextPage === 1 ? (res.items||[]) : [...items, ...(res.items||[])]);
      setTotal(res.total ?? 0);
      setPage(res.page ?? nextPage);
    } catch (e) { Toast.show(errMsg(e.code)); }
    finally { setLoading(false); }
  }, [estado, sev, equipoId, from, to, hasOT, q, page, pageSize, items]);

  const refresh = useCallback(async () => {
    try { setRefreshing(true); await load({ page:1 }); }
    finally { setRefreshing(false); }
  }, [load]);

  useEffect(() => { load({ page:1 }); }, [load]);

  const routeExists = useCallback((name) => {
    try { return (navigation?.getState?.()?.routeNames||[]).includes(name); }
    catch { return false; }
  }, [navigation]);

  const openCreate = useCallback(() => {
    const params = { prefill: { equipo_id: equipoId||'' }, onDone: refresh };
    const preferred = ROUTES.INCIDENCIA_FORM;
    navigation.navigate(preferred, params);
    if (!routeExists(preferred) && routeExists('IncidenciaFormModal')) {
      navigation.navigate('IncidenciaFormModal', params);
    }
    const names = navigation?.getState?.()?.routeNames||[];
    if (!names.includes(preferred) && !names.includes('IncidenciaFormModal')) {
      Toast.show('No encuentro la ruta del modal.'); console.warn('INC routes missing:', names);
    }
  }, [navigation, equipoId, refresh, routeExists]);

  const openDetail = useCallback((item) => {
    const params = { incidencia:item, onUpdated:refresh };
    const preferred = ROUTES.INCIDENCIA_DETAIL;
    navigation.navigate(preferred, params);
    if (!routeExists(preferred) && routeExists('IncidenciaDetailModal')) {
      navigation.navigate('IncidenciaDetailModal', params);
    }
  }, [navigation, refresh, routeExists]);

  useLayoutEffect(() => {
    if (!canCreate) return;
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={openCreate} style={{ paddingHorizontal:12, paddingVertical:8 }}>
          <Text style={{ color: palette.link, fontWeight:'700' }}>Nueva</Text>
        </Pressable>
      ),
    });
  }, [navigation, openCreate, palette.link, canCreate]);

  function renderChip(value, current, setter, label) {
    const active = current===value;
    return (
      <Pressable key={value} onPress={()=>setter(active?'':value)} style={[styles.chip, active&&styles.chipActive]}>
        <Text style={styles.chipText}>{label??value}</Text>
      </Pressable>
    );
  }

  const renderItem = ({ item }) => {
    const fecha = item.fecha_reporte ? format(new Date(item.fecha_reporte),'yyyy-MM-dd HH:mm'):'';
    return (
      <Pressable onPress={()=>openDetail(item)} style={styles.card}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{item.equipo_id||'(sin equipo)'}</Text>
          <View style={styles.sevBadge}><Text style={styles.sevTxt}>{item.severidad||'-'}</Text></View>
        </View>
        <Text style={styles.sub}>{[item.estado,fecha,item.reportado_por].filter(Boolean).join(' · ')}</Text>
        {!!item.descripcion && <Text numberOfLines={3} style={styles.desc}>{item.descripcion}</Text>}
        <View style={styles.footerRow}>
          {!!item.fotos_urls && <Text style={styles.pin}>📎</Text>}
          {!!item.ot_id && <Text style={styles.ot}>#OT-{item.ot_id}</Text>}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.h1}>Incidencias</Text>
        {fromCache && <Text style={styles.badgeCache}>(cache)</Text>}

        <View style={styles.row}>
          <TextInput
            placeholder="Buscar (descripción, equipo, reportado por)"
            placeholderTextColor={palette.textMuted}
            value={q}
            onChangeText={setQ}
            onFocus={()=>setFocusQ(true)}
            onBlur={()=>setFocusQ(false)}
            style={[styles.input, styles.inputOutline, focusQ&&styles.inputFocused]}
          />
        </View>

        <View style={styles.chipRow}>
          {renderChip('abierta',estado,setEstado,'Abierta')}
          {renderChip('en_revision',estado,setEstado,'En revisión')}
          {renderChip('en_reparacion',estado,setEstado,'En reparación')}
          {renderChip('resuelta',estado,setEstado,'Resuelta')}
        </View>

        <View style={styles.chipRow}>
          {SEVS.map(v=>renderChip(v,sev,setSev,v[0].toUpperCase()+v.slice(1)))}
        </View>

        <View style={styles.row}>
          <TextInput
            placeholder="Desde (YYYY-MM-DD)"
            placeholderTextColor={palette.textMuted}
            value={from}
            onChangeText={setFrom}
            onFocus={()=>setFocusFrom(true)}
            onBlur={()=>setFocusFrom(false)}
            style={[styles.input, styles.inputOutline, focusFrom&&styles.inputFocused]}
          />
          <TextInput
            placeholder="Hasta (YYYY-MM-DD)"
            placeholderTextColor={palette.textMuted}
            value={to}
            onChangeText={setTo}
            onFocus={()=>setFocusTo(true)}
            onBlur={()=>setFocusTo(false)}
            style={[styles.input, styles.inputOutline, focusTo&&styles.inputFocused]}
          />
        </View>

        <View style={styles.row}>
          <TextInput
            placeholder="Equipo ID (o escanear)"
            placeholderTextColor={palette.textMuted}
            value={equipoId}
            onChangeText={setEquipoId}
            onFocus={()=>setFocusEq(true)}
            onBlur={()=>setFocusEq(false)}
            style={[styles.input, styles.inputOutline, focusEq&&styles.inputFocused]}
            autoCapitalize="characters"
          />
          <Pressable
            onPress={()=>Alert.prompt?.('Escanear/Ingresar','Ingresa/pega el código del equipo',val=>val&&setEquipoId(val))}
            style={[styles.btn,{paddingHorizontal:14}]}
          >
            <Text style={styles.btnTxt}>Scan</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Pressable
            onPress={()=>{const next=hasOT===null?true:hasOT?false:null; setHasOT(next);}}
            style={[styles.checkbox, hasOT!==null&&styles.checkboxActive]}
          >
            <Text style={{color:palette.text}}>
              OT: {hasOT===null?'Todos':hasOT?'Con OT':'Sin OT'}
            </Text>
          </Pressable>

          <Pressable onPress={refresh} style={styles.btn}>
            {loading ? <ActivityIndicator/>:<Text style={styles.btnTxt}>Aplicar</Text>}
          </Pressable>
        </View>
      </View>

      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(it,idx)=>it.id||String(idx)}
        renderItem={renderItem}
        onEndReachedThreshold={0.2}
        onEndReached={()=>{ if(items.length<total&&!loading) load({page:page+1}); }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={palette.text}/>
        }
        ListEmptyComponent={
          !loading&&(
            <View style={styles.emptyBox}>
              <EmptyState
                title="Sin incidencias"
                subtitle="Prueba ajustando los filtros."
                actionLabel={canCreate?"Nueva incidencia":undefined}
                onActionPress={canCreate?openCreate:undefined}
              />
            </View>
          )
        }
      />

      {canCreate&&(
        <View pointerEvents="box-none" style={[styles.fabWrap,{paddingRight:16+(insets?.right||0),paddingBottom:16+(insets?.bottom||0)}]}>
          <Pressable onPress={openCreate} style={styles.fab} hitSlop={12}>
            <Text style={styles.fabTxt}>Nueva incidencia</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
