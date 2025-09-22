// app/services/authService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../data/api/client';

const K = {
  USER: 'auth.session.user.v1',
  REMEMBER: 'auth.session.remember.v1',
};

export async function login({ user, password, remember }) {
  // Validación mínima
  if (!user || !password) {
    const err = new Error('MISSING_CREDENTIALS');
    err.code = 'MISSING_CREDENTIALS';
    throw err;
  }

  try {
    const res = await client.request('auth/login', {
      method: 'POST',
      body: { user, password, remember: !!remember },
    });

    if (!res?.ok) {
      const e = new Error(res?.error || 'LOGIN_ERROR');
      e.code = res?.error || 'LOGIN_ERROR';
      throw e;
    }

    // Normaliza a AppUser
    const apiUser = res.data || res.user || {};
    const appUser = {
      id: apiUser.id,
      name: apiUser.nombre || apiUser.name,
      email: apiUser.email,
      role: (apiUser.role || apiUser.rol || 'tecnico').replace('_', ' '),
    };

    // Persistencia local según remember
    if (remember) {
      await AsyncStorage.setItem(K.USER, JSON.stringify(appUser));
      await AsyncStorage.setItem(K.REMEMBER, 'true');
    } else {
      await AsyncStorage.setItem(K.REMEMBER, 'false');
      // no persistimos el user
      await AsyncStorage.removeItem(K.USER);
    }

    return { user: appUser };
  } catch (err) {
    // Mapear errores de red
    if (err?.message === 'NETWORK_ERROR') {
      const e = new Error('NETWORK_ERROR');
      e.code = 'NETWORK_ERROR';
      throw e;
    }
    // Mantener code si viene del server
    if (!err.code && err.message) err.code = err.message;
    throw err;
  }
}

export async function logout() {
  try {
    // Fase 1: servidor es opcional; limpiamos local siempre
    await client.request('auth/logout', {
      method: 'POST',
      body: {}, // opcional: { user: <id> }
      ignoreErrors: true,
    });
  } catch {
    // ignorar
  } finally {
    // No borramos el “remember” aquí; eso lo hace forgetRememberedSession si el usuario lo pide
  }
}

export async function loadRememberedSession() {
  const remember = (await AsyncStorage.getItem(K.REMEMBER)) === 'true';
  if (!remember) return null;
  const raw = await AsyncStorage.getItem(K.USER);
  return raw ? JSON.parse(raw) : null;
}

export async function forgetRememberedSession() {
  await AsyncStorage.removeItem(K.USER);
  await AsyncStorage.setItem(K.REMEMBER, 'false');
}

export const authStorageKeys = K;
