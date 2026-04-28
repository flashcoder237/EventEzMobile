import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../types';

interface AuthGuardOptions {
  eventTitle?: string;
  returnScreen?: keyof RootStackParamList;
  returnParams?: object;
}

/**
 * Hook for action-level auth guards.
 * Returns a wrapper that checks auth before executing an action.
 * If not authenticated, navigates to Login screen with optional context
 * (eventTitle for the banner, returnScreen+params for auto-redirect post-login).
 *
 * Usage:
 *   const { requireAuth } = useAuthGuard();
 *   const handleBuy = requireAuth(
 *     () => navigation.navigate('TicketPurchase', { eventId }),
 *     { eventTitle: event.title, returnScreen: 'TicketPurchase', returnParams: { eventId } },
 *   );
 */
export function useAuthGuard() {
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const requireAuth = useCallback(
    <T extends (...args: any[]) => any>(action: T, options?: AuthGuardOptions) => {
      return ((...args: Parameters<T>) => {
        if (!isAuthenticated) {
          navigation.navigate('Login', options);
          return;
        }
        return action(...args);
      }) as T;
    },
    [isAuthenticated, navigation]
  );

  return { isAuthenticated, requireAuth };
}
