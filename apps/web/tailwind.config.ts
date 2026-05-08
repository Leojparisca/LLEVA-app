import type { Config } from 'tailwindcss'
import {
  LLEVA_COLORS_FLAT,
  LLEVA_TYPOGRAPHY,
  LLEVA_SPACING,
  LLEVA_RADIUS,
  LLEVA_SHADOWS,
} from '../../packages/shared-constants/src/design-tokens'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],

  theme: {
    extend: {
      colors: {
        ...LLEVA_COLORS_FLAT,

        border: LLEVA_COLORS_FLAT['surface-border'],
        input: LLEVA_COLORS_FLAT['surface-border'],
        ring: LLEVA_COLORS_FLAT['primary-500'],
        background: LLEVA_COLORS_FLAT['surface-bg'],
        foreground: LLEVA_COLORS_FLAT['text-primary'],

        primary: {
          DEFAULT: LLEVA_COLORS_FLAT['primary-500'],
          foreground: LLEVA_COLORS_FLAT['neutral-0'],
        },
        secondary: {
          DEFAULT: LLEVA_COLORS_FLAT['obsidian-100'],
          foreground: LLEVA_COLORS_FLAT['obsidian-900'],
        },
        destructive: {
          DEFAULT: LLEVA_COLORS_FLAT['semantic-error'],
          foreground: LLEVA_COLORS_FLAT['neutral-0'],
        },
        muted: {
          DEFAULT: LLEVA_COLORS_FLAT['neutral-100'],
          foreground: LLEVA_COLORS_FLAT['text-secondary'],
        },
        accent: {
          DEFAULT: LLEVA_COLORS_FLAT['primary-50'],
          foreground: LLEVA_COLORS_FLAT['primary-700'],
        },
        card: {
          DEFAULT: LLEVA_COLORS_FLAT['surface-card'],
          foreground: LLEVA_COLORS_FLAT['text-primary'],
        },
        popover: {
          DEFAULT: LLEVA_COLORS_FLAT['surface-card'],
          foreground: LLEVA_COLORS_FLAT['text-primary'],
        },
      },

      fontFamily: {
        sans: LLEVA_TYPOGRAPHY.fontFamily.sans,
        mono: LLEVA_TYPOGRAPHY.fontFamily.mono,
      },

      borderRadius: {
        ...Object.fromEntries(
          Object.entries(LLEVA_RADIUS).map(
            ([key, value]) => [key, value === 9999 ? '9999px' : `${value}px`]
          )
        ),
        lg: `${LLEVA_RADIUS.lg}px`,
        md: `${LLEVA_RADIUS.md}px`,
        sm: `${LLEVA_RADIUS.sm}px`,
      },

      boxShadow: {
        'lleva-sm': LLEVA_SHADOWS.web.sm,
        'lleva-md': LLEVA_SHADOWS.web.md,
        'lleva-lg': LLEVA_SHADOWS.web.lg,
        'lleva-xl': LLEVA_SHADOWS.web.xl,
      },

      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },

  plugins: [
    require('tailwindcss-animate'),
  ],
}

export default config