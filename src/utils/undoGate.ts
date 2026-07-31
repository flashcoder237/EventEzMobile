/**
 * Fenetre d'annulation d'envoi ("undo send").
 *
 * Contrat : l'appelant DIFFERE son envoi reseau jusqu'a resolution de la
 * promesse. `true` => envoyer, `false` => l'utilisateur a annule et rien ne
 * doit partir.
 *
 * Pourquoi ce module : l'implementation initiale envoyait le message
 * immediatement puis tentait un delete a posteriori au tap "Annuler". Le
 * destinataire avait deja recu le message et sa notification push, et si le
 * delete echouait (hors ligne, WS ferme, 403) le message restait visible — le
 * bouton "Annuler" mentait. En differant l'envoi, annuler devient exact et ne
 * depend d'aucun appel reseau.
 *
 * Extrait de ConversationScreen pour etre testable sans monter l'ecran (qui
 * couple WS, reducer, audio et AsyncStorage).
 */
export class UndoGate {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private resolver: ((commit: boolean) => void) | null = null;

  constructor(private readonly delayMs: number) {}

  /** Une fenetre est-elle en cours ? */
  get isPending(): boolean {
    return this.resolver !== null;
  }

  /**
   * Ouvre une fenetre d'annulation.
   *
   * Une fenetre deja en cours est commitee immediatement : deux envois
   * concurrents ne doivent pas s'annuler l'un l'autre (taper "Annuler" sur le
   * 2e message ne doit pas retenir le 1er).
   */
  arm(): Promise<boolean> {
    this.commit();
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
      this.timer = setTimeout(() => {
        this.timer = null;
        this.settle(true);
      }, this.delayMs);
    });
  }

  /** Tap "Annuler" : la promesse resout `false`, l'envoi n'a jamais lieu. */
  cancel(): void {
    this.settle(false);
  }

  /** Force l'envoi sans attendre la fin du delai (unmount, envoi suivant). */
  commit(): void {
    this.settle(true);
  }

  private settle(commit: boolean): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const resolve = this.resolver;
    this.resolver = null;
    resolve?.(commit);
  }
}
