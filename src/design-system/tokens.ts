/**
 * Semantic design tokens. Source of truth: docs/design-system.md §4–§5.
 * Screens use these tokens; they never hard-code colors, spacing or radii.
 */

export type ColorToken =
  | 'canvas'
  | 'surface'
  | 'surfaceSubtle'
  | 'textPrimary'
  | 'textSecondary'
  | 'outline'
  | 'outlineStrong'
  | 'brandPrimary'
  | 'onBrandPrimary'
  | 'brandContainer'
  | 'onBrandContainer'
  | 'accent'
  | 'positive'
  | 'positiveContainer'
  | 'warning'
  | 'warningContainer'
  | 'negative'
  | 'negativeContainer'
  | 'informational'
  | 'informationalContainer';

export type ColorScheme = 'light' | 'dark';

export type Palette = Readonly<Record<ColorToken, string>>;

export const colors: Readonly<Record<ColorScheme, Palette>> = {
  light: {
    canvas: '#F5F6F2',
    surface: '#FFFFFF',
    surfaceSubtle: '#E9EFEB',
    textPrimary: '#1B2825',
    textSecondary: '#56645F',
    outline: '#C7D2CC',
    outlineStrong: '#728279',
    brandPrimary: '#176A60',
    onBrandPrimary: '#FFFFFF',
    brandContainer: '#DCEFEA',
    onBrandContainer: '#123B35',
    accent: '#8B683A',
    positive: '#146447',
    positiveContainer: '#E7F4EC',
    warning: '#805500',
    warningContainer: '#FFF1CF',
    negative: '#A12D36',
    negativeContainer: '#FCE9E8',
    informational: '#315A85',
    informationalContainer: '#E8F0FB',
  },
  dark: {
    canvas: '#101715',
    surface: '#18221F',
    surfaceSubtle: '#202C28',
    textPrimary: '#F0F5F2',
    textSecondary: '#B8C5BF',
    outline: '#42514A',
    outlineStrong: '#6B7C73',
    brandPrimary: '#75C5B1',
    onBrandPrimary: '#0C2E29',
    brandContainer: '#1C3C35',
    onBrandContainer: '#C3F0E3',
    accent: '#D8BD83',
    positive: '#7BD6A8',
    positiveContainer: '#14372A',
    warning: '#F0C46B',
    warningContainer: '#3A2B12',
    negative: '#F49490',
    negativeContainer: '#441F21',
    informational: '#A5C8F2',
    informationalContainer: '#1C2B42',
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 40 } as const;

export const radii = { control: 8, field: 12, card: 16, sheet: 24 } as const;

export const minTouchTarget = 48;
