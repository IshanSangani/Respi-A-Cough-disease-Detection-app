import React, { useRef } from 'react';
import { Pressable, Text, ActivityIndicator, PressableProps, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '@/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  children: React.ReactNode;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  textClassName?: string;
  className?: string;
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  secondary: { backgroundColor: colors.secondary },
  outline: { borderColor: colors.primaryDark, borderWidth: 1, backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.danger },
  textBase: { fontWeight: '600', fontSize: 16 },
  textLight: { color: colors.surface },
  textOutline: { color: colors.primaryDark },
});

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  ...rest
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (to: number) => {
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  };

  const gradientColors = variant === 'primary'
    ? [colors.primary, colors.primaryDark]
    : variant === 'secondary'
    ? [colors.secondary, colors.secondary]
    : variant === 'danger'
    ? [colors.danger, '#b91c1c']
    : ['transparent', 'transparent'];

  const content = (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.base,
        variant === 'outline' && styles.outline,
        variant !== 'primary' && variant !== 'secondary' && variant !== 'danger' && { backgroundColor: 'transparent' },
        rest.style as any,
      ]}
    >
      {loading && <ActivityIndicator color={variant === 'outline' ? colors.primaryDark : colors.surface} style={{ marginRight: 8 }} />}
      <Text style={[
        styles.textBase,
        variant === 'outline' ? styles.textOutline : styles.textLight,
        disabled && { opacity: 0.7 },
      ]}>{children}</Text>
    </LinearGradient>
  );

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled || loading}
        onPressIn={() => animateTo(0.94)}
        onPressOut={() => animateTo(1)}
        {...rest}
        style={[disabled && { opacity: 0.5 }]}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
};

export default Button;