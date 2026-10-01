import {
  initialPostureState,
  normalizeAxes,
  PostureEvent,
  PostureSample,
  PostureState,
  screenAngle,
  stepPosture,
} from '../posture';

const G = 9.81;
const DT = 20; // 50 Hz

/** Gravité pour un angle d'écran (0 = à plat face visible, 180 = face contre table), en portrait. */
function gravityAt(deg: number): [number, number, number] {
  const r = (deg * Math.PI) / 180;
  return [0, G * Math.sin(r), G * Math.cos(r)];
}

type Frame = { deg: number; lin?: [number, number, number] };

function run(frames: Frame[], start: PostureState = initialPostureState(), t0 = 1000) {
  let st = start;
  const events: { t: number; e: PostureEvent }[] = [];
  frames.forEach((f, i) => {
    const t = t0 + i * DT;
    const [gx, gy, gz] = gravityAt(f.deg);
    const [lx, ly, lz] = f.lin ?? [0, 0, 0];
    // Accéléromètre gravité incluse (cas Android/iOS réel).
    const s: PostureSample = { t, gx, gy, gz, ax: gx + lx, ay: gy + ly, az: gz + lz };
    const r = stepPosture(st, s);
    st = r.state;
    r.events.forEach((e) => events.push({ t, e }));
  });
  return { state: st, events, names: events.map((x) => x.e) };
}

const hold = (deg: number, ms: number): Frame[] => Array.from({ length: Math.round(ms / DT) }, () => ({ deg }));
const ramp = (from: number, to: number, ms: number, lin?: [number, number, number]): Frame[] => {
  const n = Math.max(1, Math.round(ms / DT));
  return Array.from({ length: n }, (_, i) => ({ deg: from + ((to - from) * (i + 1)) / n, lin }));
};

describe('posture — utilitaires', () => {
  it('screenAngle : à plat, vertical, face contre table', () => {
    expect(screenAngle(...gravityAt(0))).toBeCloseTo(0, 3);
    expect(screenAngle(...gravityAt(90))).toBeCloseTo(90, 3);
    expect(screenAngle(...gravityAt(180))).toBeCloseTo(180, 3);
  });

  it('normalizeAxes inverse le signe sur iOS seulement', () => {
    expect(normalizeAxes(1, -2, 9.8, true)).toEqual([-1, 2, -9.8]);
    expect(normalizeAxes(1, -2, 9.8, false)).toEqual([1, -2, 9.8]);
  });
});

describe('posture — faceDown / faceUp', () => {
  it('face contre table immobile 1,2 s → faceDown une seule fois, puis faceUp au retour', () => {
    const r = run([...hold(10, 300), ...ramp(10, 180, 300), ...hold(180, 2000), ...ramp(180, 20, 200), ...hold(20, 300)]);
    expect(r.names.filter((e) => e === 'faceDown')).toHaveLength(1);
    expect(r.names.filter((e) => e === 'faceUp')).toHaveLength(1);
    expect(r.names.indexOf('faceDown')).toBeLessThan(r.names.indexOf('faceUp'));
  });

  it('pas de faceDown sous 1,2 s', () => {
    const r = run([...hold(180, 1000), ...hold(10, 300)]);
    expect(r.names).not.toContain('faceDown');
  });

  it('pas de faceDown si le téléphone bouge (dans une poche qui marche)', () => {
    const shaky: Frame[] = Array.from({ length: 100 }, (_, i) => ({ deg: 180, lin: [0, i % 2 ? 1 : -1, 0] }));
    expect(run(shaky).names).not.toContain('faceDown');
  });
});

describe('posture — presentAway', () => {
  it('écran tendu au-delà de la verticale 400 ms → presentAway, puis presentBack', () => {
    const r = run([...hold(60, 200), ...ramp(60, 115, 200), ...hold(115, 600), ...ramp(115, 60, 200), ...hold(60, 500)]);
    expect(r.names).toEqual(['presentAway', 'presentBack']);
  });

  it('un passage bref au-delà de 100° ne déclenche rien', () => {
    const r = run([...hold(60, 200), ...hold(110, 300), ...hold(60, 300)]);
    expect(r.names).not.toContain('presentAway');
  });

  it('hystérésis : rester entre 80° et 100° garde la présentation', () => {
    const r = run([...hold(115, 600), ...hold(90, 1000)]);
    expect(r.names).toEqual(['presentAway']);
  });
});

describe('posture — raise', () => {
  it('à plat 1 s puis levé vite avec élan → raise', () => {
    const r = run([...hold(5, 1200), ...ramp(5, 75, 400, [0, 3, 1]), ...hold(75, 200)]);
    expect(r.names).toContain('raise');
  });

  it('levé lentement (> 700 ms) → pas de raise', () => {
    const r = run([...hold(5, 1200), ...ramp(5, 75, 1500), ...hold(75, 200)]);
    expect(r.names).not.toContain('raise');
  });

  it('pas assez longtemps à plat → pas de raise', () => {
    const r = run([...hold(5, 500), ...ramp(5, 75, 300, [0, 3, 1])]);
    expect(r.names).not.toContain('raise');
  });
});

describe('posture — shake', () => {
  const shake = (n: number, amp = 18, period = 60): Frame[] =>
    Array.from({ length: n }, (_, i) => ({ deg: 60, lin: [Math.floor((i * DT) / period) % 2 ? amp : -amp, 0, 0] }));

  it('secousse franche → un seul shake (cooldown)', () => {
    const r = run([...hold(60, 400), ...shake(40)]);
    expect(r.names.filter((e) => e === 'shake')).toHaveLength(1);
  });

  it('marche (amplitude faible) → rien', () => {
    const r = run([...hold(60, 400), ...shake(60, 5, 400)]);
    expect(r.names).not.toContain('shake');
  });

  it('un seul à-coup → rien', () => {
    const r = run([...hold(60, 400), { deg: 60, lin: [20, 0, 0] }, ...hold(60, 400)]);
    expect(r.names).not.toContain('shake');
  });
});
