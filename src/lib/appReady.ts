// ============================================
// Signal « l'app est prête » (cold start)
// ============================================
//
// Émis par RootNavigator dès que la stack réelle (ou l'onboarding) peut être
// rendue : auth initialisée, langue et onboarding résolus. L'AnimatedSplash
// s'en sert pour disparaître dès que possible au lieu d'attendre une durée
// fixe. Signal « collant » : un abonné tardif est notifié immédiatement.

type Listener = () => void;

let ready = false;
const listeners = new Set<Listener>();

export function markAppReady(): void {
  if (ready) return;
  ready = true;
  const toCall = Array.from(listeners);
  listeners.clear();
  toCall.forEach((l) => {
    try {
      l();
    } catch {
      /* un abonné défaillant ne doit pas bloquer les autres */
    }
  });
}

export function isAppReady(): boolean {
  return ready;
}

/** S'abonne au signal. Appelle `listener` tout de suite si déjà prêt. */
export function onAppReady(listener: Listener): () => void {
  if (ready) {
    listener();
    return () => {};
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test only — remet le signal à zéro. */
export function __resetAppReadyForTests(): void {
  ready = false;
  listeners.clear();
}
