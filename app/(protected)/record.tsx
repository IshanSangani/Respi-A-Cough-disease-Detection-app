import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
import { uploadAudioAsync } from '@/lib/audio';
import mlApi, { ML_BASE_URL } from '@/lib/mlApi';
import { modelLabel } from '@/lib/modelLabels';
import { cardStyle, colors, spacing } from '@/theme';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, View } from 'react-native';

export default function RecordScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [uploading, setUploading] = useState(false);
  const [mlHealth, setMlHealth] = useState<'checking' | 'ok' | 'fail'>('checking');
  const [mlHealthMsg, setMlHealthMsg] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<'rf' | 'logreg' | 'mlp' | 'svm' | 'resnet'>('rf');
  const [availableModels, setAvailableModels] = useState<Array<'rf' | 'logreg' | 'mlp' | 'svm' | 'resnet'>>(['rf', 'logreg', 'mlp', 'svm']);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await mlApi.get('/health');
        if (!mounted) return;
        setMlHealth('ok');
        setMlHealthMsg(JSON.stringify(res.data));

        // If server exposes available models, reflect that in the UI.
        const allowed = new Set(['rf', 'logreg', 'mlp', 'svm', 'resnet']);
        const serverModelsRaw = Array.isArray((res as any)?.data?.models) ? (res as any).data.models : null;
        const serverDefaultRaw = (res as any)?.data?.default;
        const serverModels = (serverModelsRaw || [])
          .map((m: any) => String(m).trim().toLowerCase())
          .filter((m: string) => allowed.has(m)) as Array<'rf' | 'logreg' | 'mlp' | 'svm' | 'resnet'>;

        if (serverModels.length > 0) {
          setAvailableModels(serverModels);

          const serverDefault = String(serverDefaultRaw || '').trim().toLowerCase() as any;
          if (allowed.has(serverDefault) && serverModels.includes(serverDefault)) {
            setSelectedModel(serverDefault);
          } else if (!serverModels.includes(selectedModel)) {
            setSelectedModel(serverModels[0]);
          }
        }
      } catch (e: any) {
        if (!mounted) return;
        setMlHealth('fail');
        setMlHealthMsg(e?.message || 'Network error');
      }
    })();

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const startRecording = async () => {
    try {
      setElapsed(0);
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') return Alert.alert('Permission required', 'Microphone access is needed.');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setIsRecording(true);
      intervalRef.current = setInterval(() => {
        setElapsed((t) => {
          const next = t + 1;
          Animated.timing(progressAnim, {
            toValue: next / 10,
            duration: 300,
            useNativeDriver: false,
          }).start();
          return next;
        });
      }, 1000);
      setTimeout(() => { stopRecording(); }, 10000); // Auto stop at 10s
    } catch (e: any) {
      Alert.alert('Record error', e.message);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      if (intervalRef.current) clearInterval(intervalRef.current);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);
      if (uri) await handleUpload(uri);
    } catch (e: any) {
      Alert.alert('Stop error', e.message);
    }
  };

  const handleUpload = async (uri: string) => {
    setUploading(true);
    try {
      const result = await uploadAudioAsync(uri, userId, { modelKey: selectedModel });
      router.push({
        pathname: '/(protected)/(tabs)/result',
        params: {
          prediction: result.prediction,
          confidence: String(result.confidence),
          timestamp: result.timestamp,
          model: (result as any)?.model || selectedModel,
          audioUri: uri,
        },
      });
    } catch (e: any) {
      Alert.alert('Upload failed', e?.response?.data?.message || e.message);
    } finally {
      setUploading(false);
    }
  };

  const pickAndUploadAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setSelectedFileName(asset.name || '');

      setUploading(true);
      const uploadRes = await uploadAudioAsync(asset.uri, userId, {
        filename: asset.name,
        mimeType: asset.mimeType || undefined,
        modelKey: selectedModel,
      });
      router.push({
        pathname: '/(protected)/(tabs)/result',
        params: {
          prediction: uploadRes.prediction,
          confidence: String(uploadRes.confidence),
          timestamp: uploadRes.timestamp,
          model: (uploadRes as any)?.model || selectedModel,
          audioUri: asset.uri,
          audioName: asset.name || '',
          audioMimeType: asset.mimeType || '',
        },
      });
    } catch (e: any) {
      Alert.alert('Upload failed', e?.response?.data?.message || e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <LinearGradient colors={[colors.bgGradientStart, colors.bgGradientEnd]} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Record Sample</Text>
        <Text style={styles.mlStatus}>
          ML: {mlHealth === 'checking' ? 'checking…' : mlHealth === 'ok' ? 'connected' : 'not reachable'} ({ML_BASE_URL})
        </Text>
        {mlHealth !== 'checking' && mlHealthMsg ? (
          <Text style={styles.mlDetail} numberOfLines={2}>
            {mlHealthMsg}
          </Text>
        ) : null}
        <View style={styles.modelBox}>
          <Text style={styles.modelLabel}>Model option</Text>
          <View style={styles.modelRow}>
            <Button
              variant={selectedModel === 'rf' ? 'primary' : 'outline'}
              onPress={() => setSelectedModel('rf')}
              disabled={!availableModels.includes('rf')}
              style={styles.modelBtn}
            >
              {modelLabel('rf')}
            </Button>
            <Button
              variant={selectedModel === 'logreg' ? 'primary' : 'outline'}
              onPress={() => setSelectedModel('logreg')}
              disabled={!availableModels.includes('logreg')}
              style={styles.modelBtn}
            >
              {modelLabel('logreg')}
            </Button>
            <Button
              variant={selectedModel === 'mlp' ? 'primary' : 'outline'}
              onPress={() => setSelectedModel('mlp')}
              disabled={!availableModels.includes('mlp')}
              style={styles.modelBtn}
            >
              {modelLabel('mlp')}
            </Button>
            <Button
              variant={selectedModel === 'svm' ? 'primary' : 'outline'}
              onPress={() => setSelectedModel('svm')}
              disabled={!availableModels.includes('svm')}
              style={styles.modelBtn}
            >
              {modelLabel('svm')}
            </Button>
            <Button
              variant={selectedModel === 'resnet' ? 'primary' : 'outline'}
              onPress={() => setSelectedModel('resnet')}
              disabled={!availableModels.includes('resnet')}
              style={styles.modelBtn}
            >
              {modelLabel('resnet')}
            </Button>
          </View>
        </View>
        <Text style={styles.subtitle}>Capture a 10-second cough or breath sound. Hold the phone ~10cm from mouth.</Text>
        {selectedFileName ? (
          <Text style={styles.fileName} numberOfLines={1}>
            Selected: {selectedFileName}
          </Text>
        ) : null}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressAnim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }) }]} />
        </View>
        <Text style={styles.timer}>{elapsed}s / 10s</Text>
        {!isRecording && !uploading && <Button onPress={startRecording}>Start Recording</Button>}
        {!isRecording && !uploading && (
          <View style={styles.spacing}>
            <Button variant="secondary" onPress={pickAndUploadAudio}>Upload Audio</Button>
          </View>
        )}
        {isRecording && <View style={styles.spacing}><Button variant="danger" onPress={stopRecording}>Stop Early</Button></View>}
        {uploading && <View style={styles.spacing}><Button loading disabled>Uploading...</Button></View>}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  card: { ...cardStyle, gap: spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.primaryDark },
  mlStatus: { fontSize: 12, color: colors.textDim },
  mlDetail: { fontSize: 11, color: colors.textDim },
  modelBox: { gap: spacing.sm },
  modelLabel: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },
  modelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  modelBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  subtitle: { fontSize: 14, color: colors.textDim },
  fileName: { fontSize: 12, color: colors.textDim },
  progressTrack: { height: 16, backgroundColor: '#e2e8f0', borderRadius: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  timer: { textAlign: 'center', fontSize: 18, fontWeight: '600', color: colors.primaryDark },
  spacing: { marginTop: spacing.sm },
});