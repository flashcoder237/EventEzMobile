/**
 * Aiguillage UNIQUE de la secousse.
 *
 * Un seul pont capteurs écoute la secousse (le `ShakeHost` monté dans
 * App.tsx) ; les écrans qui veulent la secousse (Découvrir → « surprends-moi »,
 * Connexions / hub sur place → échange de contact) s'y inscrivent au lieu
 * d'ouvrir leur propre capteur. Sans ça, une même secousse déclencherait à la
 * fois l'annulation, le geste de l'écran et le signalement.
 *
 * Priorité : annulation en attente (G1) > geste de l'écran affiché >
 * signalement de problème (G2, hors production seulement).
 */

export type ShakeTarget = 'undo' | 'screen' | 'report' | null;

export function resolveShake(input: {
  undoPending: boolean;
  hasScreenHandler: boolean;
  reportEnabled: boolean;
  routeExcludedFromReport: boolean;
}): ShakeTarget {
  if (input.undoPending) return 'undo';
  if (input.hasScreenHandler) return 'screen';
  if (input.reportEnabled && !input.routeExcludedFromReport) return 'report';
  return null;
}

/**
 * Écrans où le signalement ne capture JAMAIS l'écran : billets (QR), paiement,
 * portefeuille, conversations privées.
 */
export const REPORT_EXCLUDED_ROUTES = new Set<string>([
  'QRCode',
  'RegistrationDetails',
  'OfflineTickets',
  'MyTickets',
  'TicketPurchase',
  'Payment',
  'PaymentSuccess',
  'PaymentFailed',
  'MyPayments',
  'Wallet',
  'RefundRequest',
  'Conversation',
  'Messages',
  'MessagesTab',
  'MessageRequests',
]);

export function isReportExcludedRoute(route: string | undefined | null): boolean {
  return !!route && REPORT_EXCLUDED_ROUTES.has(route);
}

/** G2 n'existe qu'en build interne (profil preview / development d'EAS). */
export function isShakeReportEnabled(env: string | undefined = process.env.EXPO_PUBLIC_SHAKE_TO_REPORT): boolean {
  return env === '1';
}

type Handler = () => void;
let seq = 0;
const handlers: { id: number; fn: Handler }[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const shakeRouter = {
  /** Inscrit le geste de l'écran affiché (le dernier inscrit gagne). */
  register(fn: Handler): () => void {
    const id = ++seq;
    handlers.push({ id, fn });
    emit();
    return () => {
      const i = handlers.findIndex((h) => h.id === id);
      if (i >= 0) handlers.splice(i, 1);
      emit();
    };
  },
  top(): Handler | null {
    return handlers.length ? handlers[handlers.length - 1].fn : null;
  },
  hasScreenHandler(): boolean {
    return handlers.length > 0;
  },
  subscribe(l: () => void): () => void {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  /** Tests uniquement. */
  __reset() {
    handlers.length = 0;
    listeners.clear();
  },
};
