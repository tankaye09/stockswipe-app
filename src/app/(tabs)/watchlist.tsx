import { router } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { StockRow } from '../../components/StockRow';
import { Segmented } from '../../components/ui';
import { useStocks } from '../../components/useStocks';
import type { StockId } from '../../data/types';
import { useAppState, type Action } from '../../state/store';
import { colors, space } from '../../theme';

type Section = 'watchlist' | 'trades';

const SECTIONS = [
  { value: 'watchlist', label: 'Watchlist', icon: 'star' },
  { value: 'trades', label: 'Trades', icon: 'trades' },
] as const;

/** What each section lists, how to take a stock out of it, and what it says when empty. */
const COPY: Record<
  Section,
  { testID: string; rowID: string; remove: (id: StockId) => Action; emptyTitle: string; emptyBody: string }
> = {
  watchlist: {
    testID: 'watchlist',
    rowID: 'watch',
    remove: (id) => ({ type: 'unsave', id }),
    emptyTitle: 'Nothing saved yet',
    emptyBody: 'Swipe right on a stock in Save mode to add it here.',
  },
  trades: {
    testID: 'trades',
    rowID: 'traded',
    remove: (id) => ({ type: 'unmarkTraded', id }),
    emptyTitle: 'No trades yet',
    emptyBody: 'Stocks you paper trade, or open in your broker from Trade mode, show up here.',
  },
};

/** Needles: the stocks you found in the stack, as saved (Watchlist) and traded (Trades). */
export default function NeedlesScreen() {
  const { state, dispatch } = useAppState();
  const [section, setSection] = useState<Section>('watchlist');
  const ids = section === 'watchlist' ? state.watchlist : state.traded;
  const copy = COPY[section];
  const stocks = useStocks(ids);
  const rows = ids.filter((id) => stocks[id]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Segmented options={SECTIONS} value={section} onChange={setSection} testIDPrefix="needles" />
      </View>
      {ids.length ? (
        <FlatList
          testID={copy.testID}
          data={rows}
          keyExtractor={(id) => id}
          renderItem={({ item: id }) => (
            <StockRow
              testID={`${copy.rowID}-${id}`}
              stock={stocks[id]}
              onPress={() => router.push(`/stock/${encodeURIComponent(id)}`)}
              right={
                <Pressable
                  testID={`remove-${copy.rowID}-${id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${stocks[id].symbol}`}
                  hitSlop={12}
                  onPress={() => dispatch(copy.remove(id))}
                >
                  <Icon name="close" size={20} color={colors.textFaint} />
                </Pressable>
              }
            />
          )}
        />
      ) : (
        <View style={styles.empty} testID={`${copy.testID}-empty`}>
          <Text style={styles.emptyTitle}>{copy.emptyTitle}</Text>
          <Text style={styles.emptyBody}>{copy.emptyBody}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { alignItems: 'center', paddingVertical: space(3) },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space(8) },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  emptyBody: { color: colors.textDim, textAlign: 'center', marginTop: space(2) },
});
