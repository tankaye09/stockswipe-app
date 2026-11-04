import { useEffect, useState } from 'react';
import { marketData, type StockId, type StockSummary } from '../data';

/** Loads stock details for a list of ids, keeping the given order. */
export function useStocks(ids: StockId[]) {
  const [stocks, setStocks] = useState<Record<string, StockSummary>>({});
  const key = ids.join(',');
  useEffect(() => {
    let live = true;
    Promise.all(ids.map((id) => marketData.getStock(id))).then((list) => {
      if (!live) return;
      const out: Record<string, StockSummary> = {};
      list.forEach((s, i) => s && (out[ids[i]] = s));
      setStocks(out);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return stocks;
}
