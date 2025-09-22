// screens/OrdenesTrabajo/OTForm.js
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator,
  Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import { useAppTheme } from '../../theme/ThemeProvider';
import { otsRepository } from '../../data/repositories/otsRepository';
import { useCatalog } from '../../hooks/useCatalogs';

function ListModal({ visible, title, items, onPick, onClose, palette, colors }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(
    () => (items || []).filter(x => String(x).toLowerCase().includes(q.toLowerCase())),
    [items, q]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: palette.bg,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: 12,
          maxHeight: '80%',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        }}>
          <Text style={{ color: palette.text, fontWeight: '800', fontSize: 16, marginBottom: 8 }}>
            {title}
          </Text>

          <TextInput
            placeholder="Buscar…"
            placeholderTextColor={palette.textMuted}
            value={q}
            onChangeText={setQ}
            style={[
              styles.input,
              { backgroundColor: palette.inputBg, color: palette.text, borderColor: palette.inputBorder, marginBottom: 8 }
            ]}
          />

          <FlatList
            data={filtered}
            keyExtractor={(it, i) => String(it || i)}
            renderItem={({ item }) => (
              <Pressable onPress={() => { onPick(item); onClose(); }} style={{ paddingVertical: 10 }}>
                <Text style={{ color: palette.text }}>{String(item)}</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={{ color: palette.textMuted, paddingVertical: 8 }}>Sin resultados</Text>
            }
          />

          <Pressable onPress={onClose} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
            <Text style={{ color: palette.primary, fontWeight: '700' }}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function OTForm() {
  const nav = useNavigation();
  const route = useRoute();

  const theme = useAppTheme();
  const { colors, palette: p } = theme ?? {};

  // 🎨 Fallbacks SUAVES (respetan tu tema y rellenan claves faltantes)
  const palette = useMemo(() => ({
    bg: colors?.background ?? '#0B0B0B',
    text: colors?.text ?? '#FFFFFF',
    textMuted: p?.textMuted ?? '#9CA3AF',
    cardBorder: p?.cardBorder ?? colors?.border ?? '#242424',
    inputBg: p?.inputBg ?? colors?.surface ?? '#141414',
    inputBorder: p?.inputBorder ?? colors?.border ?? '#2A2A2A',
    primary: colors?.primary ?? '#4F46E5',
  }), [colors, p]);

  const mode = route.params?.mode ?? 'create';
  const initial = route.params?.initial ?? null;
  const isEdit = mode === 'edit';

  const [form, setForm] = useState({
    titulo: initial?.titulo || '',
    equipo_id: initial?.equipo_id || '',
    responsable: initial?.responsable || '',
    proveedor: initial?.proveedor || '',
    repuestos: initial?.repuestos || [],
    fecha_programada: initial?.fecha_programada || '',
    notas: initial?.notas || '',
  });
  const [saving, setSaving] = useState(false);

  // Catálogos con badge (cache)
  const { items: responsables = [], offline: offR } = useCatalog('responsables');
  const { items: proveedores  = [], offline: offP } = useCatalog('proveedores');
  const { items: repuestos    = [], offline: offRep } = useCatalog('repuestos');

  // Modales
  const [pickResp, setPickResp] = useState(false);
  const [pickProv, setPickProv] = useState(false);
  const [pickRep,  setPickRep]  = useState(false);

  async function onSubmit() {
    try {
      if (!form.titulo.trim()) throw new Error('Título es obligatorio');
      if (!form.responsable)  throw new Error('Responsable es obligatorio');
      setSaving(true);
      if (isEdit) {
        await otsRepository.update(initial.id, form);
      } else {
        await otsRepository.create(form);
      }
      nav.goBack();
    } catch (e) {
      const msg =
        e?.code === 'CATALOG_INVALID' ? e.message :
        /UNAUTHORIZED/.test(e?.code || '') ? 'No autorizado. Revisa tu configuración.' :
        /SHEETS_ERROR/.test(e?.code || '') ? 'Error en datos (Sheets).' :
        /NETWORK/.test(e?.code || '') ? 'Sin conexión — usando cache.' :
        e?.message || 'No se pudo guardar la OT';
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  function toggleRepuesto(r) {
    setForm(prev => {
      const on = prev.repuestos.includes(r);
      return { ...prev, repuestos: on ? prev.repuestos.filter(x => x !== r) : [...prev.repuestos, r] };
    });
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
      <View style={[styles.header, { borderColor: colors?.border }]}>
        <Text style={[styles.h1, { color: palette.text }]}>{isEdit ? 'Editar OT' : 'Nueva OT'}</Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.label, { color: palette.textMuted }]}>Título *</Text>
        <TextInput
          value={form.titulo}
          onChangeText={v => setForm(f => ({ ...f, titulo: v }))}
          placeholder="Ej. Cambio de lámpara…"
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            { backgroundColor: palette.inputBg, color: palette.text, borderColor: palette.inputBorder }
          ]}
        />

        <Text style={[styles.label, { color: palette.textMuted }]}>Equipo (ID / etiqueta)</Text>
        <TextInput
          value={form.equipo_id}
          onChangeText={v => setForm(f => ({ ...f, equipo_id: v }))}
          placeholder="Ej. P-01, M.01…"
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            { backgroundColor: palette.inputBg, color: palette.text, borderColor: palette.inputBorder }
          ]}
        />

        <Text style={[styles.label, { color: palette.textMuted }]}>
          Responsable * {offR ? '(cache)' : ''}
        </Text>
        <Pressable
          onPress={() => setPickResp(true)}
          style={[
            styles.input,
            { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, justifyContent: 'center' }
          ]}
        >
          <Text style={{ color: form.responsable ? palette.text : palette.textMuted }}>
            {form.responsable || 'Seleccionar…'}
          </Text>
        </Pressable>

        <Text style={[styles.label, { color: palette.textMuted }]}>
          Proveedor {offP ? '(cache)' : ''}
        </Text>
        <Pressable
          onPress={() => setPickProv(true)}
          style={[
            styles.input,
            { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, justifyContent: 'center' }
          ]}
        >
          <Text style={{ color: form.proveedor ? palette.text : palette.textMuted }}>
            {form.proveedor || 'Seleccionar…'}
          </Text>
        </Pressable>

        <Text style={[styles.label, { color: palette.textMuted }]}>
          Repuestos {offRep ? '(cache)' : ''}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {form.repuestos.map(r => (
            <Pressable key={r} onPress={() => toggleRepuesto(r)} style={[styles.chip, { borderColor: palette.primary }]}>
              <Text style={[styles.chipText, { color: palette.primary }]}>{String(r)}</Text>
            </Pressable>
          ))}
          {!form.repuestos.length && (
            <Text style={{ color: palette.textMuted }}>—</Text>
          )}
          <Pressable
            onPress={() => setPickRep(true)}
            style={[styles.chip, { borderColor: palette.primary }]}
          >
            <Text style={[styles.chipText, { color: palette.primary }]}>Seleccionar</Text>
          </Pressable>
        </View>

        <Text style={[styles.label, { color: palette.textMuted }]}>Fecha programada (YYYY-MM-DD)</Text>
        <TextInput
          value={form.fecha_programada}
          onChangeText={v => setForm(f => ({ ...f, fecha_programada: v }))}
          placeholder="2025-10-01"
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            { backgroundColor: palette.inputBg, color: palette.text, borderColor: palette.inputBorder }
          ]}
        />

        <Text style={[styles.label, { color: palette.textMuted }]}>Notas</Text>
        <TextInput
          value={form.notas}
          onChangeText={v => setForm(f => ({ ...f, notas: v }))}
          placeholder="Detalles, seguridad, materiales…"
          placeholderTextColor={palette.textMuted}
          multiline
          style={[
            styles.input,
            { minHeight: 90, backgroundColor: palette.inputBg, color: palette.text, borderColor: palette.inputBorder }
          ]}
        />

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <Pressable
            onPress={() => !saving && onSubmit()}
            style={[styles.btn, { borderColor: palette.primary }]}
          >
            {saving
              ? <ActivityIndicator color={palette.primary} />
              : <Text style={{ color: palette.primary, fontWeight: '800' }}>
                  {isEdit ? 'Guardar cambios' : 'Crear OT'}
                </Text>
            }
          </Pressable>

          <Pressable
            onPress={() => nav.goBack()}
            style={[styles.btn, { borderColor: palette.inputBorder }]}
          >
            <Text style={{ color: palette.text }}>Cancelar</Text>
          </Pressable>
        </View>
      </View>

      {/* Modales */}
      <ListModal
        visible={pickResp}
        title="Selecciona responsable"
        items={responsables}
        onPick={v => setForm(f => ({ ...f, responsable: String(v) }))}
        onClose={() => setPickResp(false)}
        palette={palette}
        colors={colors}
      />

      <ListModal
        visible={pickProv}
        title="Selecciona proveedor"
        items={proveedores}
        onPick={v => setForm(f => ({ ...f, proveedor: String(v) }))}
        onClose={() => setPickProv(false)}
        palette={palette}
        colors={colors}
      />

      <Modal visible={pickRep} transparent animationType="slide" onRequestClose={() => setPickRep(false)}>
        <View style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: palette.bg,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            padding: 12,
            maxHeight: '80%',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors?.border,
          }}>
            <Text style={{ color: palette.text, fontWeight: '800', fontSize: 16, marginBottom: 8 }}>
              Selecciona repuestos
            </Text>
            <FlatList
              data={repuestos}
              keyExtractor={(it, i) => String(it || i)}
              renderItem={({ item }) => {
                const on = form.repuestos.includes(item);
                return (
                  <Pressable onPress={() => toggleRepuesto(item)} style={{ paddingVertical: 10 }}>
                    <Text style={{ color: on ? palette.primary : palette.text, fontWeight: on ? '800' : '400' }}>
                      {String(item)}
                    </Text>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text style={{ color: palette.textMuted, paddingVertical: 8 }}>Sin repuestos</Text>
              }
            />
            <Pressable onPress={() => setPickRep(false)} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
              <Text style={{ color: palette.primary, fontWeight: '700' }}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 12, borderBottomWidth: 1 },
  h1: { fontSize: 18, fontWeight: '800' },
  body: { padding: 12, gap: 12 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: '700' },
  btn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start' },
});
