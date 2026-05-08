import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
} from '../../constants/theme';

interface Tag {
  id: number;
  name: string;
}

interface TagInputProps {
  existingTags: Tag[];
  selectedTagIds: number[];
  customTags: string[];
  onTagsChange: (selectedTags: number[]) => void;
  onCustomTagAdd: (tag: string) => void;
  onCustomTagRemove: (tag: string) => void;
}

export default function TagInput({
  existingTags,
  selectedTagIds,
  customTags,
  onTagsChange,
  onCustomTagAdd,
  onCustomTagRemove,
}: TagInputProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');

  const handleAddCustomTag = () => {
    if (inputValue.trim()) {
      onCustomTagAdd(inputValue.trim());
      setInputValue('');
    }
  };

  const handleExistingTagSelect = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Selected Tags Display */}
      {(selectedTagIds.length > 0 || customTags.length > 0) && (
        <View style={styles.selectedTagsContainer}>
          {/* Existing Tags */}
          {selectedTagIds.map(tagId => {
            const tag = existingTags.find(t => t.id === tagId);
            if (!tag) return null;

            return (
              <View key={`existing-${tag.id}`} style={[styles.selectedTag, { backgroundColor: colors.primaryBg }]}>
                <Text style={[styles.selectedTagText, { color: colors.primary }]}>{tag.name}</Text>
                <TouchableOpacity
                  onPress={() => handleExistingTagSelect(tag.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            );
          })}

          {/* Custom Tags */}
          {customTags.map(tag => (
            <View key={`custom-${tag}`} style={[styles.customTag, { backgroundColor: colors.blueBg }]}>
              <Text style={[styles.customTagText, { color: colors.blueDark }]}>{tag}</Text>
              <TouchableOpacity
                onPress={() => onCustomTagRemove(tag)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={16} color={colors.blue} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Input Field */}
      <View style={[styles.inputContainer, { backgroundColor: colors.gray50, borderColor: colors.gray200 }]}>
        <Ionicons name="pricetag-outline" size={18} color={colors.gray400} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: colors.gray900 }]}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder={t('componentsCommon.tagInputPlaceholder')}
          placeholderTextColor={colors.gray400}
          onSubmitEditing={handleAddCustomTag}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primaryBg }]}
          onPress={handleAddCustomTag}
          disabled={!inputValue.trim()}
        >
          <Ionicons
            name="add"
            size={18}
            color={inputValue.trim() ? colors.primary : colors.gray400}
          />
        </TouchableOpacity>
      </View>

      {/* Available Tags */}
      <View style={styles.availableTagsSection}>
        <Text style={[styles.availableTagsLabel, { color: colors.gray600 }]}>{t('componentsCommon.tagAvailableLabel')}</Text>
        <ScrollView
          style={[styles.availableTagsScroll, { backgroundColor: colors.gray50 }]}
          contentContainerStyle={styles.availableTagsContent}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          <View style={styles.availableTagsGrid}>
            {existingTags.map(tag => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <TouchableOpacity
                  key={tag.id}
                  style={[
                    styles.availableTag,
                    { backgroundColor: colors.gray200 },
                    isSelected && [styles.availableTagSelected, { backgroundColor: colors.primary }],
                  ]}
                  onPress={() => handleExistingTagSelect(tag.id)}
                >
                  <Text
                    style={[
                      styles.availableTagText,
                      { color: colors.gray700 },
                      isSelected && styles.availableTagTextSelected,
                    ]}
                  >
                    {tag.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  selectedTagText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  customTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.blueBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  customTagText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.blueDark,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.gray900,
  },
  addButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.full,
  },
  availableTagsSection: {
    gap: Spacing.sm,
  },
  availableTagsLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  availableTagsScroll: {
    maxHeight: 120,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  availableTagsContent: {
    flexGrow: 1,
  },
  availableTagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  availableTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray200,
  },
  availableTagSelected: {
    backgroundColor: Colors.primary,
  },
  availableTagText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray700,
  },
  availableTagTextSelected: {
    color: Colors.white,
  },
});
