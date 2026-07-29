/**
 * Tests du validateur d'étapes de création d'événement.
 *
 * Ce hook décide si un formulaire est valide AVANT l'envoi au backend. Un trou
 * ici = données incomplètes envoyées → 400 côté serveur. On couvre donc TOUS
 * les cas de chaque étape (1 infos, 2 date/lieu, 3 tarifs/champs), pour les
 * deux types d'event (billetterie / inscription) et les variantes de lieu.
 */
import { renderHook } from '@testing-library/react-native';
import { useEventFormValidation } from '../useEventFormValidation';
import type { EventFormState } from '../useEventForm';

const showError = jest.fn();

function baseForm(overrides: Partial<EventFormState> = {}): EventFormState {
  const start = new Date(Date.now() + 24 * 3600 * 1000);
  const end = new Date(start.getTime() + 2 * 3600 * 1000);
  return {
    currentStep: 1,
    isEditMode: false,
    title: 'Titre',
    description: 'Description',
    shortDescription: '',
    eventType: 'billetterie',
    categoryId: 1,
    coverVideoUrl: '',
    selectedTagIds: [],
    customTags: [],
    availableTags: [],
    startDate: start,
    endDate: end,
    registrationDeadline: null,
    hasRegistrationDeadline: false,
    locationType: 'in_person',
    locationName: '',
    locationCity: 'Yaoundé',
    locationAddress: '',
    locationCountry: 'Cameroun',
    onlineUrl: '',
    onlinePlatform: '',
    isFree: true,
    maxParticipants: '',
    autoApproveRegistrations: true,
    feeBearer: 'participant',
    ticketTypes: [],
    formFields: [],
    showFormFieldsForBilletterie: false,
    visibility: 'public',
    accessCode: '',
    sessions: [],
    tracks: [],
    speakers: [],
    ...overrides,
  } as unknown as EventFormState;
}

function ticket(overrides: any = {}) {
  const salesStart = new Date(Date.now() + 3600 * 1000);
  const salesEnd = new Date(Date.now() + 20 * 3600 * 1000);
  return {
    name: 'Standard', description: '', price: '5000', quantity_total: '100',
    sales_start: salesStart, sales_end: salesEnd,
    is_visible: true, max_per_order: '10', min_per_order: '1',
    ...overrides,
  };
}

function field(overrides: any = {}) {
  return {
    label: 'Nom', field_type: 'text', required: false,
    placeholder: '', help_text: '', options: '', order: 0,
    ...overrides,
  };
}

function validate(form: EventFormState, step: number) {
  const { result } = renderHook(() => useEventFormValidation(form, showError));
  return result.current.withDetails(step);
}

beforeEach(() => showError.mockClear());

describe('useEventFormValidation — étape 1 (infos)', () => {
  it('valide un titre/description/catégorie corrects', () => {
    expect(validate(baseForm(), 1).valid).toBe(true);
  });
  it('rejette un titre vide', () => {
    expect(validate(baseForm({ title: '  ' }), 1).errors.title).toBeDefined();
  });
  it('rejette une description vide', () => {
    expect(validate(baseForm({ description: '' }), 1).errors.description).toBeDefined();
  });
  it('rejette une catégorie manquante', () => {
    expect(validate(baseForm({ categoryId: null as any }), 1).errors.categoryId).toBeDefined();
  });
  it('accepte une URL vidéo YouTube', () => {
    const r = validate(baseForm({ coverVideoUrl: 'https://youtube.com/watch?v=abc' }), 1);
    expect(r.errors.coverVideoUrl).toBeUndefined();
  });
  it('rejette une URL vidéo non YouTube/Vimeo', () => {
    const r = validate(baseForm({ coverVideoUrl: 'https://tiktok.com/@x/video/1' }), 1);
    expect(r.errors.coverVideoUrl).toBeDefined();
  });
});

describe('useEventFormValidation — étape 2 (date & lieu)', () => {
  it('valide un présentiel avec ville et dates cohérentes', () => {
    expect(validate(baseForm(), 2).valid).toBe(true);
  });
  it('rejette une date de début dans le passé (création)', () => {
    const past = new Date(Date.now() - 3600 * 1000);
    const r = validate(baseForm({ startDate: past, endDate: new Date(Date.now() + 3600 * 1000) }), 2);
    expect(r.errors.startDate).toBeDefined();
  });
  it('autorise une date passée en mode édition', () => {
    const past = new Date(Date.now() - 48 * 3600 * 1000);
    const r = validate(baseForm({
      isEditMode: true, startDate: past, endDate: new Date(past.getTime() + 3600 * 1000),
    }), 2);
    expect(r.errors.startDate).toBeUndefined();
  });
  it('rejette end <= start', () => {
    const d = new Date(Date.now() + 5 * 3600 * 1000);
    const r = validate(baseForm({ startDate: d, endDate: d }), 2);
    expect(r.errors.endDate).toBeDefined();
  });
  it('rejette un présentiel sans ville', () => {
    expect(validate(baseForm({ locationCity: '' }), 2).errors.locationCity).toBeDefined();
  });
  it('rejette un événement en ligne sans URL', () => {
    const r = validate(baseForm({ locationType: 'online', locationCity: '', onlineUrl: '' }), 2);
    expect(r.errors.onlineUrl).toBeDefined();
  });
  it('hybride exige ville ET url', () => {
    const r = validate(baseForm({ locationType: 'hybrid', locationCity: '', onlineUrl: '' }), 2);
    expect(r.errors.locationCity).toBeDefined();
    expect(r.errors.onlineUrl).toBeDefined();
  });
});

