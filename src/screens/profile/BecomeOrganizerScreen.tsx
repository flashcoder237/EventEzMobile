import React, { useState, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { usersAPI } from '../../api';
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
import PhoneNumberInput from '../../components/common/PhoneNumberInput';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';

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

const STEP_NUMBERS = [1, 2, 3, 4] as const;

const STAT_ICONS = ['people-outline', 'ticket-outline', 'star-outline'] as const;
const BENEFIT_ICONS = ['calendar-outline', 'ticket-outline', 'analytics-outline', 'wallet-outline'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Champ de formulaire isolé : gère SON propre état focus localement.
//
// Pourquoi : si l'état `focusedField` vit dans le screen parent, chaque
// onFocus/onBlur déclenche un setState parent → re-render → renderStepX
// recrée tout le JSX → KeyboardAwareScrollView re-scroll → focus perdu →
// onBlur → setState → re-render → … cycle visible de focus qui « ressort ».
//
// Avec un state local + React.memo, seul ce champ se re-render au focus/blur.
// Le screen parent reste stable, l'input garde le focus, le clavier ne saute
// plus, et `updateField` (stable via useCallback côté parent) ne casse pas le
// memo.
// ─────────────────────────────────────────────────────────────────────────────
interface FormFieldProps {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  value: string;
  field: keyof FormData;
  error?: string;
  placeholder: string;
  onChange: (field: keyof FormData, value: string) => void;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  keyboardType?: TextInputProps['keyboardType'];
  colors: ReturnType<typeof useTheme>['colors'];
}

const FormField = memo(function FormField({
  label,
  iconName,
  value,
  field,
  error,
  placeholder,
  onChange,
  autoCapitalize,
  keyboardType,
  colors,
}: FormFieldProps) {
  // STATELESS — aucun setState sur focus/blur.
  //
  // Pourquoi : New Architecture (Fabric, app.json:newArchEnabled=true) a un
  // bug où changer le style d'un View parent pendant qu'un TextInput enfant a
  // le focus peut détruire/recréer le TextInput natif → focus perdu → clavier
  // qui descend immédiatement après être monté. Le fix le plus solide est de
  // ne JAMAIS modifier le style du wrapper sur focus.
  //
  // Bordure statique : on garde toujours `inputFocused` (border primaire) sauf
  // si erreur (border rouge). Pas d'état intermédiaire « unfocused ». Le
  // curseur natif clignotant suffit comme indication de focus.

  const wrapperStyle = error ? styles.inputError : styles.inputFocused;

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: colors.gray600 }]}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          { backgroundColor: colors.card, borderColor: colors.gray200 },
          wrapperStyle,
        ]}
      >
        <Ionicons name={iconName} size={20} color={colors.primary} />
        <TextInput
          style={[styles.input, { color: colors.gray900 }]}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          value={value}
          onChangeText={(text) => onChange(field, text)}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          autoComplete="off"
          textContentType="none"
          returnKeyType="done"
          blurOnSubmit
        />
      </View>
      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}
    </View>
  );
});

