// screens/Evaluaciones/EvaluacionFormModal.js
import React, { useMemo, useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import * as repo from '../../data/repositories/evaluacionesRepository';
import { enqueueEvaluacionCreate, enqueue } from '../../data/offline/queue';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../../theme/ThemeProvider';

const FIELDS = {
  equipo: ['fiabilidad','estado_fisico','limpieza','documentacion'],
  responsable: ['puntualidad','cumplimiento','comunicacion','proactividad'],
  evento: ['planeacion','logistica','tiempo_respuesta','seguridad'],
};

function clampScore(v){ const n = Number(v); if (Number.isNaN(n)) return ''; return Math.max(1, Math.min(5, Math.round(n))); }
function suggestAction(type, avg){ if (type==='equipo'){ if (avg<=2) return 'abrir_incidencia'; if (avg===3) return 'revision_preventiva'; } if (type==='responsable' && avg<=2) return 'conversacion_capacitacion'; return 'ninguna'; }
function pickTextOn(bg = '#2EE88A'){ const c=bg.replace('#',''); const r=parseInt(c.slice(0,2),16)/255, g=parseInt(c.slice(2,4),16)/255, b=parseInt(c.slice(4,6),16)/255; const L=0.2126*r+0.7152*g+0.0722*b; return L>0.6?'#0B0B0C':'#FFFFFF'; }

export default function EvaluacionFormModal(){
  const nav = useNavigation();
  const { params } = useRoute();
  const { colors } = useAppTheme();

  // Título del header
  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Nueva evaluación',
      headerShown: true,
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text },
    });
  }, [nav, colors]);

  const s = useMemo(() => makeStyles(colors), [colors]);

  const initialType = ['equipo','responsable','evento'].includes(params?.defaultType) ? params.defaultType : 'equipo';

  const [target_type, setType] = useState(initialType);
  const [target_id, setTargetId] = useState('');
  const [target_label, setTargetLabel] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0,10));
  const [evaluador_nombre, setEvaluadorNombre] = useState('Kenlly');
  const [comentarios, setComentarios] = useState('');
  const [fotos_urls, setFotos] = useState('');
  const [scores, setScores] = useState({});
  const [sending, setSending] = useState(false);

  const keys = useMemo(() => FIELDS[target_type] ?? [], [target_type]);
  const promedio = useMemo(() => {
    if (!keys.length) return 0;
    const vals = keys.map(k => Number(scores[k])).filter(v => v>=1 && v<=5);
    if (!vals.length) return 0;
    return Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*100)/100;
  }, [scores, keys]);

  const accion_sugerida = useMemo(() => suggestAction(target_type, promedio), [target_type, promedio]);
  const updateScore = useCallback((k, v) => setScores(sx => ({ ...sx, [k]: clampScore(v) })), []);

  async function submit(){
    const safeType = ['equipo','responsable','evento'].includes(target_type) ? target_type : 'equipo';
    if (!safeType || !target_id || !fecha) return Alert.alert('Validación','Faltan campos obligatorios (tipo, target y fecha).');

    const validFields = FIELDS[safeType] ?? [];
    const validScores = validFields.map(k => Number(scores[k])).filter(v => v>=1 && v<=5);
    if (validScores.length < 2) return Alert.alert('Validación','Ingresa al menos 2 puntajes.');
    if (promedio <= 2 && !comentarios.trim()) return Alert.alert('Validación','Comentario requerido para promedio ≤ 2.');

    const payload = { target_type:safeType, target_id, target_label, fecha, evaluador_nombre, comentarios, fotos_urls, promedio, ...scores, accion_sugerida };

    setSending(true);
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        if (enqueueEvaluacionCreate) await enqueueEvaluacionCreate(payload);
        else await enqueue({ endpoint:'evaluaciones/create', method:'POST', payload, type:'evaluaciones.create' });
        Alert.alert('Offline','Sin conexión — guardado en cola'); return nav.goBack();
      }
      await repo.create(payload);
      Alert.alert('OK','Evaluación registrada');
      nav.goBack();
    } catch (e) {
      Alert.alert('Error', e.code || e.message || 'No se pudo completar la acción.');
    } finally { setSending(false); }
  }

  // UI
  return (
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.wrap}>
        <Text style={s.h1}>Nueva evaluación</Text>

        <Text style={s.lbl}>Tipo</Text>
        <TextInput
          style={s.input}
          autoCapitalize="none"
          value={target_type}
          onChangeText={(t)=> setType(['equipo','responsable','evento'].includes(t) ? t : 'equipo')}
          placeholder="equipo|responsable|evento"
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
        />

        <Text style={s.lbl}>Target ID</Text>
        <TextInput
          style={s.input}
          autoCapitalize="none"
          value={target_id}
          onChangeText={setTargetId}
          placeholder="EQ-0001 / usr_0001 / ev_0001"
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
        />

        <Text style={s.lbl}>Target label (visible)</Text>
        <TextInput
          style={s.input}
          value={target_label}
          onChangeText={setTargetLabel}
          placeholder="Nombre visible del equipo/persona/evento"
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
        />

        <View style={s.row2}>
          <View style={{flex:1, marginRight:8}}>
            <Text style={s.lbl}>Fecha (YYYY-MM-DD)</Text>
            <TextInput
              style={s.input}
              autoCapitalize="none"
              value={fecha}
              onChangeText={setFecha}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.placeholder}
              selectionColor={colors.primary}
              cursorColor={colors.primary}
            />
          </View>
          <View style={{flex:1}}>
            <Text style={s.lbl}>Evaluador</Text>
            <TextInput
              style={s.input}
              value={evaluador_nombre}
              onChangeText={setEvaluadorNombre}
              placeholder="Tu nombre"
              placeholderTextColor={colors.placeholder}
              selectionColor={colors.primary}
              cursorColor={colors.primary}
            />
          </View>
        </View>

        <Text style={s.h2}>Puntajes</Text>
        {(keys || []).map(k => (
          <View key={k} style={s.row}>
            <Text style={[s.lbl,{flex:1, marginRight:8, textTransform:'capitalize'}]}>{k}</Text>
            <TextInput
              style={s.inputMini}
              keyboardType="numeric"
              value={String(scores[k] ?? '')}
              onChangeText={(v)=> updateScore(k, v)}
              placeholder="1-5"
              placeholderTextColor={colors.placeholder}
              selectionColor={colors.primary}
              cursorColor={colors.primary}
              maxLength={1}
            />
          </View>
        ))}

        <View style={s.row2}>
          <View style={{flex:1, marginRight:8}}>
            <Text style={s.lbl}>Promedio</Text>
            <Text style={s.avg}>{promedio || '-'}</Text>
          </View>
          <View style={{flex:1}}>
            <Text style={s.lbl}>Acción sugerida</Text>
            <Text style={s.badge}>{accion_sugerida}</Text>
          </View>
        </View>

        <Text style={s.lbl}>Comentarios {promedio <= 2 ? '(obligatorio para ≤ 2)' : '(opcional)'}</Text>
        <TextInput
          style={[s.input,{height:100}]}
          value={comentarios}
          onChangeText={setComentarios}
          multiline
          placeholder="Observaciones…"
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
        />

        <Text style={s.lbl}>Fotos URLs (separadas por |)</Text>
        <TextInput
          style={s.input}
          autoCapitalize="none"
          value={fotos_urls}
          onChangeText={setFotos}
          placeholder="https://...|https://..."
          placeholderTextColor={colors.placeholder}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
        />

        <Pressable style={[s.btn, sending && {opacity:0.6}]} onPress={submit} disabled={sending}>
          <Text style={[s.btnTxt, { color: pickTextOn(colors.primary) }]}>{sending ? 'Guardando…' : 'Guardar'}</Text>
        </Pressable>

        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Estilos dependientes del tema (objeto plano)
