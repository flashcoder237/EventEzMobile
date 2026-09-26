/**
 * La détection du genre d'événement décide de modules entiers : RSVP, plan de
 * table et cagnotte pour un mariage ; exposants et stands pour un salon. Se
 * tromper ne produit aucune erreur — les fonctionnalités disparaissent, sans
 * un mot. C'est précisément pour ça que ces cas méritent des tests.
 *
 * Elle était dupliquée dans six fichiers ; ce module est désormais la source
 * unique, côté mobile comme côté web.
 */
import {
  isWeddingEvent,
  isExhibitionEvent,
  findWeddingCategory,
} from '../eventKind';

describe('isWeddingEvent', () => {
  it('reconnaît la catégorie officielle du seed', () => {
    // `mariages-celebrations` est le slug créé par seed_reference.
    expect(
      isWeddingEvent({
        category: { slug: 'mariages-celebrations', name: 'Mariages & Célébrations' },
      }),
    ).toBe(true);
  });

  it('reconnaît la variante anglaise', () => {
    expect(
      isWeddingEvent({ category: { slug: 'weddings', name: 'Weddings & Celebrations' } }),
    ).toBe(true);
  });

  it('tolère une catégorie réduite au seul nom', () => {
    expect(isWeddingEvent({ category: { name: 'Mariage' } })).toBe(true);
  });

  describe('rattrapage par le tag — le cas qui faisait disparaître les modules', () => {
    it("reconnaît un mariage classé en « Religieux & Spirituel »", () => {
      // Une cérémonie à l'église est un classement parfaitement légitime.
      // Avant, cet événement perdait RSVP, plan de table et cagnotte sans
      // qu'aucun message n'explique pourquoi.
      expect(
        isWeddingEvent({
          category: { slug: 'religieux-spirituel', name: 'Religieux & Spirituel' },
          tags: [{ name: 'Mariage' }],
        }),
      ).toBe(true);
    });

    it('reconnaît le tag parmi plusieurs autres', () => {
      expect(
        isWeddingEvent({
          category: { slug: 'autres', name: 'Autres' },
          tags: [{ name: 'VIP' }, { name: 'Weekend' }, { name: 'Mariage' }],
        }),
      ).toBe(true);
    });

    it('ignore un tableau de tags vide', () => {
      expect(
        isWeddingEvent({ category: { slug: 'musique-concerts' }, tags: [] }),
      ).toBe(false);
    });
  });

  describe('non-mariages', () => {
    it.each([
      ['musique-concerts', 'Musique & Concerts'],
      ['conferences', 'Conférences'],
      ['sports-bien-etre', 'Sports & Bien-être'],
      ['religieux-spirituel', 'Religieux & Spirituel'],
    ])('rejette %s', (slug, name) => {
      expect(isWeddingEvent({ category: { slug, name } })).toBe(false);
    });
  });

  describe('entrées dégradées', () => {
    it.each([null, undefined, {}])('renvoie false pour %p', (input) => {
      expect(isWeddingEvent(input as never)).toBe(false);
    });

    it('supporte une catégorie nulle', () => {
      expect(isWeddingEvent({ category: null })).toBe(false);
    });

    it('supporte des tags non tableau', () => {
      expect(isWeddingEvent({ tags: null })).toBe(false);
    });
  });
});

describe('isExhibitionEvent', () => {
  it.each(['salon-du-livre', 'expo-habitat', 'foire-agricole', 'trade-show'])(
    'reconnaît %s',
    (slug) => {
      expect(isExhibitionEvent({ category: { slug } })).toBe(true);
    },
  );

  it('reconnaît un salon via son tag', () => {
    expect(
      isExhibitionEvent({ category: { slug: 'business-networking' }, tags: [{ name: 'Salon' }] }),
    ).toBe(true);
  });

  it("ne confond pas un mariage avec un salon", () => {
    const wedding = { category: { slug: 'mariages-celebrations' } };
    expect(isWeddingEvent(wedding)).toBe(true);
    expect(isExhibitionEvent(wedding)).toBe(false);
  });
});

describe('findWeddingCategory', () => {
  it('trouve la catégorie mariage dans une liste', () => {
    const categories = [
      { id: 1, slug: 'musique-concerts', name: 'Musique & Concerts' },
      { id: 2, slug: 'mariages-celebrations', name: 'Mariages & Célébrations' },
    ];
    expect(findWeddingCategory(categories)?.id).toBe(2);
  });

  it("renvoie undefined quand la catégorie n'existe pas encore en base", () => {
    // Cas réel : une instance dont le seed n'a pas été rejoué.
    expect(findWeddingCategory([{ id: 1, slug: 'autres', name: 'Autres' }])).toBeUndefined();
  });

  it.each([null, undefined, []])('supporte %p', (input) => {
    expect(findWeddingCategory(input as never)).toBeUndefined();
  });
});
