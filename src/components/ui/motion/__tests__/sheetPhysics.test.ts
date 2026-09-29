import { nearestPoint, projectRelease, rubberband, DECELERATION } from '../sheetPhysics';

describe('sheetPhysics (T5/T7)', () => {
  it('projette un lâcher selon la vitesse (décélération iOS)', () => {
    // v · d / (1 − d) / 1000 : 1000 px/s ≈ 499 px plus loin.
    expect(projectRelease(100, 1000)).toBeCloseTo(100 + (1000 * DECELERATION) / (1 - DECELERATION) / 1000);
    expect(projectRelease(200, 0)).toBe(200);
    expect(projectRelease(200, -600)).toBeLessThan(200);
  });

  it("élasticité : résiste de plus en plus sans jamais atteindre la limite", () => {
    expect(rubberband(0, 40)).toBe(0);
    expect(rubberband(-10, 40)).toBe(0);
    const a = rubberband(20, 40);
    const b = rubberband(200, 40);
    const c = rubberband(5000, 40);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeLessThan(40);
    // Moins que la distance réelle : la feuille « résiste ».
    expect(a).toBeLessThan(20);
  });

  it('aimante au cran le plus proche', () => {
    const points = [0, 300, 700];
    expect(nearestPoint(-50, points)).toBe(0);
    expect(nearestPoint(280, points)).toBe(300);
    expect(nearestPoint(560, points)).toBe(700);
  });

  it('un lâcher rapide vers le bas depuis le haut ferme la feuille', () => {
    const H = 700;
    const points = [0, H];
    // Le doigt n'a descendu la feuille que de 120 px, mais vite.
    expect(nearestPoint(projectRelease(120, 1200), points)).toBe(H);
    // Lent : elle revient en place.
    expect(nearestPoint(projectRelease(120, 50), points)).toBe(0);
  });
});
