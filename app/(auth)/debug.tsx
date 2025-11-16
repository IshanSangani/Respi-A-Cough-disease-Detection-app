import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { debugPing } from '@/lib/debugPing';
import { API_BASE_URL } from '@/lib/api';
import { spacing, colors, cardStyle } from '@/theme';

export default function DebugScreen() {
  const [result, setResult] = useState<string>('Running ping...');

  useEffect(() => {
    (async () => {
      const r = await debugPing();
      if (r.ok) {
        setResult(`Reachable. HTTP status: ${r.status}`);
      } else {
        setResult(`Unreachable: ${r.error}`);
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Debug Connectivity</Text>
        <Text style={styles.label}>Base URL:</Text>
        <Text style={styles.value}>{API_BASE_URL}</Text>
        <Text style={styles.label}>Ping result:</Text>
        <Text style={styles.value}>{result}</Text>
        <Text style={styles.hint}>This screen intentionally calls /auth/login with dummy credentials to test raw transport.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  card: { ...cardStyle, gap: spacing.xs },
  title: { fontSize: 22, fontWeight: '700', color: colors.primaryDark },
  label: { fontSize: 13, fontWeight: '600', color: colors.textDim, marginTop: spacing.xs },
  value: { fontSize: 14, color: colors.text },
  hint: { fontSize: 12, color: colors.textDim, marginTop: spacing.sm },
});
