import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { Colors, Spacing, FontFamily } from '../../constants/theme';
import { Category, Tag, AIUsage, AIGeneratedEvent } from '../../types';
import TagInput from '../common/TagInput';
import AIQuickCreatePanel from '../events/AIQuickCreatePanel';
import AIAssistButton from '../events/AIAssistButton';
import EncouragementTip from './EncouragementTip';
import styles from './eventCreateStyles';
import { useEventCreateThemedStyles } from './useEventCreateThemedStyles';

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
}: EventStep1InfoProps) {
  const { colors, isDark } = useTheme();
  const themed = useEventCreateThemedStyles();

  return (
    <View style={styles.stepContent}>
      <Text style={[styles.stepTitle, themed.stepTitle]}>À quoi ressemble votre événement ?</Text>
      <Text style={[styles.stepDescription, themed.stepDescription]}>
        Commencez par l'affiche et l'histoire. Les détails pratiques viennent ensuite.
      </Text>

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
              <Image source={bannerImage} style={styles.imagePreview} cachePolicy="disk" transition={200} />
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
                <Image source={item} style={{ width: 90, height: 70, borderRadius: 8 }} cachePolicy="disk" transition={200} />
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
          style={[styles.input, styles.inputTitle, themed.input]}
          value={title}
          onChangeText={onTitleChange}
          placeholder="Ex: Masterclass Jazz au Palais"
          placeholderTextColor={colors.gray400}
          maxLength={80}
        />
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
          style={[styles.input, styles.textArea, themed.input]}
          value={description}
          onChangeText={onDescriptionChange}
          placeholder="Qu'est-ce qui rend votre événement unique ? Pourquoi les gens doivent-ils absolument venir ?"
          placeholderTextColor={colors.gray400}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
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

      {/* Category */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, themed.label]}>Catégorie *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoriesContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, themed.categoryChip, categoryId === cat.id && [styles.categoryChipActive, themed.categoryChipActive]]}
                onPress={() => onCategoryChange(cat.id)}
              >
                <Text style={[styles.categoryChipText, themed.categoryChipText, categoryId === cat.id && [styles.categoryChipTextActive, themed.categoryChipTextActive]]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

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
