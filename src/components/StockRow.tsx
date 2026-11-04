import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StockSummary } from '../data/types';
import { changeColor, colors, fmtPct, fmtPrice, space } from '../theme';

export function StockRow({
  stock,
  right,
  onPress,
  testID,
}: {
  stock: StockSummary;
  right?: React.ReactNode;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row} testID={testID}>
      <View style={{ flex: 1 }}>
        <Text style={styles.symbol}>
          {stock.symbol} <Text style={styles.market}>{stock.market}</Text>
        </Text>
        <Text style={styles.name} numberOfLines={1}>
          {stock.name}
        </Text>
      </View>
      {right ?? (
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.price}>{fmtPrice(stock.price, stock.currency)}</Text>
          <Text style={{ color: changeColor(stock.changePct), fontSize: 13 }}>{fmtPct(stock.changePct)}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space(3.5),
    paddingHorizontal: space(4),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  symbol: { color: colors.text, fontSize: 17, fontWeight: '700' },
  market: { color: colors.textFaint, fontSize: 11 },
  name: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  price: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
