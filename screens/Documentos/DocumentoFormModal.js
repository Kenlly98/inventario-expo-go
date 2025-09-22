// screens/Documentos/DocumentoFormModal.js
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Modal, Pressable, StyleSheet, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { documentosRepository } from '../../data/repositories/documentosRepository';
import { format } from 'date-fns';
import NetInfo from '@react-native-community/netinfo';
import { useAppTheme } from '../../theme/ThemeProvider';

const todayIso = () => format(new Date(), 'yyyy-MM-dd');

export default function DocumentoFormModal({ visible, onClose, onCreated, presetEquipoId }) {
  const { colors } = useAppTheme();

  const [form, setForm] = useState({
    equipo_id: presetEquipoId || '',
    tipo: '',
    proveedor: '',
    monto_usd: '',
    moneda: 'USD',
    fecha: todayIso(),
    archivo_url: '',
    notas: '',
  });
  const [showDate, setShowDate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const valid = useMemo(() => {
    const montoOk = form.monto_usd === '' || Number(form.monto_usd) >= 0;
    const requiredOk = form.equipo_id && form.tipo && form.archivo_url && form.fecha;
    return montoOk && requiredOk;
  }, [form]);

  function upd(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function submit() {
    if (!valid) {
      Alert.alert('Atención', 'Faltan campos obligatorios o hay valores inválidos.');
      return;
    }
    // fecha <= hoy
    const d = new Date(form.fecha);
    const now = new Date();
    if (d > now) {
      Alert.alert('Atención', 'Fecha inválida.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        monto_usd: form.monto_usd === '' ? undefined : Number(form.monto_usd),
      };
      const info = await documentosRepository.link(payload);
      const state = await NetInfo.fetch();
      if (info._enqueued || !state.isConnected) {
        Alert.alert('Guardado', 'Sin conexión — guardado en cola');
      } else {
        Alert.alert('Éxito', 'Documento registrado');
      }
      onCreated?.();
      onClose?.();
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo completar la acción');
    } finally {
      setSubmitting(false);
    }
  }

  const inputBaseStyle = [
    styles.input,
    {
      borderColor: colors.primary,
      backgroundColor: colors.card || colors.surface,
      color: colors.text,
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.h1, { color: colors.text }]}>Nuevo documento</Text>

          <Text style={[styles.label, { color: colors.text }]}>Equipo (ID)</Text>
          <TextInput
            style={inputBaseStyle}
            value={form.equipo_id}
            onChangeText={(t) => upd('equipo_id', t.trim())}
            placeholder="EQ-0001"
            placeholderTextColor={colors.text + '80'}
            autoCapitalize="characters"
          />

          <Text style={[styles.label, { color: colors.text }]}>Tipo</Text>
          <TextInput
            style={inputBaseStyle}
            value={form.tipo}
            onChangeText={(t) => upd('tipo', t.trim().toLowerCase())}
            placeholder="factura, guía, contrato…"
            placeholderTextColor={colors.text + '80'}
          />

          <Text style={[styles.label, { color: colors.text }]}>Proveedor</Text>
          <TextInput
            style={inputBaseStyle}
            value={form.proveedor}
            onChangeText={(t) => upd('proveedor', t)}
            placeholder="Proveedor S.A.C."
            placeholderTextColor={colors.text + '80'}
          />

          <Text style={[styles.label, { color: colors.text }]}>Monto USD</Text>
          <TextInput
            style={inputBaseStyle}
            keyboardType="decimal-pad"
            value={String(form.monto_usd)}
            onChangeText={(t) => upd('monto_usd', t.replace(',', '.'))}
            placeholder="0.00"
            placeholderTextColor={colors.text + '80'}
          />

          <Text style={[styles.label, { color: colors.text }]}>Fecha</Text>
          <Pressable onPress={() => setShowDate(true)} style={inputBaseStyle}>
            <Text style={{ color: colors.text }}>{form.fecha}</Text>
          </Pressable>
          {showDate && (
            <DateTimePicker
              mode="date"
              value={new Date(form.fecha)}
              onChange={(_, d) => {
                setShowDate(false);
                if (d) upd('fecha', format(d, 'yyyy-MM-dd'));
              }}
            />
          )}

          <Text style={[styles.label, { color: colors.text }]}>URL de Drive</Text>
          <TextInput
            style={inputBaseStyle}
            value={form.archivo_url}
            onChangeText={(t) => upd('archivo_url', t.trim())}
            placeholder="Pega el enlace de Drive"
            placeholderTextColor={colors.text + '80'}
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: colors.text }]}>Notas</Text>
          <TextInput
            style={[...inputBaseStyle, { height: 80 }]}
            value={form.notas}
            onChangeText={(t) => upd('notas', t)}
            placeholder="Observaciones, N° documento…"
            placeholderTextColor={colors.text + '80'}
            multiline
          />

          <View style={styles.row}>
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
              disabled={submitting}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cancelar</Text>
            </Pressable>

            <Pressable
              onPress={submit}
              disabled={!valid || submitting}
              style={[
                styles.btn,
                {
                  backgroundColor: valid && !submitting ? colors.primary : colors.border,
                  opacity: valid && !submitting ? 1 : 0.7,
                },
              ]}
            >
              <Text style={styles.btnText}>{submitting ? 'Guardando…' : 'Guardar'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  card: { borderRadius: 16, padding: 16 },
  h1: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  label: { fontWeight: '600', marginTop: 8, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 10 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
});
