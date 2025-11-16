import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { loginRequest, registerRequest } from '../lib/auth';

interface AuthActionResult {
  ok: boolean;
  error?: string;
  status?: number;
}

interface AuthContextValue {
  token: string | null;
  userId: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  register: (email: string, password: string) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('jwt');
        const storedUserId = await SecureStore.getItemAsync('userId');
        if (storedToken) setToken(storedToken);
        if (storedUserId) setUserId(storedUserId);
      } catch (e) {
        console.warn('Auth init failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    try {
      const res = await loginRequest(email, password);
      if (res?.token) {
        setToken(res.token);
        await SecureStore.setItemAsync('jwt', res.token);
        if (res.userId) {
          const idString = String(res.userId);
          setUserId(idString);
          await SecureStore.setItemAsync('userId', idString);
        }
        return { ok: true };
      }
      return { ok: false, error: 'Invalid response from server' };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Login failed', status: e.status };
    }
  }, []);

  const register = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    try {
      const res = await registerRequest(email, password);
      if (res?.token) {
        setToken(res.token);
        await SecureStore.setItemAsync('jwt', res.token);
        if (res.userId) {
          const idString = String(res.userId);
          setUserId(idString);
          await SecureStore.setItemAsync('userId', idString);
        }
        return { ok: true };
      }
      return { ok: false, error: 'Invalid response from server' };
    } catch (e: any) {
      return { ok: false, error: e.message || 'Registration failed', status: e.status };
    }
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    setUserId(null);
    await SecureStore.deleteItemAsync('jwt');
    await SecureStore.deleteItemAsync('userId');
  }, []);

  const value: AuthContextValue = { token, userId, loading, login, register, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
