/**
 * Suggestion de catégorie d'après la saisie.
 *
 * DEMANDE (2026-10-07) : « comment, en fonction de ce que l'utilisateur aura
 * saisi en haut sur le formulaire de création d'événements, une catégorie peut
 * être choisie pour aider l'utilisateur ».
 *
 * PARTI PRIS TESTÉ ICI : on suggère, on ne choisit pas. Et surtout, **on ne
 * suggère que lorsque c'est net**. Une mauvaise suggestion acceptée par
 * habitude produit un classement faux que personne ne corrigera — c'est pire
 * que pas de suggestion du tout, parce que c'est invisible.
 */
import { suggestCategory } from '../suggestCategory';

const CATEGORIES = [
  { id: 1, slug: 'musique-concerts', name: 'Musique & Concerts' },
  { id: 2, slug: 'conferences', name: 'Conférences' },
  { id: 3, slug: 'formations-ateliers', name: 'Formations & Ateliers' },
  { id: 4, slug: 'mariages-celebrations', name: 'Mariages & Célébrations' },
  { id: 5, slug: 'sports-bien-etre', name: 'Sports & Bien-être' },
  { id: 6, slug: 'autres', name: 'Autres' },
];

describe('suggestCategory', () => {
  it.each([
    ['Concert Gospel International', 'musique-concerts'],
    ['Conférence annuelle des développeurs', 'conferences'],
    ['Atelier de photographie', 'formations-ateliers'],
    ['Mariage de Alice et Bob', 'mariages-celebrations'],
    ['Tournoi de football inter-quartiers', 'sports-bien-etre'],
  ])('reconnaît « %s »', (title, expectedSlug) => {
    expect(suggestCategory(title, CATEGORIES)?.slug).toBe(expectedSlug);
  });

  it('fonctionne sans accents ni majuscules', () => {
    // Les organisateurs tapent vite, souvent sans accents.
    expect(suggestCategory('conference tech', CATEGORIES)?.slug).toBe('conferences');
  });

  it('ne suggère RIEN quand le titre est ambigu', () => {
    // « Rencontre » peut être un meetup, un culte, un match… Suggérer ici
    // serait deviner.
    expect(suggestCategory('Rencontre du samedi', CATEGORIES)).toBeNull();
  });

  it('ne suggère rien sur une saisie trop courte', () => {
    // Sinon la proposition clignoterait à chaque frappe.
    expect(suggestCategory('Co', CATEGORIES)).toBeNull();
  });

  it('ne suggère rien sur une chaîne vide', () => {
    expect(suggestCategory('', CATEGORIES)).toBeNull();
    expect(suggestCategory('   ', CATEGORIES)).toBeNull();
  });

  it('ignore une règle dont la catégorie est absente du serveur', () => {
    // Le serveur peut ne pas avoir toutes les catégories semées : on cherche
    // la règle suivante plutôt que d'abandonner.
    const partial = [{ id: 9, slug: 'autres', name: 'Autres' }];

    expect(suggestCategory('Concert Gospel', partial)).toBeNull();
  });

  it('tolère une liste de catégories vide', () => {
    expect(suggestCategory('Concert', [])).toBeNull();
  });

  it('ne se déclenche pas sur un mot simplement CONTENU dans un autre', () => {
    // « concertation » n'est pas un concert. Sans frontières de mot, on
    // classerait une réunion publique en musique.
    expect(suggestCategory('Réunion de concertation citoyenne', CATEGORIES))
      .toBeNull();
  });
});
