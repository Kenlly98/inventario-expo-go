// app/store/session.js
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login as authLogin, logout as authLogout, loadRememberedSession, forgetRememberedSession } from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Ctx = createContext(null);

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [remember, setRemember] = useState(false);
  const isLoggedIn = !!user;

  async function hydrate() {
    const remembered = await loadRememberedSession();
    if (remembered) {
      setUser(remembered);
      setRemember(true);
    }
  }

  async function login({ user: userField, password, remember: rememberFlag }) {
    const res = await authLogin({ user: userField, password, remember: !!rememberFlag });
    setUser(res.user);
    setRemember(!!rememberFlag);
    return res.user;
  }

  async function logout() {
    await authLogout();
    setUser(null);
  }

  async function forget() {
    await forgetRememberedSession();
    setRemember(false);
  }

  useEffect(() => {
    hydrate();
  }, []);

  const value = useMemo(() => ({
    user,
    isLoggedIn,
    remember,
    login,
    logout,
    hydrate,
    forgetRememberedSession: forget,
  }), [user, isLoggedIn, remember]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() { return useContext(Ctx); }
