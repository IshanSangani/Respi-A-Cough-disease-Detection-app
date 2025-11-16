import React, { useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, cardStyle, softCardStyle, spacing, typography, radius } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

const metricData = [
  { label: 'Sessions', value: '12', icon: 'pulse' as const },
  { label: 'Positives', value: '2', icon: 'alert-circle' as const },
  { label: 'Avg Conf', value: '86%', icon: 'speedometer' as const },
];

const lineTrend = [60, 58, 62, 65, 63, 67, 70];

export default function HomeTab() {
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
              <Text style={styles.metricValue}>{m.value}</Text>
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
            <View key={idx} style={[styles.chartBar, { height: 20 + (v - 55), backgroundColor: colors.primary, opacity: 0.3 + idx * 0.08 }]} />
          ))}
        </View>
      </View>

      <View style={styles.activityHeaderRow}>
        <Text style={styles.feedTitle}>Recent Activity</Text>
        <Pressable><Text style={styles.viewAll}>View all</Text></Pressable>
      </View>
      <View style={styles.timeline}>
        <View style={styles.timelineItem}> 
          <View style={styles.dot} />
          <Ionicons name="mic" size={18} color={colors.primaryDark} style={styles.timelineIcon} />
          <Text style={styles.activityText}>Recorded sample</Text>
          <Text style={styles.timeStamp}>2m</Text>
        </View>
        <View style={styles.timelineItem}> 
          <View style={styles.dot} />
          <Ionicons name="stats-chart" size={18} color={colors.primaryDark} style={styles.timelineIcon} />
          <Text style={styles.activityText}>Confidence trend updated</Text>
          <Text style={styles.timeStamp}>10m</Text>
        </View>
        <View style={styles.timelineItem}> 
          <View style={styles.dot} />
          <Ionicons name="time" size={18} color={colors.primaryDark} style={styles.timelineIcon} />
          <Text style={styles.activityText}>Viewed history list</Text>
          <Text style={styles.timeStamp}>32m</Text>
        </View>
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
  metricInner: { alignItems: 'center' },
  metricIconBadge: { backgroundColor: colors.accent, padding: 8, borderRadius: 24 },
  metricValue: { ...typography.metricValue, marginTop: 8 },
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
