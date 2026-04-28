export const colors = {
  // Primary
  primary: '#00D084',
  primaryLight: '#00E694',
  primaryDark: '#00A86F',

  // Secondary
  secondary: '#00A3FF',
  secondaryLight: '#33BFFF',
  secondaryDark: '#0085CC',

  // Accent
  accent: '#FFB319',

  // Status
  success: '#00D084',
  error: '#FF3B5F',
  warning: '#FFA500',
  info: '#00A3FF',

  // Backgrounds
  background: '#0F0F1E',
  surface: '#1A1A2E',
  surfaceLight: '#252540',

  // Text
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textTertiary: '#6B6B7F',

  // Borders
  border: '#2D2D4D',
  borderLight: '#3D3D5D',

  // Glass
  glass: 'rgba(255, 255, 255, 0.08)',
  glassLight: 'rgba(255, 255, 255, 0.12)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
};

export default {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
};
