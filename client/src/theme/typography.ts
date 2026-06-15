export const typography = {
  fonts: {
    regular: 'PlusJakartaSans-Regular',
    medium: 'PlusJakartaSans-Medium',
    semiBold: 'PlusJakartaSans-SemiBold',
    bold: 'PlusJakartaSans-Bold'
  },
  sizes: {
    display: { fontSize: 32, lineHeight: 40, letterSpacing: -1.0 },
    headingXL: { fontSize: 24, lineHeight: 30, letterSpacing: -0.5 },
    headingLG: { fontSize: 20, lineHeight: 26, letterSpacing: -0.5 },
    headingMD: { fontSize: 18, lineHeight: 24, letterSpacing: 0 },
    subheading: { fontSize: 16, lineHeight: 22, letterSpacing: 0 },
    body: { fontSize: 14, lineHeight: 20, letterSpacing: 0 },
    caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
    tiny: { fontSize: 10, lineHeight: 14, letterSpacing: 0.4 }
  }
} as const;

export type TypographySizeKeys = keyof typeof typography.sizes;
