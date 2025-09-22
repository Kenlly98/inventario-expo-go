/* eslint-disable react-native/no-unused-styles */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeProvider';
import { useSession } from '../../app/store/session';
import Toast from '../../components/ui/Toast';
import { incidenciasRepository } from '../../data/repositories/incidenciasRepository';
import { enqueueIncidenciaCreate } from '../../data/offline/queue';

const SEVS = ['baja', 'media', 'alta', 'critica'];

function errMsg(code) {
  switch (code) {
    case 'MISSING_FIELDS': return 'Faltan campos obligatorios.';
    case 'UNAUTHORIZED': return 'No autorizado. Revisa tu configuración.';
    case 'SHEETS_ERROR': return 'Error de datos (Sheets). Intenta luego.';
    case 'NETWORK_ERROR': return 'Sin conexión. Guardado en cola.';
    default: return 'No se pudo completar la acción.';
  }
}

function createStyles(palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: palette.bg },
    header: { padding: 12, gap: 8 },
    h1: { color: palette.text, fontSize: 18, fontWeight: '800' },
    form: { padding: 12, gap: 12 },
    label: { color: palette.textMuted, fontSize: 12 },
    input: {
      backgroundColor: palette.inputBg,
      color: palette.text,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: palette.inputBorder,
    },
    inputOutline: {
      borderColor: palette.primary,
    },
    inputFocused: {
      borderColor: palette.primary,
      shadowColor: palette.primary,
      shadowOpacity: 0.35,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
      elevation: 4,
    },
    row: { flexDirection: 'row', gap: 8 },
    btn: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: palette.primary,
      borderWidth: 1,
      borderColor: palette.primaryBorder,
      alignItems: 'center',
    },
    btnTxt: { color: palette.onPrimary, fontWeight: '700' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.inputBorder,
      backgroundColor: palette.card,
    },
    chipActive: {
      borderColor: palette.primary,
      backgroundColor: palette.primarySoft,
      shadowColor: palette.primary,
      shadowOpacity: 0.25,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 0 },
      elevation: 3,
    },
    warn: { color: palette.warning, fontSize: 12 },
  });
}

export default function IncidenciaFormModal({ route, navigation }) {
  const { colors: palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const session = useSession();
  const user = session?.user ?? { name: 'Invitado' };

  const prefill = route?.params?.prefill || {};
  const onDone = route?.params?.onDone || (() => {});

  const [equipoId, setEquipoId] = useState(prefill.equipo_id || '');
  const [sev, setSev] = useState('media');
  const [desc, setDesc] = useState('');
  const [fotos, setFotos] = useState('');
  const [slaHoras, setSlaHoras] = useState('');

  const [focusEq, setFocusEq] = useState(false);
  const [focusDesc, setFocusDesc] = useState(false);
  const [focusFotos, setFocusFotos] = useState(false);
  const [focusSla, setFocusSla] = useState(false);

  function validate() {
    if (!equipoId?.trim()) return 'Equipo es obligatorio';
    if (!sev?.trim()) return 'Severidad es obligatoria';
    if (!desc?.trim()) return 'Descripción es obligatoria';
    return null;
  }

  async function submit() {
    const v = validate();
    if (v) { Toast.show(v); return; }

    const now = new Date();
    const payload = {
      equipo_id: equipoId.trim(),
      fecha_reporte: now.toISOString().slice(0, 16).replace('T', ' '),
      reportado_por: user?.name || 'Invitado',
      severidad: sev,
      descripcion: desc.trim(),
      fotos_urls: fotos.trim(),
      estado: 'abierta',
      sla_horas: slaHoras ? Number(slaHoras) : undefined,
    };

    try {
      await incidenciasRepository.create(payload);
      Toast.show('Incidencia creada');
      onDone?.();
      navigation.goBack();
    } catch (e) {
      if (e.code === 'NETWORK_ERROR') {
        await enqueueIncidenciaCreate(payload);
        Toast.show('Sin conexión — guardado en cola');
        onDone?.();
        navigation.goBack();
      } else {
        Toast.show(errMsg(e.code));
      }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={styles.header}>
            <Text style={styles.h1}>Nueva incidencia</Text>
            {sev === 'critica' && <Text style={styles.warn}>⚠ El equipo no podrá asignarse a eventos</Text>}
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Equipo ID</Text>
            <View style={styles.row}>
              <TextInput
                value={equipoId}
                onChangeText={setEquipoId}
                placeholder="EQ-0001"
                placeholderTextColor={palette.textMuted}
                onFocus={()=>setFocusEq(true)}
                onBlur={()=>setFocusEq(false)}
                style={[styles.input, styles.inputOutline, focusEq && styles.inputFocused, { flex:1 }]}
                autoCapitalize="characters"
              />
              <Pressable
                onPress={()=>{
                  Alert.prompt?.('Escanear/Ingresar','Ingresa/pega el código del equipo',(val)=>val && setEquipoId(val));
                }}
                style={[styles.btn,{paddingHorizontal:16}]}
              >
                <Text style={styles.btnTxt}>Scan</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Severidad</Text>
            <View style={styles.chipRow}>
              {SEVS.map(s=>(
                <Pressable key={s} onPress={()=>setSev(s)} style={[styles.chip, sev===s && styles.chipActive]}>
                  <Text style={{ color: palette.text }}>{s[0].toUpperCase()+s.slice(1)}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Descripción</Text>
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder="Describe el problema…"
              placeholderTextColor={palette.textMuted}
              onFocus={()=>setFocusDesc(true)}
              onBlur={()=>setFocusDesc(false)}
              style={[styles.input, styles.inputOutline, focusDesc && styles.inputFocused, {height:120,textAlignVertical:'top'}]}
              multiline
            />

            <Text style={styles.label}>Fotos (URLs separadas por |)</Text>
            <TextInput
              value={fotos}
              onChangeText={setFotos}
              placeholder="https://…|https://…"
              placeholderTextColor={palette.textMuted}
              onFocus={()=>setFocusFotos(true)}
              onBlur={()=>setFocusFotos(false)}
              style={[styles.input, styles.inputOutline, focusFotos && styles.inputFocused]}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>SLA horas (opcional)</Text>
            <TextInput
              value={String(slaHoras)}
              onChangeText={setSlaHoras}
              placeholder="24"
              placeholderTextColor={palette.textMuted}
              onFocus={()=>setFocusSla(true)}
              onBlur={()=>setFocusSla(false)}
              style={[styles.input, styles.inputOutline, focusSla && styles.inputFocused]}
              keyboardType="numeric"
            />

            <Pressable onPress={submit} style={styles.btn}>
              <Text style={styles.btnTxt}>Crear</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
