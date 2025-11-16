import api from './api';
import * as FileSystem from 'expo-file-system';

export interface UploadResult {
  prediction: string;
  confidence: number;
  timestamp: string;
  [key: string]: any;
}

export async function uploadAudioAsync(uri: string, userId?: string | null): Promise<UploadResult> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) throw new Error('Recording file not found');

  const form = new FormData();
  form.append('file', {
    uri,
    name: 'resp_recording.m4a',
    type: 'audio/m4a',
  } as any);
  if (userId) form.append('userId', String(userId));

  const res = await api.post('/api/audio/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}