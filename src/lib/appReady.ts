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
  crashed = false;
}

// ============================================
// Signal « l'app a plante sous le splash »
// ============================================
//
// POURQUOI : le splash anime est rendu PAR-DESSUS `<AppContent />`, en dehors
// de l'ErrorBoundary. Si l'application plante au demarrage, l'ecran d'erreur
// est bien rendu — mais SOUS le splash, donc invisible. L'utilisateur voit un
// logo fige et croit a un blocage ; en realite l'app a plante et le dit, on ne
// le laisse simplement pas voir.
//
// Ce signal permet au splash de s'effacer immediatement pour laisser
// apparaitre l'ecran d'erreur (et, en interne, le detail du probleme).

let crashed = false;

/** Appele par l'ErrorBoundary quand il attrape une erreur de rendu. */
export function markAppCrashed(): void {
  if (crashed) return;
  crashed = true;
  // Un plantage rend l'app « prete » au sens du splash : il n'y a plus rien a
  // attendre, il faut rendre la main tout de suite.
  markAppReady();
}

export function hasAppCrashed(): boolean {
  return crashed;
}
