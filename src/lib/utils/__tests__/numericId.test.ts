import { isValidNumericId, toNumericId } from '../numericId';

describe('isValidNumericId', () => {
  // LE cas signale : la decouverte navigue avec `item.slug || item.id`.
  it('refuse un slug', () => {
    expect(isValidNumericId('emmanuel-nkodo')).toBe(false);
    expect(isValidNumericId(Number('emmanuel-nkodo'))).toBe(false); // NaN
  });

  it('refuse les valeurs vides ou nulles', () => {
    expect(isValidNumericId(undefined)).toBe(false);
    expect(isValidNumericId(null)).toBe(false);
    expect(isValidNumericId('')).toBe(false);
    expect(isValidNumericId(0)).toBe(false);
    expect(isValidNumericId(-3)).toBe(false);
  });

  it('accepte un identifiant valide, y compris en chaine', () => {
    expect(isValidNumericId(42)).toBe(true);
    expect(isValidNumericId('42')).toBe(true);
  });

  it('refuse un nombre non entier', () => {
    expect(isValidNumericId(1.5)).toBe(false);
    expect(isValidNumericId(Infinity)).toBe(false);
  });
});

describe('toNumericId', () => {
  it("prefere l'id de l'objet charge au parametre de navigation", () => {
    // `preferred` vient de l'API (fiable), `fallback` peut etre un slug.
    expect(toNumericId(42, 'emmanuel-nkodo')).toBe(42);
  });

  it('retombe sur le parametre quand il est numerique', () => {
    expect(toNumericId(undefined, '7')).toBe(7);
  });

  it('renvoie null quand rien n\'est exploitable — aucun appel ne doit partir', () => {
    expect(toNumericId(undefined, 'emmanuel-nkodo')).toBeNull();
    expect(toNumericId(null, null)).toBeNull();
  });
});