describe('useEventFormValidation — étape 3 billetterie', () => {
  it('payant sans billet → erreur', () => {
    const r = validate(baseForm({ eventType: 'billetterie', isFree: false, ticketTypes: [] }), 3);
    expect(r.errors.ticketTypes).toBeDefined();
  });
  it('gratuit sans billet → OK', () => {
    const r = validate(baseForm({ eventType: 'billetterie', isFree: true, ticketTypes: [] }), 3);
    expect(r.valid).toBe(true);
  });
  it('billet valide → OK', () => {
    const r = validate(baseForm({ eventType: 'billetterie', isFree: false, ticketTypes: [ticket()] }), 3);
    expect(r.valid).toBe(true);
  });
  it('billet sans nom → erreur', () => {
    const r = validate(baseForm({ eventType: 'billetterie', isFree: false, ticketTypes: [ticket({ name: '' })] }), 3);
    expect(r.errors.ticketTypes).toBeDefined();
  });
  it('billet prix négatif → erreur', () => {
    const r = validate(baseForm({ eventType: 'billetterie', isFree: false, ticketTypes: [ticket({ price: '-5' })] }), 3);
    expect(r.errors.ticketTypes).toBeDefined();
  });
  it('billet prix non numérique → erreur', () => {
    const r = validate(baseForm({ eventType: 'billetterie', isFree: false, ticketTypes: [ticket({ price: 'abc' })] }), 3);
    expect(r.errors.ticketTypes).toBeDefined();
  });
  it('billet quantité 0 → erreur', () => {
    const r = validate(baseForm({ eventType: 'billetterie', isFree: false, ticketTypes: [ticket({ quantity_total: '0' })] }), 3);
    expect(r.errors.ticketTypes).toBeDefined();
  });
  it('sales_end après la fin de l\'event → erreur', () => {
    const start = new Date(Date.now() + 24 * 3600 * 1000);
    const end = new Date(start.getTime() + 3600 * 1000);
    const salesEndTooLate = new Date(end.getTime() + 10 * 3600 * 1000);
    const r = validate(baseForm({
      eventType: 'billetterie', isFree: false, startDate: start, endDate: end,
      ticketTypes: [ticket({ sales_start: new Date(Date.now() + 3600 * 1000), sales_end: salesEndTooLate })],
    }), 3);
    expect(r.errors.ticketTypes).toBeDefined();
  });
  it('max_per_order < min_per_order → erreur', () => {
    const r = validate(baseForm({
      eventType: 'billetterie', isFree: false,
      ticketTypes: [ticket({ min_per_order: '5', max_per_order: '2' })],
    }), 3);
    expect(r.errors.ticketTypes).toBeDefined();
  });
  it('billetterie + form fields activés et valides → OK (régression)', () => {
    const r = validate(baseForm({
      eventType: 'billetterie', isFree: false, ticketTypes: [ticket()],
      showFormFieldsForBilletterie: true, formFields: [field({ label: 'T-shirt' })],
    }), 3);
    expect(r.valid).toBe(true);
  });
  it('billetterie + form field select sans options → erreur', () => {
    const r = validate(baseForm({
      eventType: 'billetterie', isFree: false, ticketTypes: [ticket()],
      showFormFieldsForBilletterie: true,
      formFields: [field({ label: 'Taille', field_type: 'select', options: '' })],
    }), 3);
    expect(r.errors.formFields).toBeDefined();
  });
});

describe('useEventFormValidation — étape 3 inscription', () => {
  it('inscription sans champ → erreur', () => {
    const r = validate(baseForm({ eventType: 'inscription', formFields: [] }), 3);
    expect(r.errors.formFields).toBeDefined();
  });
  it('inscription avec champ texte valide → OK', () => {
    const r = validate(baseForm({ eventType: 'inscription', formFields: [field()] }), 3);
    expect(r.valid).toBe(true);
  });
  it('inscription champ sans intitulé → erreur', () => {
    const r = validate(baseForm({ eventType: 'inscription', formFields: [field({ label: '' })] }), 3);
    expect(r.errors.formFields).toBeDefined();
  });
  it('inscription champ radio sans options → erreur', () => {
    const r = validate(baseForm({
      eventType: 'inscription', formFields: [field({ label: 'Choix', field_type: 'radio', options: '' })],
    }), 3);
    expect(r.errors.formFields).toBeDefined();
  });
  it('inscription champ checkbox AVEC options → OK', () => {
    const r = validate(baseForm({
      eventType: 'inscription',
      formFields: [field({ label: 'Régime', field_type: 'checkbox', options: 'Végé,Vegan' })],
    }), 3);
    expect(r.valid).toBe(true);
  });
});

describe('useEventFormValidation — validateStep (bool + toast)', () => {
  it('retourne false et déclenche un toast sur la 1re erreur', () => {
    const { result } = renderHook(() => useEventFormValidation(baseForm({ title: '' }), showError));
    const ok = result.current(1);
    expect(ok).toBe(false);
    expect(showError).toHaveBeenCalled();
  });
  it('retourne true sans toast quand valide', () => {
    const { result } = renderHook(() => useEventFormValidation(baseForm(), showError));
    expect(result.current(1)).toBe(true);
    expect(showError).not.toHaveBeenCalled();
  });
});
