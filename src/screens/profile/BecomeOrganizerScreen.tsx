import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { usersAPI } from '../../api/client';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../constants/theme';
import GradientButton from '../../components/ui/GradientButton';
import AnimatedPressable from '../../components/ui/AnimatedPressable';

type OrganizerType = 'individual' | 'organization';

interface FormData {
  organizer_type: OrganizerType;
  company_name: string;
  registration_number: string;
  phone: string;
}

interface FormErrors {
  company_name?: string;
  registration_number?: string;
  phone?: string;
}

export default function BecomeOrganizerScreen() {
  const navigation = useNavigation();
  const { user, updateUser } = useAuth();
  const { showError, showSuccess } = useAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    organizer_type: 'individual',
    company_name: '',
    registration_number: '',
    phone: user?.phone || '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const updateField = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field as keyof FormErrors]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const validate = () => {
    const newErrors: FormErrors = {};

    if (formData.organizer_type === 'organization') {
      if (!formData.company_name.trim()) {
        newErrors.company_name = 'Le nom de l\'entreprise est requis';
      }
      if (!formData.registration_number.trim()) {
        newErrors.registration_number = 'Le numéro SIRET/RC est requis';
      }
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Le téléphone est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBecomeOrganizer = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      const data: any = {
        organizer_type: formData.organizer_type,
        phone: formData.phone.trim(),
      };

      if (formData.organizer_type === 'organization') {
        data.company_name = formData.company_name.trim();
        data.registration_number = formData.registration_number.trim();
      }

      await usersAPI.becomeOrganizer(data);

      // Mettre à jour l'utilisateur local
      const userResponse = await usersAPI.getCurrentUser();
      await updateUser(userResponse.data);

      showSuccess(
        'Félicitations !',
        'Vous êtes maintenant organisateur. Créez votre premier événement !'
      );
      navigation.goBack();
    } catch (error: any) {
      const errorData = error.response?.data;
      let message = 'Une erreur est survenue';

      if (errorData?.detail) {
        message = errorData.detail;
      } else if (errorData?.error) {
        message = errorData.error;
      }

      showError('Erreur', message);
    } finally {
      setIsLoading(false);
    }
  };

  const getInputStyle = (field: string, hasError: boolean) => {
    if (hasError) return styles.inputError;
    if (focusedField === field) return styles.inputFocused;
    return null;
  };

  const benefits = [
    {
      icon: 'calendar' as const,
      title: 'Créez vos événements',
      description: 'Publiez et gérez vos événements facilement',
    },
    {
      icon: 'ticket' as const,
      title: 'Vendez des billets',
      description: 'Système de billetterie intégré avec QR codes',
    },
    {
      icon: 'analytics' as const,
      title: 'Suivez vos performances',
      description: 'Tableaux de bord et analytics détaillés',
    },
    {
      icon: 'wallet' as const,
      title: 'Recevez vos revenus',
      description: 'Paiements sécurisés et retraits rapides',
    },
  ];

  const renderBenefits = () => (
    <View style={styles.benefitsContainer}>
      <Text style={styles.sectionTitle}>Pourquoi devenir organisateur ?</Text>
      {benefits.map((benefit, index) => (
        <View key={index} style={styles.benefitItem}>
          <View style={styles.benefitIcon}>
            <Ionicons name={benefit.icon} size={24} color={Colors.primary} />
          </View>
          <View style={styles.benefitText}>
            <Text style={styles.benefitTitle}>{benefit.title}</Text>
            <Text style={styles.benefitDescription}>{benefit.description}</Text>
          </View>
        </View>
      ))}

      <GradientButton
        onPress={() => setShowForm(true)}
        title="Commencer"
        icon={<Ionicons name="arrow-forward" size={20} color={Colors.white} />}
        size="xl"
        fullWidth
        style={styles.startButton}
      />
    </View>
  );

  const renderTypeSelector = () => (
    <View style={styles.typeSelectorContainer}>
      <Text style={styles.sectionLabel}>Quel type d'organisateur êtes-vous ?</Text>
      <View style={styles.typeOptions}>
        <AnimatedPressable
          onPress={() => updateField('organizer_type', 'individual')}
          style={[
            styles.typeOption,
            formData.organizer_type === 'individual' && styles.typeOptionSelected,
          ]}
          animationType="scale"
          scaleValue={0.98}
        >
          <View style={[
            styles.typeIconContainer,
            formData.organizer_type === 'individual' && styles.typeIconContainerSelected,
          ]}>
            <Ionicons
              name="person"
              size={24}
              color={formData.organizer_type === 'individual' ? Colors.white : Colors.gray500}
            />
          </View>
          <Text style={[
            styles.typeOptionTitle,
            formData.organizer_type === 'individual' && styles.typeOptionTitleSelected,
          ]}>
            Particulier
          </Text>
          <Text style={styles.typeOptionDescription}>
            Organisateur indépendant
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => updateField('organizer_type', 'organization')}
          style={[
            styles.typeOption,
            formData.organizer_type === 'organization' && styles.typeOptionSelected,
          ]}
          animationType="scale"
          scaleValue={0.98}
        >
          <View style={[
            styles.typeIconContainer,
            formData.organizer_type === 'organization' && styles.typeIconContainerSelected,
          ]}>
            <Ionicons
              name="business"
              size={24}
              color={formData.organizer_type === 'organization' ? Colors.white : Colors.gray500}
            />
          </View>
          <Text style={[
            styles.typeOptionTitle,
            formData.organizer_type === 'organization' && styles.typeOptionTitleSelected,
          ]}>
            Organisation
          </Text>
          <Text style={styles.typeOptionDescription}>
            Entreprise / Association
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );

  const renderForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.sectionTitle}>Informations</Text>

      {renderTypeSelector()}

      {formData.organizer_type === 'organization' && (
        <>
          {/* Company Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nom de l'entreprise</Text>
            <View style={[styles.inputWrapper, getInputStyle('company_name', !!errors.company_name)]}>
              <View style={styles.inputIconContainer}>
                <Ionicons
                  name="business-outline"
                  size={20}
                  color={focusedField === 'company_name' ? Colors.primary : Colors.gray400}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Nom de votre entreprise"
                placeholderTextColor={Colors.gray400}
                value={formData.company_name}
                onChangeText={(text) => updateField('company_name', text)}
                onFocus={() => setFocusedField('company_name')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="words"
              />
            </View>
            {errors.company_name && (
              <Text style={styles.errorText}>{errors.company_name}</Text>
            )}
          </View>

          {/* Registration Number */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Numéro SIRET / RC</Text>
            <View style={[styles.inputWrapper, getInputStyle('registration_number', !!errors.registration_number)]}>
              <View style={styles.inputIconContainer}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={focusedField === 'registration_number' ? Colors.primary : Colors.gray400}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Numéro d'enregistrement"
                placeholderTextColor={Colors.gray400}
                value={formData.registration_number}
                onChangeText={(text) => updateField('registration_number', text)}
                onFocus={() => setFocusedField('registration_number')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            {errors.registration_number && (
              <Text style={styles.errorText}>{errors.registration_number}</Text>
            )}
          </View>
        </>
      )}

      {/* Phone */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Téléphone</Text>
        <View style={[styles.inputWrapper, getInputStyle('phone', !!errors.phone)]}>
          <View style={styles.inputIconContainer}>
            <Ionicons
              name="call-outline"
              size={20}
              color={focusedField === 'phone' ? Colors.primary : Colors.gray400}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Votre numéro de téléphone"
            placeholderTextColor={Colors.gray400}
            value={formData.phone}
            onChangeText={(text) => updateField('phone', text)}
            onFocus={() => setFocusedField('phone')}
            onBlur={() => setFocusedField(null)}
            keyboardType="phone-pad"
          />
        </View>
        {errors.phone && (
          <Text style={styles.errorText}>{errors.phone}</Text>
        )}
      </View>

      <View style={styles.buttonRow}>
        <AnimatedPressable
          onPress={() => setShowForm(false)}
          style={styles.backButton}
          animationType="scale"
          scaleValue={0.95}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.gray600} />
          <Text style={styles.backButtonText}>Retour</Text>
        </AnimatedPressable>

        <GradientButton
          onPress={handleBecomeOrganizer}
          title="Confirmer"
          loading={isLoading}
          icon={<Ionicons name="checkmark" size={20} color={Colors.white} />}
          size="lg"
          style={styles.confirmButton}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => navigation.goBack()}
          style={styles.headerBackButton}
          animationType="scale"
          scaleValue={0.9}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.gray800} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Devenir Organisateur</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero */}
          <View style={styles.heroContainer}>
            <View style={styles.heroIconContainer}>
              <Ionicons name="megaphone" size={48} color={Colors.white} />
            </View>
            <Text style={styles.heroTitle}>
              Partagez vos événements avec le monde
            </Text>
            <Text style={styles.heroSubtitle}>
              Rejoignez des milliers d'organisateurs qui font confiance à EventEz
            </Text>
          </View>

          {showForm ? renderForm() : renderBenefits()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...TextStyles.h4,
  },
  scrollContent: {
    paddingBottom: Spacing['3xl'],
  },
  heroContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.primaryLight,
  },
  heroIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.lg,
  },
  heroTitle: {
    ...TextStyles.h2,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    ...TextStyles.body,
    color: Colors.gray600,
    textAlign: 'center',
  },
  benefitsContainer: {
    padding: Spacing.xl,
  },
  sectionTitle: {
    ...TextStyles.h3,
    marginBottom: Spacing.lg,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    ...TextStyles.bodyBold,
    marginBottom: Spacing.xs,
  },
  benefitDescription: {
    ...TextStyles.small,
    color: Colors.gray500,
  },
  startButton: {
    marginTop: Spacing.lg,
  },
  formContainer: {
    padding: Spacing.xl,
  },
  typeSelectorContainer: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
    marginBottom: Spacing.sm,
  },
  typeOptions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  typeOption: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    alignItems: 'center',
  },
  typeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  typeIconContainerSelected: {
    backgroundColor: Colors.primary,
  },
  typeOptionTitle: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
  },
  typeOptionTitleSelected: {
    color: Colors.primary,
  },
  typeOptionDescription: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    overflow: 'hidden',
  },
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  inputError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  inputIconContainer: {
    paddingLeft: Spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
  },
  errorText: {
    fontSize: FontSizes.xs,
    color: Colors.error,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.gray100,
  },
  backButtonText: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
  confirmButton: {
    flex: 1,
  },
});
