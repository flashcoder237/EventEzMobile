import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

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
import { useEventDraft } from '../../hooks/useEventDraft';
import { useNamedDrafts } from '../../hooks/useNamedDrafts';
import { formToPreviewEvent } from '../../lib/utils/eventPreview';
import {
  Colors,
  FontFamily,
  FontSizes,
  Spacing,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EditRouteType = RouteProp<RootStackParamList, 'EventEdit'>;

const CANVAS_LIGHT = '#F4F3F0';

export default function EventCreateScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  // Le screen est utilise pour Create et Edit. En Edit, route.params.eventId existe.
  const eventId = (route.params as EditRouteType['params'] | undefined)?.eventId;
  const draftId = (route.params as { draftId?: string } | undefined)?.draftId;
  const isEditing = !!eventId;

  const alertActions = useAlert();
  const { showAlert, showConfirm } = alertActions;
  const { colors, isDark } = useTheme();
  const canvasBg = isDark ? colors.background : CANVAS_LIGHT;
  const watermarkColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(17,17,16,0.04)';
  const barDim = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(17,17,16,0.08)';
  const hairline = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(17,17,16,0.08)';

  const {
    form,
    goToNextStep,
    goToPrevStep,
    goToStep,
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
    pickGalleryImages,
    removeGalleryImage,
    setVisibility,
    setAccessCode,
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
    setIsFree,
    setMaxParticipants,
    setAutoApproveRegistrations,
    setFeeBearer,
    addTicketType,
    updateTicketType,
    removeTicketType,
    addFormField,
    updateFormField,
    removeFormField,
    setShowFormFieldsForBilletterie,
    setFormFields,
    addSession,
    updateSession,
    removeSession,
    handleAIGenerate,
    handleAIApply,
    handleOptimizeTitle,
    handleGenerateDescription,
    handleSuggestPricing,
    handleSubmit,
    resetForm,
    hydrateForm,
    formatDate,
  } = useEventForm(alertActions, eventId);

  // Le systeme de brouillon n'a de sens qu'en mode creation : en edition,
  // la source de verite est l'evenement existant cote backend.
  const { hasDraft, draftTitle, draftLoading, draftJustSaved, loadDraft, scheduleSave, saveNow, clearDraft } = useEventDraft();
  const { saveAsNamed, loadById: loadNamedDraftById } = useNamedDrafts();
  const draftCheckedRef = useRef(false);
  const namedDraftLoadedRef = useRef(false);
  const formRef = useRef(form);
  formRef.current = form;

  // Si on arrive avec un draftId, hydrate le form depuis le brouillon nommé
  useEffect(() => {
    if (isEditing) return;
    if (!draftId) return;
    if (namedDraftLoadedRef.current) return;
    namedDraftLoadedRef.current = true;
    (async () => {
      const data = await loadNamedDraftById(draftId);
      if (data) hydrateForm(data);
    })();
  }, [draftId, isEditing, loadNamedDraftById, hydrateForm]);

  useEffect(() => {
    if (isEditing) return;
    if (draftLoading || draftCheckedRef.current) return;
    draftCheckedRef.current = true;

    if (hasDraft) {
      showAlert(
        'Brouillon trouvé',
        `Tu as un brouillon "${draftTitle}" en cours. Tu veux le reprendre ?`,
        [
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: () => clearDraft(),
          },
          {
            text: 'Reprendre',
            onPress: async () => {
              const data = await loadDraft();
              if (data) hydrateForm(data);
            },
          },
        ],
        'info'
      );
    }
  }, [isEditing, draftLoading, hasDraft, draftTitle, showAlert, clearDraft, loadDraft, hydrateForm]);

  useEffect(() => {
    if (isEditing) return;
    if (draftLoading) return;
    const hasContent =
      form.title.trim() ||
      form.description.trim() ||
      form.shortDescription.trim() ||
      form.bannerImage ||
      form.galleryImages.length > 0 ||
      form.locationName.trim() ||
      form.locationCity.trim() ||
      form.ticketTypes.length > 0 ||
      form.formFields.length > 0 ||
      form.sessions.length > 0;
    if (!hasContent) return;

    scheduleSave(form);
  }, [
    isEditing, draftLoading, scheduleSave,
    form.currentStep, form.title, form.description, form.shortDescription,
    form.eventType, form.categoryId, form.selectedTagIds, form.customTags,
    form.bannerImage, form.galleryImages, form.startDate, form.endDate, form.registrationDeadline,
    form.hasRegistrationDeadline, form.locationType, form.locationName,
    form.locationCity, form.locationAddress, form.locationCountry,
    form.onlineUrl, form.onlinePlatform, form.onlineInstructions,
    form.onlineMeetingId, form.onlinePasscode, form.locationLatitude,
    form.locationLongitude, form.isFree, form.maxParticipants,
    form.autoApproveRegistrations, form.ticketTypes, form.formFields,
    form.showFormFieldsForBilletterie, form.visibility, form.accessCode,
    form.sessions,
  ]);

  const handleBack = useCallback(async () => {
    if (!isEditing) {
      const hasContent =
        formRef.current.title.trim() ||
        formRef.current.description.trim() ||
        formRef.current.bannerImage ||
        formRef.current.galleryImages.length > 0 ||
        formRef.current.ticketTypes.length > 0 ||
        formRef.current.sessions.length > 0;
      if (hasContent) {
        await saveNow(formRef.current);
      }
    }
    navigation.goBack();
  }, [isEditing, saveNow, navigation]);

  const onSubmit = async () => {
    const result = await handleSubmit();
    if (!result) return;

    if (isEditing) {
      showAlert(
        'Succès',
        "L'événement a été mis à jour avec succès.",
        [
          {
            text: 'Voir mes événements',
            onPress: () => navigation.navigate('MyEvents'),
          },
          {
            text: 'Continuer',
            style: 'cancel',
          },
        ],
        'success'
      );
    } else {
      await clearDraft();
      showAlert(
        'Succès',
        "Ton événement a été soumis pour validation. Tu seras notifié·e dès qu'il sera approuvé. Délai habituel : moins de 24h.",
        [
          {
            text: 'Voir mes événements',
            onPress: () => navigation.navigate('MyEvents'),
          },
          {
            text: 'Créer un autre',
            onPress: async () => {
              await clearDraft();
              resetForm();
            },
          },
        ],
        'success'
      );
    }
  };

  const stepNumeral = String(form.currentStep).padStart(2, '0');
  const totalNumeral = String(STEPS.length).padStart(2, '0');
  const currentStepConfig = STEPS[form.currentStep - 1];

  const eyebrowText = isEditing
    ? `Modifier · Étape ${stepNumeral} / ${totalNumeral}`
    : `Étape ${stepNumeral} / ${totalNumeral}`;
  const titleFallback = isEditing ? "Modifier l'événement" : 'Créer un événement';
  const submitLabel = form.loading
    ? (isEditing ? 'Mise à jour...' : 'Création...')
    : (isEditing ? 'Mettre à jour' : "Publier l'événement");
  const submitEyebrow = isEditing ? 'Sauvegarder' : 'Finaliser';
  const submitA11yLabel = isEditing ? "Mettre à jour l'événement" : "Créer l'événement";

  // Loading initial uniquement en mode edition (le fetch peut prendre quelques centaines de ms)
  if (isEditing && form.loading && !form.title) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: canvasBg }]} edges={['top', 'bottom']}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={canvasBg} />
        <View style={styles.keyboardView}>
          <View style={styles.headerBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={22} color={colors.gray900} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={[styles.headerBarEyebrow, { color: colors.gray500 }]}>Modifier</Text>
              <Text style={[styles.headerBarTitle, { color: colors.gray900 }]} numberOfLines={1}>
                Chargement…
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.gray500 }]}>
              Chargement de l'événement...
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: canvasBg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={canvasBg} />
      <View style={styles.keyboardView}>
        {/* Header — editorial, transparent, blends with canvas */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.gray900} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerBarEyebrow, { color: colors.gray500 }]}>
              {eyebrowText}
            </Text>
            <Text style={[styles.headerBarTitle, { color: colors.gray900 }]} numberOfLines={1}>
              {currentStepConfig?.shortTitle || titleFallback}
            </Text>
            {!isEditing && draftJustSaved && (
              <Animated.View
                entering={FadeIn.duration(300)}
                exiting={FadeOut.duration(300)}
                style={styles.savedBadge}
              >
                <Ionicons name="cloud-done-outline" size={10} color={colors.success} />
                <Text style={[styles.savedBadgeText, { color: colors.success }]}>Sauvegardé</Text>
              </Animated.View>
            )}
          </View>

          {/* Actions header — 3 icon discs alignés (preview · reset · save-as)
              Style éditorial : disc 36px hairline border, cohérent avec
              l'iconDisc utilisé dans AdminDashboard et autres écrans. */}
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => {
                if (!formRef.current.title.trim()) {
                  showAlert(
                    'Titre requis',
                    'Saisis au moins le titre de l\'événement avant de prévisualiser.',
                    undefined,
                    'info',
                  );
                  return;
                }
                const previewEvent = formToPreviewEvent(formRef.current);
                navigation.navigate('EventDetails', {
                  eventId: 'preview',
                  previewEvent,
                });
              }}
              style={[
                styles.headerIconDisc,
                { backgroundColor: colors.card, borderColor: hairline },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Prévisualiser l'événement"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="eye-outline" size={17} color={colors.gray700} />
            </TouchableOpacity>

            {!isEditing && (
              <TouchableOpacity
                onPress={() => {
                  showAlert(
                    'Réinitialiser le formulaire ?',
                    'Toutes les données saisies seront perdues, y compris le brouillon en cours. Cette action est irréversible.',
                    [
                      { text: 'Annuler', style: 'cancel' },
                      {
                        text: 'Tout effacer',
                        style: 'destructive',
                        onPress: async () => {
                          await clearDraft();
                          resetForm();
                        },
                      },
                    ],
                    'warning',
                  );
                }}
                style={[
                  styles.headerIconDisc,
                  { backgroundColor: colors.card, borderColor: hairline },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Réinitialiser le formulaire"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="refresh-outline" size={17} color={colors.gray700} />
              </TouchableOpacity>
            )}

            {!isEditing && (
              <TouchableOpacity
                onPress={() => {
                  showAlert(
                    'Sauvegarder sous...',
                    'Donne un nom à ce brouillon pour le retrouver dans "Mes brouillons" plus tard.',
                    [
                      { text: 'Annuler', style: 'cancel' },
                      {
                        text: 'Sauvegarder',
                        onPress: async () => {
                          const name = formRef.current.title?.trim() || 'Brouillon sans titre';
                          const meta = await saveAsNamed(formRef.current, name);
                          showAlert(
                            'Brouillon sauvegardé',
                            `"${meta.name}" est dans Mes brouillons. Tu peux le reprendre depuis MyEvents.`,
                            undefined,
                            'success',
                          );
                        },
                      },
                    ],
                    'info',
                  );
                }}
                style={[
                  styles.headerIconDisc,
                  { backgroundColor: colors.card, borderColor: hairline },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Sauvegarder ce brouillon sous un nom"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="bookmark-outline" size={17} color={colors.gray700} />
              </TouchableOpacity>
            )}

            {form.aiEnabled && <AIUsageBadge usage={form.aiUsage} />}
          </View>
        </View>

        {/* Progress — editorial 4-bar indicator (replaces numbered nodes) */}
        <View style={styles.progressContainer}>
          {STEPS.map((step) => {
            const isActive = form.currentStep === step.id;
            const isCompleted = form.currentStep > step.id;
            return (
              <TouchableOpacity
                key={step.id}
                style={styles.progressBarTrack}
                onPress={() => goToStep(step.id)}
                accessibilityRole="button"
                accessibilityLabel={`Étape ${step.id} sur ${STEPS.length} : ${step.shortTitle}`}
                accessibilityState={{ selected: isActive }}
                hitSlop={{ top: 10, bottom: 10, left: 2, right: 2 }}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: isActive
                        ? colors.primary
                        : isCompleted
                        ? (isDark ? colors.primaryDark : colors.primaryLight)
                        : barDim,
                      height: isActive ? 4 : 3,
                    },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Content with watermark step numeral behind */}
        <View style={styles.scrollWrap}>
          {/* Big faded step numeral — editorial backdrop */}
          <Text
            pointerEvents="none"
            style={[styles.watermarkNumeral, { color: watermarkColor }]}
          >
            {stepNumeral}
          </Text>

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
                onRemoveImage={() =>
                  showConfirm(
                    'Supprimer la bannière ?',
                    "Cette image sera retirée. Tu peux toujours en uploader une nouvelle ensuite.",
                    () => setBannerImage(null),
                  )
                }
                galleryImages={form.galleryImages}
                onPickGalleryImages={pickGalleryImages}
                onRemoveGalleryImage={removeGalleryImage}
                visibility={form.visibility}
                accessCode={form.accessCode}
                onVisibilityChange={setVisibility}
                onAccessCodeChange={setAccessCode}
                onAIGenerate={handleAIGenerate}
                onAIApply={handleAIApply}
                onOptimizeTitle={handleOptimizeTitle}
                onGenerateDescription={handleGenerateDescription}
                stepErrors={form.stepErrors}
                onApplyTemplate={isEditing ? undefined : (template) => {
                  // Hydrate les champs du form depuis le template. On évite
                  // d'écraser ce que l'utilisateur a déjà tapé : on ne touche
                  // un champ que s'il est encore vide.
                  if (!form.title && template.name) setTitle(template.name);
                  if (!form.description && template.description_skeleton) {
                    setDescription(template.description_skeleton);
                  }
                  if (template.event_type) setEventType(template.event_type);
                  if (template.location_type) setLocationType(template.location_type);
                  if (template.category != null) setCategoryId(template.category);
                  if (Array.isArray(template.tags) && template.tags.length > 0) {
                    template.tags.forEach((t) => handleCustomTagAdd(t));
                  }
                }}
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
                stepErrors={form.stepErrors}
              />
            )}

            {form.currentStep === 3 && (
              <EventStep3Pricing
                eventType={form.eventType}
                isFree={form.isFree}
                maxParticipants={form.maxParticipants}
                autoApproveRegistrations={form.autoApproveRegistrations}
                feeBearer={form.feeBearer}
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
                onFeeBearerChange={setFeeBearer}
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
        </View>

        {/* Sticky Bottom Nav — ghost Retour + pill CTA with dual label + arrow disc */}
        <View
          style={[
            styles.navigationButtons,
            {
              backgroundColor: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(244,243,240,0.9)',
              borderTopColor: isDark ? colors.gray100 : 'rgba(17,17,16,0.06)',
            },
          ]}
        >
          {form.currentStep > 1 ? (
            <TouchableOpacity
              style={styles.prevButtonGhost}
              onPress={goToPrevStep}
              accessibilityRole="button"
              accessibilityLabel="Étape précédente"
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Ionicons name="chevron-back" size={16} color={colors.gray500} />
              <Text style={[styles.prevButtonGhostText, { color: colors.gray600 }]}>Retour</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 80 }} />
          )}

          {form.currentStep < STEPS.length ? (
            <TouchableOpacity
              style={[
                styles.nextButton,
                { backgroundColor: colors.primary, shadowColor: colors.primary },
              ]}
              onPress={goToNextStep}
              accessibilityRole="button"
              accessibilityLabel="Étape suivante"
              activeOpacity={0.88}
            >
              <View style={styles.nextButtonContent}>
                <Text style={styles.nextButtonEyebrow}>Suivant</Text>
                <Text style={styles.nextButtonLabel} numberOfLines={1}>
                  {currentStepConfig?.nextLabel}
                </Text>
              </View>
              <View style={styles.nextButtonArrow}>
                <Ionicons name="arrow-forward" size={16} color={'#FFFFFF'} />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary, shadowColor: colors.primary },
                form.loading && styles.submitButtonDisabled,
              ]}
              onPress={onSubmit}
              disabled={form.loading}
              accessibilityRole="button"
              accessibilityLabel={submitA11yLabel}
              activeOpacity={0.88}
            >
              <View style={styles.nextButtonContent}>
                <Text style={styles.nextButtonEyebrow}>{submitEyebrow}</Text>
                <Text style={styles.nextButtonLabel} numberOfLines={1}>
                  {submitLabel}
                </Text>
              </View>
              <View style={styles.nextButtonArrow}>
                {form.loading ? (
                  <ActivityIndicator size="small" color={'#FFFFFF'} />
                ) : (
                  <Ionicons name="checkmark" size={18} color={'#FFFFFF'} />
                )}
              </View>
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
// Screen-level styles — editorial shell
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
  },
  // Header — no card bg, transparent, blends with canvas
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -Spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerIconDisc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  headerBarEyebrow: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerBarTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.3,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  savedBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  // Progress — 4 horizontal bars (active indigo, completed dim primary, future 8% ink)
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.base,
    paddingTop: 2,
  },
  progressBarTrack: {
    flex: 1,
    height: 10,
    justifyContent: 'center',
  },
  progressBarFill: {
    width: '100%',
    borderRadius: 2,
  },
  // Scroll wrapper so the watermark numeral can sit behind the scroll content
  scrollWrap: {
    flex: 1,
    position: 'relative',
  },
  watermarkNumeral: {
    position: 'absolute',
    top: -20,
    left: -16,
    fontSize: 220,
    fontFamily: FontFamily.displayExtraBold,
    lineHeight: 200,
    letterSpacing: -12,
    zIndex: 0,
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl * 2,
  },
  // Bottom nav
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: 1,
  },
  prevButtonGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: 2,
    minWidth: 80,
  },
  prevButtonGhostText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },
  // Pill CTA — dual-label + arrow disc (matches AIDesigner concept)
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 5,
  },
  nextButtonContent: {
    flex: 1,
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  nextButtonEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: Colors.lime,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    lineHeight: 11,
  },
  nextButtonLabel: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.base,
    color: '#FFFFFF',
    letterSpacing: -0.2,
    marginTop: 2,
  },
  nextButtonArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
});
