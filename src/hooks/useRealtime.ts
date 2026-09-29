/**
 * Hooks d'accès au bus temps réel (micro-delight R2, V0).
 *
 * `useRealtimeTopic` retient un topic le temps du montage (le gestionnaire
 * compte les références et respecte le plafond de 3 topics par socket).
 * `useRealtimeMessage` écoute un type de message sans re-rendu global.
 */
import { useEffect, useRef, useState } from 'react';
import { onRealtime, topicManager, type RealtimeMessage } from '../lib/realtime/socketBus';
import type { TopicStatus } from '../lib/realtime/topicManager';
import { useScreenFocused } from '../components/ui/motion/useMotionGate';

export function useRealtimeTopic(topic: string | null | undefined): TopicStatus | undefined {
  const [status, setStatus] = useState<TopicStatus | undefined>(undefined);
  // Un écran resté dans la pile (fiche → fiche similaire → …) ne garde pas
  // ses topics : le serveur plafonne à 3 par socket et le gestionnaire sert
  // les plus anciens en premier, donc l'écran visible serait affamé. Le topic
  // est rendu au blur et repris au focus (l'écran se resynchronise alors).
  const focused = useScreenFocused();
  const effective = focused ? topic : null;
  useEffect(() => {
    const topic = effective;
    if (!topic) {
      setStatus(undefined);
      return;
    }
    const off = topicManager.onStatus((t, st) => {
      if (t === topic) setStatus(st);
    });
    const release = topicManager.acquire(topic);
    setStatus(topicManager.getStatus(topic));
    return () => {
      off();
      release();
    };
  }, [effective]);
  return status;
}

export function useRealtimeMessage(
  type: string,
  handler: (message: RealtimeMessage) => void,
  enabled = true,
): void {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  }, [handler]);
  useEffect(() => {
    if (!enabled) return;
    return onRealtime(type, (m) => ref.current(m));
  }, [type, enabled]);
}

/** Topic `live:{eventId}` (Q&R, sondages, réactions) pour un écran de direct. */
export function useLiveTopic(
  eventId: string | null | undefined,
  onUpdate: (kind: string, data: any) => void,
  enabled = true,
): TopicStatus | undefined {
  const topic = enabled && eventId ? `live:${eventId}` : null;
  const status = useRealtimeTopic(topic);
  useRealtimeMessage(
    'live.update',
    (m) => {
      if (m.topic !== topic) return;
      onUpdate(String(m.kind ?? ''), (m as any).data);
    },
    !!topic,
  );
  return status;
}

/** Topic `organizer:{eventId}` (check-ins en direct, jour J). */
export function useOrganizerTopic(
  eventId: string | null | undefined,
  onCheckin: (data: any) => void,
  enabled = true,
): TopicStatus | undefined {
  const topic = enabled && eventId ? `organizer:${eventId}` : null;
  const status = useRealtimeTopic(topic);
  useRealtimeMessage(
    'organizer.checkin',
    (m) => {
      if (m.topic !== topic) return;
      onCheckin((m as any).data);
    },
    !!topic,
  );
  return status;
}
