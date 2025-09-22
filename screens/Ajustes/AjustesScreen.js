// screens/Ajustes/AjustesScreen.js
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
  TextInput,
} from 'react-native';

import { useSession } from '../../app/store/session';
import { useAppTheme } from '../../theme/ThemeProvider';
import { THEMES, THEME_ORDER } from '../../theme/themes';
import client from '../../app/data/api/client';
import { catalogsRepository } from '../../data/repositories';

export default function AjustesScreen() {
  // ✅ hooks sin condicionales
  const session = useSession();
  const { mode, colors, setMode, palette } = useAppTheme();

  // 🎨 Paleta de texto consistente
  const textPrimary = colors?.text ?? palette?.text ?? '#fff';
  const textMuted   = palette?.textMuted ?? '#9aa0a6';

  // Fallbacks si no hay session provider
  const user = session?.user ?? { id: 'Kenlly', name: 'Kenlly', role: 'super admin' };
  const isLoggedIn = !!session?.user;
  const remember = !!session?.remember;

  const login = session?.login || (async () => { const err = new Error('NO_SESSION_PROVIDER'); err.code = 'NO_SESSION_PROVIDER'; throw err; });
  const logout = session?.logout || (async () => {});
  const forgetRememberedSession = session?.forgetRememberedSession || (async () => {});

  const [health, setHealth] = useState(null);         // { ok, ts, raw }
  const [backupInfo, setBackupInfo] = useState(null); // { name, url }
  const [cats, setCats] = useState(null);             // { counts, ts }

  // Login form
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginRemember, setLoginRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  const themeOptions = useMemo(
    () => THEME_ORDER.map((key) => ({ key, label: THEMES[key]?.name || key })),
    []
  );

  const canBackup = ['administracion', 'dueno', 'super admin'].includes(
    (user?.role || '').toLowerCase()
  );

  /* ────────── Acciones ────────── */
  function showLoginError(code) {
    const map = {
      USER_NOT_FOUND: 'Usuario no encontrado.',
      USER_INACTIVE: 'Usuario inactivo.',
      INVALID_PASSWORD: 'Contraseña incorrecta.',
      RATE_LIMITED: 'Demasiados intentos. Intenta en 60 segundos',
      UNAUTHORIZED: 'No autorizado. Revisa tu configuración.',
      NETWORK_ERROR: 'Sin conexión. Inténtalo de nuevo.',
      NO_SESSION_PROVIDER: 'Configura <SessionProvider> en App.js',
    };
    Alert.alert('Login', map[code] || 'No se pudo iniciar sesión.');
  }

  async function onLogin() {
    try {
      setBusy(true);
      const u = await login({
        user: loginUser.trim(),
        password: loginPass,
        remember: loginRemember,
      });
      if (u) {
        Alert.alert('Sesión iniciada', `Usuario: ${u.name} · Rol: ${u.role}`);
      }
      setLoginPass('');
    } catch (e) {
      showLoginError(e?.code);
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    await logout();
    Alert.alert('Sesión', 'Sesión cerrada');
  }

  async function onForget() {
    await forgetRememberedSession();
    Alert.alert('Sesión', 'Sesión olvidada en este dispositivo');
  }

  async function pingAPI() {
    try {
      const res = await client.request('health', { method: 'GET' });
      setHealth({ ok: !!res?.ok, raw: res, ts: Date.now() });
      Alert.alert('Health', res?.ok ? 'API OK' : 'API con problemas');
    } catch (e) {
      setHealth({ ok: false, raw: { error: e.message }, ts: Date.now() });
      Alert.alert(
        'Health',
        e?.code === 'UNAUTHORIZED'
          ? 'No autorizado. Revisa tu configuración.'
          : `Error: ${e.message}`
      );
    }
  }

  async function refreshCatalogs() {
    try {
      const data = await catalogsRepository.all();
      const counts = Object.fromEntries(
        Object.entries(data || {}).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
      );
      setCats({ counts, ts: Date.now() });
      Alert.alert(
        'Catálogos',
        `Descargados correctamente.\n${Object.entries(counts)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n')}`
      );
    } catch (e) {
      Alert.alert('Catálogos', 'Error al refrescar catálogos');
    }
  }

  async function runBackupNow() {
    if (!canBackup) {
      Alert.alert('Permisos', 'Solo Admin / Dueño / Super Admin');
      return;
    }
    Alert.alert('Backup', 'Se generará un ZIP en Drive. ¿Confirmar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          try {
            const res = await client.request('backup/now', { method: 'POST' });
            const data = res?.data || res;
            setBackupInfo(data);
            const name = data?.name || 'backup.zip';
            if (data?.url) {
              Alert.alert('Backup generado', name, [
                { text: 'Cerrar' },
                { text: 'Abrir', onPress: () => Linking.openURL(data.url) },
              ]);
            } else {
              Alert.alert('Backup', 'Backup generado.');
            }
          } catch (e) {
            Alert.alert(
              'Backup',
              e?.code === 'UNAUTHORIZED'
                ? 'No autorizado. Revisa tu configuración.'
                : 'No se pudo generar el backup'
            );
          }
        },
      },
    ]);
  }

  const maskKey = (v) => {
    const s = String(v ?? '—');
    try {
      return s.replace(/.(?=.{4}$)/g, '•');
    } catch {
      return '••••';
    }
  };

  /* ────────── UI ────────── */
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.wrap}
    >
      {/* Header con rol */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Text style={[styles.h1, { color: textPrimary }]}>Ajustes</Text>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: colors.surface,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 12 }}>
            {String(user?.role || 'tecnico')}
          </Text>
        </View>
      </View>

      {/* Sesión */}
      <Section title="Sesión" colors={colors} textPrimary={textPrimary}>
        {!isLoggedIn ? (
          <>
            <LabeledInput
              colors={colors}
              label="Email/Usuario"
              placeholder="tu@correo.com o id"
              value={loginUser}
              onChangeText={setLoginUser}
              autoCapitalize="none"
              textMuted={textMuted}
            />
            <View style={{ height: 8 }} />
            <LabeledInput
              colors={colors}
              label="Contraseña"
              placeholder="••••••••"
              value={loginPass}
              onChangeText={setLoginPass}
              secureTextEntry
              textMuted={textMuted}
            />
            <View style={{ height: 8 }} />
            <Pressable
              onPress={() => setLoginRemember(!loginRemember)}
              style={[
                styles.chip,
                {
                  backgroundColor: loginRemember ? colors.primary : colors.surface,
                  borderColor: loginRemember ? colors.primary : colors.border,
                  alignSelf: 'flex-start',
                },
              ]}
            >
              <Text style={{ color: loginRemember ? '#fff' : textPrimary, fontWeight: '700' }}>
                Recordar en este dispositivo
              </Text>
            </Pressable>

            <View style={{ height: 8 }} />
            <Pressable
              onPress={onLogin}
              disabled={busy}
              style={[styles.btn, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}
            >
              <Text style={styles.btnTx}>{busy ? 'Ingresando…' : 'Iniciar sesión'}</Text>
            </Pressable>

            {!session?.user && (
              <Text style={[styles.note, { color: textMuted, marginTop: 6 }]}>
                * Nota: si ves “NO_SESSION_PROVIDER”, envuelve tu App con &lt;SessionProvider /&gt;.
              </Text>
            )}
          </>
        ) : (
          <>
            <Text style={[styles.note, { color: textPrimary }]}>
              Usuario: <Text style={{ fontWeight: '800' }}>{user?.name}</Text> · Rol:{' '}
              <Text style={{ fontWeight: '800' }}>{user?.role}</Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Pressable
                onPress={onLogout}
                style={[
                  styles.btn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Text style={[styles.btnTx, { color: textPrimary }]}>Cerrar sesión</Text>
              </Pressable>
              {remember && (
                <Pressable
                  onPress={onForget}
                  style={[
                    styles.btn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Text style={[styles.btnTx, { color: textPrimary }]}>Olvidar esta sesión</Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </Section>

      {/* Perfil */}
      <Section title="Perfil" colors={colors} textPrimary={textPrimary}>
        <Row label="Nombre" value={user?.name || 'Invitado'} textPrimary={textPrimary} textMuted={textMuted} />
        <Row label="Rol" value={user?.role || 'super_admin'} textPrimary={textPrimary} textMuted={textMuted} />
        <Row label="Usuario" value={user?.id || '—'} textPrimary={textPrimary} textMuted={textMuted} />
      </Section>

      {/* Tema */}
      <Section title="Tema de la app" colors={colors} textPrimary={textPrimary}>
        <View style={styles.row}>
          {themeOptions.map((opt) => {
            const active = mode === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => {
                  setMode(opt.key);
                  Alert.alert('Tema', `Tema cambiado a: ${opt.label}`);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={{ color: active ? '#fff' : textPrimary, fontWeight: '700' }}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.note, { color: textMuted }]}>Actual: {String(mode)}</Text>
      </Section>

      {/* Diagnóstico */}
      <Section title="Diagnóstico" colors={colors} textPrimary={textPrimary}>
        <Pressable onPress={pingAPI} style={[styles.btn, { backgroundColor: colors.primary }]}>
          <Text style={styles.btnTx}>Probar API (health)</Text>
        </Pressable>
        <Text style={[styles.note, { color: textMuted }]}>
          Último health:{' '}
          {health
            ? `${health.ok ? 'OK' : 'Error'} · ${new Date(health.ts).toLocaleString()}`
            : '—'}
        </Text>
      </Section>

      {/* Catálogos */}
      <Section title="Catálogos" colors={colors} textPrimary={textPrimary}>
        <Pressable
          onPress={refreshCatalogs}
          style={[
            styles.btn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: StyleSheet.hairlineWidth,
            },
          ]}
        >
          <Text style={[styles.btnTx, { color: textPrimary }]}>Refrescar catálogos</Text>
        </Pressable>
        {cats && (
          <View style={{ marginTop: 6 }}>
            {Object.entries(cats.counts).map(([k, v]) => (
              <Text key={k} style={[styles.note, { color: textMuted }]}>
                {k}: {v}
              </Text>
            ))}
            <Text style={[styles.note, { color: textMuted }]}>
              {new Date(cats.ts).toLocaleString()}
            </Text>
          </View>
        )}
      </Section>

      {/* Backups */}
      <Section title="Backups" colors={colors} textPrimary={textPrimary}>
        <Pressable
          onPress={canBackup ? runBackupNow : () => Alert.alert('Permisos', 'Solo Admin / Super Admin')}
          style={[
            styles.btn,
            {
              backgroundColor: canBackup ? colors.primary : colors.border,
              opacity: canBackup ? 1 : 0.7,
            },
          ]}
        >
          <Text style={styles.btnTx}>Backup ahora</Text>
        </Pressable>
        <Text style={[styles.note, { color: textMuted }]}>
          Último: {backupInfo ? backupInfo.name || '' : '—'}
        </Text>
      </Section>

      {/* API */}
      <Section title="API" colors={colors} textPrimary={textPrimary}>
        <Row label="Base" value={process.env.EXPO_PUBLIC_API_BASE || '—'} small textPrimary={textPrimary} textMuted={textMuted} />
        <Row label="Key" value={maskKey(process.env.EXPO_PUBLIC_API_KEY)} small textPrimary={textPrimary} textMuted={textMuted} />
      </Section>
    </ScrollView>
  );
}

/* Helpers UI */
function Section({ title, children, colors, textPrimary }) {
  return (
    <View style={[styles.section, { borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: textPrimary }]}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, small, textPrimary, textMuted }) {
  return (
    <View style={styles.rowItem}>
      <Text style={[styles.rowLabel, { color: textMuted }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: textPrimary }, small && { fontSize: 12 }]}>
        {String(value ?? '—')}
      </Text>
    </View>
  );
}

function LabeledInput({ colors, label, style, textMuted, ...props }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={[styles.rowLabel, { width: 110, color: textMuted }]}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={textMuted}
        style={[
          {
            flex: 1,
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: 8,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
            color: colors.text,
            backgroundColor: colors.surface,
          },
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '700' },
  section: { marginBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  rowItem: { paddingVertical: 6, flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 13 },
  rowValue: { fontWeight: '600', maxWidth: '65%' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1 },
  btn: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignSelf: 'flex-start' },
  btnTx: { color: '#fff', fontWeight: '700' },
  note: { fontSize: 12, marginTop: 6 },
});
