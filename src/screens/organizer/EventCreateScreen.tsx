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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { eventsAPI, categoriesAPI } from '../../api/client';
import { Category, RootStackParamList } from '../../types';
import GradientButton from '../../components/ui/GradientButton';
import {
  Colors,
  FontSizes,
  FontWeights,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function EventCreateScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [eventType, setEventType] = useState<'billetterie' | 'inscription'>('billetterie');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [locationName, setLocationName] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [basePrice, setBasePrice] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('');

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

  const validateForm = () => {
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
    if (endDate <= startDate) {
      Alert.alert('Erreur', 'La date de fin doit être après la date de début');
      return false;
    }
    if (!isFree && !basePrice) {
      Alert.alert('Erreur', 'Veuillez indiquer un prix ou marquer l\'événement comme gratuit');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const eventData = {
        title,
        description,
        short_description: shortDescription,
        event_type: eventType,
        category: categoryId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        location_name: locationName,
        location_city: locationCity,
        location_address: locationAddress,
        location_type: 'in_person',
        is_free: isFree,
        base_price: isFree ? 0 : parseFloat(basePrice),
        max_capacity: maxCapacity ? parseInt(maxCapacity) : null,
        status: 'draft',
      };

      const response = await eventsAPI.createEvent(eventData);
      Alert.alert(
        'Succès',
        'Votre événement a été créé en tant que brouillon',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Erreur création événement:', error);
      Alert.alert(
        'Erreur',
        error.response?.data?.message || 'Impossible de créer l\'événement'
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations de base</Text>

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
                placeholder="Résumé en quelques mots"
                placeholderTextColor={Colors.gray400}
                maxLength={150}
              />
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
                  style={[
                    styles.typeOption,
                    eventType === 'billetterie' && styles.typeOptionActive,
                  ]}
                  onPress={() => setEventType('billetterie')}
                >
                  <Ionicons
                    name="ticket-outline"
                    size={20}
                    color={eventType === 'billetterie' ? Colors.white : Colors.gray600}
                  />
                  <Text
                    style={[
                      styles.typeOptionText,
                      eventType === 'billetterie' && styles.typeOptionTextActive,
                    ]}
                  >
                    Billetterie
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    eventType === 'inscription' && styles.typeOptionActive,
                  ]}
                  onPress={() => setEventType('inscription')}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={eventType === 'inscription' ? Colors.white : Colors.gray600}
                  />
                  <Text
                    style={[
                      styles.typeOptionText,
                      eventType === 'inscription' && styles.typeOptionTextActive,
                    ]}
                  >
                    Inscription
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Catégorie *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      categoryId === cat.id && styles.categoryChipActive,
                    ]}
                    onPress={() => setCategoryId(cat.id)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        categoryId === cat.id && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Date & Time Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date et heure</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date de début *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date de fin *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                <Text style={styles.dateButtonText}>{formatDate(endDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lieu</Text>

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

          {/* Pricing Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tarification</Text>

            <View style={styles.switchRow}>
              <View style={styles.switchContent}>
                <Text style={styles.switchLabel}>Événement gratuit</Text>
                <Text style={styles.switchDescription}>
                  Aucun billet payant ne sera proposé
                </Text>
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
          </View>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <GradientButton
              title={loading ? 'Création...' : 'Créer l\'événement'}
              onPress={handleSubmit}
              disabled={loading}
              fullWidth
              icon={
                loading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Ionicons name="add-circle" size={20} color={Colors.white} />
                )
              }
            />
            <Text style={styles.submitHint}>
              L'événement sera créé en tant que brouillon.{'\n'}
              Vous pourrez le modifier avant de le publier.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="datetime"
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
          mode="datetime"
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
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['3xl'],
  },
  section: {
    backgroundColor: Colors.white,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    color: Colors.gray700,
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
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
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
    fontWeight: FontWeights.medium,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  switchContent: {
    flex: 1,
    marginRight: Spacing.md,
  },
  switchLabel: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.medium,
    color: Colors.gray900,
  },
  switchDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
  submitSection: {
    padding: Spacing.lg,
  },
  submitHint: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 20,
  },
});
