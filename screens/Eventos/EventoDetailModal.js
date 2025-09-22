import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

export default function EventoDetailModal({ item, onClose }) {
  if (!item) return null;
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.h1}>{item.nombre}</Text>
        <Text style={styles.meta}>{item.fecha_inicio}{item.fecha_fin ? ` — ${item.fecha_fin}` : ''}</Text>
        {!!item.sede && <Text style={styles.meta}>Sede: {item.sede}</Text>}
        {!!item.responsable && <Text style={styles.meta}>Responsable: {item.responsable}</Text>}
        {!!item.estado && <Text style={styles.badge}>{item.estado}</Text>}
        {!!item.notas && <Text style={styles.notes}>{item.notas}</Text>}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Checklist de equipos (futuro)</Text>
          <Text style={styles.sectionHint}>Se integrará en v1</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accesos rápidos (futuro)</Text>
          <Text style={styles.sectionHint}>Hotel · Transporte · Documentos</Text>
        </View>

        <Pressable onPress={onClose} style={styles.btn}><Text style={styles.btnText}>Cerrar</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex:1, justifyContent:'center', padding:16, backgroundColor:'rgba(0,0,0,0.4)' },
  card: { backgroundColor:'#111', borderRadius:14, padding:16 },
  h1: { color:'#fff', fontSize:20, fontWeight:'800' },
  meta: { color:'#ccc', marginTop:4 },
  badge: { alignSelf:'flex-start', color:'#fff', backgroundColor:'#345', paddingHorizontal:8, paddingVertical:4, borderRadius:999, marginTop:8, textTransform:'capitalize' },
  notes: { color:'#ddd', marginTop:12 },
  section: { marginTop:16 },
  sectionTitle: { color:'#fff', fontWeight:'700' },
  sectionHint: { color:'#888', marginTop:4 },
  btn: { alignSelf:'flex-end', marginTop:16, backgroundColor:'#3a7', paddingHorizontal:14, paddingVertical:10, borderRadius:10 },
  btnText: { color:'#fff', fontWeight:'700' },
});
