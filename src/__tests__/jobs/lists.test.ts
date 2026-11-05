import { cleanName, parseNasdaq, parseSgx, PARSERS } from '../../../jobs/sync/lists';

const nasdaqRow = (symbol: string, name: string, extra: Record<string, string> = {}) => ({
  symbol,
  name,
  sector: 'Technology',
  industry: 'Computer Manufacturing',
  ...extra,
});

describe('parseNasdaq', () => {
  it('keeps company shares and maps symbols for the app and Yahoo', () => {
    const out = parseNasdaq({
      data: {
        rows: [
          nasdaqRow('AAPL', 'Apple Inc. Common Stock'),
          nasdaqRow('BRK/B', 'Berkshire Hathaway Inc. Class B Common Stock', { sector: 'Finance', industry: '' }),
          nasdaqRow('XYZW', 'Some Corp Warrants'),
          nasdaqRow('ABCU', 'Acquisition Corp Units'),
          nasdaqRow('PFX', 'Bank Depositary Shares each representing Preferred Stock'),
          nasdaqRow('SPAC', 'Blank Check Co', { industry: 'Blank Checks' }),
          nasdaqRow('BAD^A', 'Odd Code Inc'),
          nasdaqRow('NONAME', ''),
          { symbol: 42 },
        ],
      },
    });
    expect(out).toEqual([
      {
        market: 'US',
        symbol: 'AAPL',
        yahooSymbol: 'AAPL',
        name: 'Apple Inc.',
        sector: 'Technology',
        industry: 'Computer Manufacturing',
      },
      {
        market: 'US',
        symbol: 'BRK.B',
        yahooSymbol: 'BRK-B',
        name: 'Berkshire Hathaway Inc.',
        sector: 'Financials',
        industry: null,
      },
    ]);
  });

  it('fails on an unexpected response', () => {
    expect(() => parseNasdaq({})).toThrow('no data.rows');
    expect(() => parseNasdaq(null)).toThrow('no data.rows');
  });
});

describe('parseSgx', () => {
  it('keeps shares and skips warrants and certificates', () => {
    const out = parseSgx({
      data: {
        prices: [
          { nc: 'D05', n: 'DBS', type: 'stocks' },
          { nc: 'c52', n: 'ComfortDelGro' },
          { nc: '5C3W', n: 'BYD 5xShortSG270331', type: 'dlcertificates' },
          { nc: 'W123', n: 'Some Warrant', type: 'structuredwarrants' },
          { nc: '', n: 'No code' },
          { nc: 'X1', n: '' },
        ],
      },
    });
    expect(out).toEqual([
      { market: 'SGX', symbol: 'D05', yahooSymbol: 'D05.SI', name: 'DBS', sector: null, industry: null },
      { market: 'SGX', symbol: 'C52', yahooSymbol: 'C52.SI', name: 'ComfortDelGro', sector: null, industry: null },
    ]);
  });

  it('fails on an unexpected response', () => {
    expect(() => parseSgx({ data: {} })).toThrow('no data.prices');
  });

  it('is the SGX parser', () => {
    expect(PARSERS.SGX).toBe(parseSgx);
    expect(PARSERS.US).toBe(parseNasdaq);
  });
});

describe('cleanName', () => {
  it.each([
    ['Alcoa Corporation Common Stock ', 'Alcoa Corporation'],
    ['Ares Acquisition Corporation III Class A Ordinary Shares', 'Ares Acquisition Corporation III'],
    ['ATA Creativity Global American Depositary Shares', 'ATA Creativity Global'],
    ['Plain Name Ltd', 'Plain Name Ltd'],
  ])('%s -> %s', (raw, clean) => expect(cleanName(raw)).toBe(clean));
});
