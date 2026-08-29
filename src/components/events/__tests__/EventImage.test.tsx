/**
 * EventImage — l'image d'événement ne doit JAMAIS être rognée.
 *
 * Les organisateurs envoient des visuels de tous formats. En `cover`, une
 * affiche portrait perdait son titre en haut et sa date en bas — l'information
 * même que l'organisateur avait mise dans l'image.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.View };
});

import EventImage from '../EventImage';

const fits = (tree: any): string[] => {
  const out: string[] = [];
  const walk = (n: any) => {
    if (!n || typeof n !== 'object') return;
    if (n.props?.contentFit) out.push(n.props.contentFit);
    (n.children || []).forEach(walk);
  };
  walk(tree);
  return out;
};

describe('EventImage', () => {
  it("affiche l'image en entier (contain), jamais rognée", () => {
    const tree = render(<EventImage uri="https://x/a.jpg" />).toJSON();
    expect(fits(tree)).toContain('contain');
  });

  it('pose un fond flouté pour remplir le bloc', () => {
    const tree: any = render(<EventImage uri="https://x/a.jpg" />).toJSON();
    const blurred: number[] = [];
    const walk = (n: any) => {
      if (!n || typeof n !== 'object') return;
      if (typeof n.props?.blurRadius === 'number') blurred.push(n.props.blurRadius);
      (n.children || []).forEach(walk);
    };
    walk(tree);
    // Exactement une couche floutée : le fond. L'avant-plan reste net.
    expect(blurred).toHaveLength(1);
    expect(blurred[0]).toBeGreaterThan(0);
  });

  it('le fond est en cover (il doit remplir), l\'avant-plan en contain', () => {
    const tree = render(<EventImage uri="https://x/a.jpg" />).toJSON();
    const f = fits(tree);
    expect(f).toContain('cover');
    expect(f).toContain('contain');
  });

  it('rend le LQIP quand il est fourni', () => {
    const withPh = fits(render(<EventImage uri="https://x/a.jpg" placeholder="data:image/png;base64,AA" />).toJSON());
    const without = fits(render(<EventImage uri="https://x/a.jpg" />).toJSON());
    expect(withPh.length).toBeGreaterThan(without.length);
  });
});
