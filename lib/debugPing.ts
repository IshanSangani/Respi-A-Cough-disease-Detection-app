import api, { API_BASE_URL } from './api';

// Simple reachability probe; use from a temporary screen or console.
export async function debugPing(): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    // Intentionally call login with empty body expecting 4xx but proving reachability.
    const res = await api.post('/auth/login', { email: '__ping__', password: '__ping__' });
    return { ok: true, status: res.status };
  } catch (e: any) {
    if (e.response) {
      // Any HTTP response means network path works.
      return { ok: true, status: e.response.status };
    }
    return { ok: false, error: e.message || 'Network unreachable' };
  }
}

export function logBaseUrl() {
  console.info('[DEBUG] API_BASE_URL =', API_BASE_URL);
}
