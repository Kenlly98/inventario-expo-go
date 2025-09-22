// store/session.js
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'auth.session.v1';
const DEFAULT = { id: 'user-guest', name: 'Invitado', role: 'tecnico' };

const Ctx = createContext({
  user: DEFAULT,
  loginAs: (_partial) => {},
  setRole: (_role) => {},
  setName: (_name) => {},
  setId: (_id) => {},
  logout: () => {},
  reload: async () => {},
});

export function SessionProvider({ children }) {
  const [user, setUser] = useState(DEFAULT);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw));
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(user)).catch(() => {});
  }, [user]);

  const loginAs = (partial) => {
    setUser((prev) => ({ ...prev, ...partial, id: partial?.id || prev.id || 'user-local' }));
  };

  const setRole = (role) => setUser((u) => ({ ...u, role }));
  const setName = (name) => setUser((u) => ({ ...u, name }));
  const setId = (id) => setUser((u) => ({ ...u, id }));
  const logout = () => setUser(DEFAULT);

  const value = useMemo(
    () => ({
      user,
      loginAs,
      setRole,
      setName,
      setId,
      logout,
      reload: async () => {
        const raw = await AsyncStorage.getItem(KEY);
        setUser(raw ? JSON.parse(raw) : DEFAULT);
      },
    }),
    [user]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
