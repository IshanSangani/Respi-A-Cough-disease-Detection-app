import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// On Android emulator, localhost refers to the emulator itself; host machine is 10.0.2.2.
// Backend currently runs on port 8082; allow override via env or config extra.
const HOST_FALLBACK = Platform.OS === 'android' ? 'http://10.0.2.2:8082' : 'http://localhost:8082';
const EXTRA_BASE = Constants?.expoConfig?.extra?.EXPO_PUBLIC_API_URL as string | undefined;
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || EXTRA_BASE || HOST_FALLBACK);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

console.info('[API] Using baseURL:', API_BASE_URL);
if (!process.env.EXPO_PUBLIC_API_URL && !EXTRA_BASE) {
  console.info('[API] No EXPO_PUBLIC_API_URL provided; using fallback:', HOST_FALLBACK);
} else if (EXTRA_BASE && process.env.EXPO_PUBLIC_API_URL && EXTRA_BASE !== process.env.EXPO_PUBLIC_API_URL) {
  console.info('[API] Mismatch: process.env value differs from Constants.extra, using env priority');
}

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('jwt');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.warn('Attach token failed', e);
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Global 401 handling could go here
    }
      if (err.message === 'Network Error' && !err.response) {
        console.warn(
          `[API Network Error]\nbaseURL: ${API_BASE_URL}\nCheck:\n - Backend running (port 8082)\n - Correct IP if using physical device\n - Windows firewall allowing inbound 8082`
        );
    }
    return Promise.reject(err);
  }
);

export default api;