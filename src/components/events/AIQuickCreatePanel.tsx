import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';

interface AIQuickCreatePanelProps {
  onGenerate: (prompt: string) => void;
  onApply: (data: any) => void;
  isLoading: boolean;
  result: any | null;
  error: string | null;
  disabled: boolean;
  aiEnabled: boolean;
}

export default function AIQuickCreatePanel({
  onGenerate,
  onApply,
  isLoading,
  result,
  error,
  disabled,
  aiEnabled,
}: AIQuickCreatePanelProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [prompt, setPrompt] = useState('');

  if (!aiEnabled) return null;

  const handleGenerate = () => {
    if (prompt.trim().length < 10) return;
    onGenerate(prompt.trim());
  };

  return (
    <View style={[styles.container, isDark && { backgroundColor: '#1E1040', borderColor: '#4C1D95' }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, isDark && { backgroundColor: '#2E1065' }]}>
            <Ionicons name="sparkles" size={18} color="#A855F7" />
          </View>
          <View>
            <Text style={styles.headerEyebrow}>{t('componentsEvents.aiQuickPoweredBy')}</Text>
            <Text style={styles.headerTitle}>{t('componentsEvents.aiQuickTitle')}</Text>
          </View>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.gray400}
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          <TextInput
            style={[styles.promptInput, { backgroundColor: colors.surface, color: colors.gray900 }]}
            value={prompt}
            onChangeText={setPrompt}
            placeholder={t('componentsEvents.aiQuickPlaceholder')}
            placeholderTextColor={colors.gray400}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!isLoading}
          />

          <TouchableOpacity
            style={[
              styles.generateButton,
              (disabled || isLoading || prompt.trim().length < 10) && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerate}
            disabled={disabled || isLoading || prompt.trim().length < 10}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="sparkles" size={18} color={Colors.white} />
            )}
            <Text style={styles.generateButtonText}>
              {isLoading ? t('componentsEvents.aiQuickGenerating') : t('componentsEvents.aiQuickGenerate')}
            </Text>
          </TouchableOpacity>

          {error && (
            <View style={[styles.errorBox, { backgroundColor: isDark ? '#3B1515' : '#FEF2F2' }]}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {result && (
            <View style={[styles.resultBox, { backgroundColor: colors.surface }]}>
              <Text style={styles.resultTitle}>{t('componentsEvents.aiQuickResultTitle')}</Text>
              {result.title && (
                <Text style={styles.resultField}>
                  <Text style={styles.resultLabel}>{t('componentsEvents.aiQuickResultTitleLabel')}</Text>
                  {result.title}
                </Text>
              )}
              {result.description && (
                <Text style={styles.resultField} numberOfLines={3}>
                  <Text style={styles.resultLabel}>{t('componentsEvents.aiQuickResultDescriptionLabel')}</Text>
                  {result.description}
                </Text>
              )}
              <TouchableOpacity style={styles.applyButton} onPress={() => onApply(result)}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                <Text style={styles.applyButtonText}>{t('componentsEvents.aiQuickApply')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    backgroundColor: '#FAF5FF',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: Colors.secondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.displayBold,
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.gray500,
    marginTop: 2,
  },
  content: {
    padding: Spacing.md,
    paddingTop: 0,
    gap: Spacing.sm,
  },
  promptInput: {
    borderWidth: 1,
    borderColor: '#D8B4FE',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: FontSizes.sm,
    color: Colors.gray900,
    backgroundColor: Colors.white,
    minHeight: 80,
    fontFamily: FontFamily.regular,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    backgroundColor: Colors.errorBg,
    borderRadius: BorderRadius.sm,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.xs,
    flex: 1,
  },
  resultBox: {
    padding: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.successLight,
    gap: Spacing.xs,
  },
  resultTitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.successDark,
  },
  resultField: {
    fontSize: FontSizes.xs,
    color: Colors.gray700,
  },
  resultLabel: {
    fontFamily: FontFamily.semiBold,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.successDark,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  applyButtonText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
  },
});
