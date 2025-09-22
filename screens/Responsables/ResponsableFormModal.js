// screens/Responsables/ResponsableFormModal.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useSession } from '../../app/store/session';
import { can } from '../../utils/permits';
import * as respRepo from '../../data/repositories/responsablesRepository';
import { catalogsRepository } from '../../data/repositories';

/* util: hex -> rgba con opacidad */
function alpha(hex = '#000000', a = 0.16) {
  const h = hex.replace('#','');
  const r = parseInt(h.length === 3 ? h[0]+h[0] : h.slice(0,2), 16);
  const g = parseInt(h.length === 3 ? h[1]+h[1] : h.slice(2,4), 16);
  const b = parseInt(h.length === 3 ? h[2]+h[2] : h.slice(4,6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export default function ResponsableFormModal() {
  const nav = useNavigation();
  const route = useRoute();

  const theme = useAppTheme();
  const { colors, palette: p } = theme ?? {};

  // 🎨 Paleta UI (respetando tema con fallbacks suaves)
  const ui = useMemo(() => ({
    bg: colors?.background ?? '#0b0b0b',
    text: colors?.text ?? '#ffffff',
    textMuted: p?.textMuted ?? '#9aa0a6',
    card: p?.card ?? colors?.surface ?? '#141414',
    surface: colors?.surface ?? p?.card ?? '#141414',
    inputBg: p?.inputBg ?? colors?.surface ?? '#131313',
    inputBorder: p?.inputBorder ?? colors?.border ?? '#2a2a2a',
    border: colors?.border ?? '#2a2a2a',
    primary: colors?.primary ?? '#2563eb',
    onPrimary: p?.onPrimary ?? '#ffffff',
    primarySoft: alpha(colors?.primary ?? '#2563eb', 0.16),
  }), [colors, p]);

  const session = useSession();
  const user = session?.user ?? { role: 'super_admin' };

  const mode = route.params?.mode || 'create';
  const base = useMemo(() => route.params?.item || {}, [route.params?.item]);

  const allowCreate = can(user, 'resp.create');
  const allowEdit = can(user, 'resp.edit');
  const canSubmit = mode === 'create' ? allowCreate : allowEdit;

  const [catalogs, setCatalogs] = useState({
    familias: [],
    modelos_by_familia: {},
    usuarios_min: [],
  });

  const [usuarioId, setUsuarioId] = useState(base.usuario_id || '');
  const [familia, setFamilia] = useState(base.familia || '');
  const [modelosSel, setModelosSel] = useState(
    (base.modelos_asignados || '').split('|').filter(Boolean),
  );
  const [sla, setSla] = useState(String(base.kpi_objetivo_sla_horas ?? '24'));
  const [mttr, setMttr] = useState(String(base.kpi_objetivo_mttr_h ?? '8'));
  const [disp, setDisp] = useState(String(base.kpi_objetivo_disponibilidad_pct ?? '95'));

  useEffect(() => {
    setUsuarioId(base.usuario_id || '');
    setFamilia(base.familia || '');
    setModelosSel((base.modelos_asignados || '').split('|').filter(Boolean));
    setSla(String(base.kpi_objetivo_sla_horas ?? '24'));
    setMttr(String(base.kpi_objetivo_mttr_h ?? '8'));
    setDisp(String(base.kpi_objetivo_disponibilidad_pct ?? '95'));
  }, [base]);

  const modelosFamilia = useMemo(
    () => catalogs.modelos_by_familia?.[familia] || [],
    [catalogs, familia],
  );

  useEffect(() => {
    (async () => {
      try {
        const c = await catalogsRepository.all();
        setCatalogs(c || {});
      } catch (e) {
        Alert.alert('Catálogos', e.message || 'No se pudo cargar catálogos.');
      }
    })();
  }, []);

  const toggleModelo = (m) => {
    setModelosSel((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const onSubmit = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Permisos', 'No autorizado.');
      return;
    }

    const nSla = Number(sla);
    const nMttr = Number(mttr);
    const nDisp = Number(disp);

    if (!usuarioId || !familia) {
      Alert.alert('Validación', 'Usuario y familia son obligatorios.');
      return;
    }
    if (Number.isNaN(nSla) || nSla < 0) {
      Alert.alert('Validación', 'SLA inválido.');
      return;
    }
    if (Number.isNaN(nMttr) || nMttr < 0) {
      Alert.alert('Validación', 'MTTR inválido.');
      return;
    }
    if (Number.isNaN(nDisp) || nDisp < 0 || nDisp > 100) {
      Alert.alert('Validación', 'Disponibilidad 0–100.');
      return;
    }
    const validSet = new Set(modelosFamilia);
    for (const m of modelosSel) {
      if (!validSet.has(m)) {
        Alert.alert('Validación', 'Modelos no pertenecen a la familia seleccionada.');
        return;
      }
    }

    const payload = {
      usuario_id: usuarioId,
      familia,
      modelos_asignados: modelosSel.join('|'),
      kpi_objetivo_sla_horas: nSla,
      kpi_objetivo_mttr_h: nMttr,
      kpi_objetivo_disponibilidad_pct: nDisp,
    };

    try {
      if (mode === 'create') {
        await respRepo.create(payload);
      } else {
        await respRepo.update(
          { usuario_id: base.usuario_id, familia: base.familia },
          payload,
        );
      }
      Alert.alert('OK', 'Asignación guardada.');
      nav.goBack();
    } catch (e) {
      Alert.alert('Error', e.message || 'No se pudo guardar.');
    }
  }, [canSubmit, mode, usuarioId, familia, modelosSel, sla, mttr, disp, modelosFamilia, base, nav]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ui.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: ui.text, fontSize: 20, fontWeight: '800', marginBottom: 12 }}>
          {mode === 'create' ? 'Nueva asignación' : 'Editar asignación'}
        </Text>

        <Text style={{ color: ui.textMuted, marginBottom: 4 }}>Usuario (id)</Text>
        <TextInput
          placeholder="usr_0001"
          placeholderTextColor={ui.textMuted}
          value={usuarioId}
          onChangeText={setUsuarioId}
          style={[
            styles.input,
            { backgroundColor: ui.inputBg, borderColor: ui.inputBorder, color: ui.text },
          ]}
        />
        <Text style={{ color: ui.textMuted, fontSize: 12, marginBottom: 8 }}>
          Tip: pronto un picker de usuarios (usuarios_min). Por ahora ingresa el id exacto.
        </Text>

        <Text style={{ color: ui.textMuted, marginBottom: 4 }}>Familia</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(catalogs.familias || []).map((f) => {
            const active = f === familia;
            return (
              <Pressable
                key={f}
                onPress={() => { setFamilia(f); setModelosSel([]); }}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? ui.primary : ui.inputBorder,
                    backgroundColor: active ? ui.primarySoft : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: active ? ui.primary : ui.text }}>{f}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={{ color: ui.textMuted, marginTop: 12, marginBottom: 4 }}>
          Modelos asignados
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {modelosFamilia.map((m) => {
            const active = modelosSel.includes(m);
            return (
              <Pressable
                key={m}
                onPress={() => toggleModelo(m)}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? ui.primary : ui.inputBorder,
                    backgroundColor: active ? ui.primarySoft : 'transparent',
                  },
                ]}
              >
                <Text style={{ color: active ? ui.primary : ui.text }}>{m}</Text>
              </Pressable>
            );
          })}
          {!modelosFamilia.length && (
            <Text style={{ color: ui.textMuted }}>
              Selecciona una familia para ver modelos.
            </Text>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: ui.textMuted, marginBottom: 4 }}>SLA (h)</Text>
            <TextInput
              keyboardType="numeric"
              value={sla}
              onChangeText={setSla}
              placeholder="24"
              placeholderTextColor={ui.textMuted}
              style={[
                styles.input,
                { backgroundColor: ui.inputBg, borderColor: ui.inputBorder, color: ui.text },
              ]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: ui.textMuted, marginBottom: 4 }}>MTTR (h)</Text>
            <TextInput
              keyboardType="numeric"
              value={mttr}
              onChangeText={setMttr}
              placeholder="8"
              placeholderTextColor={ui.textMuted}
              style={[
                styles.input,
                { backgroundColor: ui.inputBg, borderColor: ui.inputBorder, color: ui.text },
              ]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: ui.textMuted, marginBottom: 4 }}>Disp. (%)</Text>
            <TextInput
              keyboardType="numeric"
              value={disp}
              onChangeText={setDisp}
              placeholder="95"
              placeholderTextColor={ui.textMuted}
              style={[
                styles.input,
                { backgroundColor: ui.inputBg, borderColor: ui.inputBorder, color: ui.text },
              ]}
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
          <Pressable onPress={() => nav.goBack()} style={[styles.btn, { backgroundColor: ui.surface }]}>
            <Text style={{ color: ui.text }}>Cancelar</Text>
          </Pressable>
          <Pressable
            onPress={onSubmit}
            style={[styles.btn, { backgroundColor: canSubmit ? ui.primary : ui.inputBorder }]}
            disabled={!canSubmit}
          >
            <Text style={{ color: canSubmit ? ui.onPrimary : ui.textMuted, fontWeight: '800' }}>
              Guardar
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  btn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, flex: 1, alignItems: 'center' },
});
