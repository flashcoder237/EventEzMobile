import { useState, useEffect, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '../contexts/AuthContext';

import {
  eventsAPI,
  categoriesAPI,
  ticketTypesAPI,
  tagsAPI,
  sessionsAPI,
  aiAssistAPI,
  siteSettingsAPI,
} from '../api';
import { Category, LocationType, Tag, AIUsage, AIGeneratedEvent } from '../types';
import type { AlertType } from '../components/common/CustomAlert';
import { useOrganizerWallet } from './useOrganizerWallet';
import { useEventFormValidation } from './useEventFormValidation';
import { useEventFormSubmit } from './useEventFormSubmit';
import { displayCurrency } from '../lib/utils/priceFormatters';

// Re-export constants from dedicated file
export { STEPS, LOCATION_TYPES, FIELD_TYPES, SESSION_TYPES } from './useEventFormConstants';

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
  // resources : liste de {title, url} (backend Session.resources JSONField).
  // Format aligne sur ce que /sessions/ accepte directement (pas SessionResource
  // qui est un modele distinct avec download tracking).
  resources: SessionResourceForm[];
  tags: string[];
  level: string;
  language: string;
  // Reference locale (index de tracks[]/speakers[] cote form) → resolue au
  // submit en vraies UUIDs serveur. null = pas de track / pas de moderator.
  track_index: number | null;
  speaker_indices: number[];
  moderator_index: number | null;
}

export interface TrackForm {
  name: string;
  description: string;
  color: string;
}

export interface SpeakerForm {
  first_name: string;
  last_name: string;
  title: string;       // poste (CEO, Lead Designer, ...)
  company: string;
  bio: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
  twitter: string;     // handle sans @
  photo: string;       // URI local (file://...) → upload via PATCH au submit
}

export interface SessionResourceForm {
  title: string;
  url: string;
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
  // Langue de rédaction du contenu (code ISO 639-1). Pré-remplie depuis le
  // compte, modifiable parmi toutes les langues.
  language: string;
  categoryId: number | null;
  selectedTagIds: number[];
  customTags: string[];
  bannerImage: string | null;
  coverVideo: string | null; // chemin local (file://...) si nouveau, sinon URL serveur
  coverVideoUrl: string; // URL externe YouTube/Vimeo
  galleryImages: string[];

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
  feeBearer: 'participant' | 'organizer';
  ticketTypes: TicketTypeForm[];
  formFields: FormFieldForm[];
  showFormFieldsForBilletterie: boolean;

  // Visibility
  visibility: 'public' | 'unlisted' | 'invite_only';
  accessCode: string;

  // Step 4 - Sessions (avec entites agenda : tracks et speakers)
  tracks: TrackForm[];
  speakers: SpeakerForm[];
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

  // Step validation — populated quand goToNextStep échoue, lu par les Steps
  stepErrors: Record<string, string>;

