/**
 * Formes plurielles des traductions.
 *
 * Bug observé : « 9 événement » (sans « s ») sur les cartes organisateur.
 *
 * Cause : les clés plurielles étaient suffixées `_plural`, convention
 * i18next v3. Le projet utilise i18next v25, qui attend les catégories
 * Intl.PluralRules — donc `_other`. Les clés `_plural` n'étaient jamais
 * résolues : i18next retombait silencieusement sur la forme singulier,
 * quel que soit le compte.
 *
 * Ces tests garantissent que la convention reste la bonne, et qu'aucune
 * clé `_plural` morte ne revient.
 */
import i18n from 'i18next';
import fr from '../locales/fr.json';
import en from '../locales/en.json';

beforeAll(async () => {
  await i18n.init({
    lng: 'fr',
    fallbackLng: 'fr',
    resources: { fr: { translation: fr }, en: { translation: en } },
    interpolation: { escapeValue: false },
  });
});

/** Remonte toutes les clés se terminant par un suffixe donné. */
function keysEndingWith(obj: Record<string, unknown>, suffix: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') {
      out.push(...keysEndingWith(v as Record<string, unknown>, suffix, path));
    } else if (k.endsWith(suffix)) {
      out.push(path);
    }
  }
  return out;
}

describe('convention de pluriel', () => {
  it.each([['fr', fr], ['en', en]])(
    'aucune clé `_plural` morte dans %s.json',
    (_locale, bundle) => {
      // i18next v25 ignore purement et simplement ce suffixe : une clé
      // `_plural` est du texte traduit qui ne s'affichera jamais.
      expect(keysEndingWith(bundle as Record<string, unknown>, '_plural')).toEqual([]);
    },
  );

  it('chaque clé `_other` a bien une forme singulier résolvable', () => {
    // Deux conventions valides en i18next v25 :
    //   `clé` + `clé_other`        (forme nue = singulier)
    //   `clé_one` + `clé_other`    (forme canonique Intl.PluralRules)
    // Les deux marchent ; ce qui casserait, c'est un `_other` orphelin.
    const others = keysEndingWith(fr as Record<string, unknown>, '_other');
    expect(others.length).toBeGreaterThan(0);

    const orphans = others.filter((key) => {
      const base = key.slice(0, -'_other'.length);
      return !i18n.exists(base) && !i18n.exists(`${base}_one`);
    });
    expect(orphans).toEqual([]);
  });
});

describe('rendu effectif des pluriels (français)', () => {
  it('compteur d’événements d’un organisateur', () => {
    // Le cas exact du bug : la carte affichait « 9 événement ».
    expect(i18n.t('discover.organizerEventCount', { count: 1 })).toBe('1 événement');
    expect(i18n.t('discover.organizerEventCount', { count: 9 })).toBe('9 événements');
  });

  it('zéro reste au singulier (règle française)', () => {
    // « 0 événement », pas « 0 événements » — Intl.PluralRules range 0 dans
    // la catégorie `one` pour le français, contrairement à l'anglais.
    expect(i18n.t('discover.organizerEventCount', { count: 0 })).toBe('0 événement');
  });
});

describe('rendu effectif des pluriels (anglais)', () => {
  beforeAll(() => i18n.changeLanguage('en'));
  afterAll(() => i18n.changeLanguage('fr'));

  it('zéro prend le pluriel en anglais', () => {
    expect(i18n.t('discover.organizerEventCount', { count: 0 })).toBe('0 events');
    expect(i18n.t('discover.organizerEventCount', { count: 1 })).toBe('1 event');
  });
});
