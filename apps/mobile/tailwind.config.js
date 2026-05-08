const { LLEVA_COLORS_FLAT,
        LLEVA_TYPOGRAPHY,
        LLEVA_SPACING,
        LLEVA_RADIUS } = require('../../packages/shared-constants/src/design-tokens')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
  ],

  presets: [
    require('nativewind/preset'),
  ],

  theme: {
    extend: {
      colors: LLEVA_COLORS_FLAT,

      fontFamily: {
        sans: LLEVA_TYPOGRAPHY.fontFamily.sans,
        mono: LLEVA_TYPOGRAPHY.fontFamily.mono,
      },
      fontSize: Object.fromEntries(
        Object.entries(LLEVA_TYPOGRAPHY.fontSize).map(
          ([key, value]) => [key, `${value}px`]
        )
      ),
      fontWeight: LLEVA_TYPOGRAPHY.fontWeight,

      spacing: Object.fromEntries(
        Object.entries(LLEVA_SPACING).map(
          ([key, value]) => [key, `${value}px`]
        )
      ),

      borderRadius: Object.fromEntries(
        Object.entries(LLEVA_RADIUS).map(
          ([key, value]) => [key, value === 9999 ? '9999px' : `${value}px`]
        )
      ),
    },
  },

  plugins: [],
}