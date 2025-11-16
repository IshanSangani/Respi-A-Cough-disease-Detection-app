import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, cardStyle, spacing } from '@/theme';

export default function InsightsScreen() {
  return (
    <LinearGradient colors={[colors.bgGradientStart, colors.bgGradientEnd]} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Insights</Text>
        <Text style={styles.subtitle}>Aggregated trends and analytics will appear here.</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  card: { ...cardStyle, gap: spacing.sm },
  title: { fontSize: 26, fontWeight: '700', color: colors.primaryDark },
  subtitle: { fontSize: 14, color: colors.textDim },
});
