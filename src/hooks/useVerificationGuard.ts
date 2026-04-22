import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { eventBus } from '../lib/eventBus';

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

  const emailVerified = Boolean(user?.email_verified);
  const authProvider = user?.auth_provider || 'email';
  const isVerified =
    emailVerified || (authProvider !== 'email' && authProvider !== null);

  const requireVerification = useCallback(
    (callback: () => void | Promise<void>) => {
      if (!isAuthenticated) {
        eventBus.emit('auth-required');
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
