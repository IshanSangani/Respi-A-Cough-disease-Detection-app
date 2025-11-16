import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, cardStyle, spacing } from '@/theme';
import { Button } from '@/components/Button';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function HomeProtected() {
  const router = useRouter();
  const { logout } = useAuth();
  return (
    <LinearGradient colors={[colors.bgGradientStart, colors.bgGradientEnd]} style={styles.screen}>
      <View style={styles.hero}> 
        <Text style={styles.appName}>RespiScan</Text>
        <Text style={styles.tagline}>Actionable respiratory insights from sound.</Text>
      </View>
      <View style={styles.actions}>
        <View style={styles.actionCard}>
          <Text style={styles.cardHeading}>Quick Actions</Text>
          <View style={styles.cardSpacing}><Button onPress={() => router.push('/(protected)/record')}>Record Sample</Button></View>
          <View style={styles.cardSpacing}><Button variant="secondary" onPress={() => router.push('/(protected)/history')}>History</Button></View>
          <View style={styles.cardSpacing}><Button variant="outline" onPress={logout}>Logout</Button></View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  hero: { marginBottom: spacing.xl },
  appName: { fontSize: 38, fontWeight: '700', color: colors.primaryDark },
  tagline: { marginTop: 6, fontSize: 15, color: colors.textDim },
  actions: { flex: 1 },
  actionCard: { ...cardStyle },
  cardHeading: { fontSize: 20, fontWeight: '700', color: colors.primaryDark, marginBottom: spacing.sm },
  cardSpacing: { marginBottom: spacing.sm },
});