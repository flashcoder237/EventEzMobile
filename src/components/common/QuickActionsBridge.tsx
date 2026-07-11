import { useQuickActions } from '../../hooks/useQuickActions';

/**
 * Composant sans rendu : active les raccourcis d'icône (quick actions /
 * app shortcuts). À monter sous AuthProvider (le hook lit le rôle utilisateur).
 */
export default function QuickActionsBridge(): null {
  useQuickActions();
  return null;
}
