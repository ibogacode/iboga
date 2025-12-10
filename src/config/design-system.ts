/**
 * Design System Configuration
 * Based on Figma design: Iboga Wellness Institute Dashboard
 */

export const designTokens = {
  colors: {
    brandPrimary: '#2D3A1F', // Dark green
    textOnColor: '#FFFFFF',
    textDefault: '#000000',
    activeNavGradient: {
      from: '#565656',
      to: '#1C1C1C',
    },
  },
  spacing: {
    navbarHeight: '52px',
    navbarPadding: '20px 0px',
    navItemGap: '27px',
    navItemActiveWidth: '90px',
    navItemActiveHeight: '41px',
    avatarSize: '51px',
    searchIconSize: '51px',
  },
  borderRadius: {
    logo: '36px',
    navItemActive: '21px',
    avatar: '36px',
    searchIcon: '36px',
  },
  shadows: {
    default: '0px 4px 8px 0px rgba(0, 0, 0, 0.05)',
  },
  typography: {
    navItem: {
      fontFamily: 'SF Pro Text, -apple-system, system-ui, sans-serif',
      fontSize: '16px',
      fontWeight: 400,
      lineHeight: '1.193em',
      letterSpacing: '-0.04em',
    },
  },
} as const

export type DesignTokens = typeof designTokens

