// Runs once at launch inside the app state: checks Premium with the store,
// fetches the dashboard's free tier limits, and starts the ad SDK.
import { useEffect } from 'react';
import { useAppState } from '../state/store';
import { initAds } from './ads';
import { purchases } from './purchases';

export function MonetizationSync() {
  const { dispatch } = useAppState();

  useEffect(() => {
    const p = purchases();
    let live = true;
    const ifLive = (fn: () => void) => live && fn();

    p.isPremium()
      .then((premium) => premium != null && ifLive(() => dispatch({ type: 'setPremium', premium })))
      .catch(() => {});
    // When offline this rejects, and the limits cached from the last launch stay.
    p.getRemoteLimits()
      .then((limits) => limits && ifLive(() => dispatch({ type: 'setRemoteLimits', limits })))
      .catch(() => {});
    const unsubscribe = p.onChange((premium) => ifLive(() => dispatch({ type: 'setPremium', premium })));
    initAds();

    return () => {
      live = false;
      unsubscribe();
    };
  }, [dispatch]);

  return null;
}
