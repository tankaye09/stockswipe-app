export const colors = {
  bg: '#0B0F14',
  card: '#151B23',
  cardAlt: '#1C2430',
  border: '#263040',
  text: '#F2F5F8',
  textDim: '#9AA6B5',
  textFaint: '#66727F',
  accent: '#5B8CFF',
  up: '#2ECC8A',
  down: '#FF5C6C',
  save: '#2ECC8A',
  skip: '#FF5C6C',
  trade: '#F5B83D',
  sponsored: '#B48CFF',
};

export const space = (n: number) => n * 4;

export const radius = { sm: 8, md: 14, lg: 22 };

export const fmtPrice = (n: number, currency: 'USD' | 'SGD') =>
  `${currency === 'SGD' ? 'S$' : '$'}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtPct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;

export function fmtBig(n: number, currency: 'USD' | 'SGD') {
  const sym = currency === 'SGD' ? 'S$' : '$';
  if (n >= 1e12) return `${sym}${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${sym}${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${sym}${(n / 1e6).toFixed(0)}M`;
  return `${sym}${n.toFixed(0)}`;
}

export const changeColor = (n: number) => (n > 0 ? colors.up : n < 0 ? colors.down : colors.textDim);
