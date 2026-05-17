export const tokens = {
  colors: {
    // Primary
    primary: '#5645d4',
    'primary-pressed': '#4534b3',
    'primary-deep': '#3a2a99',
    'on-primary': '#ffffff',
    // Navy
    'brand-navy': '#0a1530',
    'brand-navy-deep': '#070f24',
    'brand-navy-mid': '#1a2a52',
    // Link
    'link-blue': '#0075de',
    'link-blue-pressed': '#005bab',
    // Brand spectrum
    'brand-orange': '#dd5b00',
    'brand-orange-deep': '#793400',
    'brand-pink': '#ff64c8',
    'brand-pink-deep': '#a02e6d',
    'brand-purple': '#7b3ff2',
    'brand-purple-300': '#d6b6f6',
    'brand-purple-800': '#391c57',
    'brand-teal': '#2a9d99',
    'brand-green': '#1aae39',
    'brand-yellow': '#f5d75e',
    'brand-brown': '#523410',
    // Card tints
    'card-tint-peach': '#ffe8d4',
    'card-tint-rose': '#fde0ec',
    'card-tint-mint': '#d9f3e1',
    'card-tint-lavender': '#e6e0f5',
    'card-tint-sky': '#dcecfa',
    'card-tint-yellow': '#fef7d6',
    'card-tint-yellow-bold': '#f9e79f',
    'card-tint-cream': '#f8f5e8',
    'card-tint-gray': '#f0eeec',
    // Surface
    canvas: '#ffffff',
    surface: '#f6f5f4',
    'surface-soft': '#fafaf9',
    hairline: '#e5e3df',
    'hairline-soft': '#ede9e4',
    'hairline-strong': '#c8c4be',
    // Text
    'ink-deep': '#000000',
    ink: '#1a1a1a',
    charcoal: '#37352f',
    slate: '#5d5b54',
    steel: '#787671',
    stone: '#a4a097',
    muted: '#bbb8b1',
    'on-dark': '#ffffff',
    'on-dark-muted': '#a4a097',
    // Semantic
    'semantic-success': '#1aae39',
    'semantic-warning': '#dd5b00',
    'semantic-error': '#e03131',
  },

  typography: {
    'hero-display': { fontSize: '80px', fontWeight: '600', lineHeight: '1.05', letterSpacing: '-2px' },
    'display-lg':   { fontSize: '56px', fontWeight: '600', lineHeight: '1.10', letterSpacing: '-1px' },
    'heading-1':    { fontSize: '48px', fontWeight: '600', lineHeight: '1.15', letterSpacing: '-0.5px' },
    'heading-2':    { fontSize: '36px', fontWeight: '600', lineHeight: '1.20', letterSpacing: '-0.5px' },
    'heading-3':    { fontSize: '28px', fontWeight: '600', lineHeight: '1.25', letterSpacing: '0' },
    'heading-4':    { fontSize: '22px', fontWeight: '600', lineHeight: '1.30', letterSpacing: '0' },
    'heading-5':    { fontSize: '18px', fontWeight: '600', lineHeight: '1.40', letterSpacing: '0' },
    subtitle:       { fontSize: '18px', fontWeight: '400', lineHeight: '1.50', letterSpacing: '0' },
    'body-md':      { fontSize: '16px', fontWeight: '400', lineHeight: '1.55', letterSpacing: '0' },
    'body-md-medium': { fontSize: '16px', fontWeight: '500', lineHeight: '1.55', letterSpacing: '0' },
    'body-sm':      { fontSize: '14px', fontWeight: '400', lineHeight: '1.50', letterSpacing: '0' },
    'body-sm-medium': { fontSize: '14px', fontWeight: '500', lineHeight: '1.50', letterSpacing: '0' },
    caption:        { fontSize: '13px', fontWeight: '400', lineHeight: '1.40', letterSpacing: '0' },
    'caption-bold': { fontSize: '13px', fontWeight: '600', lineHeight: '1.40', letterSpacing: '0' },
    micro:          { fontSize: '12px', fontWeight: '500', lineHeight: '1.40', letterSpacing: '0' },
    'micro-uppercase': { fontSize: '11px', fontWeight: '600', lineHeight: '1.40', letterSpacing: '1px' },
    'button-md':    { fontSize: '14px', fontWeight: '500', lineHeight: '1.30', letterSpacing: '0' },
  },

  rounded: {
    xs:   '4px',
    sm:   '6px',
    md:   '8px',
    lg:   '12px',
    xl:   '16px',
    xxl:  '20px',
    xxxl: '24px',
    full: '9999px',
  },

  spacing: {
    xxs:        '4px',
    xs:         '8px',
    sm:         '12px',
    md:         '16px',
    lg:         '20px',
    xl:         '24px',
    xxl:        '32px',
    xxxl:       '40px',
    'section-sm': '48px',
    section:    '64px',
    'section-lg': '96px',
    hero:       '120px',
  },

  elevation: {
    flat:    'none',
    subtle:  'rgba(15, 15, 15, 0.04) 0px 1px 2px 0px',
    card:    'rgba(15, 15, 15, 0.08) 0px 4px 12px 0px',
    mockup:  'rgba(15, 15, 15, 0.20) 0px 24px 48px -8px',
    modal:   'rgba(15, 15, 15, 0.16) 0px 16px 48px -8px',
  },
} as const;

export type ColorToken    = keyof typeof tokens.colors;
export type TypographyToken = keyof typeof tokens.typography;
export type RoundedToken  = keyof typeof tokens.rounded;
export type SpacingToken  = keyof typeof tokens.spacing;
export type ElevationToken = keyof typeof tokens.elevation;
