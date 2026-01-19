import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ML Flask server base URL
// - Android emulator: use 10.0.2.2
// - iOS simulator: localhost
// - Physical device: set EXPO_PUBLIC_ML_URL in app.json (expo.extra)
const HOST_FALLBACK = Platform.OS === 'android' ? 'http://192.168.10.36:5000' : 'http://localhost:5000';
const EXTRA_BASE = Constants?.expoConfig?.extra?.EXPO_PUBLIC_ML_URL as string | undefined;
const ENV_BASE = process.env.EXPO_PUBLIC_ML_URL as string | undefined;

const RAW_BASE_URL = ENV_BASE || EXTRA_BASE || HOST_FALLBACK;
const normalizeBaseUrl = (url: string) => {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
};

export const ML_BASE_URL = normalizeBaseUrl(RAW_BASE_URL);

export const mlApi = axios.create({
  baseURL: ML_BASE_URL,
  // Inference can be slow on CPU; keep this generous during dev.
  timeout: 180000,
});

console.info('[ML] Using baseURL:', ML_BASE_URL);

mlApi.interceptors.request.use((config) => {
  const method = (config.method || 'GET').toUpperCase();
  const url = `${config.baseURL || mlApi.defaults.baseURL || ''}${config.url || ''}`;
  console.info('[ML]', method, url);
  return config;
});

mlApi.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const url = `${err?.config?.baseURL || mlApi.defaults.baseURL || ''}${err?.config?.url || ''}`;
    if (!status) {
      console.warn('[ML Network Error]', url, err?.code || '', err?.message);
    } else {
      console.warn('[ML HTTP Error]', status, url);
    }
    return Promise.reject(err);
  }
);

export default mlApi;
