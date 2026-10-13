import * as fc from 'fast-check';

import {
  InvalidQuantityError,
  MAX_QUANTITY_THOUSANDTHS,
  quantity,
  quantityToString,
} from './quantity';

describe('quantity', () => {
  it.each([
    ['0', 0n],
    ['1', 1000n],
    ['2', 2000n],
    ['1.5', 1500n],
    ['0.125', 125n],
    ['0.001', 1n],
    ['10.10', 10100n],
    ['999999999.999', MAX_QUANTITY_THOUSANDTHS],
  ])('parses %s', (input, thousandths) => {
    expect(quantity(input).thousandths).toBe(thousandths);
  });

  it.each([
    '',
    ' ',
    '-1',
    '+1',
    '1.',
    '.5',
    '1.2345',
    '1,5',
    '1e3',
    '0x10',
    'abc',
    '1 000',
    '1234567890',
    'NaN',
    'Infinity',
    '١',
  ])('rejects %p', (input) => {
    expect(() => quantity(input)).toThrow(InvalidQuantityError);
  });

  it('rejects non-string input', () => {
    expect(() => quantity(1.5 as unknown as string)).toThrow(InvalidQuantityError);
  });

  it.each([
    ['2', '2'],
    ['1.50', '1.5'],
    ['0.125', '0.125'],
    ['0', '0'],
    ['10.010', '10.01'],
  ])('prints %s as %s', (input, output) => {
    expect(quantityToString(quantity(input))).toBe(output);
  });

  it('round-trips through its string form', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 0n, max: MAX_QUANTITY_THOUSANDTHS }), (thousandths) => {
        expect(quantity(quantityToString({ thousandths })).thousandths).toBe(thousandths);
      }),
    );
  });

  it('is frozen', () => {
    expect(Object.isFrozen(quantity('1'))).toBe(true);
  });
});