export default function BecomeOrganizerScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, syncUser } = useAuth();
  const { showError, showSuccess } = useAlert();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const STEPS = STEP_NUMBERS.map((number, idx) => ({
    number,
    label: t(['becomeOrganizerForm.stepWelcome', 'becomeOrganizerForm.stepType', 'becomeOrganizerForm.stepDetails', 'becomeOrganizerForm.stepConfirm'][idx]),
  }));

  const STATS = [
    { icon: STAT_ICONS[0], value: t('becomeOrganizerForm.stat1Value'), label: t('becomeOrganizerForm.stat1Label') },
    { icon: STAT_ICONS[1], value: t('becomeOrganizerForm.stat2Value'), label: t('becomeOrganizerForm.stat2Label') },
    { icon: STAT_ICONS[2], value: t('becomeOrganizerForm.stat3Value'), label: t('becomeOrganizerForm.stat3Label') },
  ];

  const BENEFITS = [
    { icon: BENEFIT_ICONS[0], title: t('becomeOrganizerForm.benefit1Title'), desc: t('becomeOrganizerForm.benefit1Desc') },
    { icon: BENEFIT_ICONS[1], title: t('becomeOrganizerForm.benefit2Title'), desc: t('becomeOrganizerForm.benefit2Desc') },
    { icon: BENEFIT_ICONS[2], title: t('becomeOrganizerForm.benefit3Title'), desc: t('becomeOrganizerForm.benefit3Desc') },
    { icon: BENEFIT_ICONS[3], title: t('becomeOrganizerForm.benefit4Title'), desc: t('becomeOrganizerForm.benefit4Desc') },
  ];
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>(1);
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

  // Stable via useCallback + functional setState — déps vides garantissent
  // que la même référence est passée à FormField (préserve React.memo).
  const updateField = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) =>
      prev[field as keyof FormErrors] ? { ...prev, [field]: undefined } : prev,
    );
  }, []);

  const validateStep3 = () => {
    const newErrors: FormErrors = {};

    if (formData.organizer_type === 'organization') {
      if (!formData.company_name.trim()) {
        newErrors.company_name = t('becomeOrganizerForm.errorCompanyNameRequired');
      }
      if (!formData.registration_number.trim()) {
        newErrors.registration_number = t('becomeOrganizerForm.errorRegistrationNumberRequired');
      }
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('becomeOrganizerForm.errorPhoneRequired');
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
      // syncUser (et NON updateUser) : updateUser re-PATCH /users/me/ avec
      // l'objet complet, qui inclut profile_picture sous forme d'URL string
      // → le backend renvoie 400 ("La donnée soumise n'est pas un fichier").
      // syncUser met juste à jour le contexte local sans appel API.
      syncUser(userResponse.data);

      showSuccess(
        t('becomeOrganizerForm.successTitle'),
        t('becomeOrganizerForm.successMessage')
      );
      navigation.goBack();
    } catch (error: any) {
      const errorData = error.response?.data;
      let message = t('becomeOrganizerForm.errorGeneric');

      if (errorData?.detail) {
        message = errorData.detail;
      } else if (errorData?.error) {
        message = errorData.error;
      }

      showError(t('becomeOrganizerForm.errorTitle'), message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Welcome
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}>
        <Ionicons name="megaphone" size={48} color={colors.white} />
      </View>
      <Text style={[styles.heroTitle, { color: colors.gray900 }]}>{t('becomeOrganizerForm.heroTitle')}</Text>
      <Text style={[styles.heroSubtitle, { color: colors.gray500 }]}>
        {t('becomeOrganizerForm.heroSubtitle')}
      </Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        {STATS.map((stat, index) => (
          <View key={index} style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: colors.primaryBg }]}>
              <Ionicons name={stat.icon} size={20} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.gray900 }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Benefits */}
      <View style={[styles.benefitsContainer, { backgroundColor: colors.gray50 }]}>
        {BENEFITS.map((benefit, index) => (
          <View key={index} style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: colors.card }]}>
              <Ionicons name={benefit.icon} size={20} color={colors.primary} />
            </View>
            <View style={styles.benefitText}>
              <Text style={[styles.benefitTitle, { color: colors.gray900 }]}>{benefit.title}</Text>
              <Text style={[styles.benefitDesc, { color: colors.gray500 }]}>{benefit.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  // Step 2: Type Selection
  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.gray900 }]}>{t('becomeOrganizerForm.step2Title')}</Text>
      <Text style={[styles.stepSubtitle, { color: colors.gray500 }]}>
        {t('becomeOrganizerForm.step2Subtitle')}
      </Text>

      <View style={styles.typeOptions}>
        <AnimatedPressable
          onPress={() => updateField('organizer_type', 'individual')}
          style={[
            styles.typeCard,
            { borderColor: colors.gray200, backgroundColor: colors.card },
            formData.organizer_type === 'individual' && { borderColor: colors.primary, backgroundColor: colors.primaryBg },
          ]}
          animationType="scale"
          scaleValue={0.98}
        >
          <View style={[
            styles.typeIconContainer,
            { backgroundColor: colors.gray100 },
            formData.organizer_type === 'individual' && { backgroundColor: colors.primary },
          ]}>
            <Ionicons
              name="person"
              size={32}
              color={formData.organizer_type === 'individual' ? colors.white : colors.gray500}
            />
          </View>
          <Text style={[
            styles.typeTitle,
            { color: colors.gray700 },
            formData.organizer_type === 'individual' && { color: colors.primary },
          ]}>
            {t('becomeOrganizerForm.typeIndividualTitle')}
          </Text>
          <Text style={[styles.typeDesc, { color: colors.gray500 }]}>
            {t('becomeOrganizerForm.typeIndividualDesc')}
          </Text>
          {formData.organizer_type === 'individual' && (
            <View style={styles.typeCheck}>
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            </View>
          )}
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => updateField('organizer_type', 'organization')}
          style={[
            styles.typeCard,
            { borderColor: colors.gray200, backgroundColor: colors.card },
            formData.organizer_type === 'organization' && { borderColor: colors.primary, backgroundColor: colors.primaryBg },
          ]}
          animationType="scale"
          scaleValue={0.98}
        >
          <View style={[
            styles.typeIconContainer,
            { backgroundColor: colors.gray100 },
            formData.organizer_type === 'organization' && { backgroundColor: colors.primary },
          ]}>
            <Ionicons
              name="business"
              size={32}
              color={formData.organizer_type === 'organization' ? colors.white : colors.gray500}
            />
          </View>
          <Text style={[
            styles.typeTitle,
            { color: colors.gray700 },
            formData.organizer_type === 'organization' && { color: colors.primary },
          ]}>
            {t('becomeOrganizerForm.typeOrganizationTitle')}
          </Text>
          <Text style={[styles.typeDesc, { color: colors.gray500 }]}>
            {t('becomeOrganizerForm.typeOrganizationDesc')}
          </Text>
          {formData.organizer_type === 'organization' && (
            <View style={styles.typeCheck}>
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            </View>
          )}
        </AnimatedPressable>
      </View>
    </View>
  );

  // Step 3: Details Form
  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: colors.gray900 }]}>{t('becomeOrganizerForm.step3Title')}</Text>
      <Text style={[styles.stepSubtitle, { color: colors.gray500 }]}>
        {formData.organizer_type === 'organization'
          ? t('becomeOrganizerForm.step3SubtitleOrg')
          : t('becomeOrganizerForm.step3SubtitleIndividual')}
      </Text>

      <View style={styles.formContainer}>
        {formData.organizer_type === 'organization' && (
          <>
            <FormField
              label={t('becomeOrganizerForm.labelCompanyName')}
              iconName="business-outline"
              field="company_name"
              value={formData.company_name}
              error={errors.company_name}
              placeholder={t('becomeOrganizerForm.placeholderCompanyName')}
              onChange={updateField}
              autoCapitalize="words"
              colors={colors}
            />

            <FormField
              label={t('becomeOrganizerForm.labelRegistrationNumber')}
              iconName="document-text-outline"
              field="registration_number"
              value={formData.registration_number}
              error={errors.registration_number}
              placeholder={t('becomeOrganizerForm.placeholderRegistrationNumber')}
              onChange={updateField}
              colors={colors}
            />
          </>
        )}

        <View style={styles.inputContainer}>
          <PhoneNumberInput
            value={formData.phone}
            onChangeValue={(v) => updateField('phone', v)}
            label={t('becomeOrganizerForm.labelPhone')}
            error={errors.phone}
            placeholder={t('becomeOrganizerForm.placeholderPhone')}
          />
        </View>
      </View>
    </View>
  );

  // Step 4: Confirmation
  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <View style={styles.confirmIcon}>
        <Ionicons name="checkmark-circle" size={64} color={colors.success} />
      </View>
      <Text style={[styles.stepTitle, { color: colors.gray900 }]}>{t('becomeOrganizerForm.step4Title')}</Text>
      <Text style={[styles.stepSubtitle, { color: colors.gray500 }]}>
        {t('becomeOrganizerForm.step4Subtitle')}
      </Text>

      {/* Summary */}
      <View style={[styles.summaryCard, { backgroundColor: colors.gray50 }]}>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryIcon, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name={formData.organizer_type === 'organization' ? 'business' : 'person'} size={20} color={colors.primary} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={[styles.summaryLabel, { color: colors.gray500 }]}>{t('becomeOrganizerForm.summaryType')}</Text>
            <Text style={[styles.summaryValue, { color: colors.gray900 }]}>
              {formData.organizer_type === 'organization' ? t('becomeOrganizerForm.typeOrganizationTitle') : t('becomeOrganizerForm.typeIndividualTitle')}
            </Text>
          </View>
        </View>

        {formData.organizer_type === 'organization' && (
          <>
            <View style={[styles.summaryDivider, { backgroundColor: colors.gray200 }]} />
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name="business-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.summaryContent}>
                <Text style={[styles.summaryLabel, { color: colors.gray500 }]}>{t('becomeOrganizerForm.summaryCompany')}</Text>
                <Text style={[styles.summaryValue, { color: colors.gray900 }]}>{formData.company_name}</Text>
              </View>
            </View>

            <View style={[styles.summaryDivider, { backgroundColor: colors.gray200 }]} />
            <View style={styles.summaryRow}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.summaryContent}>
                <Text style={[styles.summaryLabel, { color: colors.gray500 }]}>{t('becomeOrganizerForm.summarySiret')}</Text>
                <Text style={[styles.summaryValue, { color: colors.gray900 }]}>{formData.registration_number}</Text>
              </View>
            </View>
          </>
        )}

        <View style={[styles.summaryDivider, { backgroundColor: colors.gray200 }]} />
        <View style={styles.summaryRow}>
          <View style={[styles.summaryIcon, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name="call-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={[styles.summaryLabel, { color: colors.gray500 }]}>{t('becomeOrganizerForm.summaryPhone')}</Text>
            <Text style={[styles.summaryValue, { color: colors.gray900 }]}>{formData.phone}</Text>
          </View>
        </View>
      </View>

      {/* Testimonial */}
      <View style={[styles.testimonialCard, { backgroundColor: colors.primaryBg }]}>
        <View style={styles.testimonialStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons key={star} name="star" size={16} color="#FBBF24" />
          ))}
        </View>
        <Text style={[styles.testimonialText, { color: colors.gray700 }]}>
          {t('becomeOrganizerForm.testimonialText')}
        </Text>
        <Text style={[styles.testimonialAuthor, { color: colors.gray500 }]}>{t('becomeOrganizerForm.testimonialAuthor')}</Text>
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
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>PRO</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.gray100 }]}>
        <AnimatedPressable
          onPress={handleBack}
          style={styles.headerBackButton}
          animationType="scale"
          scaleValue={0.9}
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray800} />
        </AnimatedPressable>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>{t('becomeOrganizerForm.headerTitle')}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressContainer, { backgroundColor: colors.gray50 }]}>
        <View style={[styles.progressBar, { backgroundColor: colors.gray200 }]}>
          <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: colors.primary }]} />
        </View>
        <View style={styles.stepsRow}>
          {STEPS.map((step) => (
            <View key={step.number} style={styles.stepIndicator}>
              <View style={[
                styles.stepDot,
                { backgroundColor: colors.gray200 },
                currentStep >= step.number && { backgroundColor: colors.primary },
                currentStep === step.number && { borderColor: colors.primary, backgroundColor: colors.card },
              ]}>
                {currentStep > step.number ? (
                  <Ionicons name="checkmark" size={12} color={colors.white} />
                ) : (
                  <Text style={[
                    styles.stepNumber,
                    { color: colors.gray500 },
                    currentStep >= step.number && { color: colors.primary },
                  ]}>
                    {step.number}
                  </Text>
                )}
              </View>
              <Text style={[
                styles.stepLabel,
                { color: colors.gray400 },
                currentStep >= step.number && { color: colors.gray700 },
              ]}>
                {step.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* KeyboardAvoidingView englobe ScrollView ET footer pour que les
          boutons remontent au-dessus du clavier (sinon le footer reste fixe
          en bas et est masqué par le clavier sur iOS). Android utilise
          `adjustResize` (cf. app.json) qui resize la view entière. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          {renderCurrentStep()}
        </ScrollView>

        {/* Footer Buttons — paddingBottom inclut insets.bottom pour ne pas
            être recouvert par la barre de navigation Android ni le home
            indicator iOS. Le KeyboardAvoidingView au-dessus garantit que ce
            footer remonte avec le clavier. */}
        <View
          style={[
            styles.footer,
            {
              borderTopColor: colors.gray100,
              backgroundColor: colors.card,
              paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.sm,
            },
          ]}
        >
          {currentStep > 1 && (
            <AnimatedPressable
              onPress={handleBack}
              style={[styles.backButton, { backgroundColor: colors.gray100 }]}
              animationType="scale"
              scaleValue={0.95}
            >
              <Ionicons name="arrow-back" size={20} color={colors.gray600} />
              <Text style={[styles.backButtonText, { color: colors.gray600 }]}>{t('becomeOrganizerForm.buttonBack')}</Text>
            </AnimatedPressable>
          )}

          <GradientButton
            onPress={currentStep === 4 ? handleSubmit : handleNext}
            title={currentStep === 4 ? t('becomeOrganizerForm.buttonConfirm') : t('becomeOrganizerForm.buttonContinue')}
            loading={isLoading}
            icon={
              currentStep === 4
                ? <Ionicons name="checkmark" size={20} color={colors.white} />
                : <Ionicons name="arrow-forward" size={20} color={colors.white} />
            }
            size="lg"
            style={StyleSheet.flatten([styles.nextButton, currentStep === 1 && { flex: 1 }]) as ViewStyle}
          />
        </View>
      </KeyboardAvoidingView>
      </View>
    </EditorialCanvas>
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
    fontFamily: FontFamily.displaySemiBold,
    letterSpacing: -0.3,
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
    fontSize: 11,
    fontFamily: FontFamily.bold,
    color: Colors.gray500,
  },
  stepNumberActive: {
    color: Colors.primary,
  },
  stepLabel: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    letterSpacing: 0.3,
    color: Colors.gray400,
  },
  stepLabelActive: {
    color: Colors.gray700,
    fontFamily: FontFamily.bold,
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
    letterSpacing: -0.5,
    color: Colors.gray900,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    lineHeight: 22,
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
    letterSpacing: -0.3,
    color: Colors.gray900,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    lineHeight: 14,
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
    fontFamily: FontFamily.bold,
    letterSpacing: -0.1,
    color: Colors.gray900,
  },
  benefitDesc: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    lineHeight: 15,
    color: Colors.gray500,
    marginTop: 2,
  },

  // Step 2 - Type Selection
  stepTitle: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    letterSpacing: -0.5,
    color: Colors.gray900,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  stepSubtitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    lineHeight: 22,
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
    fontFamily: FontFamily.displaySemiBold,
    letterSpacing: -0.3,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
  },
  typeTitleSelected: {
    color: Colors.primary,
    fontFamily: FontFamily.displayBold,
  },
  typeDesc: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    lineHeight: 18,
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
    fontSize: 11,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.gray600,
    marginBottom: Spacing.sm,
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
    fontFamily: FontFamily.medium,
    lineHeight: 16,
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
    fontSize: 10,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.gray500,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    letterSpacing: -0.1,
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
    lineHeight: 20,
    color: Colors.gray700,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
  testimonialAuthor: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    letterSpacing: -0.1,
    color: Colors.gray600,
  },
  nextButton: {
    flex: 1,
  },
});
