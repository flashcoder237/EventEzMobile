import { countdownHaptic } from '../hapticCountdown';

describe('countdownHaptic (H5)', () => {
  it('cran à T-5 min et T-1 min, une seule fois', () => {
    expect(countdownHaptic(300_400, 299_400)).toBe('notch');
    expect(countdownHaptic(299_400, 298_400)).toBeNull();
    expect(countdownHaptic(60_500, 59_500)).toBe('notch');
  });
  it('tick à chacune des 5 dernières secondes', () => {
    const ticks: string[] = [];
    for (let left = 8_000; left > 0; left -= 1000) {
      const h = countdownHaptic(left, left - 1000);
      if (h) ticks.push(h);
    }
    expect(ticks).toEqual(['tick', 'tick', 'tick', 'tick', 'tick']);
  });
  it('rien si le temps ne descend pas', () => {
    expect(countdownHaptic(3000, 3000)).toBeNull();
    expect(countdownHaptic(3000, 4000)).toBeNull();
  });
});
