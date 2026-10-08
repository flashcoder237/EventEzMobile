/**
 * Un champ multiligne ne doit pas être écrasé par une hauteur fixe.
 *
 * BUG CORRIGÉ (2026-10-07), signalé par un testeur capture à l'appui :
 * « regarde comment l'input de la biographie est bien faite, par contre celle
 * de description publique est coupée ».
 *
 * LE PIÈGE : en React Native, une `height` fixe l'emporte sur `minHeight`. Le
 * style de base des champs pose `height: 50`. La biographie l'annulait bien
 * (`height: undefined`, avec un commentaire expliquant précisément ce piège),
 * mais le champ « description publique » se contentait d'un `minHeight: 96`
 * — donc sans effet. Il restait écrasé sur une ligne malgré `multiline` et
 * `numberOfLines={4}`.
 *
 * Ce test lit le FICHIER SOURCE plutôt que de monter l'écran : la règle porte
 * sur la feuille de styles, et un rendu ne dirait pas laquelle des deux
 * hauteurs a gagné.
 */
import fs from 'fs';
import path from 'path';

const SOURCE = path.join(__dirname, '..', 'EditProfileScreen.tsx');

/** Extrait le corps `{...}` d'une entrée de StyleSheet. */
function styleBody(source: string, name: string): string | null {
  const start = source.indexOf(`${name}: {`);
  if (start === -1) return null;
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return null;
}

describe('champs multilignes du profil', () => {
  const source = fs.readFileSync(SOURCE, 'utf8');

  it('le style de base impose bien une hauteur fixe (prémisse du piège)', () => {
    // Si cette prémisse tombe un jour, les deux tests suivants perdent leur
    // raison d'être — autant le savoir.
    expect(styleBody(source, 'input')).toMatch(/height:\s*50/);
  });

  it.each(['textArea', 'orgDescriptionInput'])(
    '`%s` annule la hauteur fixe héritée',
    (name) => {
      const body = styleBody(source, name);

      expect(body).toBeTruthy();
      // LE bug : `minHeight` seul ne suffit pas.
      expect(body).toMatch(/height:\s*undefined/);
      expect(body).toMatch(/minHeight:\s*\d+/);
    },
  );

  it('chaque champ `multiline` porte un style qui libère la hauteur', () => {
    // Garde-fou pour l'avenir : un nouveau champ multiligne qui oublierait le
    // reset reproduirait exactement le même défaut.
    const multilineCount = (source.match(/^\s*multiline\s*$/gm) || []).length;
    const freedStyles = ['textArea', 'orgDescriptionInput'].filter((n) =>
      (styleBody(source, n) || '').includes('height: undefined'),
    );

    expect(freedStyles.length).toBeGreaterThanOrEqual(multilineCount);
  });
});
