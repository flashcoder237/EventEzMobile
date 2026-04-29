/**
 * useNamedDrafts — gestion de plusieurs brouillons d'événement nommés.
 *
 * Complémentaire à `useEventDraft` qui gère le draft auto-save unique en
 * cours de création. Ce hook permet à l'organisateur de :
 *   - "Snapshotter" le draft courant sous un nom (ex. "Concert décembre")
 *     pour pouvoir basculer sur un autre projet sans perdre le premier.
 *   - Lister tous les brouillons nommés stockés.
 *   - Charger / supprimer un brouillon nommé spécifique.
 *
 * Stockage : une entrée par draft sous le préfixe `@eventez_named_draft:<id>`
 * + une liste indexée sous `@eventez_named_drafts:index`. Pas de quota
 * imposé pour l'instant — on s'en remettra au quota AsyncStorage Android
 * (~6 MB par défaut).
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EventFormState } from './useEventForm';
import type { DraftData } from './useEventDraft';

const INDEX_KEY = '@eventez_named_drafts:index';
const ENTRY_PREFIX = '@eventez_named_draft:';

export interface NamedDraftMeta {
  id: string;
  name: string;
  savedAt: string; // ISO
  /** Snapshot du titre au moment de la sauvegarde, pour affichage */
  titleSnapshot: string;
}

interface SerializedDraft {
  data: Record<string, unknown>;
  savedAt: string;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Réutilise la même logique de serialisation que useEventDraft (mais on ne
// peut pas import une fonction privée — on duplique le minimum nécessaire).
function serializeForm(form: EventFormState): Record<string, unknown> {
  const {
    loading, categories, availableTags, showMapPicker,
    aiEnabled, aiLoading, aiResult, aiError, aiUsage,
    aiTitleLoading, aiDescLoading, aiPricingLoading,
    ...persistable
  } = form;
  const serialized: Record<string, unknown> = { ...persistable };
  for (const key of ['startDate', 'endDate', 'registrationDeadline'] as const) {
    const val = (persistable as any)[key];
    if (val instanceof Date) serialized[key] = val.toISOString();
  }
  if (Array.isArray(persistable.ticketTypes)) {
    serialized.ticketTypes = persistable.ticketTypes.map((t) => {
      const ticket: Record<string, unknown> = { ...t };
      for (const key of ['sales_start', 'sales_end'] as const) {
        if (t[key] instanceof Date) ticket[key] = (t[key] as Date).toISOString();
      }
      return ticket;
    });
  }
  if (Array.isArray(persistable.sessions)) {
    serialized.sessions = persistable.sessions.map((s) => {
      const session: Record<string, unknown> = { ...s };
      for (const key of ['start_time', 'end_time'] as const) {
        if (s[key] instanceof Date) session[key] = (s[key] as Date).toISOString();
      }
      return session;
    });
  }
  return serialized;
}

function deserializeDraft(raw: Record<string, unknown>): DraftData {
  const data = { ...raw } as any;
  for (const key of ['startDate', 'endDate', 'registrationDeadline'] as const) {
    if (typeof data[key] === 'string') {
      const d = new Date(data[key]);
      data[key] = isNaN(d.getTime()) ? null : d;
    }
  }
  if (Array.isArray(data.ticketTypes)) {
    data.ticketTypes = data.ticketTypes.map((t: any) => {
      const ticket = { ...t };
      for (const key of ['sales_start', 'sales_end']) {
        if (typeof ticket[key] === 'string') {
          const d = new Date(ticket[key]);
          ticket[key] = isNaN(d.getTime()) ? new Date() : d;
        }
      }
      return ticket;
    });
  }
  if (Array.isArray(data.sessions)) {
    data.sessions = data.sessions.map((s: any) => {
      const session = { ...s };
      for (const key of ['start_time', 'end_time']) {
        if (typeof session[key] === 'string') {
          const d = new Date(session[key]);
          session[key] = isNaN(d.getTime()) ? null : d;
        }
      }
      return session;
    });
  }
  return data as DraftData;
}

export function useNamedDrafts() {
  const [drafts, setDrafts] = useState<NamedDraftMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(INDEX_KEY);
      const list: NamedDraftMeta[] = raw ? JSON.parse(raw) : [];
      // Tri par date de sauvegarde décroissante (plus récent en premier)
      list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      setDrafts(list);
    } catch {
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveAsNamed = useCallback(
    async (form: EventFormState, name: string): Promise<NamedDraftMeta> => {
      const id = generateId();
      const meta: NamedDraftMeta = {
        id,
        name: name.trim() || form.title.trim() || 'Brouillon sans nom',
        savedAt: new Date().toISOString(),
        titleSnapshot: form.title || '',
      };
      const serialized = serializeForm(form);
      const payload: SerializedDraft = { data: serialized, savedAt: meta.savedAt };
      try {
        await AsyncStorage.setItem(ENTRY_PREFIX + id, JSON.stringify(payload));
        const raw = await AsyncStorage.getItem(INDEX_KEY);
        const list: NamedDraftMeta[] = raw ? JSON.parse(raw) : [];
        list.push(meta);
        await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(list));
        await refresh();
      } catch {
        // ignore — l'utilisateur peut retenter
      }
      return meta;
    },
    [refresh],
  );

  const loadById = useCallback(async (id: string): Promise<DraftData | null> => {
    try {
      const raw = await AsyncStorage.getItem(ENTRY_PREFIX + id);
      if (!raw) return null;
      const parsed: SerializedDraft = JSON.parse(raw);
      return deserializeDraft(parsed.data);
    } catch {
      return null;
    }
  }, []);

  const deleteById = useCallback(
    async (id: string): Promise<void> => {
      try {
        await AsyncStorage.removeItem(ENTRY_PREFIX + id);
        const raw = await AsyncStorage.getItem(INDEX_KEY);
        const list: NamedDraftMeta[] = raw ? JSON.parse(raw) : [];
        const filtered = list.filter((m) => m.id !== id);
        await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(filtered));
        await refresh();
      } catch {
        // ignore
      }
    },
    [refresh],
  );

  return {
    drafts,
    loading,
    saveAsNamed,
    loadById,
    deleteById,
    refresh,
  };
}
