/**
 * Distance au lieu de l'événement, le jour J (round 3, G8/G9).
 *
 * - Ne DEMANDE JAMAIS la permission : on lit seulement si elle est déjà
 *   accordée (sinon `granted = false` et rien d'autre ne se passe).
 * - Suivi de position « équilibré », pas de 15 m, uniquement écran affiché et
 *   app au premier plan ; coupé dès qu'on est arrivé (< 40 m).
 */
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { useAppActive, useScreenFocused } from '../components/ui/motion/useMotionGate';
import { distanceMeters, LatLng, VENUE } from '../lib/utils/venueCompass';

export interface VenueLocation {
  /** null = pas encore su ; false = non accordée (on ne la demande pas). */
  granted: boolean | null;
  /** Distance au lieu (m), null tant qu'inconnue. */
  distance: number | null;
  position: LatLng | null;
  /** < 40 m : arrivé, capteurs coupés. */
  arrived: boolean;
}

export function useVenueLocation(venue: LatLng | null, enabled: boolean): VenueLocation {
  const focused = useScreenFocused();
  const appActive = useAppActive();
  const [granted, setGranted] = useState<boolean | null>(null);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [arrived, setArrived] = useState(false);
  const on = enabled && !!venue && focused && appActive && !arrived;
  const lat = venue?.lat;
  const lng = venue?.lng;

  useEffect(() => {
    if (!on || lat == null || lng == null) return;
    let alive = true;
    let sub: Location.LocationSubscription | null = null;
    const target = { lat, lng };
    const onFix = (c: { latitude: number; longitude: number }) => {
      if (!alive) return;
      const p = { lat: c.latitude, lng: c.longitude };
      setPosition(p);
      if (distanceMeters(p, target) < VENUE.ARRIVED_M) {
        setArrived(true);
        sub?.remove();
        sub = null;
      }
    };
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (!alive) return;
        const ok = perm?.status === 'granted';
        setGranted(ok);
        if (!ok) return;
        const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 }).catch(() => null);
        if (last) onFix(last.coords);
        if (!alive) return;
        const s = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 15 },
          (loc) => onFix(loc.coords),
        );
        if (!alive) s.remove();
        else sub = s;
      } catch {
        if (alive) setGranted(false);
      }
    })();
    return () => {
      alive = false;
      sub?.remove();
    };
  }, [on, lat, lng]);

  const distance = position && venue ? distanceMeters(position, venue) : null;
  return { granted, distance, position, arrived };
}

export default useVenueLocation;
