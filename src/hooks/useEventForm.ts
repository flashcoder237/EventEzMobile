import { useState, useEffect, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import {
  eventsAPI,
  categoriesAPI,
  ticketTypesAPI,
  tagsAPI,
  sessionsAPI,
  aiAssistAPI,
  siteSettingsAPI,
} from '../api/client';
import { Category, LocationType, Tag, AIUsage, AIGeneratedEvent } from '../types';
import type { AlertType } from '../components/common/CustomAlert';
import { useCommissionConfig } from './useCommissionConfig';

// ============================================
// Types
// ============================================

export interface TicketTypeForm {
  name: string;
  description: string;
  price: string;
  quantity_total: string;
  sales_start: Date;
  sales_end: Date;
  is_visible: boolean;
  max_per_order: string;
  min_per_order: string;
}

export interface FormFieldForm {
  label: string;
  field_type: string;
  required: boolean;
  placeholder: string;
  help_text: string;
  options: string;
  order: number;
}

export interface SessionForm {
  title: string;
  description: string;
  session_type: string;
  start_time: Date | null;
  end_time: Date | null;
  location: string;
  room: string;
  max_capacity: string;
  is_virtual: boolean;
  virtual_link: string;
  requires_registration: boolean;
  is_featured: boolean;
  slides_url: string;
  recording_url: string;
  resources: string[];
  tags: string[];
  level: string;
  language: string;
}

export interface EventFormState {
  // Step navigation
  currentStep: number;
  loading: boolean;

  // Step 1 - Basic Info
  title: string;
  description: string;
  shortDescription: string;
  eventType: 'billetterie' | 'inscription';
  categoryId: number | null;
  selectedTagIds: number[];
  customTags: string[];
  bannerImage: string | null;

  // Step 2 - Date & Location
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date | null;
  hasRegistrationDeadline: boolean;
  locationType: LocationType;
  locationName: string;
  locationCity: string;
  locationAddress: string;
  locationCountry: string;
  onlineUrl: string;
  onlinePlatform: string;
  onlineInstructions: string;
  onlineMeetingId: string;
  onlinePasscode: string;
  locationLatitude: string;
  locationLongitude: string;
  showMapPicker: boolean;

  // Step 3 - Pricing
  isFree: boolean;
  maxParticipants: string;
  autoApproveRegistrations: boolean;
  ticketTypes: TicketTypeForm[];
  formFields: FormFieldForm[];
  showFormFieldsForBilletterie: boolean;

  // Visibility
  visibility: 'public' | 'unlisted' | 'invite_only';
  accessCode: string;

  // Step 4 - Sessions
  sessions: SessionForm[];

  // Reference Data
  categories: Category[];
  availableTags: Tag[];

  // AI Assist
  aiEnabled: boolean;
  aiLoading: boolean;
  aiResult: AIGeneratedEvent | null;
  aiError: string | null;
  aiUsage: AIUsage | null;
  aiTitleLoading: boolean;
  aiDescLoading: boolean;
  aiPricingLoading: boolean;
}

export interface AlertActions {
  showAlert: (title: string, message?: string, buttons?: any[], type?: AlertType) => void;
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
}

export interface MapLocation {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  country?: string;
  locationName?: string;
}

export interface UseEventFormReturn {
  // State
  form: EventFormState;

  // Step Navigation
  goToNextStep: () => void;
  goToPrevStep: () => void;
  goToStep: (step: number) => void;
  validateStep: (step: number) => boolean;

  // Step 1 handlers
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setShortDescription: (value: string) => void;
  setEventType: (value: 'billetterie' | 'inscription') => void;
  setCategoryId: (value: number | null) => void;
  setSelectedTagIds: (value: number[]) => void;
  handleCustomTagAdd: (tag: string) => void;
  handleCustomTagRemove: (tag: string) => void;
  pickImage: () => Promise<void>;
  setBannerImage: (value: string | null) => void;
  setVisibility: (value: 'public' | 'unlisted' | 'invite_only') => void;
  setAccessCode: (value: string) => void;

  // Step 2 handlers
  setStartDate: (date: Date) => void;
  setEndDate: (date: Date) => void;
  setRegistrationDeadline: (date: Date | null) => void;
  setHasRegistrationDeadline: (value: boolean) => void;
  setLocationType: (value: LocationType) => void;
  setLocationName: (value: string) => void;
  setLocationCity: (value: string) => void;
  setLocationAddress: (value: string) => void;
  setLocationCountry: (value: string) => void;
  setOnlineUrl: (value: string) => void;
  setOnlinePlatform: (value: string) => void;
  setOnlineInstructions: (value: string) => void;
  setOnlineMeetingId: (value: string) => void;
  setOnlinePasscode: (value: string) => void;
  handleMapLocationSelect: (location: MapLocation) => void;
  setShowMapPicker: (value: boolean) => void;

  // Step 3 handlers
  setIsFree: (value: boolean) => void;
  setMaxParticipants: (value: string) => void;
  setAutoApproveRegistrations: (value: boolean) => void;
  addTicketType: () => void;
  updateTicketType: (index: number, field: string, value: any) => void;
  removeTicketType: (index: number) => void;
  addFormField: () => void;
  updateFormField: (index: number, field: string, value: any) => void;
  removeFormField: (index: number) => void;
  setShowFormFieldsForBilletterie: (value: boolean) => void;
  setFormFields: (value: FormFieldForm[]) => void;
  setTicketTypes: (value: TicketTypeForm[]) => void;

  // Step 4 handlers
  addSession: () => void;
  updateSession: (index: number, field: string, value: any) => void;
  removeSession: (index: number) => void;

  // AI handlers
  handleAIGenerate: (prompt: string) => Promise<void>;
  handleAIApply: (data: AIGeneratedEvent) => void;
  handleOptimizeTitle: () => Promise<void>;
  handleGenerateDescription: () => Promise<void>;
  handleSuggestPricing: () => Promise<void>;

  // Submit
  handleSubmit: () => Promise<string | null>;
  resetForm: () => void;

  // Draft hydration
  hydrateForm: (data: Partial<EventFormState>) => void;

  // Util
  formatDate: (date: Date) => string;
}

// ============================================
// Constants
// ============================================

export const STEPS = [
  { id: 1, title: 'Informations', icon: 'information-circle-outline' },
  { id: 2, title: 'Date & Lieu', icon: 'calendar-outline' },
  { id: 3, title: 'Tarification', icon: 'pricetag-outline' },
  { id: 4, title: 'Sessions', icon: 'layers-outline' },
] as const;

export const LOCATION_TYPES: { value: LocationType; label: string; icon: string; description: string }[] = [
  { value: 'in_person', label: 'Présentiel', icon: 'location-outline', description: 'Événement physique' },
  { value: 'online', label: 'En ligne', icon: 'videocam-outline', description: 'Événement virtuel' },
  { value: 'hybrid', label: 'Hybride', icon: 'globe-outline', description: 'Physique + Virtuel' },
];

export const FIELD_TYPES = [
  { value: 'text', label: 'Texte' },
  { value: 'textarea', label: 'Texte long' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Téléphone' },
  { value: 'number', label: 'Nombre' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Liste déroulante' },
  { value: 'checkbox', label: 'Cases à cocher' },
  { value: 'radio', label: 'Boutons radio' },
];

export const SESSION_TYPES = [
  { value: 'keynote', label: 'Keynote' },
  { value: 'talk', label: 'Présentation' },
  { value: 'panel', label: 'Panel' },
  { value: 'workshop', label: 'Atelier' },
  { value: 'networking', label: 'Networking' },
  { value: 'break', label: 'Pause' },
  { value: 'lunch', label: 'Déjeuner' },
];

// ============================================
// Hook
// ============================================

export function useEventForm(alertActions: AlertActions): UseEventFormReturn {
  const { showAlert, showSuccess, showError } = alertActions;
  const { currency: platformCurrency } = useCommissionConfig();

  // Step navigation
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  // Step 1 - Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [eventType, setEventType] = useState<'billetterie' | 'inscription'>('billetterie');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [bannerImage, setBannerImage] = useState<string | null>(null);

  // Step 2 - Date & Location
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 3600000));
  const [registrationDeadline, setRegistrationDeadline] = useState<Date | null>(null);
  const [hasRegistrationDeadline, setHasRegistrationDeadline] = useState(false);
  const [locationType, setLocationType] = useState<LocationType>('in_person');
  const [locationName, setLocationName] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationCountry, setLocationCountry] = useState('Cameroun');
  const [onlineUrl, setOnlineUrl] = useState('');
  const [onlinePlatform, setOnlinePlatform] = useState('');
  const [onlineInstructions, setOnlineInstructions] = useState('');
  const [onlineMeetingId, setOnlineMeetingId] = useState('');
  const [onlinePasscode, setOnlinePasscode] = useState('');
  const [locationLatitude, setLocationLatitude] = useState('');
  const [locationLongitude, setLocationLongitude] = useState('');
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Step 3 - Pricing
  const [isFree, setIsFree] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [autoApproveRegistrations, setAutoApproveRegistrations] = useState(true);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeForm[]>([]);
  const [formFields, setFormFields] = useState<FormFieldForm[]>([]);
  const [showFormFieldsForBilletterie, setShowFormFieldsForBilletterie] = useState(false);

  // Visibility
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'invite_only'>('public');
  const [accessCode, setAccessCode] = useState('');

  // Step 4 - Sessions
  const [sessions, setSessions] = useState<SessionForm[]>([]);

  // AI Assist
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIGeneratedEvent | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiUsage, setAiUsage] = useState<AIUsage | null>(null);
  const [aiTitleLoading, setAiTitleLoading] = useState(false);
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiPricingLoading, setAiPricingLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

  // ============================================
  // Data Fetching
  // ============================================

  useEffect(() => {
    fetchCategories();
    fetchTags();
    fetchAIStatus();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.data.results || response.data || []);
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await tagsAPI.getTags();
      setAvailableTags(response.data.results || response.data || []);
    } catch (error) {
      console.error('Erreur chargement tags:', error);
    }
  };

  const fetchAIStatus = async () => {
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
  };

  const refreshAIUsage = async () => {
    try {
      const res = await aiAssistAPI.usage(sessionId);
      setAiUsage(res.data);
    } catch {}
  };

  // ============================================
  // AI Handlers
  // ============================================

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
          setAiError('Format de réponse inattendu');
        }
      } else {
        setAiResult(data);
      }
      refreshAIUsage();
    } catch (err: any) {
      setAiError(err.response?.data?.detail || err.response?.data?.message || 'Erreur lors de la génération');
    } finally {
      setAiLoading(false);
    }
  }, [sessionId]);

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
    showSuccess('Succès', 'Les données IA ont été appliquées au formulaire');
  }, [showSuccess]);

  const handleOptimizeTitle = useCallback(async () => {
    if (!title.trim() || title.length < 5) return;
    setAiTitleLoading(true);
    try {
      const categoryName = categories.find(c => c.id === categoryId)?.name || '';
      const res = await aiAssistAPI.optimizeTitle(title, eventType, categoryName, sessionId);
      const suggestions = res.data.suggestions || res.data;
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        showAlert(
          'Suggestions de titre',
          suggestions.map((s: any, i: number) => `${i + 1}. ${s.title}\n   → ${s.reason}`).join('\n\n'),
          [
            { text: 'Annuler', style: 'cancel' },
            ...suggestions.slice(0, 3).map((s: any) => ({
              text: s.title.substring(0, 20) + '...',
              onPress: () => setTitle(s.title),
            })),
          ]
        );
      }
      refreshAIUsage();
    } catch (err: any) {
      showError('Erreur', err.response?.data?.detail || 'Impossible d\'optimiser le titre');
    } finally {
      setAiTitleLoading(false);
    }
  }, [title, categories, categoryId, eventType, sessionId, showAlert, showError]);

  const handleGenerateDescription = useCallback(async () => {
    if (!title.trim()) {
      showError('Erreur', 'Veuillez d\'abord entrer un titre');
      return;
    }
    setAiDescLoading(true);
    try {
      const categoryName = categories.find(c => c.id === categoryId)?.name || '';
      const res = await aiAssistAPI.description(title, '', eventType, categoryName, sessionId);
      const text = res.data.text || res.data.description || '';
      if (text) {
        setDescription(text);
        showSuccess('Succès', 'Description générée par l\'IA');
      }
      refreshAIUsage();
    } catch (err: any) {
      showError('Erreur', err.response?.data?.detail || 'Impossible de générer la description');
    } finally {
      setAiDescLoading(false);
    }
  }, [title, categories, categoryId, eventType, sessionId, showSuccess, showError]);

  const handleSuggestPricing = useCallback(async () => {
    setAiPricingLoading(true);
    try {
      const categoryName = categories.find(c => c.id === categoryId)?.name || '';
      const res = await aiAssistAPI.pricing(eventType, categoryName, locationCity, maxParticipants, description, sessionId);
      const suggestions = res.data.suggestions || res.data;
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        showAlert(
          'Suggestions de prix IA',
          suggestions.map((s: any) => `${s.name}: ${s.price} ${platformCurrency}\n→ ${s.reasoning}`).join('\n\n'),
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Appliquer',
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
                showSuccess('Succès', 'Tickets créés à partir des suggestions IA');
              },
            },
          ]
        );
      }
      refreshAIUsage();
    } catch (err: any) {
      showError('Erreur', err.response?.data?.detail || 'Impossible de suggérer les prix');
    } finally {
      setAiPricingLoading(false);
    }
  }, [categories, categoryId, eventType, locationCity, maxParticipants, description, sessionId, startDate, showAlert, showSuccess, showError]);

  // ============================================
  // Tags Handlers
  // ============================================

  const handleCustomTagAdd = useCallback((tag: string) => {
    if (!customTags.includes(tag)) {
      setCustomTags(prev => [...prev, tag]);
    }
  }, [customTags]);

  const handleCustomTagRemove = useCallback((tag: string) => {
    setCustomTags(prev => prev.filter(t => t !== tag));
  }, []);

  // ============================================
  // Map Handler
  // ============================================

  const handleMapLocationSelect = useCallback((location: MapLocation) => {
    setLocationLatitude(location.lat.toFixed(6));
    setLocationLongitude(location.lng.toFixed(6));
    if (location.locationName) setLocationName(location.locationName);
    if (location.address) setLocationAddress(location.address);
    if (location.city) setLocationCity(location.city);
    if (location.country) setLocationCountry(location.country);
  }, []);

  // ============================================
  // Image Picker
  // ============================================

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission requise', 'Veuillez autoriser l\'accès à la galerie', undefined, 'warning');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        // Compress and convert to JPEG (max 1920px wide, quality 0.7)
        const compressed = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1920 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        setBannerImage(compressed.uri);
      } catch {
        // Fallback to original if compression fails
        setBannerImage(result.assets[0].uri);
      }
    }
  }, [showAlert]);

  // ============================================
  // Ticket Type Helpers
  // ============================================

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
  }, [startDate]);

  const updateTicketType = useCallback((index: number, field: string, value: any) => {
    setTicketTypes(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const removeTicketType = useCallback((index: number) => {
    setTicketTypes(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ============================================
  // Form Field Helpers
  // ============================================

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
  }, []);

  const updateFormField = useCallback((index: number, field: string, value: any) => {
    setFormFields(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const removeFormField = useCallback((index: number) => {
    setFormFields(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ============================================
  // Session Helpers
  // ============================================

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
    }]);
  }, []);

  const updateSession = useCallback((index: number, field: string, value: any) => {
    setSessions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const removeSession = useCallback((index: number) => {
    setSessions(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ============================================
  // Validation
  // ============================================

  const validateStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1:
        if (!title.trim()) {
          showError('Erreur', 'Le titre est requis');
          return false;
        }
        if (!description.trim()) {
          showError('Erreur', 'La description est requise');
          return false;
        }
        if (!categoryId) {
          showError('Erreur', 'Veuillez sélectionner une catégorie');
          return false;
        }
        return true;
      case 2:
        if (endDate <= startDate) {
          showError('Erreur', 'La date de fin doit être après la date de début');
          return false;
        }
        if (locationType === 'in_person' || locationType === 'hybrid') {
          if (!locationCity.trim()) {
            showError('Erreur', 'La ville est requise pour un événement présentiel');
            return false;
          }
        }
        if (locationType === 'online' || locationType === 'hybrid') {
          if (!onlineUrl.trim() && !onlinePlatform.trim()) {
            showError('Erreur', 'Veuillez indiquer une URL ou une plateforme pour l\'événement en ligne');
            return false;
          }
        }
        return true;
      case 3:
        if (eventType === 'billetterie') {
          if (!isFree && ticketTypes.length === 0) {
            showError('Erreur', 'Veuillez ajouter au moins un type de billet');
            return false;
          }
          for (let i = 0; i < ticketTypes.length; i++) {
            const ticket = ticketTypes[i];
            if (!ticket.name.trim()) {
              showError('Erreur', `Le nom du billet #${i + 1} est requis`);
              return false;
            }
            if (parseInt(ticket.quantity_total) <= 0) {
              showError('Erreur', `La quantité du billet "${ticket.name}" doit être supérieure à 0`);
              return false;
            }
          }
          if (showFormFieldsForBilletterie && formFields.length > 0) {
            for (let i = 0; i < formFields.length; i++) {
              const field = formFields[i];
              if (!field.label.trim()) {
                showError('Erreur', `L'intitulé du champ #${i + 1} est requis`);
                return false;
              }
              if (['select', 'checkbox', 'radio'].includes(field.field_type) && !field.options.trim()) {
                showError('Erreur', `Les options sont requises pour le champ "${field.label}"`);
                return false;
              }
            }
          }
        } else {
          if (formFields.length === 0) {
            showError('Erreur', 'Veuillez ajouter au moins un champ de formulaire');
            return false;
          }
          for (let i = 0; i < formFields.length; i++) {
            const field = formFields[i];
            if (!field.label.trim()) {
              showError('Erreur', `L'intitulé du champ #${i + 1} est requis`);
              return false;
            }
            if (['select', 'checkbox', 'radio'].includes(field.field_type) && !field.options.trim()) {
              showError('Erreur', `Les options sont requises pour le champ "${field.label}"`);
              return false;
            }
          }
        }
        return true;
      default:
        return true;
    }
  }, [
    title, description, categoryId, startDate, endDate, locationType,
    locationCity, onlineUrl, onlinePlatform, eventType, isFree,
    ticketTypes, formFields, showFormFieldsForBilletterie, showError,
  ]);

  // ============================================
  // Step Navigation
  // ============================================

  const goToNextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  }, [currentStep, validateStep]);

  const goToPrevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step < currentStep || validateStep(currentStep)) {
      setCurrentStep(step);
    }
  }, [currentStep, validateStep]);

  // ============================================
  // Hydrate Form (restore from draft)
  // ============================================

  const hydrateForm = useCallback((data: Partial<EventFormState>) => {
    if (data.currentStep !== undefined) setCurrentStep(data.currentStep);
    if (data.title !== undefined) setTitle(data.title);
    if (data.description !== undefined) setDescription(data.description);
    if (data.shortDescription !== undefined) setShortDescription(data.shortDescription);
    if (data.eventType !== undefined) setEventType(data.eventType);
    if (data.categoryId !== undefined) setCategoryId(data.categoryId);
    if (data.selectedTagIds !== undefined) setSelectedTagIds(data.selectedTagIds);
    if (data.customTags !== undefined) setCustomTags(data.customTags);
    if (data.bannerImage !== undefined) setBannerImage(data.bannerImage);
    if (data.startDate !== undefined) setStartDate(data.startDate);
    if (data.endDate !== undefined) setEndDate(data.endDate);
    if (data.registrationDeadline !== undefined) setRegistrationDeadline(data.registrationDeadline);
    if (data.hasRegistrationDeadline !== undefined) setHasRegistrationDeadline(data.hasRegistrationDeadline);
    if (data.locationType !== undefined) setLocationType(data.locationType);
    if (data.locationName !== undefined) setLocationName(data.locationName);
    if (data.locationCity !== undefined) setLocationCity(data.locationCity);
    if (data.locationAddress !== undefined) setLocationAddress(data.locationAddress);
    if (data.locationCountry !== undefined) setLocationCountry(data.locationCountry);
    if (data.onlineUrl !== undefined) setOnlineUrl(data.onlineUrl);
    if (data.onlinePlatform !== undefined) setOnlinePlatform(data.onlinePlatform);
    if (data.onlineInstructions !== undefined) setOnlineInstructions(data.onlineInstructions);
    if (data.onlineMeetingId !== undefined) setOnlineMeetingId(data.onlineMeetingId);
    if (data.onlinePasscode !== undefined) setOnlinePasscode(data.onlinePasscode);
    if (data.locationLatitude !== undefined) setLocationLatitude(data.locationLatitude);
    if (data.locationLongitude !== undefined) setLocationLongitude(data.locationLongitude);
    if (data.isFree !== undefined) setIsFree(data.isFree);
    if (data.maxParticipants !== undefined) setMaxParticipants(data.maxParticipants);
    if (data.autoApproveRegistrations !== undefined) setAutoApproveRegistrations(data.autoApproveRegistrations);
    if (data.ticketTypes !== undefined) setTicketTypes(data.ticketTypes);
    if (data.formFields !== undefined) setFormFields(data.formFields);
    if (data.showFormFieldsForBilletterie !== undefined) setShowFormFieldsForBilletterie(data.showFormFieldsForBilletterie);
    if (data.visibility !== undefined) setVisibility(data.visibility);
    if (data.accessCode !== undefined) setAccessCode(data.accessCode);
    if (data.sessions !== undefined) setSessions(data.sessions);
  }, []);

  // ============================================
  // Reset Form
  // ============================================

  const resetForm = useCallback(() => {
    setCurrentStep(1);
    setTitle('');
    setDescription('');
    setShortDescription('');
    setCategoryId(null);
    setSelectedTagIds([]);
    setCustomTags([]);
    setBannerImage(null);
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 3600000));
    setRegistrationDeadline(null);
    setHasRegistrationDeadline(false);
    setLocationType('in_person');
    setLocationName('');
    setLocationCity('');
    setLocationAddress('');
    setLocationLatitude('');
    setLocationLongitude('');
    setOnlineUrl('');
    setOnlinePlatform('');
    setOnlineInstructions('');
    setOnlineMeetingId('');
    setOnlinePasscode('');
    setIsFree(false);
    setMaxParticipants('');
    setTicketTypes([]);
    setFormFields([]);
    setSessions([]);
    setShowFormFieldsForBilletterie(false);
  }, []);

  // ============================================
  // Submit
  // ============================================

  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);
    try {
      const formData = new FormData();

      formData.append('title', title);
      formData.append('description', description);
      formData.append('short_description', shortDescription);
      formData.append('event_type', eventType);
      formData.append('category', String(categoryId));
      formData.append('start_date', startDate.toISOString());
      formData.append('end_date', endDate.toISOString());
      formData.append('location_type', locationType);
      formData.append('location_country', locationCountry);

      // Tags
      const allTags: string[] = [];
      selectedTagIds.forEach(tagId => {
        const tag = availableTags.find(t => t.id === tagId);
        if (tag) allTags.push(tag.name);
      });
      customTags.forEach(tag => allTags.push(tag));
      allTags.forEach(tag => {
        formData.append('tags', tag);
      });

      if (hasRegistrationDeadline && registrationDeadline) {
        formData.append('registration_deadline', registrationDeadline.toISOString());
      }

      if (locationType === 'in_person' || locationType === 'hybrid') {
        formData.append('location_name', locationName);
        formData.append('location_city', locationCity);
        formData.append('location_address', locationAddress);

        if (locationLatitude && locationLongitude) {
          formData.append('location_latitude', parseFloat(locationLatitude).toFixed(6));
          formData.append('location_longitude', parseFloat(locationLongitude).toFixed(6));
        }
      }

      if (locationType === 'online' || locationType === 'hybrid') {
        formData.append('online_url', onlineUrl);
        formData.append('online_platform', onlinePlatform);
        formData.append('online_instructions', onlineInstructions);
        if (onlineMeetingId) {
          formData.append('online_meeting_id', onlineMeetingId);
        }
        if (onlinePasscode) {
          formData.append('online_passcode', onlinePasscode);
        }
      }

      if (maxParticipants) {
        formData.append('max_participants', maxParticipants);
      }
      formData.append('auto_approve_registrations', String(autoApproveRegistrations));
      formData.append('visibility', visibility);
      if (accessCode) {
        formData.append('access_code', accessCode);
      }
      formData.append('status', 'draft');

      if (bannerImage) {
        const filename = bannerImage.split('/').pop() || 'banner.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('banner_image', {
          uri: bannerImage,
          name: filename,
          type,
        } as any);
      }

      const response = await eventsAPI.createEvent(formData);
      const eventId = response.data.id;

      // Create ticket types for billetterie events
      if (eventType === 'billetterie' && ticketTypes.length > 0) {
        await Promise.all(ticketTypes.map(ticket =>
          ticketTypesAPI.createTicketType({
            event: eventId,
            name: ticket.name,
            description: ticket.description,
            price: parseFloat(ticket.price) || 0,
            quantity_total: parseInt(ticket.quantity_total) || 100,
            sales_start: ticket.sales_start.toISOString(),
            sales_end: ticket.sales_end.toISOString(),
            is_visible: ticket.is_visible,
            max_per_order: parseInt(ticket.max_per_order) || 10,
            min_per_order: parseInt(ticket.min_per_order) || 1,
          })
        ));
      }

      // Create form fields
      const shouldCreateFormFields =
        (eventType === 'inscription' && formFields.length > 0) ||
        (eventType === 'billetterie' && showFormFieldsForBilletterie && formFields.length > 0);

      if (shouldCreateFormFields) {
        await Promise.all(formFields.map((field, index) =>
          eventsAPI.createFormField({
            event: eventId,
            label: field.label,
            field_type: field.field_type,
            required: field.required,
            placeholder: field.placeholder,
            help_text: field.help_text,
            options: field.options,
            order: index,
          })
        ));
      }

      // Create sessions
      if (sessions.length > 0) {
        await Promise.all(sessions.map(session =>
          sessionsAPI.createSession({
            event: eventId,
            title: session.title,
            description: session.description,
            session_type: session.session_type,
            start_time: session.start_time ? session.start_time.toISOString() : null,
            end_time: session.end_time ? session.end_time.toISOString() : null,
            location: session.location,
            room: session.room || '',
            max_capacity: session.max_capacity ? parseInt(session.max_capacity) : null,
            is_virtual: session.is_virtual || false,
            virtual_link: session.virtual_link || '',
            requires_registration: session.requires_registration ?? true,
            is_featured: session.is_featured || false,
            slides_url: session.slides_url || '',
            recording_url: session.recording_url || '',
            resources: session.resources || [],
            tags: session.tags || [],
            level: session.level || 'all',
            language: session.language || 'fr',
          })
        ));
      }

      return eventId;
    } catch (error: any) {
      console.error('Erreur création événement:', error);
      showError(
        'Erreur',
        error.response?.data?.message || error.response?.data?.detail || 'Impossible de créer l\'événement'
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [
    currentStep, validateStep, title, description, shortDescription, eventType,
    categoryId, startDate, endDate, locationType, locationCountry,
    selectedTagIds, availableTags, customTags, hasRegistrationDeadline,
    registrationDeadline, locationName, locationCity, locationAddress,
    locationLatitude, locationLongitude, onlineUrl, onlinePlatform,
    onlineInstructions, onlineMeetingId, onlinePasscode, maxParticipants,
    autoApproveRegistrations, bannerImage, ticketTypes, formFields,
    showFormFieldsForBilletterie, sessions, showError,
  ]);

  // ============================================
  // Utilities
  // ============================================

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // ============================================
  // Compose state object
  // ============================================

  const form: EventFormState = {
    currentStep,
    loading,
    title,
    description,
    shortDescription,
    eventType,
    categoryId,
    selectedTagIds,
    customTags,
    bannerImage,
    startDate,
    endDate,
    registrationDeadline,
    hasRegistrationDeadline,
    locationType,
    locationName,
    locationCity,
    locationAddress,
    locationCountry,
    onlineUrl,
    onlinePlatform,
    onlineInstructions,
    onlineMeetingId,
    onlinePasscode,
    locationLatitude,
    locationLongitude,
    showMapPicker,
    isFree,
    maxParticipants,
    autoApproveRegistrations,
    ticketTypes,
    formFields,
    showFormFieldsForBilletterie,
    visibility,
    accessCode,
    sessions,
    categories,
    availableTags,
    aiEnabled,
    aiLoading,
    aiResult,
    aiError,
    aiUsage,
    aiTitleLoading,
    aiDescLoading,
    aiPricingLoading,
  };

  return {
    form,

    // Step Navigation
    goToNextStep,
    goToPrevStep,
    goToStep,
    validateStep,

    // Step 1
    setTitle,
    setDescription,
    setShortDescription,
    setEventType,
    setCategoryId,
    setSelectedTagIds,
    handleCustomTagAdd,
    handleCustomTagRemove,
    pickImage,
    setBannerImage,

    // Step 2
    setStartDate,
    setEndDate,
    setRegistrationDeadline,
    setHasRegistrationDeadline,
    setLocationType,
    setLocationName,
    setLocationCity,
    setLocationAddress,
    setLocationCountry,
    setOnlineUrl,
    setOnlinePlatform,
    setOnlineInstructions,
    setOnlineMeetingId,
    setOnlinePasscode,
    handleMapLocationSelect,
    setShowMapPicker,

    // Step 3
    setIsFree,
    setMaxParticipants,
    setAutoApproveRegistrations,
    addTicketType,
    updateTicketType,
    removeTicketType,
    addFormField,
    updateFormField,
    removeFormField,
    setShowFormFieldsForBilletterie,
    setFormFields,
    setTicketTypes,

    // Visibility
    setVisibility,
    setAccessCode,

    // Step 4
    addSession,
    updateSession,
    removeSession,

    // AI
    handleAIGenerate,
    handleAIApply,
    handleOptimizeTitle,
    handleGenerateDescription,
    handleSuggestPricing,

    // Submit
    handleSubmit,
    resetForm,

    // Draft hydration
    hydrateForm,

    // Util
    formatDate,
  };
}
