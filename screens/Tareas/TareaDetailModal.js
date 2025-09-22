// screens/Tareas/TareaDetailModal.js
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSession } from '../../app/store/session';
import { can } from '../../utils/permits';
import Toast from '../../components/ui/Toast';
import { tareasRepository } from '../../data/repositories/tareasRepository';

// 🔒 Estilos estáticos (sin colores)
const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: 12, gap: 8 },
  h1: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 12 },
  value: { fontSize: 14 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  btn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  btnText: { fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
});

export default function TareaDetailModal() {
  const theme = useAppTheme();
  const { colors, palette: p } = theme ?? {};

  // 🎨 Paleta UI con fallbacks suaves
  const ui = useMemo(() => ({
    bg: colors?.background ?? '#0B0B0B',
    text: colors?.text ?? '#FFFFFF',
    textMuted: p?.textMuted ?? '#9AA0A6',
    surface: colors?.surface ?? '#151515',
    border: colors?.border ?? '#2A2A2A',
    buttonBg: colors?.surface ?? '#1E1E1E',
    buttonBorder: colors?.border ?? '#2A2A2A',
    buttonText: colors?.text ?? '#FFFFFF',
    badgeBorder: p?.inputBorder ?? colors?.border ?? '#2A2A2A',
  }), [colors, p]);

  const nav = useNavigation();
  const route = useRoute();
  const initial = route.params?.item || {};
  const [task, setTask] = useState(initial);

  const session = useSession();
  const user = useMemo(() => session?.user ?? { id: 'anon', role: 'tecnico' }, [session?.user]);
  const userId = user.id;
  const userRole = user.role;
  const taskId = task?.id;

  const doComplete = useCallback(() => {
    if (!can({ role: userRole }, 'task.complete')) { Toast.show('No autorizado'); return; }
    Alert.alert('Completar', '¿Marcar como completada?', [
      { text: 'Cancelar' },
      {
        text: 'Sí',
        style: 'destructive',
        onPress: async () => {
          try {
            const today = new Date().toISOString().slice(0, 10);
            await tareasRepository.complete(
              taskId,
              { completada_por: userId, fecha_cierre: today },
              { offlineEnqueueIfNoNet: true }
            );
            Toast.show('Tarea completada');
            setTask(prev => ({ ...prev, estado: 'completada', fecha_cierre: today }));
          } catch (e) {
            Toast.show(e.message || 'No se pudo completar');
          }
        },
      },
    ]);
  }, [taskId, userId, userRole]);

  const doDelete = useCallback(() => {
    if (!can({ role: userRole }, 'task.delete')) { Toast.show('No autorizado'); return; }
    Alert.alert('Eliminar', '¿Eliminar esta tarea?', [
      { text: 'Cancelar' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await tareasRepository.remove(taskId, { offlineEnqueueIfNoNet: true });
            Toast.show('Eliminada');
            nav.goBack();
          } catch (e) {
            Toast.show(e.message || 'No se pudo eliminar');
          }
        },
      },
    ]);
  }, [taskId, userRole, nav]);

  const goEdit = useCallback(() => {
    if (!can({ role: userRole }, 'task.edit')) { Toast.show('No autorizado'); return; }
    nav.navigate('TareaFormModal', { mode: 'edit', item: task });
  }, [userRole, nav, task]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: ui.bg }]}>
      <ScrollView contentContainerStyle={[styles.body]}>
        <Text style={[styles.h1, { color: ui.text }]} numberOfLines={2}>{task.titulo}</Text>

        <View style={[styles.row, { gap: 6, flexWrap: 'wrap' }]}>
          <View style={[styles.badge, { borderColor: ui.badgeBorder }]}>
            <Text style={[styles.value, { color: ui.text }]}>
              prioridad: {task.prioridad || '—'}
            </Text>
          </View>
          <View style={[styles.badge, { borderColor: ui.badgeBorder }]}>
            <Text style={[styles.value, { color: ui.text }]}>
              estado: {task.estado || '—'}
            </Text>
          </View>
        </View>

        <Text style={[styles.label, { color: ui.textMuted }]}>Descripción</Text>
        <Text style={[styles.value, { color: ui.text }]}>{task.descripcion || '—'}</Text>

        <Text style={[styles.label, { color: ui.textMuted }]}>Asignado a</Text>
        <Text style={[styles.value, { color: ui.text }]}>{task.asignado_a_usuario || '—'}</Text>

        <Text style={[styles.label, { color: ui.textMuted }]}>Equipo / Evento</Text>
        <Text style={[styles.value, { color: ui.text }]}>
          {task.equipo_id || '—'} · {task.evento_id || '—'}
        </Text>

        <Text style={[styles.label, { color: ui.textMuted }]}>Fechas</Text>
        <Text style={[styles.value, { color: ui.text }]}>
          Límite: {task.fecha_limite || '—'} · Creación: {task.fecha_creacion || '—'} · Cierre: {task.fecha_cierre || '—'}
        </Text>

        <View style={[styles.row, { gap: 10, marginTop: 10, flexWrap: 'wrap' }]}>
          {can({ role: userRole }, 'task.edit') && (
            <Pressable onPress={goEdit} style={[styles.btn, { backgroundColor: ui.buttonBg, borderColor: ui.buttonBorder }]}>
              <Text style={[styles.btnText, { color: ui.buttonText }]}>Editar</Text>
            </Pressable>
          )}
          {can({ role: userRole }, 'task.complete') && task.estado !== 'completada' && (
            <Pressable onPress={doComplete} style={[styles.btn, { backgroundColor: ui.buttonBg, borderColor: ui.buttonBorder }]}>
              <Text style={[styles.btnText, { color: ui.buttonText }]}>Completar</Text>
            </Pressable>
          )}
          {can({ role: userRole }, 'task.delete') && (
            <Pressable onPress={doDelete} style={[styles.btn, { backgroundColor: ui.buttonBg, borderColor: ui.buttonBorder }]}>
              <Text style={[styles.btnText, { color: ui.buttonText }]}>Eliminar</Text>
            </Pressable>
          )}
          <Pressable onPress={() => nav.goBack()} style={[styles.btn, { backgroundColor: ui.buttonBg, borderColor: ui.buttonBorder }]}>
            <Text style={[styles.btnText, { color: ui.buttonText }]}>Cerrar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
