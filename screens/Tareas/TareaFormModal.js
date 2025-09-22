// screens/Tareas/TareaFormModal.js
import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSession } from '../../app/store/session';
import { tareasRepository } from '../../data/repositories/tareasRepository';
import Toast from '../../components/ui/Toast';
import { can } from '../../utils/permits';

const PRIORIDADES = ['baja', 'media', 'alta', 'critica'];

// 🔒 Estilos estáticos (sin colores)
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12, gap: 6 },
  h1: { fontSize: 18, fontWeight: '800' },
  input: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnText: { fontWeight: '800' },
});

export default function TareaFormModal() {
  const theme = useAppTheme();
  const { colors, palette: p } = theme ?? {};

  // 🎨 Paleta UI con fallbacks suaves
  const ui = useMemo(() => ({
    bg: colors?.background ?? '#0B0B0B',
    text: colors?.text ?? '#FFFFFF',
    textMuted: p?.textMuted ?? '#9AA0A6',
    inputBg: p?.inputBg ?? colors?.surface ?? '#111317',
    inputBorder: p?.inputBorder ?? colors?.border ?? '#22252B',
    buttonBg: colors?.surface ?? '#1E2026',
    buttonBorder: colors?.border ?? '#2C2F36',
    buttonText: colors?.text ?? '#FFFFFF',
  }), [colors, p]);

  const nav = useNavigation();
  const route = useRoute();
  const mode = route.params?.mode || 'create';
  const preset = route.params?.preset || {};
  const base = route.params?.item || {};

  const session = useSession();
  const user = useMemo(() => session?.user ?? { id: 'anon', role: 'tecnico' }, [session?.user]);
  const userId = user.id;
  const userRole = user.role;

  const [titulo, setTitulo] = useState(base.titulo || '');
  const [descripcion, setDescripcion] = useState(base.descripcion || '');
  const [asignado, setAsignado] = useState(base.asignado_a_usuario || preset.asignado_a_usuario || '');
  const [prioridad, setPrioridad] = useState(base.prioridad || 'media');
  const [fecha, setFecha] = useState(base.fecha_limite || '');
  const [equipoId, setEquipoId] = useState(base.equipo_id || preset.equipo_id || '');
  const [eventoId, setEventoId] = useState(base.evento_id || preset.evento_id || '');

  const canSubmit = can({ role: userRole }, mode === 'edit' ? 'task.edit' : 'task.create');

  const submit = useCallback(async () => {
    if (!canSubmit) return Toast.show('No autorizado');

    if (!titulo.trim() || !asignado.trim() || !prioridad.trim()) {
      return Toast.show('Faltan campos obligatorios.');
    }
    if (!PRIORIDADES.includes(prioridad)) {
      return Toast.show(`Prioridad inválida. Use: ${PRIORIDADES.join(', ')}`);
    }

    try {
      const payload = {
        titulo,
        descripcion,
        asignado_a_usuario: asignado,
        prioridad,
        fecha_limite: fecha || null,
        equipo_id: equipoId || null,
        evento_id: eventoId || null,
        estado: mode === 'edit' ? base.estado || 'pendiente' : 'pendiente',
        creado_por: userId,
      };

      if (mode === 'edit' && base?.id) {
        await tareasRepository.update(base.id, payload, { offlineEnqueueIfNoNet: true });
        Toast.show('Tarea actualizada');
      } else {
        const res = await tareasRepository.create(payload, { offlineEnqueueIfNoNet: true });
        Toast.show(res?.id?.startsWith('offline_') ? 'Guardada offline' : 'Tarea creada');
      }
      nav.goBack();
    } catch (e) {
      Toast.show(e.message || 'Error al guardar');
    }
  }, [canSubmit, mode, titulo, descripcion, asignado, prioridad, fecha, equipoId, eventoId, userId, nav, base?.id, base?.estado]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: ui.bg }]}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          <View style={styles.header}>
            <Text style={[styles.h1, { color: ui.text }]}>
              {mode === 'create' ? 'Nueva tarea' : 'Editar tarea'}
            </Text>
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: ui.inputBg, color: ui.text, borderColor: ui.inputBorder }]}
            value={titulo}
            onChangeText={setTitulo}
            placeholder="Título *"
            placeholderTextColor={ui.textMuted}
          />
          <TextInput
            style={[styles.input, { backgroundColor: ui.inputBg, color: ui.text, borderColor: ui.inputBorder }]}
            value={descripcion}
            onChangeText={setDescripcion}
            placeholder="Descripción"
            placeholderTextColor={ui.textMuted}
            multiline
          />
          <TextInput
            style={[styles.input, { backgroundColor: ui.inputBg, color: ui.text, borderColor: ui.inputBorder }]}
            value={asignado}
            onChangeText={setAsignado}
            placeholder="Asignado a (usr_*)"
            placeholderTextColor={ui.textMuted}
          />
          <TextInput
            style={[styles.input, { backgroundColor: ui.inputBg, color: ui.text, borderColor: ui.inputBorder }]}
            value={prioridad}
            onChangeText={setPrioridad}
            placeholder={`Prioridad (${PRIORIDADES.join('/')}) *`}
            placeholderTextColor={ui.textMuted}
          />
          <TextInput
            style={[styles.input, { backgroundColor: ui.inputBg, color: ui.text, borderColor: ui.inputBorder }]}
            value={fecha}
            onChangeText={setFecha}
            placeholder="Fecha límite (YYYY-MM-DD)"
            placeholderTextColor={ui.textMuted}
          />

          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: ui.inputBg, color: ui.text, borderColor: ui.inputBorder }]}
              value={equipoId}
              onChangeText={setEquipoId}
              placeholder="Equipo (EQ-*)"
              placeholderTextColor={ui.textMuted}
            />
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: ui.inputBg, color: ui.text, borderColor: ui.inputBorder }]}
              value={eventoId}
              onChangeText={setEventoId}
              placeholder="Evento (evt_*)"
              placeholderTextColor={ui.textMuted}
            />
          </View>

          <View style={[styles.row, { marginTop: 8 }]}>
            <Pressable onPress={submit} style={[styles.btn, { backgroundColor: ui.buttonBg, borderColor: ui.buttonBorder }]}>
              <Text style={[styles.btnText, { color: ui.buttonText }]}>Guardar</Text>
            </Pressable>
            <Pressable onPress={() => nav.goBack()} style={[styles.btn, { backgroundColor: ui.buttonBg, borderColor: ui.buttonBorder }]}>
              <Text style={[styles.btnText, { color: ui.buttonText }]}>Cancelar</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
