import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useAlert } from '../../contexts/AlertContext';
import DateTimePickerField from '../../components/ui/DateTimePickerField';
import DatePickerField from '../../components/ui/DatePickerField';
import { eventsAPI, categoriesAPI, ticketTypesAPI, tagsAPI, sessionsAPI, aiAssistAPI, siteSettingsAPI } from '../../api/client';
import { Category, RootStackParamList, LocationType, Tag, AIUsage, AIGeneratedEvent } from '../../types';
import TagInput from '../../components/common/TagInput';
import MapPickerModal from '../../components/common/MapPickerModal';
import AIQuickCreatePanel from '../../components/events/AIQuickCreatePanel';
import AIAssistButton from '../../components/events/AIAssistButton';
import AIUsageBadge from '../../components/events/AIUsageBadge';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const locationTypes: { value: LocationType; label: string; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
  { value: 'in_person', label: 'Présentiel', icon: 'location-outline', description: 'Événement physique' },
  { value: 'online', label: 'En ligne', icon: 'videocam-outline', description: 'Événement virtuel' },
  { value: 'hybrid', label: 'Hybride', icon: 'globe-outline', description: 'Physique + Virtuel' },
];

const steps = [
  { id: 1, title: 'Informations', icon: 'information-circle-outline' },
  { id: 2, title: 'Date & Lieu', icon: 'calendar-outline' },
  { id: 3, title: 'Tarification', icon: 'pricetag-outline' },
  { id: 4, title: 'Sessions', icon: 'layers-outline' },
];

