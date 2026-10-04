/**
 * Garde-fou du lot d'illustrations.
 *
 * Les fichiers de `svgs/` sont GÉNÉRÉS depuis les SVG de
 * design-handoff/eventez-svg-redesign/. Une régénération ratée peut produire du
 * TSX qui compile mais ne dessine rien (balises vidées, accent figé en dur,
 * dégradé orphelin). Ces tests montent réellement chaque illustration et
 * vérifient qu'elle dessine, et qu'elle respecte le contrat { color, size }.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import * as Illustrations from '../index';

// Tout ce qui n'est pas une illustration (enveloppe d'animation, types).
const NOT_ILLUSTRATIONS = new Set(['AnimatedIllustration']);

const entries = Object.entries(Illustrations).filter(
  ([name, v]) => typeof v === 'function' && !NOT_ILLUSTRATIONS.has(name)
) as [string, React.ComponentType<{ color?: string; size?: number }>][];

describe('illustrations', () => {
  it('exporte le lot complet', () => {
    // 97 illustrations livrées par le redesign. Si ce nombre change, c'est
    // qu'on en a ajouté ou perdu une — à confirmer sciemment.
    expect(entries.length).toBe(97);
  });

  it.each(entries)('%s se rend sans erreur', (_name, Component) => {
    const { toJSON } = render(<Component />);
    const tree: any = toJSON();
    expect(tree).toBeTruthy();
    // Un <Svg> qui ne contient rien serait un fichier vidé par une conversion
    // ratée : il passerait le typecheck sans que personne ne le voie.
    expect(tree.children?.length ?? 0).toBeGreaterThan(0);
  });

  it.each(entries)('%s applique la prop color', (_name, Component) => {
    // react-native-svg normalise les couleurs en entiers (payload: 4289449455),
    // on ne peut donc pas chercher l'hexadécimal dans l'arbre. On compare deux
    // rendus : si changer `color` ne change rien, c'est que l'accent #4F46E5 a
    // été figé en dur à la conversion.
    const a = JSON.stringify(render(<Component color="#ABCDEF" />).toJSON());
    const b = JSON.stringify(render(<Component color="#123456" />).toJSON());
    expect(a).not.toEqual(b);
  });

  it.each(entries)('%s applique la prop size', (_name, Component) => {
    const { toJSON } = render(<Component size={64} />);
    const tree: any = toJSON();
    expect(tree.props.width).toBe(64);
    expect(tree.props.height).toBe(64);
  });

  it.each(entries)('%s ne laisse aucun dégradé orphelin', (_name, Component) => {
    const serialized = JSON.stringify(render(<Component />).toJSON());
    // Une forme remplie par un dégradé porte {"brushRef":"id"} ; le dégradé
    // correspondant est déclaré dans <Defs> sous {"name":"id"}. Si le brushRef
    // ne trouve pas son name, la forme se rend en noir ou disparaît.
    const refs = [...serialized.matchAll(/"brushRef":"([^"]+)"/g)].map((m) => m[1]);
    for (const id of refs) {
      expect(serialized).toContain(`"name":"${id}"`);
    }
  });
});
