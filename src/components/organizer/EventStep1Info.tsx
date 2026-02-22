import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing } from '../../constants/theme';
import { Category, Tag, AIUsage, AIGeneratedEvent } from '../../types';
import TagInput from '../common/TagInput';
import AIQuickCreatePanel from '../events/AIQuickCreatePanel';
import AIAssistButton from '../events/AIAssistButton';
import styles from './eventCreateStyles';

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
  onAIGenerate,
  onAIApply,
  onOptimizeTitle,
  onGenerateDescription,
}: EventStep1InfoProps) {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Informations de base</Text>
      <Text style={styles.stepDescription}>D\u00e9crivez votre \u00e9v\u00e9nement pour attirer les participants</Text>

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
        <Text style={styles.label}>Image de couverture</Text>
        <TouchableOpacity style={styles.imagePickerButton} onPress={onPickImage}>
          {bannerImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: bannerImage }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={onRemoveImage}
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

      {/* Title */}
      <View style={styles.inputGroup}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.label}>Titre de l'\u00e9v\u00e9nement *</Text>
          {aiEnabled && (
            <AIAssistButton
              label="Optimiser"
              onPress={onOptimizeTitle}
              isLoading={aiTitleLoading}
              disabled={!title.trim() || title.length < 5}
            />
          )}
        </View>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={onTitleChange}
          placeholder="Ex: Concert de Jazz au Palais"
          placeholderTextColor={Colors.gray400}
        />
      </View>

      {/* Short Description */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description courte</Text>
        <TextInput
          style={styles.input}
          value={shortDescription}
          onChangeText={onShortDescriptionChange}
          placeholder="R\u00e9sum\u00e9 en quelques mots (max 150 caract\u00e8res)"
          placeholderTextColor={Colors.gray400}
          maxLength={150}
        />
        <Text style={styles.charCount}>{shortDescription.length}/150</Text>
      </View>

      {/* Full Description */}
      <View style={styles.inputGroup}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.label}>Description compl\u00e8te *</Text>
          {aiEnabled && (
            <AIAssistButton
              label="G\u00e9n\u00e9rer"
              onPress={onGenerateDescription}
              isLoading={aiDescLoading}
              disabled={!title.trim()}
            />
          )}
        </View>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={onDescriptionChange}
          placeholder="D\u00e9crivez votre \u00e9v\u00e9nement en d\u00e9tail..."
          placeholderTextColor={Colors.gray400}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
      </View>

      {/* Event Type */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Type d'\u00e9v\u00e9nement *</Text>
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeOption, eventType === 'billetterie' && styles.typeOptionActive]}
            onPress={() => onEventTypeChange('billetterie')}
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
            onPress={() => onEventTypeChange('inscription')}
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

      {/* Category */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Cat\u00e9gorie *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoriesContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, categoryId === cat.id && styles.categoryChipActive]}
                onPress={() => onCategoryChange(cat.id)}
              >
                <Text style={[styles.categoryChipText, categoryId === cat.id && styles.categoryChipTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Tags */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Tags</Text>
        <Text style={styles.inputHint}>
          Ajoutez des mots-cl\u00e9s pour aider les participants \u00e0 trouver votre \u00e9v\u00e9nement
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

      {/* Featured Event Info */}
      <View style={styles.warningInfoBox}>
        <Ionicons name="star-outline" size={20} color={Colors.warningDark} />
        <Text style={styles.warningInfoBoxText}>
          Vous pourrez demander la mise en avant de votre \u00e9v\u00e9nement apr\u00e8s sa cr\u00e9ation depuis "Mes \u00e9v\u00e9nements".
        </Text>
      </View>
    </View>
  );
}
