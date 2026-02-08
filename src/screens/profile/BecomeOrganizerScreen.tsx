import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
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
} from '../../constants/theme';
import GradientButton from '../../components/ui/GradientButton';
import AnimatedPressable from '../../components/ui/AnimatedPressable';

const { width } = Dimensions.get('window');

type OrganizerType = 'individual' | 'organization';
type Step = 1 | 2 | 3 | 4;

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

const STEPS = [
  { number: 1, label: 'Bienvenue' },
  { number: 2, label: 'Type' },
  { number: 3, label: 'Details' },
  { number: 4, label: 'Confirmer' },
];

const STATS = [
  { icon: 'people-outline' as const, value: '2,500+', label: 'Organisateurs actifs' },
  { icon: 'ticket-outline' as const, value: '50,000+', label: 'Billets vendus' },
  { icon: 'star-outline' as const, value: '4.8/5', label: 'Satisfaction' },
];

const BENEFITS = [
  { icon: 'calendar-outline' as const, title: 'Creez vos evenements', desc: 'Publiez et gerez facilement' },
  { icon: 'ticket-outline' as const, title: 'Vendez des billets', desc: 'Billetterie avec QR codes' },
  { icon: 'analytics-outline' as const, title: 'Suivez les performances', desc: 'Analytics detailles' },
  { icon: 'wallet-outline' as const, title: 'Recevez vos revenus', desc: 'Paiements securises' },
];

