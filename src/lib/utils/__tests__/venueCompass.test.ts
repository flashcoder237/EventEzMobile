import {
  bearingDeg,
  clockHour,
  distanceMeters,
  formatDistance,
  headingIsPoor,
  initialAlign,
  quantize,
  relativeAngle,
  stepAlign,
  venueCoords,
} from '../venueCompass';

describe('venueCompass', () => {
  const douala = { lat: 4.0511, lng: 9.7679 };

  it('venueCoords accepte les chaînes DRF, refuse 0,0 et les valeurs absentes', () => {
    expect(venueCoords({ location_latitude: '4.0511', location_longitude: '9.7679' })).toEqual(douala);
    expect(venueCoords({ location_latitude: 0, location_longitude: 0 })).toBeNull();
    expect(venueCoords({})).toBeNull();
  });

  it('distance : ~111 m pour 0,001° de latitude', () => {
    const d = distanceMeters(douala, { lat: douala.lat + 0.001, lng: douala.lng });
    expect(d).toBeGreaterThan(105);
    expect(d).toBeLessThan(117);
  });

  it('cap : nord = 0, est = 90', () => {
    expect(bearingDeg(douala, { lat: douala.lat + 0.01, lng: douala.lng })).toBeCloseTo(0, 0);
    expect(bearingDeg(douala, { lat: douala.lat, lng: douala.lng + 0.01 })).toBeCloseTo(90, 0);
  });

  it('angle relatif et position horaire', () => {
    expect(relativeAngle(10, 350)).toBe(20);
    expect(relativeAngle(350, 10)).toBe(-20);
    expect(clockHour(0)).toBe(12);
    expect(clockHour(90)).toBe(3);
    expect(clockHour(-90)).toBe(9);
    expect(clockHour(180)).toBe(6);
  });

  it('paliers de 15° (animations réduites)', () => {
    expect(quantize(22, 15)).toBe(15);
    expect(quantize(23, 15)).toBe(30);
  });

  it('précision du cap', () => {
    expect(headingIsPoor('android', 1)).toBe(true);
    expect(headingIsPoor('android', 3)).toBe(false);
    expect(headingIsPoor('ios', 45)).toBe(true);
    expect(headingIsPoor('ios', 10)).toBe(false);
    expect(headingIsPoor('ios', -1)).toBe(true);
  });

  it('distance lisible', () => {
    expect(formatDistance(843)).toBe('840 m');
    expect(formatDistance(1234)).toBe('1,2 km');
    expect(formatDistance(1234, 'en')).toBe('1.2 km');
  });

  it('alignement : 500 ms tenus → un cran, puis pas avant 10 s', () => {
    let st = initialAlign();
    const fires: number[] = [];
    const feed = (rel: number, t: number) => {
      const r = stepAlign(st, rel, t);
      st = r.state;
      if (r.fire) fires.push(t);
    };
    for (let t = 1000; t <= 1600; t += 50) feed(5, t);
    expect(fires).toEqual([1500]);
    feed(40, 1700); // on se détourne
    for (let t = 1800; t <= 3000; t += 50) feed(3, t);
    expect(fires).toHaveLength(1); // cooldown 10 s
    feed(40, 11000);
    for (let t = 11600; t <= 12200; t += 50) feed(0, t);
    expect(fires).toHaveLength(2);
  });

  it('alignement : un passage bref ne déclenche rien', () => {
    let st = initialAlign();
    let fired = false;
    for (let t = 0; t <= 400; t += 50) {
      const r = stepAlign(st, 2, 1000 + t);
      st = r.state;
      fired = fired || r.fire;
    }
    expect(fired).toBe(false);
  });
});
