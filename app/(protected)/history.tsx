import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, cardStyle, spacing } from '@/theme';
import { fetchHistory, HistoryEntry } from '@/lib/auth';
import { useRouter } from 'expo-router';

export default function HistoryScreen() {
  const [data, setData] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const hist = await fetchHistory();
        setData(hist);
      } catch (e) {
        console.warn('History fetch error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <LinearGradient colors={[colors.bgGradientStart, colors.bgGradientEnd]} style={styles.screen}> 
        <View style={styles.loadingBox}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.bgGradientStart, colors.bgGradientEnd]} style={styles.screen}>
      <View style={styles.cardWrapper}>
        <Text style={styles.title}>History</Text>
        <FlatList
          data={data}
          keyExtractor={(item, idx) => `${item.timestamp}-${idx}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(protected)/result', params: { prediction: item.prediction, confidence: String(item.confidence), timestamp: item.timestamp } })}
              style={styles.listCard}
            >
              <Text style={styles.cardTitle}>{item.prediction}</Text>
              <Text style={styles.cardSubtitle}>Confidence: {item.confidence}</Text>
              <Text style={styles.cardTimestamp}>{item.timestamp}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No history yet.</Text>}
          contentContainerStyle={data.length === 0 && { flexGrow: 1, justifyContent: 'center' }}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: spacing.sm, color: colors.textDim },
  cardWrapper: { ...cardStyle, flex: 1 },
  title: { fontSize: 30, fontWeight: '700', color: colors.primaryDark, marginBottom: spacing.md },
  listCard: { marginBottom: spacing.sm, backgroundColor: colors.surfaceAlt, padding: spacing.md, borderRadius: spacing.md, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.primary, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: colors.text },
  cardTimestamp: { fontSize: 12, color: colors.textDim, marginTop: 4 },
  empty: { color: colors.textDim, textAlign: 'center' },
});