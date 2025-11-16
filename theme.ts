// Central design tokens
export const colors = {
  // Background gradients & brand
  bgGradientStart: '#EBF3FF',
  bgGradientEnd: '#F8FAFF',
  primary: '#2563EB', // strong medical blue
  primaryDark: '#1F4BB8',
  secondary: '#3B82F6',
  accent: '#60A5FA',
  danger: '#DC2626',
  // Text
  textStrong: '#0f172a',
  text: '#1E2A3A',
  textDim: '#67748E',
  // Surfaces
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFF',
  surfaceSoft: '#F7FAFF',
  // Borders & shadows
  border: '#D3DFEE',
  borderStrong: '#A8B9CC',
  shadow: 'rgba(37,99,235,0.15)',
  // Icon colors
  iconInactive: '#8FA0B3',
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const shadow = {
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  subtle: {
    shadowColor: '#00000022',
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
};

export const typography = {
  h1: { fontSize: 40, fontWeight: '800', letterSpacing: -0.5, color: colors.primaryDark },
  h2: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3, color: colors.primaryDark },
  metricValue: { fontSize: 34, fontWeight: '700', color: colors.primaryDark },
  metricLabel: { fontSize: 12, fontWeight: '500', color: colors.textDim },
  body: { fontSize: 16, color: colors.text },
  dim: { fontSize: 13, color: colors.textDim },
};

export const cardStyle = {
  backgroundColor: colors.surface,
  borderRadius: radius.lg,
  padding: spacing.lg,
  ...shadow.card,
};

export const softCardStyle = {
  backgroundColor: colors.surfaceSoft,
  borderRadius: radius.md,
  padding: spacing.md,
  shadowColor: '#00000010',
  shadowOpacity: 1,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};
