import { weekStartForRegion } from './week-start';

describe('weekStartForRegion', () => {
  it.each([
    ['GB', 1],
    ['DE', 1],
    ['FR', 1],
    ['AU', 1],
    ['US', 7],
    ['CA', 7],
    ['BD', 7],
    ['IN', 7],
    ['JP', 7],
    ['SA', 7],
    ['EG', 6],
    ['AE', 1],
    ['IR', 6],
    ['MV', 5],
  ])('%s starts on weekday %d', (region, weekday) => {
    expect(weekStartForRegion(region)).toBe(weekday);
  });

  it('ignores case and defaults to Monday', () => {
    expect(weekStartForRegion('us')).toBe(7);
    expect(weekStartForRegion('ZZ')).toBe(1);
    expect(weekStartForRegion('')).toBe(1);
    expect(weekStartForRegion(undefined)).toBe(1);
    expect(weekStartForRegion(null)).toBe(1);
    expect(weekStartForRegion('toString')).toBe(1);
  });
});
