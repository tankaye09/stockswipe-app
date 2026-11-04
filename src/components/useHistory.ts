import { useEffect, useState } from 'react';
import { marketData, type ChartRange, type PricePoint, type StockId } from '../data';

export function useHistory(id: StockId | null, range: ChartRange) {
  const [points, setPoints] = useState<PricePoint[]>([]);
  useEffect(() => {
    let live = true;
    if (!id) return;
    marketData.getHistory(id, range).then((p) => live && setPoints(p));
    return () => {
      live = false;
    };
  }, [id, range]);
  return points;
}
