import { router } from 'expo-router';
import React from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { StockRow } from '../../../components/StockRow';
import { Button, Disclaimer } from '../../../components/ui';
import { useStocks } from '../../../components/useStocks';
import { portfolioValueUsd, positionPnl, STARTING_CASH_USD } from '../../../state/rules';
import { useAppState } from '../../../state/store';
import { changeColor, colors, fmtPct, fmtPrice, space } from '../../../theme';

export default function PortfolioScreen() {
  const { state, dispatch } = useAppState();
  const { positions, cashUsd } = state.paper;
  const stocks = useStocks(positions.map((p) => p.id));
  const quotes = Object.fromEntries(
    Object.entries(stocks).map(([id, s]) => [id, { price: s.price, currency: s.currency }]),
  );
  const total = portfolioValueUsd(state.paper, quotes);
  const gain = total - STARTING_CASH_USD;

  const reset = () =>
    Alert.alert('Reset paper account?', 'This clears all positions and restores US$100,000.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => dispatch({ type: 'resetPaper' }) },
    ]);

  return (
    <FlatList
      testID="portfolio"
      style={{ backgroundColor: colors.bg }}
      data={positions.filter((p) => stocks[p.id])}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.label}>Paper account value</Text>
          <Text style={styles.total} testID="portfolio-total">
            {fmtPrice(total, 'USD')}
          </Text>
          <Text style={{ color: changeColor(gain), fontWeight: '600' }}>
            {gain >= 0 ? '+' : '-'}
            {fmtPrice(Math.abs(gain), 'USD')} ({fmtPct((gain / STARTING_CASH_USD) * 100)}) all time
          </Text>
          <Text style={styles.cash}>Cash {fmtPrice(cashUsd, 'USD')}</Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty} testID="portfolio-empty">
          No positions yet. Open any stock and use Paper trade to practise.
        </Text>
      }
      renderItem={({ item: p }) => {
        const s = stocks[p.id];
        const pnl = positionPnl(p, s.price);
        return (
          <StockRow
            testID={`position-${p.id}`}
            stock={s}
            onPress={() => router.push(`/stock/${encodeURIComponent(p.id)}`)}
            right={
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.qty}>
                  {p.qty > 0 ? `${p.qty} share${p.qty === 1 ? '' : 's'}` : `${-p.qty} short`}
                </Text>
                <Text style={{ color: changeColor(pnl), fontSize: 13 }}>
                  {pnl >= 0 ? '+' : '-'}
                  {fmtPrice(Math.abs(pnl), s.currency)}
                </Text>
              </View>
            }
          />
        );
      }}
      ListFooterComponent={
        <View style={{ padding: space(4) }}>
          <Button testID="reset-paper" label="Reset paper account" kind="secondary" onPress={reset} />
          <Disclaimer />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  header: { padding: space(5), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  label: { color: colors.textDim },
  total: { color: colors.text, fontSize: 34, fontWeight: '800', marginVertical: 4 },
  cash: { color: colors.textFaint, marginTop: space(2) },
  qty: { color: colors.text, fontWeight: '600' },
  empty: { color: colors.textDim, padding: space(6), textAlign: 'center' },
});
