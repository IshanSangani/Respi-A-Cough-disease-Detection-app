import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.wrapper}>
      <LinearGradient colors={[colors.bgGradientStart, colors.bgGradientEnd]} style={styles.background} />
      <View style={styles.bar}>
        {state.routes.map((route: any, index: number) => {
          if (route.name === 'profile') return null; // Skip deprecated profile route
          const { options } = descriptors[route.key];
          const rawLabel = options.title || route.name;
          const label = rawLabel === 'index' ? 'Home' : rawLabel;
          const isFocused = state.index === index;
          let icon: keyof typeof Ionicons.glyphMap = 'ellipse';
          switch (route.name) {
            case 'index': icon = isFocused ? 'home' : 'home-outline'; break;
            case 'record': icon = isFocused ? 'mic' : 'mic-outline'; break;
            case 'history': icon = isFocused ? 'time' : 'time-outline'; break;
            case 'insights': icon = isFocused ? 'stats-chart' : 'stats-chart-outline'; break;
            case 'account': icon = isFocused ? 'person' : 'person-outline'; break;
          }
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={onPress}
              style={[styles.item]}
            >
              <View style={[styles.iconWrap, isFocused && styles.iconFocused]}>
                <Ionicons name={icon} size={24} color={isFocused ? colors.primaryDark : colors.textDim} />
              </View>
              <View style={styles.labelContainer}>
                {isFocused && <View style={styles.pill} />}
                <Text style={[styles.label, isFocused && styles.labelFocused]}>{label}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function ProtectedTabsLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="record" options={{ title: 'Record' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  background: { ...StyleSheet.absoluteFillObject },
  bar: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: '#ffffffee',
    borderRadius: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  item: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  iconWrap: { padding: 12, borderRadius: 30 },
  iconFocused: { backgroundColor: '#EBF3FF' },
  // Removed special record styles for uniform appearance
  labelContainer: { marginTop: 2, alignItems: 'center', justifyContent: 'center' },
  pill: { position: 'absolute', top: -6, width: 18, height: 4, borderRadius: 2, backgroundColor: colors.primary },
  label: { fontSize: 12, color: colors.iconInactive },
  labelFocused: { color: colors.primaryDark, fontWeight: '600', letterSpacing: -0.2 },
});
