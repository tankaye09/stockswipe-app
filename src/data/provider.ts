import type { ChartRange, Market, PricePoint, StockId, StockSummary } from './types';

/**
 * The one seam between the app and a market data vendor.
 *
 * Today the app uses `mockProvider` (sample data). To go live, write a class that
 * implements this interface against the chosen vendor (e.g. Polygon, Twelve Data,
 * EODHD for SGX) and swap it in `src/data/index.ts`. Nothing else should change.
 *
 * Each market can have its own provider: see `CompositeProvider` below, which is
 * how SGX can come from a different vendor than US stocks.
 */
export interface MarketDataProvider {
  /** Markets this provider can serve. */
  readonly markets: Market[];
  /** Every stock the feed may show for the given markets. */
  listUniverse(markets: Market[]): Promise<StockSummary[]>;
  getStock(id: StockId): Promise<StockSummary | null>;
  getHistory(id: StockId, range: ChartRange): Promise<PricePoint[]>;
  /** Latest prices for several stocks at once (watchlist, portfolio). */
  getQuotes(ids: StockId[]): Promise<Record<string, { price: number; changePct: number }>>;
}

/** Routes each request to the provider that serves that stock's market. */
export class CompositeProvider implements MarketDataProvider {
  constructor(private readonly byMarket: Partial<Record<Market, MarketDataProvider>>) {}

  get markets(): Market[] {
    return Object.keys(this.byMarket) as Market[];
  }

  private forId(id: StockId): MarketDataProvider | undefined {
    return this.byMarket[id.split(':')[0] as Market];
  }

  async listUniverse(markets: Market[]): Promise<StockSummary[]> {
    const lists = await Promise.all(markets.map((m) => this.byMarket[m]?.listUniverse([m]) ?? Promise.resolve([])));
    return lists.flat();
  }

  async getStock(id: StockId) {
    return (await this.forId(id)?.getStock(id)) ?? null;
  }

  async getHistory(id: StockId, range: ChartRange) {
    return (await this.forId(id)?.getHistory(id, range)) ?? [];
  }

  async getQuotes(ids: StockId[]) {
    const out: Record<string, { price: number; changePct: number }> = {};
    for (const market of this.markets) {
      const mine = ids.filter((id) => id.startsWith(`${market}:`));
      if (mine.length) Object.assign(out, await this.byMarket[market]!.getQuotes(mine));
    }
    return out;
  }
}
