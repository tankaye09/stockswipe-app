import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { brokerById, openInBroker } from '../../broker/brokers';
import { AdCard, EmptyCard, LimitCard } from '../../components/FeedCards';
import { StockCard } from '../../components/StockCard';
import { SwipeDeck, type SwipeDeckHandle, type SwipeDir } from '../../components/SwipeDeck';
import { Disclaimer } from '../../components/ui';
import { UndoToast, useUndo } from '../../components/UndoToast';
import { NO_FILTERS } from '../../feed/feedEngine';
import type { StockSummary } from '../../data/types';
import { useFeed, useUniverse, type DeckItem } from '../../feed/useFeed';
import { effectiveLimits } from '../../state/rules';
import { useAppState } from '../../state/store';
import { colors, radius, space } from '../../theme';

export default function DiscoverScreen() {
  const { state } = useAppState();
  const universe = useUniverse(state.markets);
  // A new key starts a fresh feed whenever what shapes it changes.
  const feedKey = JSON.stringify([state.markets, state.filters, state.interests]);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {universe ? (
        <Feed key={feedKey} universe={universe} />
      ) : (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 80 }} />
      )}
    </SafeAreaView>
  );
}

function Feed({ universe }: { universe: StockSummary[] }) {
  const { state, dispatch } = useAppState();
  const { deck, remaining, advance, restore } = useFeed(universe);
  const { pending, start, undo } = useUndo();
  const deckRef = useRef<SwipeDeckHandle>(null);
  const tradeMode = state.swipeMode === 'trade';
  const filterCount =
    state.filters.sectors.length +
    state.filters.caps.length +
    state.filters.themes.length +
    (state.filters.earningsWithinDays != null ? 1 : 0);

  const onSwipe = (card: DeckItem, dir: SwipeDir) => {
    if (card.kind !== 'stock') {
      advance(false);
      return;
    }
    const { item } = card;
    advance(true);
    dispatch({ type: 'markSeen', id: item.id });
    dispatch({ type: 'countSwipe', delta: 1 });
    Haptics.selectionAsync().catch(() => {});

    const undoSwipe = () => {
      restore(card);
      dispatch({ type: 'countSwipe', delta: -1 });
    };

    if (dir === 'left') return;

    if (!tradeMode) {
      const alreadySaved = state.watchlist.includes(item.id);
      dispatch({ type: 'save', id: item.id });
      start({
        message: `Saved ${item.stock.symbol} to your watchlist`,
        onUndo: () => {
          if (!alreadySaved) dispatch({ type: 'unsave', id: item.id });
          undoSwipe();
        },
      });
      return;
    }

    if (!state.broker) {
      undoSwipe();
      router.push('/settings?pickBroker=1');
      return;
    }
    const broker = state.broker;
    start({
      message: `Opening ${item.stock.symbol} in ${brokerById(broker).name}…`,
      onUndo: undoSwipe,
      onExpire: () => {
        openInBroker(broker, item.stock.symbol, item.stock.market);
      },
    });
  };

  const renderCard = (card: DeckItem) => {
    switch (card.kind) {
      case 'stock':
        return <StockCard item={card.item} />;
      case 'ad':
        return <AdCard onRemoveAds={() => router.push('/paywall')} />;
      case 'limit':
        return <LimitCard dailySwipes={effectiveLimits(state).dailySwipes} onUpgrade={() => router.push('/paywall')} />;
      case 'empty':
        return <EmptyCard onReset={() => dispatch({ type: 'setFilters', filters: NO_FILTERS })} />;
    }
  };

  const top = deck[0];
  const canSwipeTop = top?.kind === 'stock' || top?.kind === 'ad';

  return (
    <>
      <View style={styles.header}>
        <View style={styles.toggle} accessibilityRole="radiogroup">
          {(['save', 'trade'] as const).map((m) => (
            <Pressable
              key={m}
              testID={`mode-${m}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: state.swipeMode === m }}
              onPress={() => dispatch({ type: 'setSwipeMode', mode: m })}
              style={[styles.toggleBtn, state.swipeMode === m && styles.toggleOn]}
            >
              <Text style={[styles.toggleText, state.swipeMode === m && styles.toggleTextOn]}>
                {m === 'save' ? '⭐ Save' : '↗ Trade'}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.headerRight}>
          {Number.isFinite(remaining) && (
            <Text style={styles.remaining} testID="swipes-left">
              {remaining} left
            </Text>
          )}
          <Pressable testID="open-filters" onPress={() => router.push('/filters')} style={styles.filterBtn}>
            <Text style={styles.filterText}>Filters{filterCount ? ` (${filterCount})` : ''}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.deck} testID="deck">
        <SwipeDeck
          ref={deckRef}
          items={deck}
          keyOf={(c) => c.key}
          render={renderCard}
          onSwipe={onSwipe}
          onTap={(c) => c.kind === 'stock' && router.push(`/stock/${encodeURIComponent(c.item.id)}`)}
          rightLabel={tradeMode ? 'TRADE' : 'SAVE'}
          rightColor={tradeMode ? colors.trade : colors.save}
          canSwipe={(c) => c.kind === 'stock' || c.kind === 'ad'}
        />
      </View>

      <View style={styles.actions}>
        <Pressable
          testID="skip-button"
          accessibilityLabel="Skip"
          disabled={!canSwipeTop}
          onPress={() => deckRef.current?.swipe('left')}
          style={[styles.round, { borderColor: colors.skip }]}
        >
          <Text style={[styles.roundText, { color: colors.skip }]}>✕</Text>
        </Pressable>
        <Pressable
          testID="right-button"
          accessibilityLabel={tradeMode ? 'Trade' : 'Save'}
          disabled={!canSwipeTop}
          onPress={() => deckRef.current?.swipe('right')}
          style={[styles.round, { borderColor: tradeMode ? colors.trade : colors.save }]}
        >
          <Text style={[styles.roundText, { color: tradeMode ? colors.trade : colors.save }]}>
            {tradeMode ? '↗' : '★'}
          </Text>
        </Pressable>
      </View>
      <Disclaimer />
      <UndoToast pending={pending} onUndo={undo} />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space(4),
    paddingVertical: space(2),
  },
  toggle: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 999, padding: 3 },
  toggleBtn: { paddingHorizontal: space(3.5), paddingVertical: space(1.5), borderRadius: 999 },
  toggleOn: { backgroundColor: colors.cardAlt },
  toggleText: { color: colors.textFaint, fontWeight: '700' },
  toggleTextOn: { color: colors.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  remaining: { color: colors.textDim, fontSize: 13 },
  filterBtn: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
  },
  filterText: { color: colors.text, fontWeight: '600' },
  deck: { flex: 1, marginHorizontal: space(4), marginTop: space(2) },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: space(10), paddingTop: space(4) },
  round: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  roundText: { fontSize: 26, fontWeight: '800' },
});
