import { changeColor, colors, fmtBig, fmtPct, fmtPrice, space } from '../theme';

describe('formatting', () => {
  it('formats prices in each currency', () => {
    expect(fmtPrice(1234.5, 'USD')).toBe('$1,234.50');
    expect(fmtPrice(4.1, 'SGD')).toBe('S$4.10');
  });

  it('formats percentages with a sign', () => {
    expect(fmtPct(1.234)).toBe('+1.23%');
    expect(fmtPct(-2)).toBe('-2.00%');
    expect(fmtPct(0)).toBe('0.00%');
  });

  it('abbreviates big numbers', () => {
    expect(fmtBig(3.6e12, 'USD')).toBe('$3.60T');
    expect(fmtBig(98e9, 'SGD')).toBe('S$98.0B');
    expect(fmtBig(450e6, 'USD')).toBe('$450M');
    expect(fmtBig(900, 'USD')).toBe('$900');
  });

  it('colours changes', () => {
    expect(changeColor(1)).toBe(colors.up);
    expect(changeColor(-1)).toBe(colors.down);
    expect(changeColor(0)).toBe(colors.textDim);
    expect(space(2)).toBe(8);
  });
});
