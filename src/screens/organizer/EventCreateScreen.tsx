import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList } from '../../types';
import MapPickerModal from '../../components/common/MapPickerModal';
import AIUsageBadge from '../../components/events/AIUsageBadge';
import {
  EventStep1Info,
  EventStep2DateTime,
  EventStep3Pricing,
  EventStep4Sessions,
} from '../../components/organizer';
import { useEventForm, STEPS } from '../../hooks/useEventForm';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function EventCreateScreen() {
  const navigation = useNavigation<NavigationProp>();
  const alertActions = useAlert();
  const { showAlert } = alertActions;
  const { colors, isDark } = useTheme();

  const {
    form,
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
    // Visibility
    setVisibility,
    setAccessCode,
    // Step 2
    setStartDate,
    setEndDate,
    setRegistrationDeadline,
    setHasRegistrationDeadline,
    setLocationType,
    setLocationName,
    setLocationCity,
    setLocationAddress,
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
    // Utils
    formatDate,
  } = useEventForm(alertActions);

  const onSubmit = async () => {
    const eventId = await handleSubmit();
    if (eventId) {
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
            onPress: () => resetForm(),
          },
        ],
        'success'
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={styles.keyboardView}>
        {/* Header */}
        <View style={[styles.headerBar, { backgroundColor: colors.card, borderBottomColor: colors.gray100 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.gray900} />
          </TouchableOpacity>
          <Text style={[styles.headerBarTitle, { color: colors.gray900 }]}>Créer un événement</Text>
          {form.aiEnabled ? <AIUsageBadge usage={form.aiUsage} /> : <View style={{ width: 40 }} />}
        </View>

        {/* Progress Steps */}
        <View style={[styles.progressContainer, { backgroundColor: colors.card, borderBottomColor: colors.gray100 }]}>
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <TouchableOpacity
                style={[
                  styles.stepIndicator,
                  { backgroundColor: colors.gray200 },
                  form.currentStep >= step.id && styles.stepIndicatorActive,
                  form.currentStep === step.id && styles.stepIndicatorCurrent,
                ]}
                onPress={() => goToStep(step.id)}
              >
                <Ionicons
                  name={step.icon as any}
                  size={18}
                  color={form.currentStep >= step.id ? Colors.white : colors.gray400}
                />
              </TouchableOpacity>
              {index < STEPS.length - 1 && (
                <View style={[styles.stepLine, { backgroundColor: colors.gray200 }, form.currentStep > step.id && styles.stepLineActive]} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Step Content */}
        <KeyboardAwareScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bottomOffset={80}
        >
          {form.currentStep === 1 && (
            <EventStep1Info
              title={form.title}
              description={form.description}
              shortDescription={form.shortDescription}
              eventType={form.eventType}
              categoryId={form.categoryId}
              selectedTagIds={form.selectedTagIds}
              customTags={form.customTags}
              bannerImage={form.bannerImage}
              categories={form.categories}
              availableTags={form.availableTags}
              aiEnabled={form.aiEnabled}
              aiLoading={form.aiLoading}
              aiResult={form.aiResult}
              aiError={form.aiError}
              aiUsage={form.aiUsage}
              aiTitleLoading={form.aiTitleLoading}
              aiDescLoading={form.aiDescLoading}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              onShortDescriptionChange={setShortDescription}
              onEventTypeChange={setEventType}
              onCategoryChange={setCategoryId}
              onTagsChange={setSelectedTagIds}
              onCustomTagAdd={handleCustomTagAdd}
              onCustomTagRemove={handleCustomTagRemove}
              onPickImage={pickImage}
              onRemoveImage={() => setBannerImage(null)}
              visibility={form.visibility}
              accessCode={form.accessCode}
              onVisibilityChange={setVisibility}
              onAccessCodeChange={setAccessCode}
              onAIGenerate={handleAIGenerate}
              onAIApply={handleAIApply}
              onOptimizeTitle={handleOptimizeTitle}
              onGenerateDescription={handleGenerateDescription}
            />
          )}

          {form.currentStep === 2 && (
            <EventStep2DateTime
              startDate={form.startDate}
              endDate={form.endDate}
              registrationDeadline={form.registrationDeadline}
              hasRegistrationDeadline={form.hasRegistrationDeadline}
              locationType={form.locationType}
              locationName={form.locationName}
              locationCity={form.locationCity}
              locationAddress={form.locationAddress}
              locationLatitude={form.locationLatitude}
              locationLongitude={form.locationLongitude}
              onlineUrl={form.onlineUrl}
              onlinePlatform={form.onlinePlatform}
              onlineInstructions={form.onlineInstructions}
              onlineMeetingId={form.onlineMeetingId}
              onlinePasscode={form.onlinePasscode}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onRegistrationDeadlineChange={setRegistrationDeadline}
              onHasRegistrationDeadlineChange={setHasRegistrationDeadline}
              onLocationTypeChange={setLocationType}
              onLocationNameChange={setLocationName}
              onLocationCityChange={setLocationCity}
              onLocationAddressChange={setLocationAddress}
              onShowMapPicker={() => setShowMapPicker(true)}
              onOnlineUrlChange={setOnlineUrl}
              onOnlinePlatformChange={setOnlinePlatform}
              onOnlineInstructionsChange={setOnlineInstructions}
              onOnlineMeetingIdChange={setOnlineMeetingId}
              onOnlinePasscodeChange={setOnlinePasscode}
            />
          )}

          {form.currentStep === 3 && (
            <EventStep3Pricing
              eventType={form.eventType}
              isFree={form.isFree}
              maxParticipants={form.maxParticipants}
              autoApproveRegistrations={form.autoApproveRegistrations}
              startDate={form.startDate}
              ticketTypes={form.ticketTypes}
              showFormFieldsForBilletterie={form.showFormFieldsForBilletterie}
              formFields={form.formFields}
              title={form.title}
              locationType={form.locationType}
              locationCity={form.locationCity}
              formatDate={formatDate}
              aiEnabled={form.aiEnabled}
              aiPricingLoading={form.aiPricingLoading}
              onIsFreeChange={setIsFree}
              onMaxParticipantsChange={setMaxParticipants}
              onAutoApproveChange={setAutoApproveRegistrations}
              onAddTicketType={addTicketType}
              onUpdateTicketType={updateTicketType}
              onRemoveTicketType={removeTicketType}
              onAddFormField={addFormField}
              onUpdateFormField={updateFormField}
              onRemoveFormField={removeFormField}
              onShowFormFieldsForBilletterieChange={setShowFormFieldsForBilletterie}
              onSetFormFields={setFormFields}
              onSuggestPricing={handleSuggestPricing}
            />
          )}

          {form.currentStep === 4 && (
            <EventStep4Sessions
              sessions={form.sessions}
              onAddSession={addSession}
              onUpdateSession={updateSession}
              onRemoveSession={removeSession}
            />
          )}
        </KeyboardAwareScrollView>

        {/* Navigation Buttons */}
        <View style={[styles.navigationButtons, { backgroundColor: colors.card, borderTopColor: colors.gray100 }]}>
          {form.currentStep > 1 && (
            <TouchableOpacity style={[styles.prevButton, { backgroundColor: colors.gray100 }]} onPress={goToPrevStep}>
              <Ionicons name="arrow-back" size={20} color={colors.gray600} />
              <Text style={[styles.prevButtonText, { color: colors.gray600 }]}>Précédent</Text>
            </TouchableOpacity>
          )}

          {form.currentStep < STEPS.length ? (
            <TouchableOpacity
              style={[styles.nextButton, form.currentStep === 1 && { flex: 1 }]}
              onPress={goToNextStep}
            >
              <Text style={styles.nextButtonText}>Suivant</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitButton, form.loading && styles.submitButtonDisabled]}
              onPress={onSubmit}
              disabled={form.loading}
            >
              {form.loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              )}
              <Text style={styles.submitButtonText}>
                {form.loading ? 'Création...' : 'Créer l\'événement'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Map Picker Modal */}
      <MapPickerModal
        visible={form.showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onLocationSelect={handleMapLocationSelect}
        initialLat={form.locationLatitude ? parseFloat(form.locationLatitude) : undefined}
        initialLng={form.locationLongitude ? parseFloat(form.locationLongitude) : undefined}
      />
    </SafeAreaView>
  );
}

// ============================================
// Screen-level styles only
// ============================================
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
});
