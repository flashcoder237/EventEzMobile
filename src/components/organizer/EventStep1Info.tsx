import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { Colors, Spacing, FontFamily, BorderRadius, FontSizes } from '../../constants/theme';
import { Category, Tag, AIUsage, AIGeneratedEvent } from '../../types';
import TagInput from '../common/TagInput';
import SearchableSelectModal from '../common/SearchableSelectModal';
import AIQuickCreatePanel from '../events/AIQuickCreatePanel';
import AIAssistButton from '../events/AIAssistButton';
import EncouragementTip from './EncouragementTip';
import TemplatePicker, { EventTemplate } from './TemplatePicker';
import styles from './eventCreateStyles';
import { useEventCreateThemedStyles } from './useEventCreateThemedStyles';

// Mapping nom Lucide / mot-clé → Ionicon. On essaie un large jeu de
// catégories + un fallback générique.
const CATEGORY_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  Calendar: 'calendar-outline',
  Music: 'musical-notes-outline',
  Mic: 'mic-outline',
  Users: 'people-outline',
  Briefcase: 'briefcase-outline',
  GraduationCap: 'school-outline',
  Trophy: 'trophy-outline',
  Heart: 'heart-outline',
  Camera: 'camera-outline',
  Film: 'film-outline',
  Coffee: 'cafe-outline',
  Star: 'star-outline',
  Globe: 'globe-outline',
  Book: 'book-outline',
  Palette: 'color-palette-outline',
  Cpu: 'hardware-chip-outline',
  Sparkles: 'sparkles-outline',
};

const resolveCategoryIcon = (icon?: string): keyof typeof Ionicons.glyphMap =>
  (icon && CATEGORY_ICON_MAP[icon]) || 'pricetag-outline';

// ============================================
// Props
// ============================================

interface EventStep1InfoProps {
  // Form data
  title: string;
  description: string;
  shortDescription: string;
  eventType: 'billetterie' | 'inscription';
  categoryId: number | null;
  selectedTagIds: number[];
  customTags: string[];
  bannerImage: string | null;

  // Reference data
  categories: Category[];
  availableTags: Tag[];

  // AI state
  aiEnabled: boolean;
  aiLoading: boolean;
  aiResult: AIGeneratedEvent | null;
  aiError: string | null;
  aiUsage: AIUsage | null;
  aiTitleLoading: boolean;
  aiDescLoading: boolean;

  // Handlers
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onShortDescriptionChange: (value: string) => void;
  onEventTypeChange: (value: 'billetterie' | 'inscription') => void;
  onCategoryChange: (value: number | null) => void;
  onTagsChange: (value: number[]) => void;
  onCustomTagAdd: (tag: string) => void;
  onCustomTagRemove: (tag: string) => void;
  onPickImage: () => void;
  onRemoveImage: () => void;
  galleryImages: string[];
  onPickGalleryImages: () => void;
  onRemoveGalleryImage: (index: number) => void;

  // Visibility
  visibility: 'public' | 'unlisted' | 'invite_only';
  accessCode: string;
  onVisibilityChange: (value: 'public' | 'unlisted' | 'invite_only') => void;
  onAccessCodeChange: (value: string) => void;

  // AI handlers
  onAIGenerate: (prompt: string) => void;
  onAIApply: (data: AIGeneratedEvent) => void;
  onOptimizeTitle: () => void;
  onGenerateDescription: () => void;
  /** Map champ → message d'erreur, peuplé après un goToNextStep raté. Optionnel. */
  stepErrors?: Record<string, string>;
  /**
   * Optionnel : applique un template événement au form. Si absent, le picker
   * n'est pas affiché. Hydraté par le hook useEventForm.
   */
  onApplyTemplate?: (template: EventTemplate) => void;
}

// ============================================
// Component
// ============================================

