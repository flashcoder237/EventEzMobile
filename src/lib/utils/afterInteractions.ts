import { InteractionManager } from 'react-native';

/**
 * `InteractionManager.runAfterInteractions` avec un délai maximal.
 *
 * Seul, il attend qu'AUCUNE interaction ne soit en cours : une animation ou un
 * geste qui en ouvre en continu le repousse indéfiniment. Des chargements
 * (accueil « Pour vous », tableau de bord) ne partaient alors jamais et
 * l'écran restait sur son squelette — « l'app se fige ». Ici, `fn` s'exécute
 * au plus tard après `maxWaitMs`, et une seule fois.
 */
export function runAfterInteractionsOrTimeout(fn: () => void, maxWaitMs = 1500): { cancel: () => void } {
  let done = false;
  // `let` + gardes : certains environnements (tests) exécutent le rappel de
  // runAfterInteractions de façon synchrone, avant que `timer` existe.
  let timer: ReturnType<typeof setTimeout> | undefined;
  let task: { cancel: () => void } | undefined;
  const run = () => {
    if (done) return;
    done = true;
    if (timer) clearTimeout(timer);
    task?.cancel();
    fn();
  };
  task = InteractionManager.runAfterInteractions(run);
  if (!done) timer = setTimeout(run, maxWaitMs);
  return {
    cancel: () => {
      done = true;
      if (timer) clearTimeout(timer);
      task?.cancel();
    },
  };
}
