// screens/Evaluaciones/EvaluacionDetailModal.js
import React, { useMemo, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../theme/ThemeProvider';

const SCORE_KEYS = new Set([
  'fiabilidad','estado_fisico','limpieza','documentacion',
  'puntualidad','cumplimiento','comunicacion','proactividad',
  'planeacion','logistica','tiempo_respuesta','seguridad'
]);

function labelAction(a) {
  if (a === 'abrir_incidencia') return 'Crear Incidencia';
  if (a === 'revision_preventiva') return 'Crear OT (Revisión)';
  if (a === 'conversacion_capacitacion') return 'Programar 1:1';
  return 'Acción sugerida';
}

export default function EvaluacionDetailModal(){
  const { params } = useRoute();
  const nav = useNavigation();
  const { colors } = useAppTheme();

  // Título del header
  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Detalle evaluación',
      headerShown: true,
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text },
    });
  }, [nav, colors]);

  const it = useMemo(() => params?.eval || {}, [params?.eval]);

  const fotoLinks = useMemo(() => (
    String(it.fotos_urls || '').split('|').map(s => s.trim()).filter(Boolean)
  ), [it.fotos_urls]);

  const scored = useMemo(() => (
    Object.entries(it)
      .filter(([k,v]) => SCORE_KEYS.has(k) && v)
      .map(([k,v]) => ({ k, v: Number(v) }))
      .sort((a,b)=> a.k.localeCompare(b.k))
  ), [it]);

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.h1}>{it.target_label || it.target_id || '(sin nombre)'}</Text>
      <Text style={s.sub}>{it.target_type} · {it.promedio}/5 · {it.fecha}</Text>
      <Text style={s.sub}>Evaluador: {it.evaluador_nombre || '—'}</Text>

      {!!scored.length && (
        <>
          <Text style={s.h2}>Puntajes</Text>
          <View style={s.card}>
            {scored.map(({k,v}) => (
              <View key={k} style={s.row}>
                <Text style={s.k}>{k.replace('_',' ')}</Text>
                <Text style={s.v}>{v}/5</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={s.h2}>Comentarios</Text>
      <Text style={s.p}>{it.comentarios || '—'}</Text>

      {!!fotoLinks.length && (
        <>
          <Text style={s.h2}>Fotos</Text>
          {fotoLinks.map((u,idx)=>(
            <Pressable key={idx} onPress={()=> Linking.openURL(u)}>
              <Text style={s.link}>{u}</Text>
            </Pressable>
          ))}
        </>
      )}

      {!!it.accion_sugerida && !it.accion_referencia && (
        <Pressable style={s.cta} onPress={()=>{/* TODO: enlazar con flujo Incidencia/OT */}}>
          <Text style={s.ctaTxt}>{labelAction(it.accion_sugerida)}</Text>
        </Pressable>
      )}

      <View style={{height:24}} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap:{ padding:16 },
  h1:{ fontSize:20, fontWeight:'800' },
  sub:{ opacity:0.8, marginTop:4 },
  h2:{ fontSize:16, fontWeight:'700', marginTop:12, marginBottom:8 },
  card:{ backgroundColor:'#222', borderRadius:12, padding:12, marginBottom:8 },
  row:{ flexDirection:'row', justifyContent:'space-between', paddingVertical:4 },
  k:{ textTransform:'capitalize', opacity:0.9 },
  v:{ fontWeight:'700' },
  p:{ lineHeight:20, opacity:0.95 },
  link:{ color:'#6cf', marginBottom:6 },
  cta:{ backgroundColor:'#2e7', padding:12, borderRadius:12, alignItems:'center', marginTop:12 },
  ctaTxt:{ fontWeight:'800' },
});
