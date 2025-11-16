import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, cardStyle, spacing, typography } from '@/theme';
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';

export default function AccountScreen() {
  const { logout, userId } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try { await logout(); } finally { setLoading(false); }
  };

  return (
    <LinearGradient colors={[colors.bgGradientStart, colors.bgGradientEnd]} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Signed in as: {userId || 'Guest'}</Text>
        <View style={{ height: spacing.md }} />
        <Button variant="outline" loading={loading} onPress={handleLogout}>Logout</Button>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  card: { ...cardStyle, gap: spacing.sm },
  title: { ...typography.h2 },
  subtitle: { fontSize: 14, color: colors.textDim },
});
