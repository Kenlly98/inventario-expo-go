import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { eventosRepository } from '../../data/repositories/eventosRepository';
import { enqueueEventoCreate } from '../../data/offline/queue';

const ESTADOS = ['planificado', 'en_curso', 'cerrado'];

function validate(values) {
  const errors = {};
  if (!values.nombre?.trim()) errors.nombre = 'Requerido';
  if (!values.fecha_inicio?.trim()) errors.fecha_inicio = 'Requerido';
  if (values.fecha_fin) {
    if (values.fecha_fin < values.fecha_inicio) errors.fecha_fin = 'Debe ser ≥ fecha de inicio';
  }
  if (values.estado && !ESTADOS.includes(values.estado)) errors.estado = 'Estado inválido';
  return errors;
}

export default function EventoFormModal({ onClose, onCreated }) {
  const [values, setValues] = useState({ nombre: '', fecha_inicio: '', fecha_fin: '', sede: '', responsable: '', estado: 'planificado', notas: '' });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (k, v) => setValues((s) => ({ ...s, [k]: v }));

  async function submit() {
    const errs = validate(values);
    if (Object.keys(errs).length) {
      const msg = errs.fecha_fin || errs.fecha_inicio || errs.nombre || errs.estado || 'Datos inválidos';
      Alert.alert('Validación', msg);
      return;
    }
    try {
      setSubmitting(true);
      const net = await NetInfo.fetch();
      if (!net?.isConnected) {
        await enqueueEventoCreate(values);
        Alert.alert('Sin conexión', 'Sin conexión — guardado en cola');
        onClose?.();
        onCreated?.('queued');
        return;
      }
      await eventosRepository.create(values);
      Alert.alert('Éxito', 'Evento creado');
      onClose?.();
      onCreated?.('created');
    } catch (e) {
      const map = {
        MISSING_FIELDS: 'Faltan campos obligatorios.',
        INVALID_DATE: 'Fecha inválida.',
        INVALID_STATE: 'Estado inválido.',
        UNAUTHORIZED: 'No autorizado. Revisa tu configuración.',
        NETWORK_ERROR: 'Sin conexión. Inténtalo de nuevo.',
      };
      Alert.alert('Error', map[e.code] || 'No se pudo completar la acción.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.h1}>Nuevo evento</Text>

        <Text style={styles.label}>Nombre*</Text>
        <TextInput placeholder="Nombre del evento" style={styles.input} value={values.nombre} onChangeText={(t)=>onChange('nombre', t)} />

        <Text style={styles.label}>Fecha inicio* (YYYY-MM-DD)</Text>
        <TextInput placeholder="YYYY-MM-DD" style={styles.input} value={values.fecha_inicio} onChangeText={(t)=>onChange('fecha_inicio', t)} />

        <Text style={styles.label}>Fecha fin (YYYY-MM-DD)</Text>
        <TextInput placeholder="YYYY-MM-DD" style={styles.input} value={values.fecha_fin} onChangeText={(t)=>onChange('fecha_fin', t)} />

        <Text style={styles.label}>Sede</Text>
        <TextInput placeholder="Lugar / local" style={styles.input} value={values.sede} onChangeText={(t)=>onChange('sede', t)} />

        <Text style={styles.label}>Responsable</Text>
        <TextInput placeholder="Nombre del responsable" style={styles.input} value={values.responsable} onChangeText={(t)=>onChange('responsable', t)} />

        <Text style={styles.label}>Estado</Text>
        <View style={styles.row}>
          {ESTADOS.map((e)=> (
            <Pressable key={e} onPress={()=>onChange('estado', e)} style={[styles.chip, values.estado===e && styles.chipActive]}>
              <Text style={[styles.chipText, values.estado===e && styles.chipTextActive]}>{e}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Notas</Text>
        <TextInput placeholder="Detalles de producción…" style={[styles.input, styles.textarea]} multiline value={values.notas} onChangeText={(t)=>onChange('notas', t)} />

        <View style={styles.actions}>
          <Pressable onPress={onClose} style={[styles.btn, styles.btnGhost]}><Text style={styles.btnGhostText}>Cancelar</Text></Pressable>
          <Pressable onPress={submit} disabled={submitting} style={[styles.btn, submitting && styles.btnDisabled]}>
            <Text style={styles.btnText}>{submitting ? 'Guardando…' : 'Crear'}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex:1, justifyContent:'center', padding:16, backgroundColor:'rgba(0,0,0,0.4)' },
  card: { backgroundColor:'#111', borderRadius:14, padding:16 },
  h1: { color:'#fff', fontSize:18, fontWeight:'700', marginBottom:12 },
  label: { color:'#bbb', fontSize:12, marginTop:8 },
  input: { backgroundColor:'#1c1c1c', color:'#fff', borderRadius:10, paddingHorizontal:12, paddingVertical:10, marginTop:6, borderWidth:1, borderColor:'#2a2a2a' },
  textarea: { height:100, textAlignVertical:'top' },
  row: { flexDirection:'row', gap:8, marginTop:6 },
  chip: { paddingHorizontal:10, paddingVertical:6, borderRadius:999, borderWidth:1, borderColor:'#2a2a2a' },
  chipActive: { backgroundColor:'#2a2a2a' },
  chipText: { color:'#bbb', fontSize:12 },
  chipTextActive: { color:'#fff' },
  actions: { flexDirection:'row', justifyContent:'flex-end', gap:12, marginTop:16 },
  btn: { backgroundColor:'#3a7', paddingHorizontal:14, paddingVertical:10, borderRadius:10 },
  btnDisabled: { opacity:0.6 },
  btnText: { color:'#fff', fontWeight:'700' },
  btnGhost: { backgroundColor:'transparent', borderWidth:1, borderColor:'#2a2a2a' },
  btnGhostText: { color:'#ddd' },
});
