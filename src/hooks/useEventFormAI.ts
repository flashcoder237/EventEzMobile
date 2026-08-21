/**
 * useEventFormAI — AI assist handlers for event creation form
 *
 * Extracted from useEventForm to reduce hook size.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { aiAssistAPI, siteSettingsAPI } from '../api';
import type { Category, AIUsage, AIGeneratedEvent } from '../types';
import type { AlertActions } from './useEventForm';
import { getApiErrorMessage } from '../lib/utils/errorHandling';

interface UseEventFormAIOptions {
  alertActions: AlertActions;
  categories: Category[];
  categoryId: number | null;
  eventType: string;
  title: string;
  description: string;
  locationCity: string;
  maxParticipants: string;
  startDate: Date;
  platformCurrency: string;
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  setShortDescription: (v: string) => void;
  setEventType: (v: 'billetterie' | 'inscription') => void;
  setCategoryId: (v: number | null) => void;
  setSelectedTagIds: (v: number[]) => void;
  setLocationType: (v: any) => void;
  setLocationName: (v: string) => void;
  setLocationCity: (v: string) => void;
  setTicketTypes: (v: any[]) => void;
}

export function useEventFormAI(options: UseEventFormAIOptions) {
  const {
    alertActions, categories, categoryId, eventType, title, description,
    locationCity, maxParticipants, startDate, platformCurrency,
    setTitle, setDescription, setShortDescription, setEventType,
    setCategoryId, setSelectedTagIds, setLocationType, setLocationName,
    setLocationCity, setTicketTypes,
  } = options;
  const { showAlert, showSuccess, showError } = alertActions;
  const { t } = useTranslation();

  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIGeneratedEvent | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiUsage, setAiUsage] = useState<AIUsage | null>(null);
  const [aiTitleLoading, setAiTitleLoading] = useState(false);
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiPricingLoading, setAiPricingLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

  const refreshAIUsage = async () => {
    try {
      const res = await aiAssistAPI.usage(sessionId);
      setAiUsage(res.data);
    } catch {}
  };

  const fetchAIStatus = useCallback(async () => {
    try {
      const res = await siteSettingsAPI.get();
      setAiEnabled(res.data.ai_assist_enabled ?? false);
      if (res.data.ai_assist_enabled) {
        const usageRes = await aiAssistAPI.usage(sessionId);
        setAiUsage(usageRes.data);
      }
    } catch {
      setAiEnabled(false);
    }
  }, [sessionId]);

  const handleAIGenerate = useCallback(async (prompt: string) => {
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const res = await aiAssistAPI.generate(prompt, sessionId);
      const data = res.data;
      if (data.result) {
        setAiResult(typeof data.result === 'string' ? JSON.parse(data.result) : data.result);
      } else if (data.text) {
        try {
          setAiResult(JSON.parse(data.text));
        } catch {
          setAiError(t('errors.generic'));
        }
      } else {
        setAiResult(data);
      }
      refreshAIUsage();
    } catch (err: any) {
      setAiError(getApiErrorMessage(err, t, { fallbackKey: 'errors.generic' }).message);
    } finally {
      setAiLoading(false);
    }
  }, [sessionId, t]);

  const handleAIApply = useCallback((data: AIGeneratedEvent) => {
    if (data.title) setTitle(data.title);
    if (data.short_description) setShortDescription(data.short_description);
    if (data.description) setDescription(data.description);
    if (data.event_type === 'billetterie' || data.event_type === 'inscription') setEventType(data.event_type);
    if (data.category_id) setCategoryId(parseInt(data.category_id));
    if (data.tag_ids) setSelectedTagIds(data.tag_ids);
    if (data.location_type === 'in_person' || data.location_type === 'online' || data.location_type === 'hybrid') {
      setLocationType(data.location_type);
    }
    if (data.suggested_location_name) setLocationName(data.suggested_location_name);
    if (data.suggested_city) setLocationCity(data.suggested_city);
    setAiResult(null);
    showSuccess(t('common.success'), t('organizer.eventCreate.aiAppliedMessage', { defaultValue: 'Les données IA ont été appliquées au formulaire' }));
  }, [showSuccess, t, setTitle, setShortDescription, setDescription, setEventType, setCategoryId, setSelectedTagIds, setLocationType, setLocationName, setLocationCity]);

  const handleOptimizeTitle = useCallback(async () => {
    if (!title.trim() || title.length < 5) return;
    setAiTitleLoading(true);
    try {
      const categoryName = categories.find(c => c.id === categoryId)?.name || '';
      const res = await aiAssistAPI.optimizeTitle(title, eventType, categoryName, sessionId);
      const suggestions = res.data.suggestions || res.data;
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        showAlert(
          t('organizer.eventCreate.aiTitleSuggestionsTitle', { defaultValue: 'Suggestions de titre' }),
          suggestions.map((s: any, i: number) => `${i + 1}. ${s.title}\n   → ${s.reason}`).join('\n\n'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            ...suggestions.slice(0, 3).map((s: any) => ({
              text: s.title.substring(0, 20) + '...',
              onPress: () => setTitle(s.title),
            })),
          ]
        );
      }
      refreshAIUsage();
    } catch (err: any) {
      showError(t('common.error'), getApiErrorMessage(err, t, { fallbackKey: 'errors.generic' }).message);
    } finally {
      setAiTitleLoading(false);
    }
  }, [title, categories, categoryId, eventType, sessionId, showAlert, showError, setTitle, t]);

  const handleGenerateDescription = useCallback(async () => {
    if (!title.trim()) {
      showAlert(
        t('common.info'),
        t('organizer.eventCreate.aiNeedTitleFirst', { defaultValue: "Ajoutez d'abord un titre pour que l'IA puisse générer une description." }),
        undefined,
        'info',
      );
      return;
    }
    setAiDescLoading(true);
    try {
      const categoryName = categories.find(c => c.id === categoryId)?.name || '';
      const res = await aiAssistAPI.description(title, '', eventType, categoryName, sessionId);
      const text = res.data.text || res.data.description || '';
      if (text) {
        setDescription(text);
        showSuccess(t('common.success'), t('organizer.eventCreate.aiDescGenerated', { defaultValue: "Description générée par l'IA" }));
      }
      refreshAIUsage();
    } catch (err: any) {
      showError(t('common.error'), getApiErrorMessage(err, t, { fallbackKey: 'errors.generic' }).message);
    } finally {
      setAiDescLoading(false);
    }
  }, [title, categories, categoryId, eventType, sessionId, showAlert, showSuccess, showError, setDescription, t]);

  const handleSuggestPricing = useCallback(async () => {
    setAiPricingLoading(true);
    try {
      const categoryName = categories.find(c => c.id === categoryId)?.name || '';
      const res = await aiAssistAPI.pricing(eventType, categoryName, locationCity, maxParticipants, description, sessionId);
      const suggestions = res.data.suggestions || res.data;
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        showAlert(
          t('organizer.eventCreate.aiPricingSuggestionsTitle', { defaultValue: 'Suggestions de prix IA' }),
          suggestions.map((s: any) => `${s.name}: ${s.price} ${platformCurrency}\n→ ${s.reasoning}`).join('\n\n'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.apply', { defaultValue: 'Appliquer' }),
              onPress: () => {
                const newTickets = suggestions.map((s: any) => ({
                  name: s.name,
                  description: s.reasoning || '',
                  price: String(s.price),
                  quantity_total: '100',
                  sales_start: startDate,
                  sales_end: new Date(startDate.getTime() - 86400000),
                  is_visible: true,
                  max_per_order: '10',
                  min_per_order: '1',
                }));
                setTicketTypes(newTickets);
                showSuccess(t('common.success'), t('organizer.eventCreate.aiTicketsCreated', { defaultValue: 'Tickets créés à partir des suggestions IA' }));
              },
            },
          ]
        );
      }
      refreshAIUsage();
    } catch (err: any) {
      showError(t('common.error'), getApiErrorMessage(err, t, { fallbackKey: 'errors.generic' }).message);
    } finally {
      setAiPricingLoading(false);
    }
  }, [categories, categoryId, eventType, locationCity, maxParticipants, description, sessionId, startDate, platformCurrency, showAlert, showSuccess, showError, setTicketTypes, t]);

  return {
    aiEnabled,
    aiLoading,
    aiResult,
    aiError,
    aiUsage,
    aiTitleLoading,
    aiDescLoading,
    aiPricingLoading,
    fetchAIStatus,
    handleAIGenerate,
    handleAIApply,
    handleOptimizeTitle,
    handleGenerateDescription,
    handleSuggestPricing,
  };
}
