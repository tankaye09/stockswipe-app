import {
  capBucket,
  cardText,
  clip,
  finite,
  mapSector,
  ONE_LINER_MAX,
  round,
  sentences,
  SUMMARY_MAX,
  tagThemes,
  toDate,
  tradingDay,
} from '../../../jobs/sync/transform';

describe('mapSector', () => {
  it.each([
    ['Technology', 'Technology'],
    ['Communication Services', 'Communication'],
    ['Financial Services', 'Financials'],
    ['Finance', 'Financials'],
    ['Consumer Cyclical', 'Consumer'],
    ['Basic Materials', 'Industrials'],
    ['Utilities', 'Energy'],
    [' health care ', 'Healthcare'],
    ['Miscellaneous', null],
    ['', null],
    [null, null],
    [undefined, null],
  ])('%s -> %s', (raw, sector) => expect(mapSector(raw)).toBe(sector));
});

describe('capBucket', () => {
  it.each([
    [3e12, 'mega'],
    [200e9, 'mega'],
    [50e9, 'large'],
    [2e9, 'mid'],
    [1e9, 'small'],
    [0, 'small'],
  ])('%d -> %s', (cap, bucket) => expect(capBucket(cap)).toBe(bucket));
});

describe('tagThemes', () => {
  const none = { sector: null, industry: null, description: '', dividendYield: null };

  it('tags from industry, description, sector and yield', () => {
    expect(
      tagThemes({ ...none, industry: 'Semiconductors', description: 'Chips for artificial intelligence.' }),
    ).toEqual(['ai', 'semiconductors']);
    expect(tagThemes({ ...none, industry: 'Banks - Regional', dividendYield: 5.2 })).toEqual(['banking', 'dividends']);
    expect(tagThemes({ ...none, sector: 'Real Estate', industry: 'REIT - Retail' })).toEqual(['shopping', 'property']);
    expect(tagThemes({ ...none, sector: 'Healthcare' })).toEqual(['health']);
    expect(tagThemes({ ...none, industry: 'Resorts & Casinos' })).toEqual(['gaming', 'travel']);
    expect(tagThemes({ ...none, industry: 'Restaurants' })).toEqual(['coffee-food']);
    expect(tagThemes({ ...none, industry: 'Solar' })).toEqual(['clean-energy']);
    expect(tagThemes({ ...none, industry: 'Auto Manufacturers', description: 'Makes electric vehicles.' })).toEqual([
      'ev',
    ]);
    expect(tagThemes({ ...none, description: 'A video game and streaming service.' })).toEqual(['gaming', 'streaming']);
    expect(tagThemes({ ...none, industry: 'Airlines' })).toEqual(['travel']);
  });

  it('tags nothing without signals', () => {
    expect(tagThemes(none)).toEqual([]);
    expect(tagThemes({ ...none, dividendYield: 2.9 })).toEqual([]);
  });
});

describe('sentences', () => {
  it('does not split at company abbreviations', () => {
    expect(sentences('Apple Inc. designs phones. It also sells Macs. DBS Group Holdings Ltd. is a bank.')).toEqual([
      'Apple Inc. designs phones.',
      'It also sells Macs.',
      'DBS Group Holdings Ltd. is a bank.',
    ]);
    expect(sentences('Founded by Dr. Smith in 1990. It grew.')).toEqual(['Founded by Dr. Smith in 1990.', 'It grew.']);
    expect(sentences('  ')).toEqual([]);
  });
});

describe('clip', () => {
  it('cuts at a word and adds an ellipsis', () => {
    expect(clip('short', 10)).toBe('short');
    expect(clip('one two three four five', 12)).toBe('one two…');
    expect(clip('abcdefghijklmnop', 8)).toBe('abcdefg…');
    expect(clip('one two, three', 10)).toBe('one two…');
  });
});

describe('cardText', () => {
  it('uses the first sentence and the next few', () => {
    const text = cardText(
      'Apple Inc.',
      'Consumer Electronics',
      'US',
      'Apple Inc. designs phones. It sells Macs. And more.',
    );
    expect(text).toEqual({ oneLiner: 'Apple Inc. designs phones.', summary: 'It sells Macs. And more.' });
  });

  it('keeps the summary short', () => {
    const long = 'First sentence. ' + Array.from({ length: 40 }, (_, i) => `Sentence number ${i} here.`).join(' ');
    const { oneLiner, summary } = cardText('X', null, 'US', long);
    expect(oneLiner).toBe('First sentence.');
    expect(summary.length).toBeLessThanOrEqual(SUMMARY_MAX);
    const huge = cardText('X', null, 'US', 'A'.repeat(500) + '.');
    expect(huge.oneLiner.length).toBeLessThanOrEqual(ONE_LINER_MAX);
    expect(cardText('X', null, 'US', 'One. ' + 'B'.repeat(400) + '.').summary.length).toBeLessThanOrEqual(SUMMARY_MAX);
  });

  it('falls back to a plain line without a description', () => {
    expect(cardText('Acme', 'Specialty Chemicals', 'US', '')).toEqual({
      oneLiner: 'Acme is in the specialty chemicals business, a US-listed company.',
      summary: '',
    });
    expect(cardText('Kopi Co', null, 'SGX', '').oneLiner).toBe('Kopi Co is listed on SGX.');
  });
});

describe('tradingDay', () => {
  it("uses each market's own calendar", () => {
    const t = new Date('2026-11-04T23:30:00Z'); // 6:30pm New York, 7:30am Singapore next day
    expect(tradingDay(t, 'US')).toBe('2026-11-04');
    expect(tradingDay(t, 'SGX')).toBe('2026-11-05');
  });
});

describe('toDate, finite, round', () => {
  it('reads the date formats Yahoo uses', () => {
    expect(toDate(new Date('2026-01-02T00:00:00Z'))?.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    expect(toDate(new Date('nope'))).toBeNull();
    expect(toDate(1767312000)?.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    expect(toDate(1767312000000)?.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    expect(toDate('2026-01-02T00:00:00Z')?.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    expect(toDate('nope')).toBeNull();
    expect(toDate('')).toBeNull();
    expect(toDate(null)).toBeNull();
  });

  it('keeps only finite numbers and rounds', () => {
    expect(finite(1.5)).toBe(1.5);
    expect(finite(NaN)).toBeNull();
    expect(finite('1')).toBeNull();
    expect(round(1.23456)).toBe(1.2346);
    expect(round(1.235, 1)).toBe(1.2);
  });
});
