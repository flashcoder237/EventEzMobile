/**
 * LanguagePickerScreen — first-launch language selector.
 *
 * Affiché AVANT l'OnboardingScreen au tout premier launch. L'utilisateur
 * choisit entre EN et FR ; son choix est persisté en AsyncStorage sous la
 * clé `@eventez_language` et appliqué via i18n `changeLanguage()`.
 *
 * Style éditorial cohérent avec le reste de l'app (warm canvas, watermark
 * numeral, FunnelDisplay, indigo+corail).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { changeLanguage, LANGUAGE_STORAGE_KEY } from '../../i18n';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, Spacing } from '../../constants/theme';

interface Props {
  onComplete: (lang: 'fr' | 'en') => void;
}

type LanguageOption = {
  code: 'en' | 'fr';
  flag: string;
  label: string;
  hint: string;
};

export default function LanguagePickerScreen({ onComplete }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [pending, setPending] = React.useState<'fr' | 'en' | null>(null);

  const options: LanguageOption[] = [
    {
      code: 'en',
      flag: '🇬🇧',
      label: 'English',
      hint: t('languagePicker.englishHint'),
    },
    {
      code: 'fr',
      flag: '🇫🇷',
      label: 'Français',
      hint: t('languagePicker.frenchHint'),
    },
  ];

  const pick = async (lang: 'fr' | 'en') => {
    if (pending) return;
    setPending(lang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      await changeLanguage(lang);
    } catch (error) {
      if (__DEV__) console.error('[LanguagePicker] persist failed', error);
    }
    onComplete(lang);
  };

  return (
    <EditorialCanvas>
      {/* Watermark — top-right "LANG" */}
      <View pointerEvents="none" style={styles.watermarkWrap}>
        <WatermarkNumeral>LANG</WatermarkNumeral>
      </View>

      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}>
        {/* Wordmark + accent dot */}
        <View style={styles.headerRow}>
          <Text style={[styles.wordmark, { color: colors.primary }]}>EventEz</Text>
          <View style={[styles.accentDot, { backgroundColor: colors.accent }]} />
        </View>

        {/* Hero block */}
        <View style={styles.hero}>
          <View
            style={[
              styles.eyebrowPill,
              {
                backgroundColor: isDark ? colors.card : '#F4F0E8',
                borderColor: colors.primary + '26',
              },
            ]}
          >
            <Text style={[styles.eyebrowText, { color: colors.primaryDark || colors.primary }]}>
              {t('languagePicker.eyebrow')}
            </Text>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {t('languagePicker.titleStart')}
            <Text style={{ color: colors.accent }}>{t('languagePicker.titleAccent')}</Text>
            {t('languagePicker.titleEnd')}
          </Text>

          <Text style={[styles.subtitle, { color: colors.gray500 }]}>
            {t('languagePicker.subtitle')}
          </Text>
        </View>

        {/* Language buttons */}
        <View style={styles.buttons}>
          {options.map(opt => {
            const isPending = pending === opt.code;
            return (
              <TouchableOpacity
                key={opt.code}
                onPress={() => pick(opt.code)}
                disabled={!!pending}
                activeOpacity={0.85}
                style={[
                  styles.langButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: isPending
                      ? colors.primary
                      : isDark
                        ? colors.gray200
                        : 'rgba(17,17,16,0.08)',
                    shadowColor: colors.primary,
                  },
                  isPending && { borderWidth: 2 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${opt.label} — ${opt.hint}`}
              >
                <Text style={styles.flag}>{opt.flag}</Text>
                <View style={styles.langButtonBody}>
                  <Text style={[styles.langLabel, { color: colors.text }]}>{opt.label}</Text>
                  <Text style={[styles.langHint, { color: colors.gray500 }]}>{opt.hint}</Text>
                </View>
                <View
                  style={[
                    styles.arrowDisc,
                    { backgroundColor: isPending ? colors.primary : colors.primary + '15' },
                  ]}
                >
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={isPending ? '#FFFFFF' : colors.primary}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer note */}
        <Pressable hitSlop={6} style={styles.footnoteWrap} accessibilityRole="text">
          <Text style={[styles.footnote, { color: colors.gray500 }]}>
            {t('languagePicker.footnote')}
          </Text>
        </Pressable>
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  watermarkWrap: {
    position: 'absolute',
    top: -24,
    right: -64,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordmark: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.6,
  },
  accentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Hero
  hero: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  eyebrowPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 16,
  },
  eyebrowText: {
    fontFamily: FontFamily.bold,
    fontSize: 10.5,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -1.4,
    marginBottom: 14,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 14.5,
    lineHeight: 21,
    paddingRight: 12,
  },

  // Buttons
  buttons: {
    gap: 14,
    marginTop: Spacing.md,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  flag: {
    fontSize: 32,
  },
  langButtonBody: {
    flex: 1,
  },
  langLabel: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    letterSpacing: -0.6,
  },
  langHint: {
    fontFamily: FontFamily.medium,
    fontSize: 12.5,
    letterSpacing: 0.1,
    marginTop: 2,
  },
  arrowDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer
  footnoteWrap: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  footnote: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 280,
  },
});
