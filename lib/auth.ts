import api from './api';

interface AuthResponse {
  token: string;
  userId?: string | number;
  [key: string]: any;
}

function extractErrorMessage(err: any): string {
  if (!err) return 'Unknown error';
  // Axios error response data message
  const msg = err?.response?.data?.message || err?.message;
  if (typeof msg === 'string' && msg.trim().length > 0) return msg;
  return 'Request failed';
}

export async function loginRequest(email: string, password: string): Promise<AuthResponse> {
  try {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  } catch (e: any) {
    const message = extractErrorMessage(e);
    const error = new Error(message);
    // Preserve status code if present
    (error as any).status = e?.response?.status;
    throw error;
  }
}

export async function registerRequest(email: string, password: string): Promise<AuthResponse> {
  try {
    const res = await api.post('/auth/register', { email, password });
    return res.data;
  } catch (e: any) {
    const message = extractErrorMessage(e);
    const error = new Error(message);
    (error as any).status = e?.response?.status;
    throw error;
  }
}

export interface HistoryEntry {
  prediction: string;
  confidence: number;
  timestamp: string;
  [key: string]: any;
}

let historyWarned = false;
export async function fetchHistory(): Promise<HistoryEntry[]> {
  try {
    const res = await api.get('/api/user/history');
    return Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    if (!historyWarned) {
      console.warn('History unreachable, using mock data (suppressed further warnings)');
      historyWarned = true;
    }
    // Return lightweight mock sample so UI has content
    return [
      {
        prediction: 'Sample (mock)',
        confidence: 0.86,
        timestamp: new Date().toISOString(),
        mocked: true,
      },
    ];
  }
}