export const LLEVA_COLORS = {
  primary:   { 50: '#eff6ff', 500: '#2563eb', 600: '#1d4ed8', 900: '#1e3a8a' },
  secondary: { 50: '#f0fdf4', 500: '#16a34a', 600: '#15803d', 900: '#14532d' },

  success:   '#16a34a',
  warning:   '#d97706',
  error:     '#dc2626',
  info:      '#2563eb',

  neutral: {
    0:   '#ffffff',
    50:  '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  trip: {
    searching:   '#f59e0b',
    matched:     '#3b82f6',
    arriving:    '#8b5cf6',
    in_progress: '#10b981',
    completed:   '#6b7280',
    cancelled:   '#ef4444',
    disputed:    '#f97316',
  },
} as const

export const LLEVA_TYPOGRAPHY = {
  fontFamily: {
    sans:  'Inter',
    mono:  'JetBrains Mono',
  },
  fontSize: {
    xs:   12,
    sm:   14,
    base: 16,
    lg:   18,
    xl:   20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  fontWeight: {
    normal:   '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
  },
} as const

export const LLEVA_SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const

export const LLEVA_RADIUS = {
  sm:   4,
  md:   8,
  lg:   12,
  xl:   16,
  full: 9999,
} as const