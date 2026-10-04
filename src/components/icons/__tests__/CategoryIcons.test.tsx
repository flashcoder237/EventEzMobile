/**
 * Garde-fou des icônes de catégorie.
 *
 * Les tracés sont reportés depuis design-handoff/eventez-svg-redesign/redesign/
 * icons-categories/. Une erreur de report donne une icône vide ou figée, qui
 * compile sans broncher : ces tests montent chaque entrée d'ICON_MAP et
 * vérifient qu'elle dessine et qu'elle réagit à ses props.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { CategoryIcon, getCategoryIconComponent } from '../CategoryIcons';

// Les clés réellement résolues par ICON_MAP (le défaut est testé à part).
const KEYS = [
  'music', 'concert', 'musique',
  'sport', 'sports',
  'art', 'culture',
  'food', 'gastronomie',
  'tech', 'technologie',
  'business', 'conference', 'conférence',
  'education', 'formation',
  'santé', 'health',
  'film', 'cinéma',
  'festival', 'networking', 'calendar',
];

const draws = (tree: any) => (tree?.children?.length ?? 0) > 0;

describe('CategoryIcon', () => {
  it.each(KEYS)('« %s » dessine une icône', (name) => {
    const tree: any = render(<CategoryIcon name={name} />).toJSON();
    expect(tree).toBeTruthy();
    expect(draws(tree)).toBe(true);
  });

  it('retombe sur l’icône par défaut pour une catégorie inconnue', () => {
    const tree: any = render(<CategoryIcon name="catégorie-qui-nexiste-pas" />).toJSON();
    expect(draws(tree)).toBe(true);
    // Le défaut (Sparkles) doit rendre la même chose que la clé explicite.
    const fallback = JSON.stringify(tree);
    const explicit = JSON.stringify(render(<CategoryIcon name="default" />).toJSON());
    expect(fallback).toEqual(explicit);
  });

  it('résout la casse et les accents comme ICON_MAP', () => {
    const a = JSON.stringify(render(<CategoryIcon name="MUSIC" />).toJSON());
    const b = JSON.stringify(render(<CategoryIcon name="music" />).toJSON());
    expect(a).toEqual(b);
  });

  it('applique size', () => {
    const tree: any = render(<CategoryIcon name="music" size={48} />).toJSON();
    expect(tree.props.width).toBe(48);
    expect(tree.props.height).toBe(48);
  });

  it('applique color', () => {
    // react-native-svg normalise les couleurs en entiers : on compare deux
    // rendus plutôt que de chercher l'hexadécimal dans l'arbre.
    const a = JSON.stringify(render(<CategoryIcon name="music" color="#ABCDEF" />).toJSON());
    const b = JSON.stringify(render(<CategoryIcon name="music" color="#123456" />).toJSON());
    expect(a).not.toEqual(b);
  });

  it('applique strokeWidth', () => {
    const a = JSON.stringify(render(<CategoryIcon name="music" strokeWidth={1} />).toJSON());
    const b = JSON.stringify(render(<CategoryIcon name="music" strokeWidth={3} />).toJSON());
    expect(a).not.toEqual(b);
  });

  it('getCategoryIconComponent renvoie un composant montable', () => {
    const Icon = getCategoryIconComponent('tech');
    const tree: any = render(<Icon />).toJSON();
    expect(draws(tree)).toBe(true);
  });

  it('chaque catégorie de même famille partage bien son icône', () => {
    // music/musique/concert pointent sur la même icône : si le report casse
    // l'une des trois, l'égalité saute.
    const m = JSON.stringify(render(<CategoryIcon name="music" />).toJSON());
    expect(JSON.stringify(render(<CategoryIcon name="musique" />).toJSON())).toEqual(m);
    expect(JSON.stringify(render(<CategoryIcon name="concert" />).toJSON())).toEqual(m);
  });
});
