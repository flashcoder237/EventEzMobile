import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../types';

/**
 * Hook for action-level auth guards.
 * Returns a wrapper that checks auth before executing an action.
 * If not authenticated, navigates to Login screen.
 *
 * Usage:
 *   const { requireAuth } = useAuthGuard();
 *   const handleBuy = requireAuth(() => { navigation.navigate('TicketPurchase', ...) });
 */
export function useAuthGuard() {
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const requireAuth = useCallback(
    <T extends (...args: any[]) => any>(action: T) => {
      return ((...args: Parameters<T>) => {
        if (!isAuthenticated) {
          navigation.navigate('Login');
          return;
        }
        return action(...args);
      }) as T;
    },
    [isAuthenticated, navigation]
  );

  return { isAuthenticated, requireAuth };
}