export default function BecomeOrganizerScreen() {
  const navigation = useNavigation();
  const { user, updateUser } = useAuth();
  const { showError, showSuccess } = useAlert();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;

  const [formData, setFormData] = useState<FormData>({
    organizer_type: 'individual',
    company_name: '',
    registration_number: '',
    phone: user?.phone || '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const animateProgress = (toStep: Step) => {
    Animated.spring(progressAnim, {
      toValue: toStep,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  };

  const goToStep = (step: Step) => {
    animateProgress(step);
    setCurrentStep(step);
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field as keyof FormErrors]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const validateStep3 = () => {
    const newErrors: FormErrors = {};

    if (formData.organizer_type === 'organization') {
      if (!formData.company_name.trim()) {
        newErrors.company_name = "Le nom de l'entreprise est requis";
      }
      if (!formData.registration_number.trim()) {
        newErrors.registration_number = 'Le numero SIRET/RC est requis';
      }
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Le telephone est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 3) {
      if (!validateStep3()) return;
    }

    if (currentStep < 4) {
      goToStep((currentStep + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      goToStep((currentStep - 1) as Step);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
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

      const userResponse = await usersAPI.getCurrentUser();
      await updateUser(userResponse.data);

      showSuccess(
        'Felicitations !',
        'Vous etes maintenant organisateur. Creez votre premier evenement !'
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

  // Step 1: Welcome
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.heroIcon}>
        <Ionicons name="megaphone" size={48} color={Colors.white} />
      </View>
      <Text style={styles.heroTitle}>Devenez Organisateur</Text>
      <Text style={styles.heroSubtitle}>
        Partagez vos evenements avec des milliers de participants
      </Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        {STATS.map((stat, index) => (
          <View key={index} style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name={stat.icon} size={20} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Benefits */}
      <View style={styles.benefitsContainer}>
        {BENEFITS.map((benefit, index) => (
          <View key={index} style={styles.benefitItem}>
            <View style={styles.benefitIcon}>
              <Ionicons name={benefit.icon} size={20} color={Colors.primary} />
            </View>
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              <Text style={styles.benefitDesc}>{benefit.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  // Step 2: Type Selection
  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Quel type d'organisateur etes-vous ?</Text>
      <Text style={styles.stepSubtitle}>
        Choisissez le profil qui vous correspond le mieux
      </Text>

      <View style={styles.typeOptions}>
        <AnimatedPressable
          onPress={() => updateField('organizer_type', 'individual')}
          style={[
            styles.typeCard,
            formData.organizer_type === 'individual' && styles.typeCardSelected,
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
              size={32}
              color={formData.organizer_type === 'individual' ? Colors.white : Colors.gray500}
            />
          </View>
          <Text style={[
            styles.typeTitle,
            formData.organizer_type === 'individual' && styles.typeTitleSelected,
          ]}>
            Particulier
          </Text>
          <Text style={styles.typeDesc}>
            Organisateur independant, freelance ou passione
          </Text>
          {formData.organizer_type === 'individual' && (
            <View style={styles.typeCheck}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
            </View>
          )}
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => updateField('organizer_type', 'organization')}
          style={[
            styles.typeCard,
            formData.organizer_type === 'organization' && styles.typeCardSelected,
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
              size={32}
              color={formData.organizer_type === 'organization' ? Colors.white : Colors.gray500}
            />
          </View>
          <Text style={[
            styles.typeTitle,
            formData.organizer_type === 'organization' && styles.typeTitleSelected,
          ]}>
            Organisation
          </Text>
          <Text style={styles.typeDesc}>
            Entreprise, association ou structure officielle
          </Text>
          {formData.organizer_type === 'organization' && (
            <View style={styles.typeCheck}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
            </View>
          )}
        </AnimatedPressable>
      </View>
    </View>
  );

  // Step 3: Details Form
  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Vos informations</Text>
      <Text style={styles.stepSubtitle}>
        {formData.organizer_type === 'organization'
          ? 'Renseignez les informations de votre organisation'
          : 'Renseignez vos coordonnees de contact'}
      </Text>

      <View style={styles.formContainer}>
        {formData.organizer_type === 'organization' && (
          <>
            {/* Company Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nom de l'entreprise</Text>
              <View style={[styles.inputWrapper, getInputStyle('company_name', !!errors.company_name)]}>
                <Ionicons
                  name="business-outline"
                  size={20}
                  color={focusedField === 'company_name' ? Colors.primary : Colors.gray400}
                />
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
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color={Colors.error} />
                  <Text style={styles.errorText}>{errors.company_name}</Text>
                </View>
              )}
            </View>

            {/* Registration Number */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Numero SIRET / RC</Text>
              <View style={[styles.inputWrapper, getInputStyle('registration_number', !!errors.registration_number)]}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={focusedField === 'registration_number' ? Colors.primary : Colors.gray400}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Numero d'enregistrement"
                  placeholderTextColor={Colors.gray400}
                  value={formData.registration_number}
                  onChangeText={(text) => updateField('registration_number', text)}
                  onFocus={() => setFocusedField('registration_number')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              {errors.registration_number && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color={Colors.error} />
                  <Text style={styles.errorText}>{errors.registration_number}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Phone */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Telephone</Text>
          <View style={[styles.inputWrapper, getInputStyle('phone', !!errors.phone)]}>
            <Ionicons
              name="call-outline"
              size={20}
              color={focusedField === 'phone' ? Colors.primary : Colors.gray400}
            />
            <TextInput
              style={styles.input}
              placeholder="Votre numero de telephone"
              placeholderTextColor={Colors.gray400}
              value={formData.phone}
              onChangeText={(text) => updateField('phone', text)}
              onFocus={() => setFocusedField('phone')}
              onBlur={() => setFocusedField(null)}
              keyboardType="phone-pad"
            />
          </View>
          {errors.phone && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color={Colors.error} />
              <Text style={styles.errorText}>{errors.phone}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  // Step 4: Confirmation
  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <View style={styles.confirmIcon}>
        <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
      </View>
      <Text style={styles.stepTitle}>Pret a commencer !</Text>
      <Text style={styles.stepSubtitle}>
        Verifiez vos informations avant de confirmer
      </Text>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryIcon}>
            <Ionicons name={formData.organizer_type === 'organization' ? 'business' : 'person'} size={20} color={Colors.primary} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>Type</Text>
            <Text style={styles.summaryValue}>
              {formData.organizer_type === 'organization' ? 'Organisation' : 'Particulier'}
            </Text>
          </View>
        </View>

        {formData.organizer_type === 'organization' && (
          <>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryIcon}>
                <Ionicons name="business-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Entreprise</Text>
                <Text style={styles.summaryValue}>{formData.company_name}</Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <View style={styles.summaryIcon}>
                <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>SIRET/RC</Text>
                <Text style={styles.summaryValue}>{formData.registration_number}</Text>
              </View>
            </View>
          </>
        )}

        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <View style={styles.summaryIcon}>
            <Ionicons name="call-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>Telephone</Text>
            <Text style={styles.summaryValue}>{formData.phone}</Text>
          </View>
        </View>
      </View>

      {/* Testimonial */}
      <View style={styles.testimonialCard}>
        <View style={styles.testimonialStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons key={star} name="star" size={16} color="#FBBF24" />
          ))}
        </View>
        <Text style={styles.testimonialText}>
          "EventEz m'a permis de gerer mes evenements facilement et d'atteindre plus de participants."
        </Text>
        <Text style={styles.testimonialAuthor}>- Marie D., Organisatrice</Text>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [1, 4],
    outputRange: ['25%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable
          onPress={handleBack}
          style={styles.headerBackButton}
          animationType="scale"
          scaleValue={0.9}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.gray800} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Devenir Organisateur</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <View style={styles.stepsRow}>
          {STEPS.map((step) => (
            <View key={step.number} style={styles.stepIndicator}>
              <View style={[
                styles.stepDot,
                currentStep >= step.number && styles.stepDotActive,
                currentStep === step.number && styles.stepDotCurrent,
              ]}>
                {currentStep > step.number ? (
                  <Ionicons name="checkmark" size={12} color={Colors.white} />
                ) : (
                  <Text style={[
                    styles.stepNumber,
                    currentStep >= step.number && styles.stepNumberActive,
                  ]}>
                    {step.number}
                  </Text>
                )}
              </View>
              <Text style={[
                styles.stepLabel,
                currentStep >= step.number && styles.stepLabelActive,
              ]}>
                {step.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 100}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderCurrentStep()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        {currentStep > 1 && (
          <AnimatedPressable
            onPress={handleBack}
            style={styles.backButton}
            animationType="scale"
            scaleValue={0.95}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.gray600} />
            <Text style={styles.backButtonText}>Retour</Text>
          </AnimatedPressable>
        )}

        <GradientButton
          onPress={currentStep === 4 ? handleSubmit : handleNext}
          title={currentStep === 4 ? 'Confirmer' : 'Continuer'}
          loading={isLoading}
          icon={
            currentStep === 4
              ? <Ionicons name="checkmark" size={20} color={Colors.white} />
              : <Ionicons name="arrow-forward" size={20} color={Colors.white} />
          }
          size="lg"
          style={[styles.nextButton, currentStep === 1 && { flex: 1 }]}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  // Header
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
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },

  // Progress
  progressContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.gray50,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.gray200,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepIndicator: {
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
  },
  stepDotCurrent: {
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  stepNumber: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray500,
  },
  stepNumberActive: {
    color: Colors.primary,
  },
  stepLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray400,
  },
  stepLabelActive: {
    color: Colors.gray700,
    fontFamily: FontFamily.medium,
  },

  // Content
  scrollContent: {
    paddingBottom: Spacing['3xl'],
  },
  stepContent: {
    padding: Spacing.xl,
  },

  // Step 1 - Hero
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.lg,
  },
  heroTitle: {
    fontSize: FontSizes['2xl'],
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    textAlign: 'center',
  },
  benefitsContainer: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    ...Shadows.sm,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  benefitDesc: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },

  // Step 2 - Type Selection
  stepTitle: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  stepSubtitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  typeOptions: {
    gap: Spacing.md,
  },
  typeCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    alignItems: 'center',
    position: 'relative',
  },
  typeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  typeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  typeIconContainerSelected: {
    backgroundColor: Colors.primary,
  },
  typeTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
  },
  typeTitleSelected: {
    color: Colors.primary,
  },
  typeDesc: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
    textAlign: 'center',
  },
  typeCheck: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
  },

  // Step 3 - Form
  formContainer: {
    gap: Spacing.md,
  },
  inputContainer: {
    marginBottom: Spacing.sm,
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
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
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
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: 4,
  },
  errorText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.error,
  },

  // Step 4 - Confirmation
  confirmIcon: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },
  summaryValue: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.gray200,
    marginVertical: Spacing.md,
  },
  testimonialCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  testimonialStars: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  testimonialText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray700,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
  testimonialAuthor: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    backgroundColor: Colors.white,
    gap: Spacing.md,
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
    fontSize: FontSizes.base,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
  nextButton: {
    flex: 1,
  },
});
