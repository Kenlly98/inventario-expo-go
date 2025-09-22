// screens/Documentos/DocumentoDetailModal.js
import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Linking } from 'react-native';
import { useAppTheme } from '../../theme/ThemeProvider';

export default function DocumentoDetailModal({ visible, onClose, item }) {
  const { colors } = useAppTheme();
  if (!item) return null;

  const isDrive = String(item.archivo_url || '').includes('drive.google.com');
  const openLink = () => {
    const url = String(item.archivo_url || '').trim();
    if (url) Linking.openURL(url);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.h1, { color: colors.text }]}>Detalle del documento</Text>

          <Row label="ID" value={item.id} colors={colors} />
          <Row label="Equipo" value={item.equipo_id} colors={colors} />
          <Row label="Tipo" value={item.tipo} colors={colors} />
          <Row label="Proveedor" value={item.proveedor} colors={colors} />
          <Row label="Monto" value={item.monto_usd != null ? `$ ${item.monto_usd}` : '-'} colors={colors} />
          <Row label="Moneda" value={item.moneda || 'USD'} colors={colors} />
          <Row label="Fecha" value={item.fecha} colors={colors} />
          <Row label="Notas" value={item.notas || '-'} colors={colors} />
          <Row label="Actualizado" value={item.updated_at} colors={colors} />

          <View style={{ height: 12 }} />

          <Pressable onPress={openLink} style={[styles.btn, { backgroundColor: colors.primary }]}>
            <Text style={styles.btnText}>{isDrive ? 'Abrir en Drive' : 'Abrir enlace'}</Text>
          </Pressable>

          <Pressable
            onPress={onClose}
            style={[
              styles.btn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <Text style={{ fontWeight: '700', color: colors.text }}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value, colors }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.text, opacity: 0.75 }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]} numberOfLines={3}>
        {String(value ?? '-')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  card: { borderRadius: 16, padding: 16 },
  h1: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  row: { paddingVertical: 6 },
  label: { fontWeight: '600' },
  value: {},
  btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
});
