import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { virtualRoomsAPI } from '../api/content';

/**
 * Appel visio PERSISTANT (façon Zoom/WhatsApp).
 *
 * Problème résolu : avant, la visio vivait dans un Stack.Screen (WebViewScreen)
 * démonté dès qu'on naviguait → l'appel se coupait. Ici, l'état de l'appel est
 * GLOBAL et la WebView est montée UNE SEULE FOIS à la racine (VisioCallOverlay,
 * sibling de RootNavigator). La navigation ne la démonte plus → l'appel survit,
 * réductible en bulle draggable.
 *
 * NB : ne PAS confondre avec le SDK Jitsi natif (écarté : incompatible New
 * Architecture + React 19). On garde la WebView + le JWT self-hosted du backend.
 */

export type VisioMode = 'fullscreen' | 'bubble';

export interface VisioCallState {
  /** URL Jitsi complète (?jwt=…#config…) fournie par event_join. */
  url: string;
  /** room_id (PK DB) — sert au POST /leave/ (quota participant-minutes). */
  roomId: string | null;
  /** Titre neutre (jamais l'URL : elle porte le JWT). */
  title?: string;
  /** Notice RGPD d'enregistrement à afficher (fournie par event_join). */
  recordingNotice?: string | null;
  /** fullscreen (par défaut à l'ouverture) ou bubble (réduit). */
  mode: VisioMode;
}

interface VisioCallContextValue {
  call: VisioCallState | null;
  /** Démarre/replace l'appel courant (plein écran). */
  startCall: (params: {
    url: string;
    roomId?: string | null;
    title?: string;
    recordingNotice?: string | null;
  }) => void;
  /** Termine l'appel (démonte la WebView) + signale le leave au serveur. */
  endCall: () => void;
  /** Réduit en bulle flottante (l'appel continue). */
  minimize: () => void;
  /** Repasse en plein écran. */
  maximize: () => void;
}

const VisioCallContext = createContext<VisioCallContextValue | undefined>(undefined);

export function VisioCallProvider({ children }: { children: ReactNode }) {
  const [call, setCall] = useState<VisioCallState | null>(null);
  // roomId courant mémorisé hors state pour le leave même si endCall part d'un
  // callback où `call` serait périmé (closure).
  const currentRoomIdRef = useRef<string | null>(null);

  const startCall = useCallback((params: {
    url: string;
    roomId?: string | null;
    title?: string;
    recordingNotice?: string | null;
  }) => {
    // Si un autre appel tourne, on signale sa sortie avant d'en ouvrir un nouveau.
    const prev = currentRoomIdRef.current;
    if (prev) {
      virtualRoomsAPI.leave(prev).catch(() => {});
    }
    currentRoomIdRef.current = params.roomId ?? null;
    setCall({
      url: params.url,
      roomId: params.roomId ?? null,
      title: params.title,
      recordingNotice: params.recordingNotice ?? null,
      mode: 'fullscreen',
    });
  }, []);

  const endCall = useCallback(() => {
    const rid = currentRoomIdRef.current;
    // Le leave marque left_at côté serveur (compteur « en direct » + quota
    // participant-minutes FACTURABLE). Sans lui, le participant reste compté
    // présent jusqu'au rattrapage (max_duration + 30 min).
    if (rid) {
      virtualRoomsAPI.leave(rid).catch(() => {});
    }
    currentRoomIdRef.current = null;
    setCall(null);
  }, []);

  const minimize = useCallback(() => {
    setCall(c => (c ? { ...c, mode: 'bubble' } : c));
  }, []);

  const maximize = useCallback(() => {
    setCall(c => (c ? { ...c, mode: 'fullscreen' } : c));
  }, []);

  return (
    <VisioCallContext.Provider value={{ call, startCall, endCall, minimize, maximize }}>
      {children}
    </VisioCallContext.Provider>
  );
}

export function useVisioCall(): VisioCallContextValue {
  const ctx = useContext(VisioCallContext);
  if (!ctx) throw new Error('useVisioCall must be used within a VisioCallProvider');
  return ctx;
}
