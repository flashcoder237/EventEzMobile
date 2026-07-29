/**
 * Tests de useEventFormCollections — CRUD tickets / form fields / sessions.
 *
 * Ce hook produit les DÉFAUTS exacts des sous-ressources (prix '0', qty '100',
 * sales_start = start-7j, field_type 'text', order incrémental, session talk…)
 * — ces valeurs alimentent directement les payloads API. On vérifie les
 * défauts, l'ordre, l'update immuable et le remove par index.
 */
import { renderHook, act } from '@testing-library/react-native';
import { useState } from 'react';
import { useEventFormCollections } from '../useEventFormCollections';

const START = new Date('2026-08-15T18:00:00Z');

// Hôte : câble de vrais useState aux setters attendus par le hook.
function useHost(startDate: Date = START) {
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [formFields, setFormFields] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const api = useEventFormCollections({ startDate, setTicketTypes, setFormFields, setSessions });
  return { api, ticketTypes, formFields, sessions };
}

describe('ticket types', () => {
  it('addTicketType applique les défauts + sales_start = start - 7j', () => {
    const { result } = renderHook(() => useHost());
    act(() => result.current.api.addTicketType());

    const t = result.current.ticketTypes[0];
    expect(t).toMatchObject({
      name: '', price: '0', quantity_total: '100',
      is_visible: true, max_per_order: '10', min_per_order: '1',
    });
    expect(t.sales_end.toISOString()).toBe(START.toISOString());
    const expectedStart = new Date(START); expectedStart.setDate(expectedStart.getDate() - 7);
    expect(t.sales_start.toISOString()).toBe(expectedStart.toISOString());
  });

  it('updateTicketType modifie un champ sans muter les autres', () => {
    const { result } = renderHook(() => useHost());
    act(() => result.current.api.addTicketType());
    act(() => result.current.api.addTicketType());
    act(() => result.current.api.updateTicketType(1, 'name', 'VIP'));

    expect(result.current.ticketTypes[0].name).toBe('');
    expect(result.current.ticketTypes[1].name).toBe('VIP');
  });

  it('removeTicketType retire par index', () => {
    const { result } = renderHook(() => useHost());
    act(() => result.current.api.addTicketType());
    act(() => result.current.api.addTicketType());
    act(() => result.current.api.updateTicketType(0, 'name', 'A'));
    act(() => result.current.api.updateTicketType(1, 'name', 'B'));
    act(() => result.current.api.removeTicketType(0));

    expect(result.current.ticketTypes).toHaveLength(1);
    expect(result.current.ticketTypes[0].name).toBe('B');
  });
});

describe('form fields', () => {
  it('addFormField applique les défauts + order incrémental', () => {
    const { result } = renderHook(() => useHost());
    act(() => result.current.api.addFormField());
    act(() => result.current.api.addFormField());

    expect(result.current.formFields[0]).toMatchObject({
      label: '', field_type: 'text', required: false, options: '', order: 0,
    });
    expect(result.current.formFields[1].order).toBe(1);
  });

  it('updateFormField change le type / les options', () => {
    const { result } = renderHook(() => useHost());
    act(() => result.current.api.addFormField());
    act(() => result.current.api.updateFormField(0, 'field_type', 'select'));
    act(() => result.current.api.updateFormField(0, 'options', 'A,B,C'));

    expect(result.current.formFields[0].field_type).toBe('select');
    expect(result.current.formFields[0].options).toBe('A,B,C');
  });

  it('removeFormField retire par index', () => {
    const { result } = renderHook(() => useHost());
    act(() => result.current.api.addFormField());
    act(() => result.current.api.addFormField());
    act(() => result.current.api.removeFormField(0));
    expect(result.current.formFields).toHaveLength(1);
  });
});

describe('sessions', () => {
  it('addSession applique les défauts (talk, requires_registration, level all)', () => {
    const { result } = renderHook(() => useHost());
    act(() => result.current.api.addSession());

    expect(result.current.sessions[0]).toMatchObject({
      session_type: 'talk',
      requires_registration: true,
      is_virtual: false,
      level: 'all',
      language: 'fr',
      track_index: null,
      speaker_indices: [],
      moderator_index: null,
    });
  });

  it('updateSession modifie un champ ciblé', () => {
    const { result } = renderHook(() => useHost());
    act(() => result.current.api.addSession());
    act(() => result.current.api.updateSession(0, 'title', 'Keynote'));
    expect(result.current.sessions[0].title).toBe('Keynote');
  });

  it('removeSession retire par index', () => {
    const { result } = renderHook(() => useHost());
    act(() => result.current.api.addSession());
    act(() => result.current.api.addSession());
    act(() => result.current.api.updateSession(1, 'title', 'Panel'));
    act(() => result.current.api.removeSession(0));
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].title).toBe('Panel');
  });
});