  // Mode edition : true si on edite un event existant (vs create). Sert a relacher
  // certaines validations qui n'ont du sens qu'au create (ex: start_date dans le passe).
  isEditMode: boolean;
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
  form: EventFormState;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  goToStep: (step: number) => void;
  validateStep: (step: number) => boolean;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setShortDescription: (value: string) => void;
  setEventType: (value: 'billetterie' | 'inscription') => void;
  setLanguage: (value: string) => void;
  setCategoryId: (value: number | null) => void;
  setSelectedTagIds: (value: number[]) => void;
  handleCustomTagAdd: (tag: string) => void;
  handleCustomTagRemove: (tag: string) => void;
  pickImage: () => Promise<void>;
  setBannerImage: (value: string | null) => void;
  pickCoverVideo: () => Promise<void>;
  setCoverVideo: (value: string | null) => void;
  setCoverVideoUrl: (value: string) => void;
  pickGalleryImages: () => Promise<void>;
  removeGalleryImage: (index: number) => void;
  setVisibility: (value: 'public' | 'unlisted' | 'invite_only') => void;
  setAccessCode: (value: string) => void;
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
  setIsFree: (value: boolean) => void;
  setMaxParticipants: (value: string) => void;
  setAutoApproveRegistrations: (value: boolean) => void;
  setFeeBearer: (value: 'participant' | 'organizer') => void;
  addTicketType: () => void;
  updateTicketType: (index: number, field: string, value: any) => void;
  removeTicketType: (index: number) => void;
  addFormField: () => void;
  updateFormField: (index: number, field: string, value: any) => void;
  removeFormField: (index: number) => void;
  setShowFormFieldsForBilletterie: (value: boolean) => void;
  setFormFields: (value: FormFieldForm[]) => void;
  setTicketTypes: (value: TicketTypeForm[]) => void;
  addSession: () => void;
  updateSession: (index: number, field: string, value: any) => void;
  removeSession: (index: number) => void;
  addTrack: () => void;
  updateTrack: (index: number, field: string, value: any) => void;
  removeTrack: (index: number) => void;
  addSpeaker: () => void;
  updateSpeaker: (index: number, field: string, value: any) => void;
  removeSpeaker: (index: number) => void;
  handleAIGenerate: (prompt: string) => Promise<void>;
  handleAIApply: (data: AIGeneratedEvent) => void;
  handleOptimizeTitle: () => Promise<void>;
  handleGenerateDescription: () => Promise<void>;
  handleSuggestPricing: () => Promise<void>;
  handleSubmit: () => Promise<string | null>;
  resetForm: () => void;
  hydrateForm: (data: Partial<EventFormState>) => void;
  isEditMode: boolean;
  formatDate: (date: Date) => string;
}

// ============================================
// Image persistence helpers
// ============================================

const DRAFT_IMAGES_DIR = (FileSystem.documentDirectory ?? '') + 'event_draft_images/';

