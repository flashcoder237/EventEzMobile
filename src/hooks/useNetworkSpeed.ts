import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

/**
 * Returns true when the user is on a slow cellular connection (2G/3G or
 * cellularGeneration === '2g'/'3g'). Used to show a "connexion lente"
 * banner on screens where the user is about to wait (Discover, Payment).
 *
 * Falls back to "not slow" if NetInfo is unavailable or the type is unknown.
 */
export function useNetworkSpeed() {
  const [isSlowCellular, setIsSlowCellular] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const evaluate = (state: NetInfoState) => {
      // Offline = no connection at all
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);

      // Slow cellular = type cellular AND generation 2g/3g
      if (state.type === 'cellular' && state.details && 'cellularGeneration' in state.details) {
        const gen = state.details.cellularGeneration;
        setIsSlowCellular(gen === '2g' || gen === '3g');
      } else {
        setIsSlowCellular(false);
      }
    };

    // Initial fetch
    NetInfo.fetch().then(evaluate).catch(() => {
      /* ignore — assume not slow */
    });

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener(evaluate);
    return unsubscribe;
  }, []);

  return { isSlowCellular, isOffline };
}
