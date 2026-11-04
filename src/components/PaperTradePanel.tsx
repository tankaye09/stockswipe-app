import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { StockSummary } from '../data/types';
import { stockId } from '../data/types';
import { applyPaperTrade, FX_TO_USD, positionPnl, type TradeSide } from '../state/rules';
import { useAppState } from '../state/store';
import { changeColor, colors, fmtPrice, radius, space } from '../theme';
import { Button, Row } from './ui';

export function PaperTradePanel({ stock }: { stock: StockSummary }) {
  const { state, dispatch } = useAppState();
  const id = stockId(stock);
  const position = state.paper.positions.find((p) => p.id === id);
  const [qtyText, setQtyText] = useState('1');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const qty = Number(qtyText);

  const sides: TradeSide[] = !position ? ['buy', 'short'] : position.qty > 0 ? ['buy', 'sell'] : ['short', 'cover'];
  const label: Record<TradeSide, string> = { buy: 'Buy', sell: 'Sell', short: 'Short', cover: 'Cover' };

  const trade = (side: TradeSide) => {
    // Validate with the same rule the store uses so we can show the reason.
    const check = applyPaperTrade(state.paper, { id, side, qty, price: stock.price }, stock.currency);
    if (!check.ok) {
      setMessage({ text: check.error!, ok: false });
      return;
    }
    dispatch({ type: 'paperTrade', id, side, qty, price: stock.price, currency: stock.currency });
    setMessage({ text: `${label[side]} ${qty} ${stock.symbol} at ${fmtPrice(stock.price, stock.currency)}`, ok: true });
  };

  const pnl = position ? positionPnl(position, stock.price) : 0;

  return (
    <View style={styles.box} testID="paper-panel">
      <Text style={styles.title}>Paper trade</Text>
      <Text style={styles.sub}>
        Practise with virtual cash. Balance: $
        {state.paper.cashUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        {stock.currency !== 'USD' ? ` (S$1 = US$${FX_TO_USD[stock.currency]})` : ''}
      </Text>
      {position && (
        <Text style={styles.position} testID="paper-position">
          You hold {position.qty > 0 ? position.qty : `${-position.qty} short`} at{' '}
          {fmtPrice(position.avgPrice, stock.currency)} ·{' '}
          <Text style={{ color: changeColor(pnl) }}>
            {pnl >= 0 ? '+' : '-'}
            {fmtPrice(Math.abs(pnl), stock.currency)}
          </Text>
        </Text>
      )}
      <View style={styles.qtyRow}>
        <Text style={styles.qtyLabel}>Shares</Text>
        <TextInput
          testID="paper-qty"
          value={qtyText}
          onChangeText={setQtyText}
          keyboardType="number-pad"
          style={styles.input}
          accessibilityLabel="Number of shares"
        />
      </View>
      <Row>
        {sides.map((side) => (
          <Button
            key={side}
            testID={`paper-${side}`}
            label={label[side]}
            kind={side === 'buy' || side === 'cover' ? 'primary' : 'secondary'}
            onPress={() => trade(side)}
            style={{ flex: 1 }}
          />
        ))}
      </Row>
      {message && (
        <Text testID="paper-message" style={[styles.msg, { color: message.ok ? colors.up : colors.down }]}>
          {message.text}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.card, borderRadius: radius.md, padding: space(4), marginTop: space(6) },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 13, marginTop: 4, marginBottom: space(3) },
  position: { color: colors.text, fontSize: 14, marginBottom: space(3) },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: space(3), gap: space(3) },
  qtyLabel: { color: colors.textDim },
  input: {
    flex: 1,
    color: colors.text,
    backgroundColor: colors.cardAlt,
    borderRadius: radius.sm,
    paddingHorizontal: space(3),
    paddingVertical: space(2),
    fontSize: 16,
  },
  msg: { marginTop: space(3), fontSize: 14 },
});
