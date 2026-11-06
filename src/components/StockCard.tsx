import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { FeedItem } from '../feed/feedEngine';
import { changeColor, colors, fmtBig, fmtPct, fmtPrice, radius, space } from '../theme';
import { Icon, type IconName } from './Icon';
import { PriceChart } from './PriceChart';
import { useHistory } from './useHistory';

/** Why the card was shown: a stock like ones you saved, in the news, or a wildcard. */
const BUCKET_ICON: Record<FeedItem['bucket'], IconName> = { liked: 'heart', news: 'newspaper', wildcard: 'dice' };

export function StockCard({ item }: { item: FeedItem }) {
  const { stock: s } = item;
  const points = useHistory(item.id, '6M');
  const [chartWidth, setChartWidth] = useState(0);

  return (
    <View style={styles.card}>
      <View style={styles.reason}>
        <Icon name={BUCKET_ICON[item.bucket]} size={14} color={colors.textDim} testID={`reason-${item.bucket}`} />
        <Text style={styles.reasonText} numberOfLines={2}>
          {item.reason}
        </Text>
      </View>

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.row}>
            <Text style={styles.symbol} testID="card-symbol">
              {s.symbol}
            </Text>
            <Text style={styles.market}>{s.market}</Text>
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {s.name}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.price}>{fmtPrice(s.price, s.currency)}</Text>
          <Text style={[styles.change, { color: changeColor(s.changePct) }]}>{fmtPct(s.changePct)} today</Text>
        </View>
      </View>

      <View testID="card-chart" onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)} style={styles.chart}>
        {chartWidth > 0 && <PriceChart points={points} width={chartWidth} height={110} />}
        <Text style={styles.chartLabel}>6 months</Text>
      </View>

      <View style={styles.stats}>
        <Stat label="Market cap" value={fmtBig(s.stats.marketCap, s.currency)} />
        <Stat label="P/E" value={s.stats.peRatio ? s.stats.peRatio.toFixed(0) : 'n/a'} />
        <Stat label="Dividend" value={s.stats.dividendYield ? `${s.stats.dividendYield.toFixed(1)}%` : 'None'} />
      </View>

      <Text style={styles.oneLiner}>{s.breakdown.oneLiner}</Text>
      <Text style={styles.body} numberOfLines={3}>
        {s.breakdown.whatTheyDo}
      </Text>
      {s.breakdown.whyPeopleWatch ? (
        <>
          <Text style={styles.label}>Why people watch it</Text>
          <Text style={styles.body} numberOfLines={2}>
            {s.breakdown.whyPeopleWatch}
          </Text>
        </>
      ) : null}

      <Text style={styles.more}>Tap for the full breakdown</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space(5),
  },
  reason: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cardAlt,
    borderRadius: radius.sm,
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
    marginBottom: space(4),
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
  },
  reasonText: { color: colors.textDim, fontSize: 13, flexShrink: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  symbol: { color: colors.text, fontSize: 28, fontWeight: '800' },
  market: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  name: { color: colors.textDim, fontSize: 15, marginTop: 2 },
  price: { color: colors.text, fontSize: 22, fontWeight: '700' },
  change: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  chart: { marginVertical: space(4) },
  chartLabel: { color: colors.textFaint, fontSize: 11, position: 'absolute', right: 0, top: 0 },
  stats: { flexDirection: 'row', gap: space(2), marginBottom: space(4) },
  stat: { flex: 1, backgroundColor: colors.cardAlt, borderRadius: radius.sm, padding: space(2.5) },
  statLabel: { color: colors.textFaint, fontSize: 11 },
  statValue: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
  oneLiner: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: space(2) },
  label: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
    marginTop: space(3),
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  body: { color: colors.textDim, fontSize: 15, lineHeight: 21 },
  more: { color: colors.accent, fontSize: 13, marginTop: 'auto', textAlign: 'center', paddingTop: space(3) },
});
