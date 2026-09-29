/**
 * S2 — « Ce soir » : le billet du jour, où qu'on soit dans l'app.
 *
 * Lit d'abord le cache de « Mes billets » (`my-tickets:{userId}`) ; au besoin,
 * UN appel par session à `getMyRegistrations` (le résultat réalimente ce même
 * cache). Renvoie le billet dont la phase est jour J, portes ouvertes ou en
 * cours — et publie le raccourci d'icône correspondant (retiré sinon).
 */
import { useEffect, useMemo, useState } from 'react';
import CacheService from '../services/CacheService';
import { registrationsAPI } from '../api';
import { getTicketPhase, TicketPhase } from '../lib/utils/ticketPhase';
import { isRegistrationUnsettled } from '../utils/paymentSettled';
import { setTodayTicket } from '../lib/todayTicket';

export interface TonightTicket {
  registrationId: string;
  event: any;
  phase: TicketPhase;
}

const ON_DAY: TicketPhase[] = ['JOUR_J', 'PORTES', 'EN_COURS'];
let fetchedThisSession = false;

function eventOf(reg: any): any {
  if (reg?.event_detail && typeof reg.event_detail === 'object') return reg.event_detail;
  if (reg?.event && typeof reg.event === 'object') return reg.event;
  return null;
}

export function pickTonight(regs: any[], now: Date): TonightTicket | null {
  let best: (TonightTicket & { start: number }) | null = null;
  for (const reg of regs || []) {
    if (!['confirmed', 'checked_in', 'completed'].includes(String(reg?.status))) continue;
    if (isRegistrationUnsettled(reg)) continue;
    const event = eventOf(reg);
    const phase = getTicketPhase(event, reg, now);
    if (!phase || !ON_DAY.includes(phase)) continue;
    const start = new Date(event.start_date).getTime();
    if (!best || start < best.start) best = { registrationId: String(reg.id), event, phase, start };
  }
  if (!best) return null;
  const { start: _s, ...rest } = best;
  return rest;
}

export function useTonightTicket(userId: string | number | null | undefined): TonightTicket | null {
  const [regs, setRegs] = useState<any[] | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!userId) {
      setRegs(null);
      return;
    }
    let alive = true;
    const key = `my-tickets:${userId}`;
    (async () => {
      try {
        const cached = await CacheService.get<any[]>(key);
        if (cached?.data && alive) setRegs(cached.data);
        if ((cached && !cached.isStale) || fetchedThisSession) return;
        fetchedThisSession = true;
        const res = await registrationsAPI.getMyRegistrations();
        const data = res.data?.results || res.data || [];
        CacheService.set(key, data, 2 * 60 * 1000);
        if (alive) setRegs(data);
      } catch {
        /* silencieux : la carte « Ce soir » est un plus, jamais un blocage */
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId]);

  const tonight = useMemo(() => (regs ? pickTonight(regs, now) : null), [regs, now]);

  useEffect(() => {
    if (!regs) return;
    setTodayTicket(tonight ? { registrationId: tonight.registrationId, title: String(tonight.event?.title || '') } : null);
  }, [regs, tonight]);

  return tonight;
}
