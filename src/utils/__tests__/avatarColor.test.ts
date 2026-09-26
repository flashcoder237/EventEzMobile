/**
 * Couleur d'avatar dérivée du nom.
 *
 * Sert de repli quand un organisateur n'a pas de logo. Le repli précédent —
 * une icône « immeuble » grise — était IDENTIQUE pour tout le monde : trois
 * cartes côte à côte montraient trois silhouettes interchangeables.
 *
 * La propriété essentielle est le DÉTERMINISME : un organisateur garde la même
 * couleur d'une session à l'autre et d'un écran à l'autre. C'est ce qui en
 * fait un repère d'identité plutôt qu'une décoration aléatoire.
 */
import { getAvatarColor, AVATAR_COLORS } from '../avatarColor';

describe('getAvatarColor — déterminisme', () => {
  it('rend toujours la même couleur pour un nom donné', () => {
    const a = getAvatarColor('Kribi Beach Events');
    const b = getAvatarColor('Kribi Beach Events');
    expect(a).toBe(b);
  });

  it('ignore la casse et les espaces de bordure', () => {
    // Le même organisateur écrit différemment selon les endpoints ne doit pas
    // changer de couleur d'un écran à l'autre.
    expect(getAvatarColor('Douala Festival')).toBe(getAvatarColor('  douala festival  '));
  });

  it('reste stable sur plusieurs appels successifs', () => {
    const colors = Array.from({ length: 20 }, () => getAvatarColor('Pierre Organisateur'));
    expect(new Set(colors).size).toBe(1);
  });
});

describe('getAvatarColor — répartition', () => {
  it('rend toujours une couleur de la palette', () => {
    const names = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot'];
    for (const n of names) {
      expect(AVATAR_COLORS).toContain(getAvatarColor(n) as typeof AVATAR_COLORS[number]);
    }
  });

  it('distingue des noms différents dans la majorité des cas', () => {
    // On ne peut pas garantir zéro collision (8 couleurs, N noms), mais une
    // palette qui renverrait toujours la même teinte ne servirait à rien.
    const names = [
      'Kribi Beach Events', 'Douala Festival', 'Pierre Organisateur',
      'Yaoundé Live', 'Bamenda Arts', 'Garoua Sports',
    ];
    const used = new Set(names.map(getAvatarColor));
    expect(used.size).toBeGreaterThan(1);
  });
});

describe('getAvatarColor — cas limites', () => {
  it.each([null, undefined, '', '   '])('renvoie une couleur valide pour %p', (input) => {
    const color = getAvatarColor(input as string | null | undefined);
    expect(AVATAR_COLORS).toContain(color as typeof AVATAR_COLORS[number]);
  });

  it('ne jette pas sur des caractères non latins ou des emoji', () => {
    expect(() => getAvatarColor('日本イベント')).not.toThrow();
    expect(() => getAvatarColor('🎉 Fête 🎉')).not.toThrow();
  });
});