export default function EventStep1Info({
  title,
  description,
  shortDescription,
  eventType,
  categoryId,
  selectedTagIds,
  customTags,
  bannerImage,
  categories,
  availableTags,
  aiEnabled,
  aiLoading,
  aiResult,
  aiError,
  aiUsage,
  aiTitleLoading,
  aiDescLoading,
  onTitleChange,
  onDescriptionChange,
  onShortDescriptionChange,
  onEventTypeChange,
  onCategoryChange,
  onTagsChange,
  onCustomTagAdd,
  onCustomTagRemove,
  onPickImage,
  onRemoveImage,
  galleryImages,
  onPickGalleryImages,
  onRemoveGalleryImage,
  visibility,
  accessCode,
  onVisibilityChange,
  onAccessCodeChange,
  onAIGenerate,
  onAIApply,
  onOptimizeTitle,
  onGenerateDescription,
  stepErrors = {},
  onApplyTemplate,
}: EventStep1InfoProps) {
  const { colors, isDark } = useTheme();
  const themed = useEventCreateThemedStyles();
  const hairline = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(17,17,16,0.08)';
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const selectedCategory = categories.find(c => c.id === categoryId) || null;

  return (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, themed.stepTitle]}>À quoi ressemble votre événement ?</Text>
      <Text style={[styles.stepDescription, themed.stepDescription]}>
        Commencez par l'affiche et l'histoire. Les détails pratiques viennent ensuite.
      </Text>

      {/* Templates — raccourci pour bootstrapper le form depuis un modèle. Si
          le parent ne fournit pas onApplyTemplate, on cache la section. */}
      {onApplyTemplate ? <TemplatePicker onApply={onApplyTemplate} /> : null}

      {/* AI Quick Create */}
      <AIQuickCreatePanel
        onGenerate={onAIGenerate}
        onApply={onAIApply}
        isLoading={aiLoading}
        result={aiResult}
        error={aiError}
        disabled={!aiUsage || (aiUsage.daily_limit > 0 && aiUsage.daily_count >= aiUsage.daily_limit)}
        aiEnabled={aiEnabled}
      />

      {/* Banner Image */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, themed.label]}>Affiche</Text>
        <TouchableOpacity style={[styles.imagePickerButton, themed.imagePickerButton]} onPress={onPickImage}>
          {bannerImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={bannerImage} style={styles.imagePreview} cachePolicy="memory-disk" transition={200} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={onRemoveImage}
              >
                <Ionicons name="close-circle" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.imagePickerPlaceholder, themed.imagePickerPlaceholder]}>
              <View style={[styles.imagePickerIconBubble, themed.imagePickerIconBubble]}>
                <Ionicons name="image-outline" size={26} color={themed.imagePickerIconColor} />
              </View>
              <View style={styles.imagePickerTextGroup}>
                <Text style={[styles.imagePickerText, themed.imagePickerText]}>Ajouter une affiche</Text>
                <Text style={[styles.imagePickerSubtext, themed.imagePickerSubtext]}>1920×1080 recommandé</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Encouragement tip — appears once a banner is uploaded */}
      {bannerImage && (
        <EncouragementTip
          tone="accent"
          icon="sparkles"
          title="Ça donne envie !"
          message="Une affiche claire augmente sensiblement le taux d'inscription. Tu es sur la bonne voie."
        />
      )}

      {/* Gallery Images */}
      <View style={styles.inputGroup}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
          <Text style={[styles.label, themed.label]}>
            Galerie de photos
            {galleryImages.length > 0 ? ` (${galleryImages.length}/10)` : ''}
          </Text>
          {galleryImages.length < 10 && (
            <TouchableOpacity onPress={onPickGalleryImages} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={{ fontFamily: FontFamily.semiBold, color: colors.primary, fontSize: 13 }}>Ajouter</Text>
            </TouchableOpacity>
          )}
        </View>
        {galleryImages.length === 0 ? (
          <TouchableOpacity
            style={[styles.imagePickerButton, themed.imagePickerButton, { height: 72 }]}
            onPress={onPickGalleryImages}
          >
            <View style={[styles.imagePickerPlaceholder, themed.imagePickerPlaceholder, { paddingVertical: 12 }]}>
              <Ionicons name="images-outline" size={28} color={colors.gray400} />
              <Text style={[styles.imagePickerText, themed.imagePickerText]}>Ajouter des photos supplémentaires</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <FlatList
            horizontal
            data={galleryImages}
            keyExtractor={(_, i) => i.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item, index }) => (
              <View style={{ position: 'relative' }}>
                <Image source={item} style={{ width: 90, height: 70, borderRadius: 8 }} cachePolicy="memory-disk" transition={200} />
                <TouchableOpacity
                  style={{ position: 'absolute', top: -6, right: -6 }}
                  onPress={() => onRemoveGalleryImage(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>

      {/* Title — editorial display font + char counter inline */}
      <View style={styles.inputGroup}>
        <View style={styles.labelRow}>
          <Text style={[styles.labelRowLabel, themed.labelRowLabel]}>Titre de l'événement *</Text>
          <Text style={[styles.labelRowCounter, themed.labelRowCounter]}>{title.length}/80</Text>
        </View>
        <TextInput
          style={[
            styles.input,
            styles.inputTitle,
            themed.input,
            stepErrors.title && { borderColor: '#EF4444', borderWidth: 1.5 },
          ]}
          value={title}
          onChangeText={onTitleChange}
          placeholder="Ex: Masterclass Jazz au Palais"
          placeholderTextColor={colors.gray400}
          maxLength={80}
        />
        {stepErrors.title && (
          <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, fontFamily: FontFamily.medium }}>
            {stepErrors.title}
          </Text>
        )}
        {aiEnabled && (
          <View style={{ marginTop: Spacing.sm, alignSelf: 'flex-start' }}>
            <AIAssistButton
              label="Optimiser avec l'IA"
              onPress={onOptimizeTitle}
              isLoading={aiTitleLoading}
              disabled={!title.trim() || title.length < 5}
            />
          </View>
        )}
      </View>

      {/* Short Description — label row with counter */}
      <View style={styles.inputGroup}>
        <View style={styles.labelRow}>
          <Text style={[styles.labelRowLabel, themed.labelRowLabel]}>Description courte</Text>
          <Text style={[styles.labelRowCounter, themed.labelRowCounter]}>{shortDescription.length}/150</Text>
        </View>
        <TextInput
          style={[styles.input, themed.input]}
          value={shortDescription}
          onChangeText={onShortDescriptionChange}
          placeholder="Un résumé en quelques mots"
          placeholderTextColor={colors.gray400}
          maxLength={150}
        />
      </View>

      {/* Full Description */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, themed.label]}>L'histoire de l'événement *</Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            themed.input,
            stepErrors.description && { borderColor: '#EF4444', borderWidth: 1.5 },
          ]}
          value={description}
          onChangeText={onDescriptionChange}
          placeholder="Qu'est-ce qui rend ton événement unique ? Pourquoi les gens doivent-ils absolument venir ?"
          placeholderTextColor={colors.gray400}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
        {stepErrors.description && (
          <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, fontFamily: FontFamily.medium }}>
            {stepErrors.description}
          </Text>
        )}
        {aiEnabled && (
          <View style={{ marginTop: Spacing.sm, alignSelf: 'flex-start' }}>
            <AIAssistButton
              label="Rédiger un brouillon avec l'IA"
              onPress={onGenerateDescription}
              isLoading={aiDescLoading}
              disabled={!title.trim()}
            />
          </View>
        )}
      </View>

      {/* Event Type */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, themed.label]}>Type d'événement *</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeOption, themed.typeOption, eventType === 'billetterie' && styles.typeOptionActive]}
            onPress={() => onEventTypeChange('billetterie')}
          >
            <Ionicons
              name="ticket-outline"
              size={20}
              color={eventType === 'billetterie' ? Colors.white : colors.gray600}
            />
            <Text style={[styles.typeOptionText, themed.typeOptionText, eventType === 'billetterie' && styles.typeOptionTextActive]}>
              Billetterie
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeOption, themed.typeOption, eventType === 'inscription' && styles.typeOptionActive]}
            onPress={() => onEventTypeChange('inscription')}
          >
            <Ionicons
              name="create-outline"
              size={20}
              color={eventType === 'inscription' ? Colors.white : colors.gray600}
            />
            <Text style={[styles.typeOptionText, themed.typeOptionText, eventType === 'inscription' && styles.typeOptionTextActive]}>
              Inscription
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category — bouton-trigger qui ouvre un modal de recherche.
          Avant : ScrollView horizontal de chips (mauvais quand 20+ catégories).
          Maintenant : un seul bouton qui montre la catégorie sélectionnée
          (icône + nom) ou un placeholder, et ouvre la liste filtrée au tap. */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, themed.label]}>Catégorie *</Text>
        <TouchableOpacity
          onPress={() => setCategoryModalOpen(true)}
          style={[
            categorySelectStyles.trigger,
            { backgroundColor: colors.card, borderColor: hairline },
          ]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={
            selectedCategory
              ? `Catégorie : ${selectedCategory.name}. Toucher pour changer.`
              : 'Choisir une catégorie'
          }
        >
          {selectedCategory ? (
            <>
              <View
                style={[
                  categorySelectStyles.iconWell,
                  { backgroundColor: `${colors.primary}14` },
                ]}
              >
                <Ionicons
                  name={resolveCategoryIcon(selectedCategory.icon)}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[categorySelectStyles.triggerLabel, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {selectedCategory.name}
                </Text>
                {!!selectedCategory.description && (
                  <Text
                    style={[categorySelectStyles.triggerDesc, { color: colors.gray500 }]}
                    numberOfLines={1}
                  >
                    {selectedCategory.description}
                  </Text>
                )}
              </View>
            </>
          ) : (
            <>
              <View
                style={[
                  categorySelectStyles.iconWell,
                  { backgroundColor: colors.gray100 },
                ]}
              >
                <Ionicons name="pricetag-outline" size={18} color={colors.gray500} />
              </View>
              <Text
                style={[categorySelectStyles.triggerPlaceholder, { color: colors.gray500 }]}
              >
                Choisir une catégorie
              </Text>
            </>
          )}
          <Ionicons name="chevron-down" size={18} color={colors.gray400} />
        </TouchableOpacity>
      </View>

      <SearchableSelectModal<Category>
        visible={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        eyebrow="ÉVÉNEMENT"
        title="Catégorie"
        searchPlaceholder="Rechercher une catégorie..."
        items={categories}
        getKey={c => String(c.id)}
        getLabel={c => c.name}
        getDescription={c => c.description}
        getIcon={c => resolveCategoryIcon(c.icon)}
        selectedKey={categoryId != null ? String(categoryId) : null}
        onSelect={c => onCategoryChange(c.id)}
        onClear={() => onCategoryChange(null)}
        emptyText="Aucune catégorie ne correspond à cette recherche."
      />

      {/* Tags */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, themed.label]}>Tags</Text>
        <Text style={[styles.inputHint, themed.inputHint]}>
          Ajoutez des mots-clés pour aider les participants à trouver votre événement
        </Text>
        <View style={{ marginTop: Spacing.sm }}>
          <TagInput
            existingTags={availableTags}
            selectedTagIds={selectedTagIds}
            customTags={customTags}
            onTagsChange={onTagsChange}
            onCustomTagAdd={onCustomTagAdd}
            onCustomTagRemove={onCustomTagRemove}
          />
        </View>
      </View>

      {/* Visibility */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, themed.label]}>Visibilité</Text>
        <Text style={[styles.inputHint, themed.inputHint]}>Qui peut voir et accéder à votre événement</Text>
        <View style={styles.optionCardRow}>
          {([
            { value: 'public' as const, label: 'Public', icon: 'globe-outline' as const, desc: 'Visible par tous' },
            { value: 'unlisted' as const, label: 'Non listé', icon: 'link-outline' as const, desc: 'Via le lien' },
            { value: 'invite_only' as const, label: 'Invitation', icon: 'lock-closed-outline' as const, desc: 'Sur invitation' },
          ]).map((opt) => {
            const active = visibility === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => onVisibilityChange(opt.value)}
                activeOpacity={0.85}
                style={[styles.optionCard, themed.optionCard, active && [styles.optionCardActive, themed.optionCardActive]]}
              >
                <View style={[styles.optionCardIconWrap, themed.optionCardIconWrap, active && [styles.optionCardIconWrapActive, themed.optionCardIconWrapActive]]}>
                  <Ionicons
                    name={opt.icon}
                    size={18}
                    color={active ? themed.optionCardIconActiveColor : themed.optionCardIconIdleColor}
                  />
                </View>
                <Text style={[styles.optionCardLabel, themed.optionCardLabel, active && [styles.optionCardLabelActive, themed.optionCardLabelActive]]}>
                  {opt.label}
                </Text>
                <Text style={[styles.optionCardDesc, themed.optionCardDesc, active && [styles.optionCardDescActive, themed.optionCardDescActive]]}>
                  {opt.desc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Access Code (optional) */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, themed.label]}>Code d'accès (optionnel)</Text>
        <Text style={[styles.inputHint, themed.inputHint]}>
          Les visiteurs devront entrer ce code pour voir les détails
        </Text>
        <TextInput
          style={[styles.input, themed.input]}
          value={accessCode}
          onChangeText={onAccessCodeChange}
          placeholder="Laisser vide pour pas de code"
          placeholderTextColor={colors.gray400}
          secureTextEntry={false}
        />
      </View>

      {/* Featured Event Info */}
      <View style={[styles.warningInfoBox, themed.warningInfoBox]}>
        <Ionicons name="star-outline" size={20} color={colors.warningDark} />
        <Text style={[styles.warningInfoBoxText, themed.warningInfoBoxText]}>
          Vous pourrez demander la mise en avant de votre événement après sa création depuis "Mes événements".
        </Text>
      </View>
    </View>
  );
}

// Styles spécifiques au trigger Catégorie (le contenu du modal vit dans
// SearchableSelectModal). Pas dans eventCreateStyles parce que c'est très
// localisé et ne sera réutilisé par aucun autre step.
const categorySelectStyles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  iconWell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.2,
  },
  triggerDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginTop: 1,
  },
  triggerPlaceholder: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.base,
    letterSpacing: -0.1,
  },
});
