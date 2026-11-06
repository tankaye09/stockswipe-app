import { fetchJson, loadYahoo, main, marketsFrom, USER_AGENT } from '../../../jobs/sync/main';
import * as run from '../../../jobs/sync/run';
import type { YahooLike } from '../../../jobs/sync/yahoo';

jest.mock('yahoo-finance2', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((opts: object) => ({ opts })),
}));

const yahoo: YahooLike = { quote: jest.fn(), quoteSummary: jest.fn(), chart: jest.fn() };
const ENV = { SUPABASE_URL: 'https://db.example.co', SUPABASE_SERVICE_ROLE_KEY: 'k' };

afterEach(() => jest.restoreAllMocks());

describe('marketsFrom', () => {
  it('reads the market argument', () => {
    expect(marketsFrom(undefined)).toEqual(['US', 'SGX']);
    expect(marketsFrom('all')).toEqual(['US', 'SGX']);
    expect(marketsFrom('us')).toEqual(['US']);
    expect(marketsFrom('SGX')).toEqual(['SGX']);
    expect(() => marketsFrom('HKEX')).toThrow('Unknown market "HKEX"');
  });
});

describe('fetchJson', () => {
  it('sends a browser user agent and reads JSON', async () => {
    const fn = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ a: 1 }) }));
    expect(await fetchJson('https://x.test/list', fn as unknown as typeof fetch)).toEqual({ a: 1 });
    expect(fn).toHaveBeenCalledWith('https://x.test/list', {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    const bad = jest.fn(async () => ({ ok: false, status: 403 }));
    await expect(fetchJson('https://x.test/list', bad as unknown as typeof fetch)).rejects.toThrow(
      'GET https://x.test/list failed (403)',
    );
  });
});

describe('main', () => {
  it('needs the Supabase secrets', async () => {
    await expect(main(['US'], {}, async () => yahoo)).rejects.toThrow('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  });

  it('syncs each market with the configured limits', async () => {
    const sync = jest.spyOn(run, 'syncMarket').mockImplementation(async (market, deps) => {
      await deps.pause(0);
      expect(deps.now()).toBeInstanceOf(Date);
      return { market } as run.SyncResult;
    });
    const results = await main(
      ['all'],
      { ...ENV, SYNC_PROFILE_LIMIT: '5', SYNC_BACKFILL_LIMIT: 'x' },
      async () => yahoo,
    );
    expect(results.map((r) => r.market)).toEqual(['US', 'SGX']);
    expect(sync).toHaveBeenCalledWith('US', expect.anything(), {
      profileLimit: 5,
      backfillLimit: 600,
      breakdownLimit: 300,
    });
    expect(sync.mock.calls[0][1].writer).toBeUndefined();
  });

  it('writes breakdowns with Claude when the Anthropic key is set', async () => {
    const sync = jest.spyOn(run, 'syncMarket').mockImplementation(async (market) => ({ market }) as run.SyncResult);
    await main(
      ['US'],
      { ...ENV, ANTHROPIC_API_KEY: 'sk', SYNC_BREAKDOWN_LIMIT: '7' },
      async () => yahoo,
      () => {},
    );
    expect(sync.mock.calls[0][1].writer).toBeDefined();
    expect(sync.mock.calls[0][2].breakdownLimit).toBe(7);
  });

  it('fetches lists through fetchJson', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: 1 }) } as Response);
    jest.spyOn(run, 'syncMarket').mockImplementation(async (market, deps) => {
      expect(await deps.fetchJson('https://x.test')).toEqual({ ok: 1 });
      return { market } as run.SyncResult;
    });
    await main(
      ['US'],
      ENV,
      async () => yahoo,
      () => {},
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('loadYahoo', () => {
  it('creates a yahoo-finance2 client without the survey notice', async () => {
    expect(await loadYahoo()).toEqual({ opts: { suppressNotices: ['yahooSurvey'] } });
  });
});
