import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

import { eventsAPI, categoriesAPI } from '../../api/client';
import { Category, RootStackParamList, LocationType } from '../../types';
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

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [eventType, setEventType] = useState<'billetterie' | 'inscription'>('billetterie');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 3600000));

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

  // Pricing
  const [isFree, setIsFree] = useState(false);
  const [basePrice, setBasePrice] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [autoApproveRegistrations, setAutoApproveRegistrations] = useState(true);

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
  const [showSessionStartPicker, setShowSessionStartPicker] = useState<number | null>(null);
  const [showSessionEndPicker, setShowSessionEndPicker] = useState<number | null>(null);
  const [sessionPickerMode, setSessionPickerMode] = useState<'date' | 'time'>('date');

  // Banner Image
  const [bannerImage, setBannerImage] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.data.results || response.data || []);
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie');
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
          Alert.alert('Erreur', 'Le titre est requis');
          return false;
        }
        if (!description.trim()) {
          Alert.alert('Erreur', 'La description est requise');
          return false;
        }
        if (!categoryId) {
          Alert.alert('Erreur', 'Veuillez sélectionner une catégorie');
          return false;
        }
        return true;
      case 2:
        if (endDate <= startDate) {
          Alert.alert('Erreur', 'La date de fin doit être après la date de début');
          return false;
        }
        if (locationType === 'in_person' || locationType === 'hybrid') {
          if (!locationCity.trim()) {
            Alert.alert('Erreur', 'La ville est requise pour un événement présentiel');
            return false;
          }
        }
        if (locationType === 'online' || locationType === 'hybrid') {
          if (!onlineUrl.trim() && !onlinePlatform.trim()) {
            Alert.alert('Erreur', 'Veuillez indiquer une URL ou une plateforme pour l\'événement en ligne');
            return false;
          }
        }
        return true;
      case 3:
        if (!isFree && !basePrice) {
          Alert.alert('Erreur', 'Veuillez indiquer un prix ou marquer l\'événement comme gratuit');
          return false;
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

      if (locationType === 'in_person' || locationType === 'hybrid') {
        formData.append('location_name', locationName);
        formData.append('location_city', locationCity);
        formData.append('location_address', locationAddress);
      }

      if (locationType === 'online' || locationType === 'hybrid') {
        formData.append('online_url', onlineUrl);
        formData.append('online_platform', onlinePlatform);
        formData.append('online_instructions', onlineInstructions);
      }

      formData.append('is_free', String(isFree));
      formData.append('base_price', String(isFree ? 0 : parseFloat(basePrice || '0')));
      if (maxCapacity) {
        formData.append('max_capacity', maxCapacity);
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

      Alert.alert(
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
              setBannerImage(null);
              setStartDate(new Date());
              setEndDate(new Date(Date.now() + 3600000));
              setLocationType('in_person');
              setLocationName('');
              setLocationCity('');
              setLocationAddress('');
              setOnlineUrl('');
              setOnlinePlatform('');
              setIsFree(false);
              setBasePrice('');
              setMaxCapacity('');
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Erreur création événement:', error);
      Alert.alert(
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
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
        <Text style={styles.label}>Titre de l'événement *</Text>
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
        <Text style={styles.label}>Description complète *</Text>
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
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Date et Lieu</Text>
      <Text style={styles.stepDescription}>Quand et où se déroulera votre événement ?</Text>

      {/* Dates */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Date de début *</Text>
        <View style={styles.dateTimeRow}>
          <TouchableOpacity
            style={[styles.dateButton, { flex: 2 }]}
            onPress={() => { setPickerMode('date'); setShowStartPicker(true); }}
          >
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dateButton, { flex: 1 }]}
            onPress={() => { setPickerMode('time'); setShowStartPicker(true); }}
          >
            <Ionicons name="time-outline" size={18} color={Colors.primary} />
            <Text style={styles.dateButtonText}>{formatTime(startDate)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Date de fin *</Text>
        <View style={styles.dateTimeRow}>
          <TouchableOpacity
            style={[styles.dateButton, { flex: 2 }]}
            onPress={() => { setPickerMode('date'); setShowEndPicker(true); }}
          >
            <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
            <Text style={styles.dateButtonText}>{formatDate(endDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dateButton, { flex: 1 }]}
            onPress={() => { setPickerMode('time'); setShowEndPicker(true); }}
          >
            <Ionicons name="time-outline" size={18} color={Colors.primary} />
            <Text style={styles.dateButtonText}>{formatTime(endDate)}</Text>
          </TouchableOpacity>
        </View>
      </View>

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

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tarification</Text>
      <Text style={styles.stepDescription}>Définissez le prix et les options de votre événement</Text>

      <View style={styles.switchRow}>
        <View style={styles.switchContent}>
          <Text style={styles.switchLabel}>Événement gratuit</Text>
          <Text style={styles.switchDescription}>Aucun billet payant ne sera proposé</Text>
        </View>
        <Switch
          value={isFree}
          onValueChange={setIsFree}
          trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
          thumbColor={isFree ? Colors.primary : Colors.gray400}
        />
      </View>

      {!isFree && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Prix de base (FCFA) *</Text>
          <TextInput
            style={styles.input}
            value={basePrice}
            onChangeText={setBasePrice}
            placeholder="Ex: 5000"
            placeholderTextColor={Colors.gray400}
            keyboardType="numeric"
          />
          <Text style={styles.inputHint}>
            Vous pourrez créer plusieurs types de billets après la création
          </Text>
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Capacité maximale</Text>
        <TextInput
          style={styles.input}
          value={maxCapacity}
          onChangeText={setMaxCapacity}
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
          <Text style={styles.summaryLabel}>Prix</Text>
          <Text style={[styles.summaryValue, { color: Colors.primary }]}>
            {isFree ? 'Gratuit' : `${basePrice || '0'} FCFA`}
          </Text>
        </View>
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header with back button */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.gray900} />
          </TouchableOpacity>
          <Text style={styles.headerBarTitle}>Créer un événement</Text>
          <View style={{ width: 40 }} />
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

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </ScrollView>

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
      </KeyboardAvoidingView>

      {/* Date Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode={pickerMode}
          display="spinner"
          onChange={(_, date) => {
            setShowStartPicker(false);
            if (date) {
              setStartDate(date);
              if (date > endDate) {
                setEndDate(new Date(date.getTime() + 3600000));
              }
            }
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode={pickerMode}
          display="spinner"
          minimumDate={startDate}
          onChange={(_, date) => {
            setShowEndPicker(false);
            if (date) setEndDate(date);
          }}
        />
      )}
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
});