function makeStyles(colors){
  return {
    wrap:{ padding:16, backgroundColor: colors.bg || colors.background },
    h1:{ fontSize:20, fontWeight:'700', marginBottom:12, color: colors.text },
    h2:{ fontSize:16, fontWeight:'700', marginTop:8, marginBottom:6, color: colors.text },
    lbl:{ color: colors.textMuted, marginBottom:6 },

    // Bordes del color del tema (sin halo)
    input:{
      backgroundColor: colors.inputBg,
      color: colors.text,
      borderRadius:10,
      padding:10,
      marginBottom:10,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    inputMini:{
      backgroundColor: colors.inputBg,
      color: colors.text,
      borderRadius:10,
      paddingVertical:8,
      paddingHorizontal:10,
      width:70,
      textAlign:'center',
      borderWidth: 1.5,
      borderColor: colors.primary,
    },

    row:{ flexDirection:'row', alignItems:'center', marginBottom:8 },
    row2:{ flexDirection:'row', marginBottom:8 },
    avg:{ fontWeight:'800', fontSize:18, marginBottom:12, color: colors.text },
    badge:{
      backgroundColor: colors.inputBg,
      borderRadius:10,
      paddingHorizontal:10,
      paddingVertical:6,
      alignSelf:'flex-start',
      borderWidth: 1.5,
      borderColor: colors.inputBorder,
      color: colors.text,
      textTransform:'capitalize',
    },
    btn:{ backgroundColor: colors.primary, padding:12, borderRadius:12, alignItems:'center', marginTop:8 },
    btnTxt:{ fontWeight:'700' },
  };
}
