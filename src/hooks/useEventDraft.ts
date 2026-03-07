import { useState, useRef, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import type { EventFormState, TicketTypeForm, SessionForm, FormFieldForm } from './useEventForm';

const DRAFT_KEY = '@eventez_event_draft';
const DEBOUNCE_MS = 2000;

// Fields to exclude from draft (transient/reference/AI state)
type ExcludedKeys =
  | 'loading'
  | 'categories'
  | 'availableTags'
  | 'showMapPicker'
  | 'aiEnabled'
  | 'aiLoading'
  | 'aiResult'
  | 'aiError'
  | 'aiUsage'
  | 'aiTitleLoading'
  | 'aiDescLoading'
  | 'aiPricingLoading';

export type DraftData = Omit<EventFormState, ExcludedKeys>;

// ============================================
// Serialization helpers
// ============================================

interface SerializedDraft {
  data: Record<string, unknown>;
  savedAt: string;
}

const DATE_FIELDS_TOP = ['startDate', 'endDate', 'registrationDeadline'] as const;
const DATE_FIELDS_TICKET = ['sales_start', 'sales_end'] as const;
const DATE_FIELDS_SESSION = ['start_time', 'end_time'] as const;

function serializeForm(form: EventFormState): Record<string, unknown> {
  const {
    loading,
    categories,
    availableTags,
    showMapPicker,
    aiEnabled,
    aiLoading,
    aiResult,
    aiError,
    aiUsage,
    aiTitleLoading,
    aiDescLoading,
    aiPricingLoading,
    ...persistable
  } = form;

  const serialized: Record<string, unknown> = { ...persistable };

  // Convert top-level Date fields to ISO strings
  for (const key of DATE_FIELDS_TOP) {
    const val = (persistable as any)[key];
    if (val instanceof Date) {
      serialized[key] = val.toISOString();
    }
  }

  // Convert ticket type Date fields
  if (persistable.ticketTypes?.length) {
    serialized.ticketTypes = persistable.ticketTypes.map((t) => {
      const ticket: Record<string, unknown> = { ...t };
      for (const key of DATE_FIELDS_TICKET) {
        if (t[key] instanceof Date) {
          ticket[key] = (t[key] as Date).toISOString();
        }
      }
      return ticket;
    });
  }

  // Convert session Date fields
  if (persistable.sessions?.length) {
    serialized.sessions = persistable.sessions.map((s) => {
      const session: Record<string, unknown> = { ...s };
      for (const key of DATE_FIELDS_SESSION) {
        if (s[key] instanceof Date) {
          session[key] = (s[key] as Date).toISOString();
        }
      }
      return session;
    });
  }

  return serialized;
}

function deserializeDraft(raw: Record<string, unknown>): DraftData {
  const data = { ...raw } as any;

  // Reconstruct top-level Date fields
  for (const key of DATE_FIELDS_TOP) {
    if (typeof data[key] === 'string') {
      const d = new Date(data[key]);
      data[key] = isNaN(d.getTime()) ? null : d;
    }
  }

  // Reconstruct ticket type Date fields
  if (Array.isArray(data.ticketTypes)) {
    data.ticketTypes = data.ticketTypes.map((t: any) => {
      const ticket = { ...t };
      for (const key of DATE_FIELDS_TICKET) {
        if (typeof ticket[key] === 'string') {
          const d = new Date(ticket[key]);
          ticket[key] = isNaN(d.getTime()) ? new Date() : d;
        }
      }
      return ticket as TicketTypeForm;
    });
  }

  // Reconstruct session Date fields
  if (Array.isArray(data.sessions)) {
    data.sessions = data.sessions.map((s: any) => {
      const session = { ...s };
      for (const key of DATE_FIELDS_SESSION) {
        if (typeof session[key] === 'string') {
          const d = new Date(session[key]);
          session[key] = isNaN(d.getTime()) ? null : d;
        }
      }
      return session as SessionForm;
    });
  }

  return data as DraftData;
}

async function validateBannerImage(uri: string | null): Promise<string | null> {
  if (!uri) return null;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists ? uri : null;
  } catch {
    return null;
  }
}

function isFormEmpty(form: EventFormState): boolean {
  return (
    !form.title.trim() &&
    !form.description.trim() &&
    !form.shortDescription.trim() &&
    !form.bannerImage &&
    !form.locationName.trim() &&
    !form.locationCity.trim() &&
    form.ticketTypes.length === 0 &&
    form.formFields.length === 0 &&
    form.sessions.length === 0
  );
}

// ============================================
// Hook
// ============================================

export interface UseEventDraftReturn {
  hasDraft: boolean;
  draftTitle: string;
  draftLoading: boolean;
  draftJustSaved: boolean;
  loadDraft: () => Promise<DraftData | null>;
  scheduleSave: (form: EventFormState) => void;
  saveNow: (form: EventFormState) => Promise<void>;
  clearDraft: () => Promise<void>;
}

export function useEventDraft(): UseEventDraftReturn {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftLoading, setDraftLoading] = useState(true);
  const [draftJustSaved, setDraftJustSaved] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savedIndicatorRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Check if a draft exists on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (raw) {
          const parsed: SerializedDraft = JSON.parse(raw);
          setHasDraft(true);
          setDraftTitle((parsed.data.title as string) || 'Sans titre');
        }
      } catch {
        setHasDraft(false);
      } finally {
        setDraftLoading(false);
      }
    })();
  }, []);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current);
    };
  }, []);

  const showSavedIndicator = useCallback(() => {
    setDraftJustSaved(true);
    if (savedIndicatorRef.current) clearTimeout(savedIndicatorRef.current);
    savedIndicatorRef.current = setTimeout(() => {
      setDraftJustSaved(false);
    }, 2000);
  }, []);

  const saveNow = useCallback(async (form: EventFormState) => {
    if (isFormEmpty(form)) return;
    try {
      const serialized = serializeForm(form);
      const payload: SerializedDraft = {
        data: serialized,
        savedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      setHasDraft(true);
      setDraftTitle(form.title || 'Sans titre');
      showSavedIndicator();
    } catch (error) {
      if (__DEV__) console.error('Erreur sauvegarde brouillon:', error);
    }
  }, [showSavedIndicator]);

  const scheduleSave = useCallback((form: EventFormState) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveNow(form);
    }, DEBOUNCE_MS);
  }, [saveNow]);

  const loadDraft = useCallback(async (): Promise<DraftData | null> => {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const parsed: SerializedDraft = JSON.parse(raw);
      const draft = deserializeDraft(parsed.data);

      // Validate banner image still exists on disk
      draft.bannerImage = await validateBannerImage(draft.bannerImage ?? null);

      // Validate gallery images still exist on disk
      if (Array.isArray(draft.galleryImages) && draft.galleryImages.length > 0) {
        const validated = await Promise.all(
          draft.galleryImages.map(uri => validateBannerImage(uri))
        );
        draft.galleryImages = validated.filter((uri): uri is string => uri !== null);
      } else {
        draft.galleryImages = [];
      }

      return draft;
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement brouillon:', error);
      return null;
    }
  }, []);

  const clearDraft = useCallback(async () => {
    try {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      await AsyncStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      setDraftTitle('');
    } catch (error) {
      if (__DEV__) console.error('Erreur suppression brouillon:', error);
    }
  }, []);

  return {
    hasDraft,
    draftTitle,
    draftLoading,
    draftJustSaved,
    loadDraft,
    scheduleSave,
    saveNow,
    clearDraft,
  };
}
