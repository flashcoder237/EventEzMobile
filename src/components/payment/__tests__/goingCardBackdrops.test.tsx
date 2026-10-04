/**
 * Fonds dessinés de la carte « J'y vais ».
 *
 * Les fichiers de `backdrops/` sont GÉNÉRÉS depuis
 * design-handoff/eventez-svg-redesign/redesign/fonds/. Ils s'ajoutent aux
 * teintes unies : ces tests vérifient que les deux voies coexistent et que
 * l'aperçu bascule bien de l'une à l'autre.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import {
  GOING_CARD_BACKDROPS,
  backdropById,
} from '../backdrops';
import { GoingCardPreview } from '../GoingCardPrep';

const draws = (tree: any) => (tree?.children?.length ?? 0) > 0;

describe('fonds de la carte « J’y vais »', () => {
  it('expose les cinq fonds livrés', () => {
    expect(GOING_CARD_BACKDROPS).toHaveLength(5);
  });

  it('chaque fond a un identifiant unique', () => {
    const ids = GOING_CARD_BACKDROPS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(GOING_CARD_BACKDROPS.map((b) => [b.id, b.Art] as const))(
    '« %s » se rend sans erreur',
    (_id, Art) => {
      expect(draws(render(<Art />).toJSON())).toBe(true);
    }
  );

  it.each(GOING_CARD_BACKDROPS.map((b) => [b.id, b.swatch] as const))(
    '« %s » a une pastille hexadécimale',
    (_id, swatch) => {
      expect(swatch).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  );

  it('les cinq fonds sont des dessins distincts', () => {
    const seen = GOING_CARD_BACKDROPS.map((b) =>
      JSON.stringify(render(React.createElement(b.Art)).toJSON())
    );
    expect(new Set(seen).size).toBe(5);
  });
});

describe('backdropById', () => {
  it.each(GOING_CARD_BACKDROPS.map((b) => b.id))('résout « %s »', (id) => {
    expect(backdropById(id)?.id).toBe(id);
  });

  it('renvoie null pour un identifiant inconnu, null ou undefined', () => {
    // Un brouillon enregistré avant l'ajout des fonds n'a pas de `backdrop` :
    // il doit retomber sur la teinte unie, pas planter.
    expect(backdropById('fond-supprime')).toBeNull();
    expect(backdropById(null)).toBeNull();
    expect(backdropById(undefined)).toBeNull();
  });
});

describe('GoingCardPreview', () => {
  const base = { message: 'J’Y VAIS', title: 'Festival', dateLabel: 'sam. 12 avr.' };

  it('rend le dégradé de teinte quand aucun fond n’est choisi', () => {
    const tree: any = render(<GoingCardPreview tint="#4F46E5" {...base} />).toJSON();
    expect(draws(tree)).toBe(true);
  });

  it('rend un visuel différent avec un fond dessiné', () => {
    const plain = JSON.stringify(
      render(<GoingCardPreview tint="#4F46E5" {...base} />).toJSON()
    );
    const withArt = JSON.stringify(
      render(<GoingCardPreview tint="#4F46E5" backdrop="nuit" {...base} />).toJSON()
    );
    expect(withArt).not.toEqual(plain);
  });

  it('retombe sur la teinte si le fond est inconnu', () => {
    // Robustesse : un identifiant obsolète ne doit pas vider la carte.
    const plain = JSON.stringify(
      render(<GoingCardPreview tint="#4F46E5" {...base} />).toJSON()
    );
    const unknown = JSON.stringify(
      render(<GoingCardPreview tint="#4F46E5" backdrop="nexiste-pas" {...base} />).toJSON()
    );
    expect(unknown).toEqual(plain);
  });

  it('affiche le message et le titre dans les deux modes', () => {
    for (const backdrop of [null, 'marque']) {
      const { getByText } = render(
        <GoingCardPreview tint="#4F46E5" backdrop={backdrop} {...base} />
      );
      expect(getByText('J’Y VAIS')).toBeTruthy();
      expect(getByText('Festival')).toBeTruthy();
    }
  });
});
