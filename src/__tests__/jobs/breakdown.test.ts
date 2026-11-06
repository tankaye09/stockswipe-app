import type Anthropic from '@anthropic-ai/sdk';
import {
  applyBreakdown,
  claudeWriter,
  DEFAULT_MODEL,
  facts,
  hasVerdict,
  LIMITS,
  MAX_FAILS_IN_A_ROW,
  needsBreakdown,
  SYSTEM,
  tidy,
  writeBreakdowns,
  type Breakdown,
} from '../../../jobs/sync/breakdown';
import { newRow } from '../../../jobs/sync/run';
import type { StockRow } from '../../data/live/rows';

const row = (over: Partial<StockRow> = {}): StockRow => ({
  ...newRow(
    {
      market: 'US',
      symbol: 'NVDA',
      yahooSymbol: 'NVDA',
      name: 'NVIDIA Corporation',
      sector: 'Technology',
      industry: null,
    },
    '2026-11-01T00:00:00Z',
  ),
  industry: 'Semiconductors',
  market_cap: 4.2e12,
  description: 'NVIDIA makes graphics chips. ',
  ...over,
});

const good: Breakdown = {
  oneLiner: 'NVIDIA designs the chips behind most AI.',
  whatTheyDo: 'It designs graphics chips.',
  howTheyMakeMoney: 'It sells chips to data centres.',
  whyPeopleWatch: 'Investors follow AI spending.',
  risksToKnow: 'Demand can swing.',
};

function fakeClient(responses: unknown[]) {
  const parse = jest.fn(async () => {
    const r = responses.shift();
    if (r instanceof Error) throw r;
    return r;
  });
  return { client: { messages: { parse } } as unknown as Anthropic, parse };
}

describe('facts', () => {
  it('lists what Claude needs to know', () => {
    expect(facts(row({ dividend_yield: 0.02 }))).toBe(
      [
        'Company: NVIDIA Corporation',
        'Ticker: NVDA (US-listed)',
        'Sector: Technology',
        'Industry: Semiconductors',
        'Market value: about USD 4200.0 billion',
        'Dividend yield: 0.02%',
        'Description: NVIDIA makes graphics chips.',
      ].join('\n'),
    );
    const sgx = facts(
      row({ market: 'SGX', currency: 'SGD', sector: null, industry: null, market_cap: 250e6, symbol: 'Z74' }),
    );
    expect(sgx).toContain('Ticker: Z74 (listed on SGX in Singapore)');
    expect(sgx).toContain('Market value: about SGD 250 million');
    expect(sgx).not.toContain('Sector');
    expect(facts(row({ market_cap: 0 }))).not.toContain('Market value');
  });
});

describe('verdicts and tidying', () => {
  it('spots buy/sell verdicts but not ordinary business words', () => {
    expect(hasVerdict(good)).toBe(false);
    expect(hasVerdict({ ...good, whyPeopleWatch: 'It sells chips and buys wafers.' })).toBe(false);
    expect(hasVerdict({ ...good, whyPeopleWatch: 'Many think it is undervalued.' })).toBe(true);
    expect(hasVerdict({ ...good, risksToKnow: 'You should wait for a dip.' })).toBe(true);
    expect(hasVerdict({ ...good, oneLiner: 'A strong buy rating stock.' })).toBe(true);
  });

  it('trims each part to its limit', () => {
    const long = tidy({ ...good, oneLiner: `  ${'word '.repeat(60)}`, risksToKnow: ' Short. ' });
    expect(long.oneLiner.length).toBeLessThanOrEqual(LIMITS.oneLiner);
    expect(long.risksToKnow).toBe('Short.');
  });

  it('tells Claude never to recommend', () => {
    expect(SYSTEM).toMatch(/Never say or hint whether to buy, sell or hold/);
  });
});

describe('claudeWriter', () => {
  it('asks Claude for a structured breakdown and keeps a clean one', async () => {
    const { client, parse } = fakeClient([{ stop_reason: 'end_turn', parsed_output: good }]);
    expect(await claudeWriter(client).write(row())).toEqual(good);
    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: DEFAULT_MODEL,
        system: SYSTEM,
        messages: [{ role: 'user', content: facts(row()) }],
        output_config: expect.objectContaining({ effort: 'low' }),
      }),
    );
  });

  it('throws away cut-off, refused or verdict answers', async () => {
    const { client, parse } = fakeClient([
      { stop_reason: 'max_tokens', parsed_output: good },
      { stop_reason: 'refusal', parsed_output: null },
      { stop_reason: 'end_turn', parsed_output: { ...good, whyPeopleWatch: 'It looks overvalued.' } },
    ]);
    const writer = claudeWriter(client, 'claude-haiku-5-5');
    expect(await writer.write(row())).toBeNull();
    expect(await writer.write(row())).toBeNull();
    expect(await writer.write(row())).toBeNull();
    expect(parse).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude-haiku-5-5' }));
  });
});

describe('needsBreakdown and applyBreakdown', () => {
  it('picks described stocks without a breakdown, biggest first', () => {
    const rows = [
      row({ id: 'US:S', market_cap: 1e9 }),
      row({ id: 'US:B', market_cap: 9e9 }),
      row({ id: 'US:DONE', breakdown_at: '2026-11-01T00:00:00Z' }),
      row({ id: 'US:BLANK', description: '  ' }),
      row({ id: 'US:NOSECTOR', sector: null }),
    ];
    expect(needsBreakdown(rows, 5).map((r) => r.id)).toEqual(['US:B', 'US:S']);
    expect(needsBreakdown(rows, 1).map((r) => r.id)).toEqual(['US:B']);
  });

  it('copies a breakdown onto the row', () => {
    expect(applyBreakdown(row(), good, '2026-11-06T00:00:00Z')).toMatchObject({
      one_liner: good.oneLiner,
      what_they_do: good.whatTheyDo,
      how_they_make_money: good.howTheyMakeMoney,
      why_people_watch: good.whyPeopleWatch,
      risks_to_know: good.risksToKnow,
      breakdown_at: '2026-11-06T00:00:00Z',
    });
  });
});

describe('writeBreakdowns', () => {
  it('saves what was written and logs skipped stocks', async () => {
    const rows = [row({ id: 'US:A' }), row({ id: 'US:B' }), row({ id: 'US:C' })];
    const save = jest.fn();
    const logs: string[] = [];
    const write = jest.fn(async (r: StockRow) => {
      if (r.id === 'US:B') return null;
      if (r.id === 'US:C') throw new Error('overloaded');
      return good;
    });
    expect(await writeBreakdowns(rows, { write }, save, (m) => logs.push(m))).toBe(1);
    expect(save).toHaveBeenCalledWith(rows[0], good);
    expect(logs).toEqual(['breakdown skipped for US:B']);
    expect(await writeBreakdowns([], { write }, save, () => {})).toBe(0);
  });

  it('stops after several failures in a row', async () => {
    const rows = Array.from({ length: 40 }, (_, i) => row({ id: `US:S${i}` }));
    const logs: string[] = [];
    const write = jest.fn(async () => {
      throw new Error('invalid x-api-key');
    });
    expect(await writeBreakdowns(rows, { write }, jest.fn(), (m) => logs.push(m))).toBe(0);
    expect(write.mock.calls.length).toBeLessThan(rows.length);
    expect(logs).toEqual([
      `breakdowns: ${MAX_FAILS_IN_A_ROW} failures in a row (Error: invalid x-api-key), stopping until the next run`,
    ]);
  });
});
