import * as FileSystem from 'expo-file-system/legacy';
import api from './api';
import mlApi from './mlApi';

export interface UploadResult {
  prediction: string;
  confidence: number;
  timestamp: string;
  [key: string]: any;
}

export type UploadAudioOptions = {
  filename?: string;
  mimeType?: string;
};

export async function uploadAudioAsync(
  uri: string,
  userId?: string | null,
  options?: UploadAudioOptions,
): Promise<UploadResult> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) throw new Error('Recording file not found');

  const uriLower = uri.toLowerCase();
  const nameLower = options?.filename?.toLowerCase();
  const extMatch = (nameLower || uriLower).match(/\.([a-z0-9]+)(\?|$)/);
  const ext = extMatch?.[1] || 'm4a';
  const mimeByExt: Record<string, string> = {
    m4a: 'audio/m4a',
    mp4: 'audio/mp4',
    wav: 'audio/wav',
    caf: 'audio/x-caf',
    '3gp': 'audio/3gpp',
    '3gpp': 'audio/3gpp',
    aac: 'audio/aac',
    mp3: 'audio/mpeg',
  };
  const mime = options?.mimeType || mimeByExt[ext] || 'application/octet-stream';
  const filename = options?.filename || `resp_recording.${ext}`;

  const form = new FormData();
  // Flask endpoint expects request.files['audio'] (we also attach 'file' for compatibility)
  form.append('audio', {
    uri,
    name: filename,
    type: mime,
  } as any);
  form.append('file', {
    uri,
    name: filename,
    type: mime,
  } as any);
  if (userId) form.append('userId', String(userId));

  try {
    console.info('[Upload] audio uri:', uri);
    console.info('[Upload] audio size:', info.size, 'ext:', ext, 'mime:', mime);
    const res = await mlApi.post('/predict', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    // Best-effort: store result in Spring/Mongo for History screen.
    try {
      await api.post('/api/user/history', {
        prediction: res.data?.prediction,
        confidence: res.data?.confidence,
        timestamp: res.data?.timestamp,
      });
    } catch (e) {
      // If user isn't logged in or backend not reachable, ignore.
      console.warn('[History] save failed (ignored)');
    }
    return res.data;
  } catch (e: any) {
    // Surface useful info for debugging connectivity
    const baseURL = e?.config?.baseURL || mlApi.defaults.baseURL;
    const status = e?.response?.status;
    const msg =
      e?.response?.data?.message ||
      e?.message ||
      'Upload failed';
    const detail = status ? `HTTP ${status}` : 'No HTTP response (network error)';
    throw new Error(`${msg}\n${detail}\nML baseURL: ${baseURL}`);
  }
}