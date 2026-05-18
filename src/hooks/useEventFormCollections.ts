/**
 * useEventFormCollections — CRUD helpers for ticket types, form fields, and sessions
 *
 * Extracted from useEventForm to reduce hook size.
 */

import { useCallback } from 'react';
import type { TicketTypeForm, FormFieldForm, SessionForm } from './useEventForm';

interface UseEventFormCollectionsOptions {
  startDate: Date;
  setTicketTypes: React.Dispatch<React.SetStateAction<TicketTypeForm[]>>;
  setFormFields: React.Dispatch<React.SetStateAction<FormFieldForm[]>>;
  setSessions: React.Dispatch<React.SetStateAction<SessionForm[]>>;
}

export function useEventFormCollections({
  startDate,
  setTicketTypes,
  setFormFields,
  setSessions,
}: UseEventFormCollectionsOptions) {
  // Ticket Types
  const addTicketType = useCallback(() => {
    const salesStart = new Date(startDate);
    salesStart.setDate(salesStart.getDate() - 7);
    setTicketTypes(prev => [...prev, {
      name: '',
      description: '',
      price: '0',
      quantity_total: '100',
      sales_start: salesStart,
      sales_end: new Date(startDate),
      is_visible: true,
      max_per_order: '10',
      min_per_order: '1',
    }]);
  }, [startDate, setTicketTypes]);

  const updateTicketType = useCallback((index: number, field: string, value: any) => {
    setTicketTypes(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, [setTicketTypes]);

  const removeTicketType = useCallback((index: number) => {
    setTicketTypes(prev => prev.filter((_, i) => i !== index));
  }, [setTicketTypes]);

  // Form Fields
  const addFormField = useCallback(() => {
    setFormFields(prev => [...prev, {
      label: '',
      field_type: 'text',
      required: false,
      placeholder: '',
      help_text: '',
      options: '',
      order: prev.length,
    }]);
  }, [setFormFields]);

  const updateFormField = useCallback((index: number, field: string, value: any) => {
    setFormFields(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, [setFormFields]);

  const removeFormField = useCallback((index: number) => {
    setFormFields(prev => prev.filter((_, i) => i !== index));
  }, [setFormFields]);

  // Sessions
  const addSession = useCallback(() => {
    setSessions(prev => [...prev, {
      title: '',
      description: '',
      session_type: 'talk',
      start_time: null,
      end_time: null,
      location: '',
      room: '',
      max_capacity: '',
      is_virtual: false,
      virtual_link: '',
      requires_registration: true,
      is_featured: false,
      slides_url: '',
      recording_url: '',
      resources: [],
      tags: [],
      level: 'all',
      language: 'fr',
      track_index: null,
      speaker_indices: [],
      moderator_index: null,
    }]);
  }, [setSessions]);

  const updateSession = useCallback((index: number, field: string, value: any) => {
    setSessions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, [setSessions]);

  const removeSession = useCallback((index: number) => {
    setSessions(prev => prev.filter((_, i) => i !== index));
  }, [setSessions]);

  return {
    addTicketType,
    updateTicketType,
    removeTicketType,
    addFormField,
    updateFormField,
    removeFormField,
    addSession,
    updateSession,
    removeSession,
  };
}
