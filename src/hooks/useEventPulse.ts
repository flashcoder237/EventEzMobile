/**
 * Pouls d'un événement (micro-delight R2, V0).
 *
 * - `GET /api/events/{id}/pulse/` au montage (cache 30 s côté serveur) ;
 * - puis toutes les 60 s, SEULEMENT si l'écran a le focus, que l'app est au
 *   premier plan et que l'événement est « chaud » (moins de 7 jours, pas
 *   terminé) ; un rafraîchissement au retour sur l'écran ;
 * - utilisateur connecté : abonnement `event:{id}` sur la socket de
 *   notifications ; chaque `event.pulse` remplace l'instantané.
 *
 * Honnêteté : on n'affiche que ce que le serveur renvoie ; `null` reste `null`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { eventsAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { mergePulse, type EventPulse } from '../lib/realtime/pulse';
import { useRealtimeMessage, useRealtimeTopic } from './useRealtime';
import { useAppActive, useScreenFocused } from '../components/ui/motion';

const REFRESH_MS = 60_000;

// Le backend ne connaît pas la route (404 sur un événement pourtant affiché :
// serveur pas encore mis à jour). On arrête de la demander pour la session,
// au lieu de relancer une requête inutile toutes les 60 s sur chaque fiche.
let pulseRouteMissing = false;

export function useEventPulse(
  eventId: string | null | undefined,
  { hot = false, enabled = true }: { hot?: boolean; enabled?: boolean } = {},
): EventPulse | null {
  const { isAuthenticated } = useAuth();
  const focused = useScreenFocused();
  const appActive = useAppActive();
  const [pulse, setPulse] = useState<EventPulse | null>(null);
  const alive = useRef(true);
  const visible = focused && appActive;

  const load = useCallback(async () => {
    if (!eventId || !enabled || pulseRouteMissing) return;
    try {
      const res = await (eventsAPI as any).getEventPulse(String(eventId));
      if (alive.current) setPulse((prev) => mergePulse(prev, res?.data));
    } catch (err: any) {
      // Le pouls est un complément : son absence n'affiche simplement rien.
      // Une 404 en HTML (page Django « Not Found ») = la route n'existe pas
      // sur ce serveur ; une 404 JSON = événement inaccessible, on continue.
      const data = err?.response?.data;
      if (err?.response?.status === 404 && typeof data === 'string' && data.includes('<html')) {
        pulseRouteMissing = true;
      }
    }
  }, [eventId, enabled]);

  // Nouvel événement : on repart de zéro.
  useEffect(() => {
    alive.current = true;
    setPulse(null);
    return () => {
      alive.current = false;
    };
  }, [eventId]);

  // Au montage et à chaque retour (focus / premier plan), puis toutes les 60 s
  // tant que l'écran est visible et l'événement chaud.
  useEffect(() => {
    if (!visible) return;
    load();
    if (!hot) return;
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [visible, hot, load]);

  const topic = enabled && eventId && isAuthenticated ? `event:${eventId}` : null;
  useRealtimeTopic(topic);
  useRealtimeMessage(
    'event.pulse',
    (m) => {
      if (m.topic !== topic) return;
      setPulse((prev) => mergePulse(prev, (m as any).pulse));
    },
    !!topic,
  );

  return pulse;
}
