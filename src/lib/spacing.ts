/**
 * 8px Grid Spacing System
 * All spacing values are multiples of 8px for visual consistency
 */
export const spacing = {
  xs: '0.5rem',    // 8px
  sm: '0.75rem',    // 12px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '3rem',    // 48px
  '3xl': '4rem',    // 64px
} as const

/**
 * Spacing scale for consistent gaps
 */
export const gaps = {
  xs: 'gap-2',      // 8px
  sm: 'gap-3',      // 12px
  md: 'gap-4',      // 16px
  lg: 'gap-6',      // 24px
  xl: 'gap-8',      // 32px
  '2xl': 'gap-12',  // 48px
} as const

/**
 * Padding scale
 */
export const padding = {
  xs: 'p-2',        // 8px
  sm: 'p-3',        // 12px
  md: 'p-4',        // 16px
  lg: 'p-6',        // 24px
  xl: 'p-8',        // 32px
  '2xl': 'p-12',    // 48px
} as const

export type Spacing = typeof spacing
export type Gaps = typeof gaps
export type Padding = typeof padding

