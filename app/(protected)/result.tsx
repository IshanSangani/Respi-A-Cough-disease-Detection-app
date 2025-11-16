import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, cardStyle, spacing } from '@/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from '@/components/Button';

export default function ResultScreen() {
  const { prediction, confidence, timestamp } = useLocalSearchParams<{ prediction?: string; confidence?: string; timestamp?: string }>();
  const router = useRouter();
  return (
    <LinearGradient colors={[colors.bgGradientStart, colors.bgGradientEnd]} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Result</Text>
        <Text style={styles.prediction}>Prediction: {prediction}</Text>
        <Text style={styles.confidence}>Confidence: {confidence}</Text>
        <Text style={styles.timestamp}>Timestamp: {timestamp}</Text>
        <View style={styles.spacing}>
          <Button onPress={() => router.push('/(protected)/history')}>Full History</Button>
        </View>
        <View style={styles.spacing}>
          <Button variant="secondary" onPress={() => router.replace('/(protected)')}>Home</Button>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  card: { ...cardStyle, gap: spacing.sm },
  title: { fontSize: 30, fontWeight: '700', color: colors.primaryDark },
  prediction: { fontSize: 20, fontWeight: '600', color: colors.primary },
  confidence: { fontSize: 18, color: colors.secondary },
  timestamp: { fontSize: 14, color: colors.textDim, marginBottom: spacing.md },
  spacing: { marginBottom: spacing.sm },
});