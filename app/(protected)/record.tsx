import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Alert, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, cardStyle, spacing } from '@/theme';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Button } from '@/components/Button';
import { useRouter } from 'expo-router';
import { uploadAudioAsync } from '@/lib/audio';
import { useAuth } from '@/hooks/useAuth';

export default function RecordScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [uploading, setUploading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
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
      const result = await uploadAudioAsync(uri, userId);
      router.replace({ pathname: '/(protected)/result', params: { prediction: result.prediction, confidence: String(result.confidence), timestamp: result.timestamp } });
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
        <Text style={styles.subtitle}>Capture a 10-second cough or breath sound. Hold the phone ~10cm from mouth.</Text>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressAnim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }) }]} />
        </View>
        <Text style={styles.timer}>{elapsed}s / 10s</Text>
        {!isRecording && !uploading && <Button onPress={startRecording}>Start Recording</Button>}
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
  subtitle: { fontSize: 14, color: colors.textDim },
  progressTrack: { height: 16, backgroundColor: '#e2e8f0', borderRadius: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  timer: { textAlign: 'center', fontSize: 18, fontWeight: '600', color: colors.primaryDark },
  spacing: { marginTop: spacing.sm },
});