/**
 * Géométrie du « jour J » (round 3, G8/G9) : distance au lieu, cap, boussole.
 * Fonctions pures (testées) — les capteurs vivent dans useVenueCompass.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

/** Seuils métier. */
export const VENUE = {
  /** G8 : « sur place » pour ouvrir le billet d'un geste. */
  NEAR_M: 300,
  /** G9 : la boussole n'apparaît qu'à moins de 3 km. */
  COMPASS_MAX_M: 3000,
  /** G9 : arrivé — on coupe les capteurs. */
  ARRIVED_M: 40,
  /** G9 : tolérance d'alignement, durée tenue et intervalle entre deux crans. */
  ALIGN_DEG: 12,
  ALIGN_HOLD_MS: 500,
  ALIGN_COOLDOWN_MS: 10_000,
  /** Animations réduites : la flèche tourne par paliers. */
  REDUCED_STEP_DEG: 15,
};

/** Coordonnées du lieu (DRF sérialise les DecimalField en chaînes). */
export function venueCoords(event: any): LatLng | null {
  const lat = event?.location_latitude == null ? NaN : Number(event.location_latitude);
  const lng = event?.location_longitude == null ? NaN : Number(event.location_longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Cap initial de `from` vers `to`, en degrés (0 = nord, sens horaire). */
export function bearingDeg(from: LatLng, to: LatLng): number {
  const y = Math.sin(rad(to.lng - from.lng)) * Math.cos(rad(to.lat));
  const x =
    Math.cos(rad(from.lat)) * Math.sin(rad(to.lat)) -
    Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(rad(to.lng - from.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Angle du lieu par rapport à l'avant du téléphone, dans ]-180, 180]. */
export function relativeAngle(bearing: number, heading: number): number {
  let d = (((bearing - heading) % 360) + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

/** Position « horaire » (12 = devant, 3 = à droite…). */
export function clockHour(rel: number): number {
  const h = Math.round((((rel % 360) + 360) % 360) / 30) % 12;
  return h === 0 ? 12 : h;
}

export function quantize(angle: number, step: number): number {
  return Math.round(angle / step) * step;
}

/**
 * Cap peu fiable → « Étalonnez la boussole ».
 * Android : niveau 0–3 (3 = élevé). iOS : incertitude en degrés (< 0 = invalide).
 */
export function headingIsPoor(platform: string, accuracy: number | null | undefined): boolean {
  if (accuracy == null || !Number.isFinite(accuracy)) return false;
  if (platform === 'android') return accuracy <= 1;
  return accuracy < 0 || accuracy > 30;
}

export function formatDistance(m: number, locale = 'fr'): string {
  if (m < 1000) return `${Math.max(0, Math.round(m / 10) * 10)} m`;
  const km = m / 1000;
  const str = km.toFixed(km < 10 ? 1 : 0);
  return `${locale.startsWith('fr') ? str.replace('.', ',') : str} km`;
}

/** Détecteur d'alignement : ±ALIGN_DEG tenu ALIGN_HOLD_MS, au plus une fois / 10 s. */
export interface AlignState {
  since: number;
  lastFiredAt: number;
  fired: boolean;
}

export function initialAlign(): AlignState {
  return { since: 0, lastFiredAt: 0, fired: false };
}

export function stepAlign(prev: AlignState, rel: number, now: number): { state: AlignState; fire: boolean } {
  const st = { ...prev };
  if (Math.abs(rel) > VENUE.ALIGN_DEG) {
    st.since = 0;
    st.fired = false;
    return { state: st, fire: false };
  }
  if (st.since === 0) st.since = now;
  if (!st.fired && now - st.since >= VENUE.ALIGN_HOLD_MS && (st.lastFiredAt === 0 || now - st.lastFiredAt >= VENUE.ALIGN_COOLDOWN_MS)) {
    st.fired = true;
    st.lastFiredAt = now;
    return { state: st, fire: true };
  }
  return { state: st, fire: false };
}
