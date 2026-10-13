import { contrastRatio, relativeLuminance } from './contrast';

describe('contrastRatio', () => {
  it('is 21:1 for black on white and symmetric', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
  });

  it('is 1:1 for identical colors', () => {
    expect(contrastRatio('#176A60', '#176a60')).toBe(1);
  });

  it('matches the WCAG reference value for #767676 on white', () => {
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
  });
});

describe('relativeLuminance', () => {
  it.each(['176A60', '#FFF', 'rgb(0,0,0)', '#GGGGGG'])('rejects %s', (value) => {
    expect(() => relativeLuminance(value)).toThrow('Expected a #RRGGBB color');
  });
});
