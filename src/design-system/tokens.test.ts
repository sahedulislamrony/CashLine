import { contrastRatio } from './contrast';
import { colors, type ColorScheme, type ColorToken } from './tokens';

const schemes: ColorScheme[] = ['light', 'dark'];
const surfaces: ColorToken[] = ['canvas', 'surface', 'surfaceSubtle'];

// Text and status colors that must stay readable on every base surface.
const textTokens: ColorToken[] = [
  'textPrimary',
  'textSecondary',
  'brandPrimary',
  'positive',
  'warning',
  'negative',
  'informational',
];

const containerPairs: [ColorToken, ColorToken][] = [
  ['onBrandPrimary', 'brandPrimary'],
  ['onBrandContainer', 'brandContainer'],
  ['positive', 'positiveContainer'],
  ['warning', 'warningContainer'],
  ['negative', 'negativeContainer'],
  ['informational', 'informationalContainer'],
];

describe.each(schemes)('%s palette', (scheme) => {
  const palette = colors[scheme];

  it('defines every token as #RRGGBB', () => {
    expect(Object.keys(palette).sort()).toEqual(Object.keys(colors.light).sort());
    for (const value of Object.values(palette)) {
      expect(value).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it.each(textTokens.flatMap((text) => surfaces.map((surface) => [text, surface] as const)))(
    '%s on %s reaches 4.5:1',
    (text, surface) => {
      expect(contrastRatio(palette[text], palette[surface])).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(containerPairs)('%s on %s reaches 4.5:1', (text, container) => {
    expect(contrastRatio(palette[text], palette[container])).toBeGreaterThanOrEqual(4.5);
  });

  // `accent` is held to the 3:1 non-text / large-text level only: light accent on
  // surfaceSubtle is 4.35:1, so it is not safe for body text there (docs/memory.md O-18).
  it.each(['outlineStrong', 'accent'] as const)('%s reaches 3:1 on every surface', (token) => {
    for (const surface of surfaces) {
      expect(contrastRatio(palette[token], palette[surface])).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('documented contrast values (docs/design-system.md §4)', () => {
  it.each([
    ['light', 'textPrimary', 'canvas', 14.05],
    ['light', 'textSecondary', 'canvas', 5.72],
    ['light', 'onBrandPrimary', 'brandPrimary', 6.43],
    ['light', 'outlineStrong', 'surfaceSubtle', 3.47],
    ['dark', 'textSecondary', 'canvas', 10.19],
    ['dark', 'outlineStrong', 'surfaceSubtle', 3.27],
  ] as const)('%s %s on %s is %d:1', (scheme, a, b, expected) => {
    expect(contrastRatio(colors[scheme][a], colors[scheme][b])).toBeCloseTo(expected, 1);
  });
});
