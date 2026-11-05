import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { brokerById, openInBroker } from '../../broker/brokers';
import { PaperTradePanel } from '../../components/PaperTradePanel';
import { PriceChart } from '../../components/PriceChart';
import { Button, Chip, Disclaimer, Row, SectionTitle } from '../../components/ui';
import { useHistory } from '../../components/useHistory';
import { marketData, type ChartRange, type StockSummary } from '../../data';
import { parseStockIdParam } from '../../state/persist';
import { useAppState } from '../../state/store';
import { changeColor, colors, fmtBig, fmtPct, fmtPrice, space } from '../../theme';

const RANGES: ChartRange[] = ['1M', '6M', '1Y'];

export default function StockScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  // The id can come from a deep link, so treat it as untrusted input.
  const id = parseStockIdParam(params.id);
  const { state, dispatch } = useAppState();
  const [stock, setStock] = useState<StockSummary | null | undefined>(undefined);
  const [range, setRange] = useState<ChartRange>('6M');
  const points = useHistory(id, range);
  const { width } = useWindowDimensions();
  const saved = id !== null && state.watchlist.includes(id);

  useEffect(() => {
    if (id) marketData.getStock(id).then(setStock);
  }, [id]);

  if (id === null || stock === null) return <Text style={styles.body}>Stock not found.</Text>;
  if (stock === undefined) return <ActivityIndicator color={colors.accent} style={{ marginTop: 80 }} />;

  const b = stock.breakdown;
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.content} testID="stock-screen">
      <Stack.Screen options={{ title: stock.symbol }} />
      <Text style={styles.name}>{stock.name}</Text>
      <Text style={styles.price}>{fmtPrice(stock.price, stock.currency)}</Text>
      <Text style={{ color: changeColor(stock.changePct), fontWeight: '600' }}>{fmtPct(stock.changePct)} today</Text>

      <View style={{ marginVertical: space(4) }}>
        <PriceChart points={points} width={width - space(10)} height={180} />
      </View>
      <Row>
        {RANGES.map((r) => (
          <Chip key={r} label={r} selected={r === range} onPress={() => setRange(r)} testID={`range-${r}`} />
        ))}
      </Row>

      <Row style={{ marginTop: space(5) }}>
        <Button
          testID="toggle-save"
          label={saved ? '★ Saved' : '☆ Save'}
          kind="secondary"
          onPress={() => dispatch({ type: saved ? 'unsave' : 'save', id })}
          style={{ flex: 1 }}
        />
        <Button
          testID="open-broker"
          label={state.broker ? `Open in ${brokerById(state.broker).name}` : 'Choose a broker'}
          onPress={() =>
            state.broker ? openInBroker(state.broker, stock.symbol, stock.market) : router.push('/settings')
          }
          style={{ flex: 1 }}
        />
      </Row>

      <SectionTitle>In plain English</SectionTitle>
      <Text style={styles.lead}>{b.oneLiner}</Text>
      <Para title="What they do" text={b.whatTheyDo} />
      <Para title="How they make money" text={b.howTheyMakeMoney} />
      <Para title="Why people watch it" text={b.whyPeopleWatch} />
      <Para title="Risks to know" text={b.risksToKnow} />

      <SectionTitle>Key stats</SectionTitle>
      <Stat label="Market cap" value={fmtBig(stock.stats.marketCap, stock.currency)} />
      <Stat label="P/E ratio" value={stock.stats.peRatio?.toFixed(1) ?? 'n/a'} />
      <Stat label="Dividend yield" value={stock.stats.dividendYield ? `${stock.stats.dividendYield}%` : 'None'} />
      <Stat
        label="52-week range"
        value={`${fmtPrice(stock.stats.week52Low, stock.currency)} – ${fmtPrice(stock.stats.week52High, stock.currency)}`}
      />
      <Stat label="Next earnings" value={stock.stats.nextEarnings ?? 'Not announced'} />
      <Stat label="Sector" value={stock.sector} />

      {stock.news.length > 0 && (
        <>
          <SectionTitle>News</SectionTitle>
          {stock.news.map((n) => (
            <Text key={n.headline} style={styles.body}>
              • {n.headline}{' '}
              <Text style={{ color: colors.textFaint }}>
                ({n.source}, {n.date})
              </Text>
            </Text>
          ))}
        </>
      )}

      <PaperTradePanel stock={stock} />
      <Disclaimer />
    </ScrollView>
  );
}

function Para({ title, text }: { title: string; text: string }) {
  // Real stocks only have some parts of the breakdown so far.
  if (!text) return null;
  return (
    <View style={{ marginTop: space(3) }}>
      <Text style={styles.paraTitle}>{title}</Text>
      <Text style={styles.body}>{text}</Text>
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
  content: { padding: space(5), paddingBottom: space(12) },
  name: { color: colors.textDim, fontSize: 16 },
  price: { color: colors.text, fontSize: 32, fontWeight: '800', marginTop: 4 },
  lead: { color: colors.text, fontSize: 18, fontWeight: '700' },
  paraTitle: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 2 },
  body: { color: colors.textDim, fontSize: 15, lineHeight: 22 },
  stat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space(2.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  statLabel: { color: colors.textDim },
  statValue: { color: colors.text, fontWeight: '600' },
});
