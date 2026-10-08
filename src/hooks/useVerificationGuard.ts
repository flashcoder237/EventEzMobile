import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { eventBus } from '../lib/eventBus';
import { RootStackParamList } from '../types';

/**
 * Hook for verification-level guards.
 *
 * Wraps an action and ensures the user is authenticated AND has a verified
 * email (or uses a social provider that implies verification). Otherwise, it
 * dispatches an event to show the verification modal/sheet.
 *
 * Usage:
 *   const { requireVerification, isVerified } = useVerificationGuard();
 *   const handleBuy = () => requireVerification(() => navigate('TicketPurchase', ...));
 */
export function useVerificationGuard() {
  const { user, isAuthenticated } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const emailVerified = Boolean(user?.email_verified);
  const authProvider = user?.auth_provider || 'email';
  const isVerified =
    emailVerified || (authProvider !== 'email' && authProvider !== null);

  const requireVerification = useCallback(
    (callback: () => void | Promise<void>) => {
      if (!isAuthenticated) {
        // BUG CORRIGE (2026-10-07) : « a quoi sert ce bouton de favori si
        // cliquer dessus ne fait rien ? ».
        //
        // On emettait `auth-required` sur le bus d'evenements... qui N'AVAIT
        // AUCUN ABONNE. L'action s'arretait donc ici, en silence absolu : pas
        // d'ecran de connexion, pas de message, rien. Le bouton paraissait
        // mort alors que tout le reste de la chaine etait correct.
        //
        // On navigue desormais vers la connexion, comme le fait deja
        // `useAuthGuard` — c'est le comportement attendu, et il est visible.
        navigation.navigate('Login' as never);
        return;
      }
      if (!isVerified) {
        eventBus.emit('verification-required', {
          email: user?.email,
        });
        return;
      }
      callback();
    },
    [isAuthenticated, isVerified, user?.email],
  );

  return {
    isVerified,
    isAuthenticated,
    requireVerification,
    email: user?.email,
  };
}