export default function EventCreateScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { showAlert, showSuccess, showError } = useAlert();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [eventType, setEventType] = useState<'billetterie' | 'inscription'>('billetterie');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 3600000));
  const [registrationDeadline, setRegistrationDeadline] = useState<Date | null>(null);
  const [hasRegistrationDeadline, setHasRegistrationDeadline] = useState(false);

  // Location
  const [locationType, setLocationType] = useState<LocationType>('in_person');
  const [locationName, setLocationName] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationCountry, setLocationCountry] = useState('Cameroun');

  // Online
  const [onlineUrl, setOnlineUrl] = useState('');
  const [onlinePlatform, setOnlinePlatform] = useState('');
  const [onlineInstructions, setOnlineInstructions] = useState('');
  const [onlineMeetingId, setOnlineMeetingId] = useState('');
  const [onlinePasscode, setOnlinePasscode] = useState('');

  // GPS Coordinates
  const [locationLatitude, setLocationLatitude] = useState('');
  const [locationLongitude, setLocationLongitude] = useState('');

  // Pricing
  const [isFree, setIsFree] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [autoApproveRegistrations, setAutoApproveRegistrations] = useState(true);

  // Ticket Types (for billetterie)
  const [ticketTypes, setTicketTypes] = useState<Array<{
    name: string;
    description: string;
    price: string;
    quantity_total: string;
    sales_start: Date;
    sales_end: Date;
    is_visible: boolean;
    max_per_order: string;
    min_per_order: string;
  }>>([]);

  // Form Fields (for inscription)
  const [formFields, setFormFields] = useState<Array<{
    label: string;
    field_type: string;
    required: boolean;
    placeholder: string;
    help_text: string;
    options: string;
    order: number;
  }>>([]);


  // Form fields for billetterie (optional)
  const [showFormFieldsForBilletterie, setShowFormFieldsForBilletterie] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<Array<{
    title: string;
    description: string;
    session_type: string;
    start_time: Date | null;
    end_time: Date | null;
    location: string;
    max_capacity: string;
  }>>([]);

  // Banner Image
  const [bannerImage, setBannerImage] = useState<string | null>(null);

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

  const handleAIGenerate = async (prompt: string) => {
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const res = await aiAssistAPI.generate(prompt, sessionId);
      const data = res.data;
      // Parse the response - backend returns streaming text, but mobile gets full JSON
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
  };

  const handleAIApply = (data: AIGeneratedEvent) => {
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
  };

  const handleOptimizeTitle = async () => {
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
  };

  const handleGenerateDescription = async () => {
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
  };

  const handleSuggestPricing = async () => {
    setAiPricingLoading(true);
    try {
      const categoryName = categories.find(c => c.id === categoryId)?.name || '';
      const res = await aiAssistAPI.pricing(eventType, categoryName, locationCity, maxParticipants, description, sessionId);
      const suggestions = res.data.suggestions || res.data;
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        showAlert(
          'Suggestions de prix IA',
          suggestions.map((s: any) => `${s.name}: ${s.price} FCFA\n→ ${s.reasoning}`).join('\n\n'),
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
  };

  const handleCustomTagAdd = (tag: string) => {
    if (!customTags.includes(tag)) {
      setCustomTags([...customTags, tag]);
    }
  };

  const handleCustomTagRemove = (tag: string) => {
    setCustomTags(customTags.filter(t => t !== tag));
  };

  const handleMapLocationSelect = (location: {
    lat: number;
    lng: number;
    address?: string;
    city?: string;
    country?: string;
    locationName?: string;
  }) => {
    // Limiter à 6 décimales pour respecter la contrainte du backend
    setLocationLatitude(location.lat.toFixed(6));
    setLocationLongitude(location.lng.toFixed(6));
    if (location.locationName) setLocationName(location.locationName);
    if (location.address) setLocationAddress(location.address);
    if (location.city) setLocationCity(location.city);
    if (location.country) setLocationCountry(location.country);
  };

  const pickImage = async () => {
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
      setBannerImage(result.assets[0].uri);
    }
  };

  const validateStep = (step: number) => {
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
          // Validate each ticket type
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
          // Validate form fields if enabled for billetterie
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
          // inscription type
          if (formFields.length === 0) {
            showError('Erreur', 'Veuillez ajouter au moins un champ de formulaire');
            return false;
          }
          // Validate each form field
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
  };

  const goToNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const goToPrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
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

      // Tags - envoyer les noms des tags sélectionnés et personnalisés
      const allTags: string[] = [];
      // Ajouter les tags existants sélectionnés par nom
      selectedTagIds.forEach(tagId => {
        const tag = availableTags.find(t => t.id === tagId);
        if (tag) allTags.push(tag.name);
      });
      // Ajouter les tags personnalisés
      customTags.forEach(tag => allTags.push(tag));
      // Envoyer au backend
      allTags.forEach(tag => {
        formData.append('tags', tag);
      });

      // Date limite d'inscription
      if (hasRegistrationDeadline && registrationDeadline) {
        formData.append('registration_deadline', registrationDeadline.toISOString());
      }

      if (locationType === 'in_person' || locationType === 'hybrid') {
        formData.append('location_name', locationName);
        formData.append('location_city', locationCity);
        formData.append('location_address', locationAddress);

        // Coordonnées GPS
        if (locationLatitude && locationLongitude) {
          formData.append('location_latitude', locationLatitude);
          formData.append('location_longitude', locationLongitude);
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

      // Create form fields for inscription events OR billetterie events with form fields enabled
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

      // Create sessions if present
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
            max_capacity: session.max_capacity ? parseInt(session.max_capacity) : null,
          })
        ));
      }

      showAlert(
        'Succès',
        'Votre événement a été créé en tant que brouillon. Vous pouvez le modifier et le publier depuis Mes événements.',
        [
          {
            text: 'Voir mes événements',
            onPress: () => navigation.navigate('MyEvents'),
          },
          {
            text: 'Créer un autre',
            onPress: () => {
              // Reset form
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
            },
          },
        ],
        'success'
      );
    } catch (error: any) {
      console.error('Erreur création événement:', error);
      showError(
        'Erreur',
        error.response?.data?.message || error.response?.data?.detail || 'Impossible de créer l\'événement'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Session helpers
  const addSession = () => {
    setSessions([...sessions, {
      title: '',
      description: '',
      session_type: 'talk',
      start_time: null,
      end_time: null,
      location: '',
      max_capacity: '',
    }]);
  };

  const updateSession = (index: number, field: string, value: any) => {
    const updated = [...sessions];
    updated[index] = { ...updated[index], [field]: value };
    setSessions(updated);
  };

  const removeSession = (index: number) => {
    setSessions(sessions.filter((_, i) => i !== index));
  };

  // Ticket Type helpers
  const addTicketType = () => {
    const salesStart = new Date(startDate);
    salesStart.setDate(salesStart.getDate() - 7); // Default: 7 days before event
    setTicketTypes([...ticketTypes, {
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
  };

  const updateTicketType = (index: number, field: string, value: any) => {
    const updated = [...ticketTypes];
    updated[index] = { ...updated[index], [field]: value };
    setTicketTypes(updated);
  };

  const removeTicketType = (index: number) => {
    setTicketTypes(ticketTypes.filter((_, i) => i !== index));
  };

  // Form Field helpers
  const addFormField = () => {
    setFormFields([...formFields, {
      label: '',
      field_type: 'text',
      required: false,
      placeholder: '',
      help_text: '',
      options: '',
      order: formFields.length,
    }]);
  };

  const updateFormField = (index: number, field: string, value: any) => {
    const updated = [...formFields];
    updated[index] = { ...updated[index], [field]: value };
    setFormFields(updated);
  };

  const removeFormField = (index: number) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  const fieldTypes = [
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

  const sessionTypes = [
    { value: 'keynote', label: 'Keynote' },
    { value: 'talk', label: 'Présentation' },
    { value: 'panel', label: 'Panel' },
    { value: 'workshop', label: 'Atelier' },
    { value: 'networking', label: 'Networking' },
    { value: 'break', label: 'Pause' },
  ];

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Informations de base</Text>
      <Text style={styles.stepDescription}>Décrivez votre événement pour attirer les participants</Text>

      {/* AI Quick Create */}
      <AIQuickCreatePanel
        onGenerate={handleAIGenerate}
        onApply={handleAIApply}
        isLoading={aiLoading}
        result={aiResult}
        error={aiError}
        disabled={!aiUsage || (aiUsage.daily_limit > 0 && aiUsage.daily_count >= aiUsage.daily_limit)}
        aiEnabled={aiEnabled}
      />

      {/* Banner Image */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Image de couverture</Text>
        <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
          {bannerImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: bannerImage }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setBannerImage(null)}
              >
                <Ionicons name="close-circle" size={24} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePickerPlaceholder}>
              <Ionicons name="image-outline" size={40} color={Colors.gray400} />
              <Text style={styles.imagePickerText}>Ajouter une image (16:9)</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.label}>Titre de l'événement *</Text>
          {aiEnabled && (
            <AIAssistButton
              label="Optimiser"
              onPress={handleOptimizeTitle}
              isLoading={aiTitleLoading}
              disabled={!title.trim() || title.length < 5}
            />
          )}
        </View>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Ex: Concert de Jazz au Palais"
          placeholderTextColor={Colors.gray400}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description courte</Text>
        <TextInput
          style={styles.input}
          value={shortDescription}
          onChangeText={setShortDescription}
          placeholder="Résumé en quelques mots (max 150 caractères)"
          placeholderTextColor={Colors.gray400}
          maxLength={150}
        />
        <Text style={styles.charCount}>{shortDescription.length}/150</Text>
      </View>

      <View style={styles.inputGroup}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.label}>Description complète *</Text>
          {aiEnabled && (
            <AIAssistButton
              label="Générer"
              onPress={handleGenerateDescription}
              isLoading={aiDescLoading}
              disabled={!title.trim()}
            />
          )}
        </View>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Décrivez votre événement en détail..."
          placeholderTextColor={Colors.gray400}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Type d'événement *</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeOption, eventType === 'billetterie' && styles.typeOptionActive]}
            onPress={() => setEventType('billetterie')}
          >
            <Ionicons
              name="ticket-outline"
              size={20}
              color={eventType === 'billetterie' ? Colors.white : Colors.gray600}
            />
            <Text style={[styles.typeOptionText, eventType === 'billetterie' && styles.typeOptionTextActive]}>
              Billetterie
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeOption, eventType === 'inscription' && styles.typeOptionActive]}
            onPress={() => setEventType('inscription')}
          >
            <Ionicons
              name="create-outline"
              size={20}
              color={eventType === 'inscription' ? Colors.white : Colors.gray600}
            />
            <Text style={[styles.typeOptionText, eventType === 'inscription' && styles.typeOptionTextActive]}>
              Inscription
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Catégorie *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoriesContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, categoryId === cat.id && styles.categoryChipActive]}
                onPress={() => setCategoryId(cat.id)}
              >
                <Text style={[styles.categoryChipText, categoryId === cat.id && styles.categoryChipTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Tags</Text>
        <Text style={styles.inputHint}>
          Ajoutez des mots-clés pour aider les participants à trouver votre événement
        </Text>
        <View style={{ marginTop: Spacing.sm }}>
          <TagInput
            existingTags={availableTags}
            selectedTagIds={selectedTagIds}
            customTags={customTags}
            onTagsChange={setSelectedTagIds}
            onCustomTagAdd={handleCustomTagAdd}
            onCustomTagRemove={handleCustomTagRemove}
          />
        </View>
      </View>

      {/* Featured Event Info */}
      <View style={styles.warningInfoBox}>
        <Ionicons name="star-outline" size={20} color={Colors.warningDark} />
        <Text style={styles.warningInfoBoxText}>
          Vous pourrez demander la mise en avant de votre événement après sa création depuis "Mes événements".
        </Text>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Date et Lieu</Text>
      <Text style={styles.stepDescription}>Quand et où se déroulera votre événement ?</Text>

      {/* Dates */}
      <DateTimePickerField
        label="Date de début *"
        value={startDate}
        onChange={(date) => {
          setStartDate(date);
          if (date > endDate) {
            setEndDate(new Date(date.getTime() + 3600000));
          }
        }}
      />

      <DateTimePickerField
        label="Date de fin *"
        value={endDate}
        onChange={(date) => setEndDate(date)}
        minimumDate={startDate}
      />

      {/* Registration Deadline */}
      <View style={styles.switchRow}>
        <View style={styles.switchContent}>
          <Text style={styles.switchLabel}>Date limite d'inscription</Text>
          <Text style={styles.switchDescription}>Definir une date limite pour s'inscrire</Text>
        </View>
        <Switch
          value={hasRegistrationDeadline}
          onValueChange={(value) => {
            setHasRegistrationDeadline(value);
            if (value && !registrationDeadline) {
              // Par defaut, la veille de l'evenement
              const deadline = new Date(startDate);
              deadline.setDate(deadline.getDate() - 1);
              setRegistrationDeadline(deadline);
            }
          }}
          trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
          thumbColor={hasRegistrationDeadline ? Colors.primary : Colors.gray400}
        />
      </View>

      {hasRegistrationDeadline && (
        <DatePickerField
          label="Date limite"
          value={registrationDeadline || undefined}
          onChange={(date) => setRegistrationDeadline(date)}
          maximumDate={startDate}
          placeholder="Sélectionner une date"
        />
      )}

      {/* Location Type */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Type de lieu *</Text>
        <View style={styles.locationTypeSelector}>
          {locationTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[styles.locationTypeOption, locationType === type.value && styles.locationTypeOptionActive]}
              onPress={() => setLocationType(type.value)}
            >
              <Ionicons
                name={type.icon}
                size={24}
                color={locationType === type.value ? Colors.primary : Colors.gray500}
              />
              <Text style={[styles.locationTypeLabel, locationType === type.value && styles.locationTypeLabelActive]}>
                {type.label}
              </Text>
              <Text style={styles.locationTypeDesc}>{type.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Physical Location Fields */}
      {(locationType === 'in_person' || locationType === 'hybrid') && (
        <View style={styles.locationFields}>
          <Text style={styles.subSectionTitle}>Lieu physique</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom du lieu</Text>
            <TextInput
              style={styles.input}
              value={locationName}
              onChangeText={setLocationName}
              placeholder="Ex: Palais des Congrès"
              placeholderTextColor={Colors.gray400}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ville *</Text>
            <TextInput
              style={styles.input}
              value={locationCity}
              onChangeText={setLocationCity}
              placeholder="Ex: Douala"
              placeholderTextColor={Colors.gray400}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse</Text>
            <TextInput
              style={styles.input}
              value={locationAddress}
              onChangeText={setLocationAddress}
              placeholder="Adresse complète"
              placeholderTextColor={Colors.gray400}
            />
          </View>

          {/* Map Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Emplacement sur la carte</Text>
            <TouchableOpacity
              style={styles.mapPickerButton}
              onPress={() => setShowMapPicker(true)}
            >
              <Ionicons name="map-outline" size={20} color={Colors.primary} />
              <Text style={styles.mapPickerButtonText}>
                {locationLatitude && locationLongitude
                  ? 'Modifier l\'emplacement sur la carte'
                  : 'Choisir sur la carte'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.gray400} />
            </TouchableOpacity>

            {/* Display selected coordinates */}
            {locationLatitude && locationLongitude && (
              <View style={styles.selectedCoordsContainer}>
                <Ionicons name="location" size={16} color={Colors.success} />
                <Text style={styles.selectedCoordsText}>
                  {locationLatitude}, {locationLongitude}
                </Text>
              </View>
            )}

            <Text style={styles.inputHint}>
              Pour afficher l'événement sur la carte et permettre la navigation
            </Text>
          </View>
        </View>
      )}

      {/* Online Location Fields */}
      {(locationType === 'online' || locationType === 'hybrid') && (
        <View style={styles.locationFields}>
          <Text style={styles.subSectionTitle}>Lieu virtuel</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Plateforme</Text>
            <TextInput
              style={styles.input}
              value={onlinePlatform}
              onChangeText={setOnlinePlatform}
              placeholder="Ex: Zoom, Google Meet, Teams"
              placeholderTextColor={Colors.gray400}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Lien de connexion</Text>
            <TextInput
              style={styles.input}
              value={onlineUrl}
              onChangeText={setOnlineUrl}
              placeholder="https://..."
              placeholderTextColor={Colors.gray400}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ID de réunion</Text>
            <TextInput
              style={styles.input}
              value={onlineMeetingId}
              onChangeText={setOnlineMeetingId}
              placeholder="Ex: 123 456 7890"
              placeholderTextColor={Colors.gray400}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Code d'accès</Text>
            <TextInput
              style={styles.input}
              value={onlinePasscode}
              onChangeText={setOnlinePasscode}
              placeholder="Ex: abc123"
              placeholderTextColor={Colors.gray400}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Instructions de connexion</Text>
            <TextInput
              style={[styles.input, styles.textAreaSmall]}
              value={onlineInstructions}
              onChangeText={setOnlineInstructions}
              placeholder="Instructions pour rejoindre l'événement..."
              placeholderTextColor={Colors.gray400}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>
      )}
    </View>
  );

  // Helper to render form fields section (used by both billetterie and inscription)
  const renderFormFieldsSection = (isOptional: boolean = false) => (
    <>
      {formFields.length === 0 ? (
        <View style={styles.emptySessionsContainer}>
          <View style={styles.emptySessionsIcon}>
            <Ionicons name="document-text-outline" size={40} color={Colors.gray400} />
          </View>
          <Text style={styles.emptySessionsTitle}>
            {isOptional ? 'Aucun champ supplémentaire' : 'Aucun champ'}
          </Text>
          <Text style={styles.emptySessionsText}>
            {isOptional
              ? 'Ajoutez des champs pour collecter des informations supplémentaires lors de l\'achat'
              : 'Ajoutez des champs pour collecter les informations des participants'}
          </Text>
          <TouchableOpacity style={styles.addSessionButton} onPress={addFormField}>
            <Ionicons name="add" size={20} color={Colors.white} />
            <Text style={styles.addSessionButtonText}>Ajouter un champ</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {formFields.map((field, index) => (
            <View key={index} style={styles.sessionCard}>
              <View style={styles.sessionCardHeader}>
                <Text style={styles.sessionCardTitle}>Champ {index + 1}</Text>
                <TouchableOpacity onPress={() => removeFormField(index)}>
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Intitulé *</Text>
                <TextInput
                  style={styles.input}
                  value={field.label}
                  onChangeText={(value) => updateFormField(index, 'label', value)}
                  placeholder="Ex: Nom complet, Entreprise, Poste"
                  placeholderTextColor={Colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Type de champ</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.sessionTypesContainer}>
                    {fieldTypes.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.sessionTypeChip,
                          field.field_type === type.value && styles.sessionTypeChipActive,
                        ]}
                        onPress={() => updateFormField(index, 'field_type', type.value)}
                      >
                        <Text
                          style={[
                            styles.sessionTypeChipText,
                            field.field_type === type.value && styles.sessionTypeChipTextActive,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Placeholder</Text>
                <TextInput
                  style={styles.input}
                  value={field.placeholder}
                  onChangeText={(value) => updateFormField(index, 'placeholder', value)}
                  placeholder="Texte d'aide dans le champ"
                  placeholderTextColor={Colors.gray400}
                />
              </View>

              {['select', 'checkbox', 'radio'].includes(field.field_type) && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Options (séparées par des virgules) *</Text>
                  <TextInput
                    style={styles.input}
                    value={field.options}
                    onChangeText={(value) => updateFormField(index, 'options', value)}
                    placeholder="Ex: Option 1, Option 2, Option 3"
                    placeholderTextColor={Colors.gray400}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Texte d'aide</Text>
                <TextInput
                  style={styles.input}
                  value={field.help_text}
                  onChangeText={(value) => updateFormField(index, 'help_text', value)}
                  placeholder="Instructions supplémentaires"
                  placeholderTextColor={Colors.gray400}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchContent}>
                  <Text style={styles.switchLabel}>Obligatoire</Text>
                  <Text style={styles.switchDescription}>Ce champ doit être rempli</Text>
                </View>
                <Switch
                  value={field.required}
                  onValueChange={(value) => updateFormField(index, 'required', value)}
                  trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
                  thumbColor={field.required ? Colors.primary : Colors.gray400}
                />
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addAnotherSessionButton} onPress={addFormField}>
            <Ionicons name="add" size={20} color={Colors.primary} />
            <Text style={styles.addAnotherSessionText}>Ajouter un autre champ</Text>
          </TouchableOpacity>
        </>
      )}
    </>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>
        {eventType === 'billetterie' ? 'Billetterie' : 'Formulaire d\'inscription'}
      </Text>
      <Text style={styles.stepDescription}>
        {eventType === 'billetterie'
          ? 'Créez les différents types de billets pour votre événement'
          : 'Définissez les champs du formulaire d\'inscription'}
      </Text>

      {aiEnabled && eventType === 'billetterie' && (
        <AIAssistButton
          label="Suggérer des prix avec l'IA"
          onPress={handleSuggestPricing}
          isLoading={aiPricingLoading}
          variant="full"
        />
      )}

      {eventType === 'billetterie' ? (
        // BILLETTERIE - Ticket Types + Optional Form Fields
        <>
          <View style={styles.switchRow}>
            <View style={styles.switchContent}>
              <Text style={styles.switchLabel}>Événement gratuit</Text>
              <Text style={styles.switchDescription}>Aucun billet payant ne sera proposé</Text>
            </View>
            <Switch
              value={isFree}
              onValueChange={(value) => {
                setIsFree(value);
                if (value && ticketTypes.length === 0) {
                  // Add a free ticket by default
                  addTicketType();
                  setTimeout(() => {
                    updateTicketType(0, 'name', 'Entrée gratuite');
                    updateTicketType(0, 'price', '0');
                  }, 100);
                }
              }}
              trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
              thumbColor={isFree ? Colors.primary : Colors.gray400}
            />
          </View>

          {/* Ticket Types Section */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="ticket-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.sectionHeaderTitle}>Types de billets</Text>
          </View>

          {ticketTypes.length === 0 ? (
            <View style={styles.emptySessionsContainer}>
              <View style={styles.emptySessionsIcon}>
                <Ionicons name="ticket-outline" size={40} color={Colors.gray400} />
              </View>
              <Text style={styles.emptySessionsTitle}>Aucun type de billet</Text>
              <Text style={styles.emptySessionsText}>
                Créez au moins un type de billet pour votre événement
              </Text>
              <TouchableOpacity style={styles.addSessionButton} onPress={addTicketType}>
                <Ionicons name="add" size={20} color={Colors.white} />
                <Text style={styles.addSessionButtonText}>Ajouter un billet</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {ticketTypes.map((ticket, index) => (
                <View key={index} style={styles.sessionCard}>
                  <View style={styles.sessionCardHeader}>
                    <Text style={styles.sessionCardTitle}>Billet {index + 1}</Text>
                    <TouchableOpacity onPress={() => removeTicketType(index)}>
                      <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nom du billet *</Text>
                    <TextInput
                      style={styles.input}
                      value={ticket.name}
                      onChangeText={(value) => updateTicketType(index, 'name', value)}
                      placeholder="Ex: Standard, VIP, Early Bird"
                      placeholderTextColor={Colors.gray400}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.textAreaSmall]}
                      value={ticket.description}
                      onChangeText={(value) => updateTicketType(index, 'description', value)}
                      placeholder="Décrivez ce que ce billet inclut"
                      placeholderTextColor={Colors.gray400}
                      multiline
                      numberOfLines={2}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Prix (FCFA) *</Text>
                      <TextInput
                        style={styles.input}
                        value={ticket.price}
                        onChangeText={(value) => updateTicketType(index, 'price', value)}
                        placeholder="0"
                        placeholderTextColor={Colors.gray400}
                        keyboardType="numeric"
                        editable={!isFree}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Quantité *</Text>
                      <TextInput
                        style={styles.input}
                        value={ticket.quantity_total}
                        onChangeText={(value) => updateTicketType(index, 'quantity_total', value)}
                        placeholder="100"
                        placeholderTextColor={Colors.gray400}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Min/commande</Text>
                      <TextInput
                        style={styles.input}
                        value={ticket.min_per_order}
                        onChangeText={(value) => updateTicketType(index, 'min_per_order', value)}
                        placeholder="1"
                        placeholderTextColor={Colors.gray400}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Max/commande</Text>
                      <TextInput
                        style={styles.input}
                        value={ticket.max_per_order}
                        onChangeText={(value) => updateTicketType(index, 'max_per_order', value)}
                        placeholder="10"
                        placeholderTextColor={Colors.gray400}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <DateTimePickerField
                    label="Début des ventes"
                    value={ticket.sales_start}
                    onChange={(date) => updateTicketType(index, 'sales_start', date)}
                  />

                  <DateTimePickerField
                    label="Fin des ventes"
                    value={ticket.sales_end}
                    onChange={(date) => updateTicketType(index, 'sales_end', date)}
                    minimumDate={ticket.sales_start}
                    maximumDate={startDate}
                  />

                  <View style={styles.switchRow}>
                    <View style={styles.switchContent}>
                      <Text style={styles.switchLabel}>Visible</Text>
                      <Text style={styles.switchDescription}>Afficher ce billet publiquement</Text>
                    </View>
                    <Switch
                      value={ticket.is_visible}
                      onValueChange={(value) => updateTicketType(index, 'is_visible', value)}
                      trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
                      thumbColor={ticket.is_visible ? Colors.primary : Colors.gray400}
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.addAnotherSessionButton} onPress={addTicketType}>
                <Ionicons name="add" size={20} color={Colors.primary} />
                <Text style={styles.addAnotherSessionText}>Ajouter un autre billet</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Optional Form Fields Section for Billetterie */}
          <View style={[styles.sectionDivider, { marginTop: Spacing.xl }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: Colors.warningLight }]}>
                <Ionicons name="document-text-outline" size={20} color={Colors.secondary || '#D97706'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionHeaderTitle}>Formulaire d'inscription (optionnel)</Text>
                <Text style={styles.sectionHeaderDescription}>
                  Collectez des informations supplémentaires lors de l'achat
                </Text>
              </View>
              <Switch
                value={showFormFieldsForBilletterie}
                onValueChange={(value) => {
                  setShowFormFieldsForBilletterie(value);
                  if (!value) {
                    // Clear form fields when disabled
                    setFormFields([]);
                  }
                }}
                trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
                thumbColor={showFormFieldsForBilletterie ? Colors.primary : Colors.gray400}
              />
            </View>

            {showFormFieldsForBilletterie && (
              <View style={{ marginTop: Spacing.md }}>
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
                  <Text style={styles.infoBoxText}>
                    Ces champs seront affichés lors de l'achat de billets pour collecter des informations sur les participants (allergies, taille de t-shirt, etc.)
                  </Text>
                </View>
                {renderFormFieldsSection(true)}
              </View>
            )}
          </View>
        </>
      ) : (
        // INSCRIPTION - Form Fields Only
        <>
          {renderFormFieldsSection(false)}
        </>
      )}

      {/* Common settings */}
      <View style={{ marginTop: Spacing.lg, paddingTop: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.gray100 }}>
        <Text style={styles.subSectionTitle}>Paramètres généraux</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nombre maximum de participants</Text>
          <TextInput
            style={styles.input}
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            placeholder="Laisser vide pour illimité"
            placeholderTextColor={Colors.gray400}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchContent}>
            <Text style={styles.switchLabel}>Approbation automatique</Text>
            <Text style={styles.switchDescription}>Les inscriptions sont confirmées automatiquement</Text>
          </View>
          <Switch
            value={autoApproveRegistrations}
            onValueChange={setAutoApproveRegistrations}
            trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
            thumbColor={autoApproveRegistrations ? Colors.primary : Colors.gray400}
          />
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Récapitulatif</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Titre</Text>
          <Text style={styles.summaryValue} numberOfLines={1}>{title || '-'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Type</Text>
          <Text style={styles.summaryValue}>{eventType === 'billetterie' ? 'Billetterie' : 'Inscription'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Date</Text>
          <Text style={styles.summaryValue}>{formatDate(startDate)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Lieu</Text>
          <Text style={styles.summaryValue}>
            {locationType === 'online' ? 'En ligne' : locationType === 'hybrid' ? 'Hybride' : locationCity || '-'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            {eventType === 'billetterie' ? 'Billets' : 'Champs'}
          </Text>
          <Text style={[styles.summaryValue, { color: Colors.primary }]}>
            {eventType === 'billetterie'
              ? (isFree ? 'Gratuit' : `${ticketTypes.length} type(s)`)
              : `${formFields.length} champ(s)`}
          </Text>
        </View>
        {eventType === 'billetterie' && showFormFieldsForBilletterie && formFields.length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Champs d'inscription</Text>
            <Text style={[styles.summaryValue, { color: Colors.secondary || '#D97706' }]}>
              {formFields.length} champ(s)
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Sessions (optionnel)</Text>
      <Text style={styles.stepDescription}>Ajoutez des sessions à votre événement</Text>

      {/* Info box */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
        <Text style={styles.infoBoxText}>
          Cette étape est optionnelle. Vous pouvez ajouter des sessions plus tard depuis votre tableau de bord.
        </Text>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.emptySessionsContainer}>
          <View style={styles.emptySessionsIcon}>
            <Ionicons name="layers-outline" size={40} color={Colors.gray400} />
          </View>
          <Text style={styles.emptySessionsTitle}>Aucune session</Text>
          <Text style={styles.emptySessionsText}>
            Cliquez sur "Ajouter une session" pour commencer
          </Text>
          <TouchableOpacity style={styles.addSessionButton} onPress={addSession}>
            <Ionicons name="add" size={20} color={Colors.white} />
            <Text style={styles.addSessionButtonText}>Ajouter une session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {sessions.map((session, index) => (
            <View key={index} style={styles.sessionCard}>
              <View style={styles.sessionCardHeader}>
                <Text style={styles.sessionCardTitle}>Session {index + 1}</Text>
                <TouchableOpacity onPress={() => removeSession(index)}>
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Titre de la session *</Text>
                <TextInput
                  style={styles.input}
                  value={session.title}
                  onChangeText={(value) => updateSession(index, 'title', value)}
                  placeholder="Ex: Conférence inaugurale"
                  placeholderTextColor={Colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Type de session</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.sessionTypesContainer}>
                    {sessionTypes.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.sessionTypeChip,
                          session.session_type === type.value && styles.sessionTypeChipActive,
                        ]}
                        onPress={() => updateSession(index, 'session_type', type.value)}
                      >
                        <Text
                          style={[
                            styles.sessionTypeChipText,
                            session.session_type === type.value && styles.sessionTypeChipTextActive,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Lieu/Salle</Text>
                <TextInput
                  style={styles.input}
                  value={session.location}
                  onChangeText={(value) => updateSession(index, 'location', value)}
                  placeholder="Ex: Salle A, Amphithéâtre"
                  placeholderTextColor={Colors.gray400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textAreaSmall]}
                  value={session.description}
                  onChangeText={(value) => updateSession(index, 'description', value)}
                  placeholder="Décrivez le contenu de cette session"
                  placeholderTextColor={Colors.gray400}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Capacité maximale</Text>
                <TextInput
                  style={styles.input}
                  value={session.max_capacity}
                  onChangeText={(value) => updateSession(index, 'max_capacity', value)}
                  placeholder="Ex: 100"
                  placeholderTextColor={Colors.gray400}
                  keyboardType="numeric"
                />
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addAnotherSessionButton} onPress={addSession}>
            <Ionicons name="add" size={20} color={Colors.primary} />
            <Text style={styles.addAnotherSessionText}>Ajouter une autre session</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.keyboardView}>
        {/* Header with back button */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.gray900} />
          </TouchableOpacity>
          <Text style={styles.headerBarTitle}>Créer un événement</Text>
          {aiEnabled ? <AIUsageBadge usage={aiUsage} /> : <View style={{ width: 40 }} />}
        </View>

        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <TouchableOpacity
                style={[
                  styles.stepIndicator,
                  currentStep >= step.id && styles.stepIndicatorActive,
                  currentStep === step.id && styles.stepIndicatorCurrent,
                ]}
                onPress={() => {
                  if (step.id < currentStep || validateStep(currentStep)) {
                    setCurrentStep(step.id);
                  }
                }}
              >
                <Ionicons
                  name={step.icon as any}
                  size={18}
                  color={currentStep >= step.id ? Colors.white : Colors.gray400}
                />
              </TouchableOpacity>
              {index < steps.length - 1 && (
                <View style={[styles.stepLine, currentStep > step.id && styles.stepLineActive]} />
              )}
            </React.Fragment>
          ))}
        </View>

        <KeyboardAwareScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bottomOffset={80}
        >
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </KeyboardAwareScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.prevButton} onPress={goToPrevStep}>
              <Ionicons name="arrow-back" size={20} color={Colors.gray600} />
              <Text style={styles.prevButtonText}>Précédent</Text>
            </TouchableOpacity>
          )}

          {currentStep < steps.length ? (
            <TouchableOpacity
              style={[styles.nextButton, currentStep === 1 && { flex: 1 }]}
              onPress={goToNextStep}
            >
              <Text style={styles.nextButtonText}>Suivant</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              )}
              <Text style={styles.submitButtonText}>
                {loading ? 'Création...' : 'Créer l\'événement'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Map Picker Modal */}
      <MapPickerModal
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onLocationSelect={handleMapLocationSelect}
        initialLat={locationLatitude ? parseFloat(locationLatitude) : undefined}
        initialLng={locationLongitude ? parseFloat(locationLongitude) : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    backgroundColor: Colors.white,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBarTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    color: Colors.gray900,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  stepIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicatorActive: {
    backgroundColor: Colors.primary,
  },
  stepIndicatorCurrent: {
    backgroundColor: Colors.primary,
    transform: [{ scale: 1.1 }],
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.gray200,
    marginHorizontal: Spacing.sm,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  stepContent: {
    padding: Spacing.lg,
  },
  stepTitle: {
    ...TextStyles.h3,
    marginBottom: Spacing.xs,
  },
  stepDescription: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...TextStyles.label,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.gray900,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  textArea: {
    minHeight: 120,
    paddingTop: Spacing.md,
  },
  textAreaSmall: {
    minHeight: 80,
    paddingTop: Spacing.md,
  },
  charCount: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  inputHint: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginTop: Spacing.xs,
  },
  imagePickerButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.gray200,
    borderStyle: 'dashed',
  },
  imagePickerPlaceholder: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray50,
  },
  imagePickerText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.sm,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 160,
  },
  removeImageButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  typeOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeOptionText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  typeOptionTextActive: {
    color: Colors.white,
  },
  categoriesContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  categoryChipActive: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  categoryChipTextActive: {
    color: Colors.primary,
    fontFamily: FontFamily.medium,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  dateButtonText: {
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  locationTypeSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  locationTypeOption: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  locationTypeOptionActive: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primary,
  },
  locationTypeLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
    marginTop: Spacing.xs,
  },
  locationTypeLabelActive: {
    color: Colors.primary,
  },
  locationTypeDesc: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    textAlign: 'center',
    marginTop: 2,
  },
  locationFields: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  subSectionTitle: {
    ...TextStyles.bodyBold,
    color: Colors.gray800,
    marginBottom: Spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  switchContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  switchLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  switchDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  summaryTitle: {
    ...TextStyles.bodyBold,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  summaryLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  summaryValue: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray900,
    maxWidth: '60%',
    textAlign: 'right',
  },
  navigationButtons: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    backgroundColor: Colors.white,
  },
  prevButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray100,
    gap: Spacing.sm,
  },
  prevButtonText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.base,
    color: Colors.gray600,
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    gap: Spacing.sm,
  },
  nextButtonText: {
    ...TextStyles.button,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.success,
    gap: Spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...TextStyles.button,
  },
  // Sessions Step Styles
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  infoBoxText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    lineHeight: 20,
  },
  warningInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  warningInfoBoxText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.warningDark,
    lineHeight: 20,
  },
  emptySessionsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.gray200,
  },
  emptySessionsIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptySessionsTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
  },
  emptySessionsText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginBottom: Spacing.lg,
  },
  addSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  addSessionButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.white,
  },
  sessionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  sessionCardTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  sessionTypesContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  sessionTypeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  sessionTypeChipActive: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primary,
  },
  sessionTypeChipText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  sessionTypeChipTextActive: {
    color: Colors.primary,
    fontFamily: FontFamily.medium,
  },
  addAnotherSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.gray200,
    backgroundColor: Colors.gray50,
    gap: Spacing.sm,
  },
  addAnotherSessionText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.base,
    color: Colors.primary,
  },
  mapPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    gap: Spacing.sm,
  },
  mapPickerButtonText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.base,
    color: Colors.primary,
  },
  selectedCoordsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.md,
  },
  selectedCoordsText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.successDark,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  sectionHeaderDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
  sectionDivider: {
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
  },
});
