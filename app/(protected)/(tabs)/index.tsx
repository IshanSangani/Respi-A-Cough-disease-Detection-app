import { fetchHistory, HistoryEntry } from '@/lib/auth';
import { modelLabel } from '@/lib/modelLabels';
import { cardStyle, colors, radius, softCardStyle, spacing, typography } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

function confidenceToPct(conf: any): number {
  const n = Number(conf);
  if (!Number.isFinite(n)) return 0;
  if (n <= 1) return Math.round(n * 100);
  if (n <= 100) return Math.round(n);
  return 100;
}

function formatTimeAgo(isoOrDateLike?: string | null): string {
  if (!isoOrDateLike) return '';
  const ms = new Date(isoOrDateLike).getTime();
  if (!Number.isFinite(ms)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
}

export default function HomeTab() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const hist = await fetchHistory();
        if (!mounted) return;
        setHistory(Array.isArray(hist) ? hist : []);
      } catch (e) {
        if (!mounted) return;
        setHistory([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const latest = history?.[0];

  const avgConfPct = useMemo(() => {
    if (!history || history.length === 0) return 0;
    let sum = 0;
    let count = 0;
    for (const h of history) {
      const n = Number(h?.confidence);
      if (!Number.isFinite(n)) continue;
      sum += (n <= 1 ? n : (n / 100));
      count += 1;
    }
    if (count === 0) return 0;
    return Math.round((sum / count) * 100);
  }, [history]);

  const metricData = useMemo(() => {
    return [
      { label: 'Sessions', value: String(history?.length || 0), icon: 'pulse' as const },
      {
        label: 'Latest',
        value: latest?.prediction ? String(latest.prediction) : loading ? '—' : 'None',
        icon: 'time' as const,
      },
      { label: 'Avg Conf', value: `${avgConfPct}%`, icon: 'speedometer' as const },
    ];
  }, [history?.length, latest?.prediction, avgConfPct, loading]);

  const lineTrend = useMemo(() => {
    const items = (history || []).slice(0, 7).reverse();
    const points = items.map((h) => confidenceToPct(h?.confidence));
    // Keep at least 7 bars so layout stays consistent.
    while (points.length < 7) points.unshift(0);
    return points;
  }, [history]);

  const recentActivity = useMemo(() => {
    const items = (history || []).slice(0, 3);
    return items.map((h) => {
      const when = (h as any)?.createdAt || h?.timestamp;
      const timeAgo = formatTimeAgo(when);
      const model = h?.model ? modelLabel(h.model) : null;
      const confPct = confidenceToPct(h?.confidence);
      const label = `${h?.prediction || 'Result'}${model ? ` • ${model}` : ''}`;
      return {
        key: `${h?.timestamp || when || Math.random()}`,
        icon: 'stats-chart' as const,
        text: `${label} • ${confPct}%`,
        timeAgo,
      };
    });
  }, [history]);

  const scaleRefs = useRef(metricData.map(() => new Animated.Value(1))).current;

  const pressIn = (i: number) => {
    Animated.spring(scaleRefs[i], { toValue: 0.94, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
  };
  const pressOut = (i: number) => {
    Animated.spring(scaleRefs[i], { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
  };

  return (
    <LinearGradient colors={[colors.bgGradientStart, colors.bgGradientEnd]} style={styles.screen}>
      <LinearGradient colors={['#ffffff', colors.bgGradientStart]} style={styles.headerGradient} />
      <View style={styles.heroRow}>
        <Ionicons name="medkit" size={34} color={colors.primaryDark} style={{ marginRight: spacing.sm }} />
        <Text style={styles.appName}>RespiScan</Text>
      </View>
      <Text style={styles.tagline}>Your respiratory companion dashboard.</Text>

      <View style={styles.metricsRow}>
        {metricData.map((m, i) => (
          <Animated.View key={m.label} style={[styles.metricCard, { transform: [{ scale: scaleRefs[i] }] }]}> 
            <Pressable
              onPressIn={() => pressIn(i)}
              onPressOut={() => pressOut(i)}
              style={styles.metricInner}
            >
              <View style={styles.metricIconBadge}>
                <Ionicons name={m.icon} size={20} color={colors.primaryDark} />
              </View>
              <Text
                style={m.label === 'Latest' ? styles.metricValueLatest : styles.metricValue}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {m.value}
              </Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHeaderRow}>
          <Text style={styles.chartTitle}>Confidence Trend</Text>
          <Text style={styles.chartSub}>7 days</Text>
        </View>
        <View style={styles.chartPlaceholder}>
          {/* Simple pseudo chart using bars */}
          {lineTrend.map((v, idx) => (
            <View
              key={idx}
              style={[
                styles.chartBar,
                {
                  height: Math.max(6, 20 + (v - 55)),
                  backgroundColor: colors.primary,
                  opacity: 0.3 + idx * 0.08,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.activityHeaderRow}>
        <Text style={styles.feedTitle}>Recent Activity</Text>
        <Pressable onPress={() => router.push('/(protected)/(tabs)/history')}><Text style={styles.viewAll}>View all</Text></Pressable>
      </View>
      <View style={styles.timeline}>
        {recentActivity.length === 0 ? (
          <View style={[styles.timelineItem, { borderBottomWidth: 0 }]}> 
            <View style={styles.dot} />
            <Ionicons name="information-circle" size={18} color={colors.primaryDark} style={styles.timelineIcon} />
            <Text style={styles.activityText}>No activity yet. Record a sample to get started.</Text>
            <Text style={styles.timeStamp} />
          </View>
        ) : (
          recentActivity.map((a, idx) => (
            <View key={a.key} style={[styles.timelineItem, idx === recentActivity.length - 1 ? { borderBottomWidth: 0 } : null]}> 
              <View style={styles.dot} />
              <Ionicons name={a.icon} size={18} color={colors.primaryDark} style={styles.timelineIcon} />
              <Text style={styles.activityText} numberOfLines={1}>{a.text}</Text>
              <Text style={styles.timeStamp}>{a.timeAgo}</Text>
            </View>
          ))
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  headerGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 160, opacity: 0.6 },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  appName: { ...typography.h1 },
  tagline: { marginTop: 4, fontSize: 15, color: colors.textDim, marginBottom: spacing.lg },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  metricCard: { ...softCardStyle, flex: 1, alignItems: 'center', marginHorizontal: 4 },
  metricInner: { alignItems: 'center', width: '100%' },
  metricIconBadge: { backgroundColor: colors.accent, padding: 8, borderRadius: 24 },
  metricValue: { ...typography.metricValue, marginTop: 8, textAlign: 'center', width: '100%' },
  metricValueLatest: { ...typography.body, fontWeight: '700', color: colors.primaryDark, marginTop: 8, textAlign: 'center', width: '100%' },
  metricLabel: { ...typography.metricLabel, marginTop: 2 },
  chartCard: { ...cardStyle, marginBottom: spacing.lg },
  chartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  chartTitle: { ...typography.h2, fontSize: 20 },
  chartSub: { fontSize: 12, color: colors.textDim },
  chartPlaceholder: { flexDirection: 'row', alignItems: 'flex-end', height: 60 },
  chartBar: { flex: 1, marginHorizontal: 3, borderRadius: 4 },
  activityHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  feedTitle: { fontSize: 18, fontWeight: '600', color: colors.primaryDark },
  viewAll: { fontSize: 12, fontWeight: '600', color: colors.primary },
  timeline: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, ...softCardStyle },
  timelineItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.border },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 10 },
  timelineIcon: { marginRight: 8 },
  activityText: { fontSize: 13, color: colors.text, flex: 1 },
  timeStamp: { fontSize: 11, color: colors.textDim, marginLeft: 8 },
});
