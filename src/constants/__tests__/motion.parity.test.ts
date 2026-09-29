/**
 * Parité des tokens motion avec la source partagée web + mobile
 * (`EventEz/docs/motion-tokens.json`). Si le fichier est absent (dépôt mobile
 * cloné seul, en CI), le test est ignoré : la source n'est pas versionnée ici.
 */
import * as fs from 'fs';
import * as path from 'path';
import { Amplitudes, CurvePoints, Durations, Springs } from '../motion';

const SOURCE = path.resolve(__dirname, '../../../../docs/motion-tokens.json');
const hasSource = fs.existsSync(SOURCE);
const d = hasSource ? describe : describe.skip;

d('motion tokens — parité avec docs/motion-tokens.json', () => {
  const json = hasSource ? JSON.parse(fs.readFileSync(SOURCE, 'utf8')) : {};

  it('durées', () => {
    expect(Durations).toEqual(json.duration);
  });

  it('courbes', () => {
    for (const [k, v] of Object.entries(json.easing)) {
      expect(CurvePoints[k as keyof typeof CurvePoints]).toEqual(v);
    }
  });

  it('ressorts', () => {
    expect(Springs).toEqual(json.spring);
  });

  it('amplitudes', () => {
    expect(Amplitudes).toEqual(json.amplitude);
  });
});

describe('motion tokens — garde-fous', () => {
  it('aucun pop au-delà de 1,12, aucune entrée depuis moins de 0,96', () => {
    expect(Amplitudes.popPeak).toBeLessThanOrEqual(1.12);
    expect(Amplitudes.enterFrom).toBeGreaterThanOrEqual(0.96);
  });
  it('le seul ressort de layout ne dépasse jamais', () => {
    expect(Springs.layout.overshootClamping).toBe(true);
  });
});
