import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
import { uploadAudioAsync } from '@/lib/audio';
import mlApi, { ML_BASE_URL } from '@/lib/mlApi';
import { modelLabel } from '@/lib/modelLabels';
import { cardStyle, colors, spacing } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

export default function ResultScreen() {
  const {
    prediction: predictionParam,
    confidence: confidenceParam,
    timestamp: timestampParam,
    model: modelParam,
    audioUri,
    audioName,
    audioMimeType,
  } = useLocalSearchParams<{
    prediction?: string;
    confidence?: string;
    timestamp?: string;
    model?: string;
    audioUri?: string;
    audioName?: string;
    audioMimeType?: string;
  }>();
  const router = useRouter();
  const segments = useSegments();
  const { userId } = useAuth();

  const [prediction, setPrediction] = React.useState<string | undefined>(predictionParam);
  const [confidence, setConfidence] = React.useState<string | undefined>(confidenceParam);
  const [timestamp, setTimestamp] = React.useState<string | undefined>(timestampParam);
  const [model, setModel] = React.useState<string | undefined>(modelParam);

  const [showModelPicker, setShowModelPicker] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [mlHealth, setMlHealth] = React.useState<'checking' | 'ok' | 'fail'>('checking');
  const [availableModels, setAvailableModels] = React.useState<Array<'rf' | 'logreg' | 'mlp' | 'svm' | 'resnet'>>([
    'rf',
    'logreg',
    'mlp',
    'svm',
  ]);

  React.useEffect(() => {
    // If someone navigates to the stack-only route, force it under the tabs layout
    // so the UI stays consistent.
    if (segments?.[0] === '(protected)' && segments?.[1] === 'result') {
      router.replace({
        pathname: '/(protected)/(tabs)/result',
        params: {
          prediction: predictionParam,
          confidence: confidenceParam,
          timestamp: timestampParam,
          model: modelParam,
          audioUri,
          audioName,
          audioMimeType,
        },
      });
    }
  }, [segments, predictionParam, confidenceParam, timestampParam, modelParam, audioUri, audioName, audioMimeType, router]);

  React.useEffect(() => {
    setPrediction(predictionParam);
    setConfidence(confidenceParam);
    setTimestamp(timestampParam);
    setModel(modelParam);
  }, [predictionParam, confidenceParam, timestampParam, modelParam]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await mlApi.get('/health');
        if (!mounted) return;
        setMlHealth('ok');
        const allowed = new Set(['rf', 'logreg', 'mlp', 'svm', 'resnet']);
        const serverModelsRaw = Array.isArray((res as any)?.data?.models) ? (res as any).data.models : null;
        const serverModels = (serverModelsRaw || [])
          .map((m: any) => String(m).trim().toLowerCase())
          .filter((m: string) => allowed.has(m)) as Array<'rf' | 'logreg' | 'mlp' | 'svm' | 'resnet'>;
        if (serverModels.length > 0) setAvailableModels(serverModels);
      } catch (e) {
        if (!mounted) return;
        setMlHealth('fail');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const runWithModel = async (modelKey: 'rf' | 'logreg' | 'mlp' | 'svm' | 'resnet') => {
    if (!audioUri) {
      Alert.alert('Missing audio', 'This result does not have an audio file attached, so it cannot be re-run.');
      return;
    }

    setRunning(true);
    try {
      const res = await uploadAudioAsync(audioUri, userId, {
        modelKey,
        filename: audioName && audioName.trim().length > 0 ? audioName : undefined,
        mimeType: audioMimeType && audioMimeType.trim().length > 0 ? audioMimeType : undefined,
      });

      setPrediction(res.prediction);
      setConfidence(String(res.confidence));
      setTimestamp(res.timestamp);
      setModel((res as any)?.model || modelKey);
      setShowModelPicker(false);
    } catch (e: any) {
      Alert.alert('Failed to run model', e?.message || 'Unknown error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <LinearGradient colors={[colors.bgGradientStart, colors.bgGradientEnd]} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Result</Text>
        {model ? <Text style={styles.model}>Model: {modelLabel(model)}</Text> : null}
        <Text style={styles.prediction}>Prediction: {prediction}</Text>
        <Text style={styles.confidence}>Confidence: {confidence}</Text>
        <Text style={styles.timestamp}>Timestamp: {timestamp}</Text>

        <View style={styles.tryBox}>
          <Text style={styles.tryTitle}>Do you want to try another model?</Text>
          <View style={styles.tryRow}>
            <Button
              onPress={() => setShowModelPicker(true)}
              disabled={running || !audioUri}
              style={styles.tryBtn}
            >
              Yes
            </Button>
            <Button
              variant="secondary"
              onPress={() => router.replace('/(protected)/(tabs)/record')}
              disabled={running}
              style={styles.tryBtn}
            >
              No
            </Button>
          </View>
          {!audioUri ? (
            <Text style={styles.tryHint}>
              (Re-run is available only for fresh results from Record/Upload)
            </Text>
          ) : (
            <Text style={styles.tryHint}>
              ML: {mlHealth === 'ok' ? 'connected' : mlHealth === 'fail' ? 'not reachable' : 'checking…'} ({ML_BASE_URL})
            </Text>
          )}

          {showModelPicker ? (
            <View style={styles.modelBox}>
              <Text style={styles.modelLabel}>Choose a model</Text>
              <View style={styles.modelRow}>
                <Button
                  variant={String(model || '').toLowerCase() === 'rf' ? 'primary' : 'outline'}
                  onPress={() => runWithModel('rf')}
                  disabled={running || !availableModels.includes('rf')}
                  style={styles.modelBtn}
                >
                  {modelLabel('rf')}
                </Button>
                <Button
                  variant={String(model || '').toLowerCase() === 'logreg' ? 'primary' : 'outline'}
                  onPress={() => runWithModel('logreg')}
                  disabled={running || !availableModels.includes('logreg')}
                  style={styles.modelBtn}
                >
                  {modelLabel('logreg')}
                </Button>
                <Button
                  variant={String(model || '').toLowerCase() === 'mlp' ? 'primary' : 'outline'}
                  onPress={() => runWithModel('mlp')}
                  disabled={running || !availableModels.includes('mlp')}
                  style={styles.modelBtn}
                >
                  {modelLabel('mlp')}
                </Button>
                <Button
                  variant={String(model || '').toLowerCase() === 'svm' ? 'primary' : 'outline'}
                  onPress={() => runWithModel('svm')}
                  disabled={running || !availableModels.includes('svm')}
                  style={styles.modelBtn}
                >
                  {modelLabel('svm')}
                </Button>
                <Button
                  variant={String(model || '').toLowerCase() === 'resnet' ? 'primary' : 'outline'}
                  onPress={() => runWithModel('resnet')}
                  disabled={running || !availableModels.includes('resnet')}
                  style={styles.modelBtn}
                >
                  {modelLabel('resnet')}
                </Button>
              </View>
              {running ? (
                <View style={styles.spacing}>
                  <Button loading disabled>
                    Running...
                  </Button>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.spacing}>
          <Button onPress={() => router.push('/(protected)/(tabs)/history')}>Full History</Button>
        </View>
        <View style={styles.spacing}>
          <Button variant="secondary" onPress={() => router.replace('/(protected)/(tabs)')}>Home</Button>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  card: { ...cardStyle, gap: spacing.sm },
  title: { fontSize: 30, fontWeight: '700', color: colors.primaryDark },
  model: { fontSize: 14, color: colors.textDim },
  prediction: { fontSize: 20, fontWeight: '600', color: colors.primary },
  confidence: { fontSize: 18, color: colors.secondary },
  timestamp: { fontSize: 14, color: colors.textDim, marginBottom: spacing.md },
  spacing: { marginBottom: spacing.sm },
  tryBox: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  tryTitle: { fontSize: 16, fontWeight: '600', color: colors.primaryDark },
  tryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tryBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  tryHint: { fontSize: 12, color: colors.textDim },
  modelBox: { gap: spacing.sm },
  modelLabel: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },
  modelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  modelBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
});