async function persistImageToDisk(uri: string): Promise<string> {
  try {
    await FileSystem.makeDirectoryAsync(DRAFT_IMAGES_DIR, { intermediates: true });
    const ext = uri.toLowerCase().includes('.png') ? 'png' : 'jpg';
    const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const dest = DRAFT_IMAGES_DIR + filename;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}

// ============================================
// Hook
// ============================================

export function useEventForm(alertActions: AlertActions, editEventId?: string): UseEventFormReturn {
  const { showAlert, showSuccess, showError } = alertActions;
  // Strategie "Event mono-devise" : la devise provient du wallet de l'organisateur
  // (l'event herite de wallet.currency a sa creation, docs/CURRENCY_STRATEGY.md).
  const { currency: walletCurrency } = useOrganizerWallet();
  const platformCurrency = displayCurrency(walletCurrency);

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
  const [language, setLanguage] = useState<string>('fr');
  const [categoryId, setCategoryId] = useState<number | null>(null);

  // Pré-remplir la langue de rédaction avec celle du compte (création seulement ;
  // en édition, hydrateForm charge la langue de l'événement). L'organisateur
  // peut la surcharger ; le backend respecte le choix explicite.
  const { user: _authUser } = useAuth();
  useEffect(() => {
    if (editEventId) return;
    const lang = (_authUser as any)?.language;
    if (lang === 'fr' || lang === 'en') setLanguage(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editEventId, _authUser]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [coverVideo, setCoverVideo] = useState<string | null>(null);
  const [coverVideoUrl, setCoverVideoUrl] = useState<string>('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  // Step 2 - Date & Location
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 3600000));
  const [registrationDeadline, setRegistrationDeadline] = useState<Date | null>(null);
  const [hasRegistrationDeadline, setHasRegistrationDeadline] = useState(false);
  const [locationType, setLocationType] = useState<LocationType>('in_person');
  const [locationName, setLocationName] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  // Vide par défaut : sera auto-rempli par le geocoding / MapPicker quand
  // l'utilisateur choisit un lieu. Évite d'imposer Cameroun à un orga
  // international qui crée un event sans toucher au pays.
  const [locationCountry, setLocationCountry] = useState('');
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
  const [feeBearer, setFeeBearer] = useState<'participant' | 'organizer'>('participant');
  const [ticketTypes, setTicketTypes] = useState<TicketTypeForm[]>([]);
  const [formFields, setFormFields] = useState<FormFieldForm[]>([]);
  const [showFormFieldsForBilletterie, setShowFormFieldsForBilletterie] = useState(false);

  // Visibility
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'invite_only'>('public');
  const [accessCode, setAccessCode] = useState('');

  // Step 4 - Sessions + agenda entities
  const [tracks, setTracks] = useState<TrackForm[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerForm[]>([]);
  const [sessions, setSessions] = useState<SessionForm[]>([]);

  // Step validation errors — populated when goToNextStep fails. Les
  // components Step1/2/3 lisent ce map pour appliquer un border rouge sur
  // les champs invalides. Reset à null à chaque édition de champ.
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

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
  // Compose form state object
  // ============================================

  const form: EventFormState = {
    currentStep, loading, title, description, shortDescription, eventType, language,
    categoryId, selectedTagIds, customTags, bannerImage, coverVideo, coverVideoUrl, galleryImages,
    startDate, endDate, registrationDeadline, hasRegistrationDeadline,
    locationType, locationName, locationCity, locationAddress, locationCountry,
    onlineUrl, onlinePlatform, onlineInstructions, onlineMeetingId, onlinePasscode,
    locationLatitude, locationLongitude, showMapPicker,
    isFree, maxParticipants, autoApproveRegistrations, feeBearer,
    ticketTypes, formFields, showFormFieldsForBilletterie,
    visibility, accessCode, sessions, tracks, speakers, categories, availableTags,
    aiEnabled, aiLoading, aiResult, aiError, aiUsage,
    aiTitleLoading, aiDescLoading, aiPricingLoading,
    stepErrors,
    isEditMode: !!editEventId,
  };

  // ============================================
  // Delegated: Validation & Submit
  // ============================================

  const validateStep = useEventFormValidation(form, showError);

  const handleSubmit = useEventFormSubmit(form, validateStep, showError, editEventId);

  // Wrap handleSubmit with loading state
  const handleSubmitWithLoading = useCallback(async (): Promise<string | null> => {
    setLoading(true);
    try {
      return await handleSubmit();
    } finally {
      setLoading(false);
    }
  }, [handleSubmit]);

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
      if (__DEV__) console.error('Erreur chargement catégories:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await tagsAPI.getTags();
      setAvailableTags(response.data.results || response.data || []);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement tags:', error);
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
        try { setAiResult(JSON.parse(data.text)); } catch { setAiError('Format de réponse inattendu'); }
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
    if (!title.trim()) { showError('Erreur', 'Veuillez d\'abord entrer un titre'); return; }
    setAiDescLoading(true);
    try {
      const categoryName = categories.find(c => c.id === categoryId)?.name || '';
      const res = await aiAssistAPI.description(title, '', eventType, categoryName, sessionId);
      const text = res.data.text || res.data.description || '';
      if (text) { setDescription(text); showSuccess('Succès', 'Description générée par l\'IA'); }
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
                  name: s.name, description: s.reasoning || '', price: String(s.price),
                  quantity_total: '100', sales_start: startDate,
                  sales_end: new Date(startDate.getTime() - 86400000),
                  is_visible: true, max_per_order: '10', min_per_order: '1',
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
    if (!customTags.includes(tag)) setCustomTags(prev => [...prev, tag]);
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
      allowsEditing: true, aspect: [16, 9], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          result.assets[0].uri, [{ resize: { width: 1920 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        setBannerImage(await persistImageToDisk(compressed.uri));
      } catch {
        setBannerImage(await persistImageToDisk(result.assets[0].uri));
      }
    }
  }, [showAlert]);

  const pickCoverVideo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission requise', "Veuillez autoriser l'acces a la galerie", undefined, 'warning');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      videoMaxDuration: 30,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      // Verifier la taille (max 20 MB)
      if (asset.fileSize && asset.fileSize > 20 * 1024 * 1024) {
        showAlert('Video trop lourde', 'La video doit faire moins de 20 Mo.', undefined, 'warning');
        return;
      }
      setCoverVideo(asset.uri);
      setCoverVideoUrl(''); // mutuellement exclusif avec URL externe
    }
  }, [showAlert]);

  const pickGalleryImages = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission requise', 'Veuillez autoriser l\'accès à la galerie', undefined, 'warning');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true, quality: 0.8, selectionLimit: 10,
    });
    if (!result.canceled && result.assets.length > 0) {
      const persistedUris = await Promise.all(result.assets.map(a => persistImageToDisk(a.uri)));
      setGalleryImages(prev => [...prev, ...persistedUris].slice(0, 10));
    }
  }, [showAlert]);

  const removeGalleryImage = useCallback((index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ============================================
  // Collection Helpers
  // ============================================

  const addTicketType = useCallback(() => {
    const salesStart = new Date(startDate);
    salesStart.setDate(salesStart.getDate() - 7);
    setTicketTypes(prev => [...prev, {
      name: '', description: '', price: '0', quantity_total: '100',
      sales_start: salesStart, sales_end: new Date(startDate),
      is_visible: true, max_per_order: '10', min_per_order: '1',
    }]);
  }, [startDate]);

  const updateTicketType = useCallback((index: number, field: string, value: any) => {
    setTicketTypes(prev => { const u = [...prev]; u[index] = { ...u[index], [field]: value }; return u; });
  }, []);

  const removeTicketType = useCallback((index: number) => {
    setTicketTypes(prev => prev.filter((_, i) => i !== index));
  }, []);

  const addFormField = useCallback(() => {
    setFormFields(prev => [...prev, {
      label: '', field_type: 'text', required: false,
      placeholder: '', help_text: '', options: '', order: prev.length,
    }]);
  }, []);

  const updateFormField = useCallback((index: number, field: string, value: any) => {
    setFormFields(prev => { const u = [...prev]; u[index] = { ...u[index], [field]: value }; return u; });
  }, []);

  const removeFormField = useCallback((index: number) => {
    setFormFields(prev => prev.filter((_, i) => i !== index));
  }, []);

  const addSession = useCallback(() => {
    setSessions(prev => [...prev, {
      title: '', description: '', session_type: 'talk',
      start_time: null, end_time: null, location: '', room: '',
      max_capacity: '', is_virtual: false, virtual_link: '',
      requires_registration: true, is_featured: false,
      slides_url: '', recording_url: '', resources: [], tags: [],
      level: 'all', language: 'fr',
      track_index: null, speaker_indices: [], moderator_index: null,
    }]);
  }, []);

  const updateSession = useCallback((index: number, field: string, value: any) => {
    setSessions(prev => { const u = [...prev]; u[index] = { ...u[index], [field]: value }; return u; });
  }, []);

  const removeSession = useCallback((index: number) => {
    setSessions(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ── Tracks ──
  const addTrack = useCallback(() => {
    setTracks(prev => [...prev, {
      name: '', description: '', color: '#4F46E5',
    }]);
  }, []);
  const updateTrack = useCallback((index: number, field: string, value: any) => {
    setTracks(prev => { const u = [...prev]; u[index] = { ...u[index], [field]: value }; return u; });
  }, []);
  const removeTrack = useCallback((index: number) => {
    // Quand on retire un track, on doit aussi reset track_index sur les
    // sessions qui le referencaient (sinon UUID dangling au submit).
    setTracks(prev => prev.filter((_, i) => i !== index));
    setSessions(prev => prev.map(s => {
      if (s.track_index === index) return { ...s, track_index: null };
      // Reindex : si le track supprime etait avant celui pointe, decremente.
      if (s.track_index !== null && s.track_index > index) {
        return { ...s, track_index: s.track_index - 1 };
      }
      return s;
    }));
  }, []);

  // ── Speakers ──
  const addSpeaker = useCallback(() => {
    setSpeakers(prev => [...prev, {
      first_name: '', last_name: '', title: '', company: '',
      bio: '', email: '', phone: '', website: '', linkedin: '', twitter: '',
      photo: '',
    }]);
  }, []);
  const updateSpeaker = useCallback((index: number, field: string, value: any) => {
    setSpeakers(prev => { const u = [...prev]; u[index] = { ...u[index], [field]: value }; return u; });
  }, []);
  const removeSpeaker = useCallback((index: number) => {
    // Idem : retirer les references dans toutes les sessions.
    setSpeakers(prev => prev.filter((_, i) => i !== index));
    setSessions(prev => prev.map(s => {
      const nextSpeakerIndices = s.speaker_indices
        .filter(i => i !== index)
        .map(i => (i > index ? i - 1 : i));
      let nextModeratorIndex: number | null = s.moderator_index;
      if (nextModeratorIndex === index) nextModeratorIndex = null;
      else if (nextModeratorIndex !== null && nextModeratorIndex > index) nextModeratorIndex -= 1;
      return { ...s, speaker_indices: nextSpeakerIndices, moderator_index: nextModeratorIndex };
    }));
  }, []);

  // ============================================
  // Step Navigation
  // ============================================

  const { STEPS } = require('./useEventFormConstants');

  const goToNextStep = useCallback(() => {
    const result = validateStep.withDetails(currentStep);
    if (result.valid) {
      setStepErrors({});
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    } else {
      setStepErrors(result.errors as Record<string, string>);
      // Toast pour la première erreur (UX existante préservée)
      const firstError = Object.values(result.errors)[0];
      if (firstError) showError('Erreur', firstError);
    }
  }, [currentStep, validateStep, showError]);

  const goToPrevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    if (step < currentStep || validateStep(currentStep)) setCurrentStep(step);
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
    if (data.language !== undefined) setLanguage(data.language);
    if (data.categoryId !== undefined) setCategoryId(data.categoryId);
    if (data.selectedTagIds !== undefined) setSelectedTagIds(data.selectedTagIds);
    if (data.customTags !== undefined) setCustomTags(data.customTags);
    if (data.bannerImage !== undefined) setBannerImage(data.bannerImage);
    if (data.coverVideo !== undefined) setCoverVideo(data.coverVideo);
    if (data.coverVideoUrl !== undefined) setCoverVideoUrl(data.coverVideoUrl);
    if (data.galleryImages !== undefined) setGalleryImages(data.galleryImages);
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
    if (data.feeBearer !== undefined) setFeeBearer(data.feeBearer);
    if (data.ticketTypes !== undefined) setTicketTypes(data.ticketTypes);
    if (data.formFields !== undefined) setFormFields(data.formFields);
    if (data.showFormFieldsForBilletterie !== undefined) setShowFormFieldsForBilletterie(data.showFormFieldsForBilletterie);
    if (data.visibility !== undefined) setVisibility(data.visibility);
    if (data.accessCode !== undefined) setAccessCode(data.accessCode);
    if (data.sessions !== undefined) {
      // Normalisation defensive : un draft AsyncStorage cree avant l'ajout
      // des champs track_index/speaker_indices/moderator_index/resources peut
      // ne pas les contenir. Sans defaut explicite, le rendu crash sur
      // `.includes()` ou `.length` d'undefined dans EventStep4Sessions.
      setSessions(data.sessions.map(s => ({
        ...s,
        track_index: s.track_index ?? null,
        speaker_indices: Array.isArray(s.speaker_indices) ? s.speaker_indices : [],
        moderator_index: s.moderator_index ?? null,
        resources: Array.isArray(s.resources) ? s.resources : [],
      })));
    }
    if (data.tracks !== undefined) setTracks(data.tracks);
    if (data.speakers !== undefined) setSpeakers(data.speakers);
  }, []);

  // Load event data for edit mode
  useEffect(() => {
    if (!editEventId) return;
    const loadEvent = async () => {
      setLoading(true);
      try {
        const response = await eventsAPI.getEvent(editEventId);
        const event = response.data;
        hydrateForm({
          title: event.title || '',
          description: event.description || '',
          shortDescription: event.short_description || '',
          eventType: event.event_type || 'billetterie',
          language: event.language || 'fr',
          categoryId: event.category
            ? (typeof event.category === 'object' ? event.category.id : event.category)
            : null,
          selectedTagIds: event.tags
            ? event.tags.map((t: any) => (typeof t === 'object' ? t.id : t))
            : [],
          startDate: event.start_date ? new Date(event.start_date) : new Date(),
          endDate: event.end_date ? new Date(event.end_date) : new Date(Date.now() + 3600000),
          registrationDeadline: event.registration_deadline ? new Date(event.registration_deadline) : null,
          hasRegistrationDeadline: !!event.registration_deadline,
          locationType: event.location_type || 'in_person',
          locationName: event.location_name || '',
          locationCity: event.location_city || '',
          locationAddress: event.location_address || '',
          locationCountry: event.location_country || '',
          locationLatitude: event.location_latitude ? String(event.location_latitude) : '',
          locationLongitude: event.location_longitude ? String(event.location_longitude) : '',
          onlineUrl: event.online_url || '',
          onlinePlatform: event.online_platform || '',
          onlineInstructions: event.online_instructions || '',
          onlineMeetingId: event.online_meeting_id || '',
          onlinePasscode: event.online_passcode || '',
          bannerImage: event.banner_image || null,
          coverVideo: event.cover_video || null,
          coverVideoUrl: event.cover_video_url || '',
          maxParticipants: event.max_participants ? String(event.max_participants) : '',
          autoApproveRegistrations: event.auto_approve_registrations ?? true,
          feeBearer: event.fee_bearer || 'participant',
          visibility: event.visibility || 'public',
          accessCode: event.access_code || '',
        });
      } catch (error) {
        if (__DEV__) console.error('[useEventForm] Error loading event for edit:', error);
        showError('Erreur', "Impossible de charger les données de l'événement");
      } finally {
        setLoading(false);
      }
    };
    loadEvent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editEventId]);

  // ============================================
  // Reset Form
  // ============================================

  const resetForm = useCallback(() => {
    setCurrentStep(1);
    setTitle(''); setDescription(''); setShortDescription('');
    setCategoryId(null); setSelectedTagIds([]); setCustomTags([]);
    setBannerImage(null);
    setCoverVideo(null); setCoverVideoUrl('');
    setStartDate(new Date()); setEndDate(new Date(Date.now() + 3600000));
    setRegistrationDeadline(null); setHasRegistrationDeadline(false);
    setLocationType('in_person');
    setLocationName(''); setLocationCity(''); setLocationAddress('');
    setLocationLatitude(''); setLocationLongitude('');
    setOnlineUrl(''); setOnlinePlatform(''); setOnlineInstructions('');
    setOnlineMeetingId(''); setOnlinePasscode('');
    setIsFree(false); setFeeBearer('participant'); setMaxParticipants('');
    setTicketTypes([]); setFormFields([]); setSessions([]);
    setTracks([]); setSpeakers([]);
    setShowFormFieldsForBilletterie(false);
  }, []);

  // ============================================
  // Utilities
  // ============================================

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
    });
  }, []);

  return {
    form,
    goToNextStep, goToPrevStep, goToStep, validateStep,
    setTitle, setDescription, setShortDescription, setEventType, setLanguage,
    setCategoryId, setSelectedTagIds, handleCustomTagAdd, handleCustomTagRemove,
    pickImage, setBannerImage, pickCoverVideo, setCoverVideo, setCoverVideoUrl, pickGalleryImages, removeGalleryImage,
    setVisibility, setAccessCode,
    setStartDate, setEndDate, setRegistrationDeadline, setHasRegistrationDeadline,
    setLocationType, setLocationName, setLocationCity, setLocationAddress, setLocationCountry,
    setOnlineUrl, setOnlinePlatform, setOnlineInstructions, setOnlineMeetingId, setOnlinePasscode,
    handleMapLocationSelect, setShowMapPicker,
    setIsFree, setMaxParticipants, setAutoApproveRegistrations, setFeeBearer,
    addTicketType, updateTicketType, removeTicketType,
    addFormField, updateFormField, removeFormField,
    setShowFormFieldsForBilletterie, setFormFields, setTicketTypes,
    addSession, updateSession, removeSession,
    addTrack, updateTrack, removeTrack,
    addSpeaker, updateSpeaker, removeSpeaker,
    handleAIGenerate, handleAIApply, handleOptimizeTitle, handleGenerateDescription, handleSuggestPricing,
    handleSubmit: handleSubmitWithLoading,
    resetForm, hydrateForm,
    isEditMode: !!editEventId,
    formatDate,
  };
}
