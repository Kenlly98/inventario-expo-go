// screens/Responsables/ResponsableDetailModal.js
import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useSession } from '../../app/store/session';
import { can } from '../../utils/permits';
import * as respRepo from '../../data/repositories/responsablesRepository';
import { ROUTES } from '../../navigation/routes';

export default function ResponsableDetailModal() {
  const nav = useNavigation();
  const route = useRoute();
  const { palette } = useAppTheme();
  const session = useSession();
  const user = session?.user ?? { role: 'super_admin' };

  const item = route.params?.item;
  const allowEdit = can(user, 'resp.edit');
  const allowDelete = can(user, 'resp.delete');

  if (!item) return null;

  const modelos = (item.modelos_asignados || '').split('|').filter(Boolean);

  const onEdit = () => {
    nav.navigate(ROUTES.RESPONSABLE_FORM, { mode: 'edit', item });
  };

  const onDelete = () => {
    if (!allowDelete) {
      Alert.alert('Permisos', 'Solo Super Admin puede eliminar.');
      return;
    }
    Alert.alert('Eliminar', '¿Desasignar este responsable de la familia?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            await respRepo.remove({ usuario_id: item.usuario_id, familia: item.familia });
            Alert.alert('OK', 'Desasignado.');
            nav.goBack();
          } catch (e) {
            Alert.alert('Error', e.message || 'No se pudo eliminar.');
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: palette.text, fontSize: 20, fontWeight: '800', marginBottom: 12 }}>
          {item.familia} • {item.usuario_nombre || item.usuario_id}
        </Text>

        <View style={{ gap: 6, marginBottom: 12 }}>
          <Text style={{ color: palette.textMuted }}>Usuario</Text>
          <Text style={{ color: palette.text }}>{item.usuario_nombre || item.usuario_id} {item.usuario_rol ? `(${item.usuario_rol})` : ''}</Text>
        </View>

        <View style={{ gap: 6, marginBottom: 12 }}>
          <Text style={{ color: palette.textMuted }}>Modelos asignados</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {modelos.length ? modelos.map(m => (
              <View key={m} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: palette.inputBorder }}>
                <Text style={{ color: palette.text }}>{m}</Text>
              </View>
            )) : <Text style={{ color: palette.textMuted }}>—</Text>}
          </View>
        </View>

        <View style={{ gap: 6, marginBottom: 12 }}>
          <Text style={{ color: palette.textMuted }}>Metas KPI</Text>
          <Text style={{ color: palette.text }}>
            SLA {item.kpi_objetivo_sla_horas ?? '—'}h · MTTR {item.kpi_objetivo_mttr_h ?? '—'}h · DISP {item.kpi_objetivo_disponibilidad_pct ?? '—'}%
          </Text>
        </View>

        {/* (Preparado) KPIs reales, cuando el dashboard los exponga */}
        {/* <View style={{ gap: 6, marginBottom: 12 }}>
          <Text style={{ color: palette.textMuted }}>KPIs reales</Text>
          <Text style={{ color: palette.text }}>SLA prom: —h · MTTR prom: —h · DISP: —%</Text>
        </View> */}

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <Pressable onPress={() => nav.goBack()} style={[styles.btn, { backgroundColor: palette.card }]}>
            <Text style={{ color: palette.text }}>Cerrar</Text>
          </Pressable>
          {allowEdit && (
            <Pressable onPress={onEdit} style={[styles.btn, { backgroundColor: palette.primary }]}>
              <Text style={{ color: palette.onPrimary, fontWeight: '800' }}>Editar</Text>
            </Pressable>
          )}
          {allowDelete && (
            <Pressable onPress={onDelete} style={[styles.btn, { backgroundColor: palette.danger }]}>
              <Text style={{ color: palette.onDanger, fontWeight: '800' }}>Eliminar</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, flex: 1, alignItems: 'center' },
});
