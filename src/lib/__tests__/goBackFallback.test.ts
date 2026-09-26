/**
 * Retour sans historique : repli vers l'accueil.
 *
 * CAS REEL : depuis l'ecran Notifications ouvert a la racine du stack
 * (restauration de session, deep link, notification), le bouton retour ne
 * menait NULLE PART. `canGoBack()` etant faux, le helper ne faisait
 * simplement rien — l'utilisateur etait bloque, sans plus aucun chemin vers
 * l'accueil.
 */
import { goBack } from '../navigation';

const makeNav = (canGoBack: boolean) => ({
  canGoBack: () => canGoBack,
  goBack: jest.fn(),
  dispatch: jest.fn(),
  navigate: jest.fn(),
});

describe('goBack', () => {
  it('revient en arriere quand il y a un historique', () => {
    const nav = makeNav(true);
    goBack(nav as any);

    expect(nav.goBack).toHaveBeenCalled();
    expect(nav.dispatch).not.toHaveBeenCalled();
  });

  it('retombe sur l accueil quand il n y a AUCUN historique', () => {
    const nav = makeNav(false);
    goBack(nav as any);

    // Ne rien faire laissait l'utilisateur bloque : on reinitialise vers Main.
    expect(nav.goBack).not.toHaveBeenCalled();
    expect(nav.dispatch).toHaveBeenCalled();
  });

  it('le repli cible bien l accueil', () => {
    const nav = makeNav(false);
    goBack(nav as any);

    const action = nav.dispatch.mock.calls[0][0];
    expect(JSON.stringify(action)).toContain('Main');
  });
});
