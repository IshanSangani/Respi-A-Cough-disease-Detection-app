import { Stack } from 'expo-router';
import React from 'react';

// Protected stack now nests a tab navigator for primary app sections.
// Result is provided under (tabs) to keep the UI consistent.
export default function ProtectedLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}