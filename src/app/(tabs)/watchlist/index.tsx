import { router } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { StockRow } from '../../../components/StockRow';
import { useStocks } from '../../../components/useStocks';
import { useAppState } from '../../../state/store';
import { colors, space } from '../../../theme';

export default function WatchlistScreen() {
  const { state, dispatch } = useAppState();
  const stocks = useStocks(state.watchlist);
  const rows = state.watchlist.filter((id) => stocks[id]);

  if (!state.watchlist.length) {
    return (
      <View style={styles.empty} testID="watchlist-empty">
        <Text style={styles.emptyTitle}>Nothing saved yet</Text>
        <Text style={styles.emptyBody}>Swipe right on a stock in Save mode to add it here.</Text>
      </View>
    );
  }

  return (
    <FlatList
      testID="watchlist"
      style={{ backgroundColor: colors.bg }}
      data={rows}
      keyExtractor={(id) => id}
      renderItem={({ item: id }) => (
        <StockRow
          testID={`watch-${id}`}
          stock={stocks[id]}
          onPress={() => router.push(`/stock/${encodeURIComponent(id)}`)}
          right={
            <Pressable
              testID={`unsave-${id}`}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${stocks[id].symbol}`}
              hitSlop={12}
              onPress={() => dispatch({ type: 'unsave', id })}
            >
              <Text style={{ color: colors.textFaint, fontSize: 18 }}>✕</Text>
            </Pressable>
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: space(8) },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  emptyBody: { color: colors.textDim, textAlign: 'center', marginTop: space(2) },
});
