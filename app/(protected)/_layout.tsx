import React from 'react';
import { Stack } from 'expo-router';

// Protected stack now nests a tab navigator for primary app sections.
// The result screen stays stack-only so it can be pushed without showing the tab bar.
export default function ProtectedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="result" />
    </Stack>
  );
}