import React, { useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, cardStyle, spacing, typography } from '@/theme';
import { useRouter, Link } from 'expo-router';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
import { API_BASE_URL } from '@/lib/api';
import { emailError, passwordError } from '@/lib/validation';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const emailErr = emailError(email);
  const passwordErr = passwordError(password, 8);

  const handleLogin = async () => {
    if (emailErr || passwordErr) {
      setErrorMessage(emailErr || passwordErr);
      return;
    }
    setErrorMessage(null);
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.ok) {
      router.replace('/(protected)/(tabs)');
    } else {
      setErrorMessage(result.error || 'Login failed');
    }
  };

  return (
    <LinearGradient colors={[colors.bgGradientStart, colors.bgGradientEnd]} style={styles.screen}>
      <View style={styles.headerBox}>
        <Text style={styles.appName}>RespiScan</Text>
        <Text style={styles.tagline}>AI-powered respiratory insight</Text>
      </View>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Login</Text>
        <Input label="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} error={emailErr || undefined} />
        <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} error={passwordErr || undefined} />
        <Button onPress={handleLogin} loading={loading} disabled={loading || !!emailErr || !!passwordErr}>Continue</Button>
        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
        <Text style={styles.debug}>API: {API_BASE_URL}</Text>
        <Text style={styles.switchText}>Need an account? <Link href="/(auth)/register">Register</Link></Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  headerBox: { alignItems: 'center', marginBottom: spacing.xl },
  appName: { fontSize: 36, fontWeight: '700', color: colors.primaryDark },
  tagline: { marginTop: 4, fontSize: 14, color: colors.textDim },
  formCard: { ...cardStyle, gap: spacing.sm },
  formTitle: { fontSize: 26, fontWeight: '700', color: colors.primaryDark, marginBottom: spacing.sm },
  switchText: { marginTop: spacing.md, fontSize: 13, color: colors.textDim, textAlign: 'center' },
  error: { marginTop: spacing.xs, fontSize: 13, color: colors.danger || '#DC2626', textAlign: 'center' },
  debug: { marginTop: spacing.xs, fontSize: 11, color: colors.textDim, textAlign: 'center' },
});