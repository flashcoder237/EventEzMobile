/**
 * OnboardingScreen — first-launch welcome (editorial)
 * Shown on the very first app open, before any auth.
 *
 * Redesigned via AIDesigner (run 1093ce9f) — illustrations as hero,
 * editorial canvas with per-slide numeral watermarks, accent word in coral.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Pressable,
  ViewToken,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useReducedMotion } from '../../hooks/useReducedMotion';

import { FontFamily } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { changeLanguage, LANGUAGE_STORAGE_KEY } from '../../i18n';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { getRegionalSlideHints } from '../../lib/utils/regionalSlideHints';
import {
  AnimatedIllustration,
  PeopleSearch,
  OnlinePayments,
  SaveToBookmarks,
  WellDone,
  type EntryPreset,
  type IdlePreset,
} from '../../components/illustrations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH;

export const ONBOARDING_COMPLETE_KEY = 'eventez_onboarding_complete';

type FeatureSlide = {
  id: string;
  numeral: string;       // big watermark per slide (e.g. "01", "02")
  i18nKey: string;       // i18n key prefix (e.g. "onboardingSlide1")
  Illustration: React.ComponentType<{ color?: string; size?: number }>;
  illustrationEntry: EntryPreset;
  illustrationIdle: IdlePreset;
};

// 4 slides — un parcours d'intro court. Au-delà, l'utilisateur décroche
// avant d'avoir vu le moindre vrai contenu (cf. audit UX).
const SLIDES: FeatureSlide[] = [
  {
    id: '1',
    numeral: '01',
    i18nKey: 'onboardingSlide1',
    Illustration: PeopleSearch,
    illustrationEntry: 'scaleIn',
    illustrationIdle: 'float',
  },
  {
    id: '2',
    numeral: '02',
    i18nKey: 'onboardingSlide2',
    Illustration: OnlinePayments,
    illustrationEntry: 'slideUp',
    illustrationIdle: 'breathe',
  },
  {
    id: '3',
    numeral: '03',
    i18nKey: 'onboardingSlide3',
    Illustration: SaveToBookmarks,
    illustrationEntry: 'fadeIn',
    illustrationIdle: 'sway',
  },
  {
    id: '4',
    numeral: '04',
    i18nKey: 'onboardingSlide4',
    Illustration: WellDone,
    illustrationEntry: 'bounce',
    illustrationIdle: 'breathe',
  },
];

interface Props {
  onComplete: (goToLogin?: boolean) => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const [index, setIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Hints regionaux — la region device ne change pas en cours de session, mais
  // les variantes FR/EN (Hambourg/Hamburg, Lisbonne/Lisbon, etc.) doivent suivre
  // la langue active (le toggle FR/EN ci-dessous la change en direct).
  // `null` = pas de mapping pour cette region → body neutre par defaut.
  const regionalHints = useMemo(
    () => getRegionalSlideHints(i18n.language),
    [i18n.language],
  );

  // Langue active normalisee ('fr' / 'en') pour piloter le toggle. i18n.language
  // peut etre 'fr-FR' selon la locale device → on ne garde que le code base.
  const activeLang: 'fr' | 'en' = i18n.language?.startsWith('fr') ? 'fr' : 'en';

  // Toggle FR/EN : change la langue en direct (les slides se re-rendent) ET
  // persiste le choix pour les prochains launches (cf. i18nReady dans i18n/index).
  const setLanguage = async (lang: 'fr' | 'en') => {
    if (lang === activeLang) return;
    try {
      await changeLanguage(lang);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (error) {
      if (__DEV__) console.error('[Onboarding] language switch error:', error);
    }
  };

  // Pulsing coral dot in header (was the only animation on the original screen)
  const reducedMotion = useReducedMotion();
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.75);
  useEffect(() => {
    if (reducedMotion) return;
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(2.2, { duration: 1200, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1200, easing: Easing.out(Easing.ease) }),
        withTiming(0.75, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [pulseScale, pulseOpacity, reducedMotion]);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  const completeAndExit = async (goToLogin: boolean) => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    } catch (error) {
      if (__DEV__) console.error('[Onboarding] save error:', error);
    }
    onComplete(goToLogin);
  };

  const goToNext = () => {
    if (index < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      completeAndExit(false);
    }
  };

  const renderCard = ({ item }: { item: FeatureSlide }) => {
    const Illustration = item.Illustration;
    return (
      <View style={styles.card}>
        {/* Per-slide faded numeral watermark */}
        <Text
          pointerEvents="none"
          style={[
            styles.slideNumeral,
            { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,16,0.06)' },
          ]}
        >
          {item.numeral}
        </Text>

        {/* Decorative dots/lines around the illustration */}
        <View style={[styles.decorDot, { backgroundColor: colors.accent + '66' }]} />
        <View style={[styles.decorLine, { backgroundColor: colors.primary + '33' }]} />

        {/* Hero illustration — animated, sized for the card */}
        <View style={styles.illustrationWrap}>
          <AnimatedIllustration
            entry={item.illustrationEntry}
            idle={item.illustrationIdle}
          >
            <Illustration color={colors.primary} size={220} />
          </AnimatedIllustration>
        </View>

        {/* Body block */}
        <View style={styles.cardBody}>
          {/* Eyebrow pill */}
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
              {t(`auth.${item.i18nKey}Eyebrow`)}
            </Text>
          </View>

          {/* Title with coral accent word */}
          <Text style={[styles.title, { color: colors.text }]}>
            {t(`auth.${item.i18nKey}TitleStart`)}
            <Text style={{ color: colors.accent }}>{t(`auth.${item.i18nKey}TitleAccent`)}</Text>
            {t(`auth.${item.i18nKey}TitleEnd`)}
          </Text>

          {/* Caption — slide 1 utilise la variante "BodyCities" avec
              interpolation {{cityA}}/{{cityB}} si la region est mappee. Sinon
              fallback sur le body neutre. */}
          <Text style={[styles.caption, { color: colors.gray500 }]}>
            {item.id === '1' && regionalHints
              ? t(`auth.${item.i18nKey}BodyCities`, { cityA: regionalHints.cityA, cityB: regionalHints.cityB })
              : t(`auth.${item.i18nKey}Body`)}
          </Text>
        </View>
      </View>
    );
  };

  const isLastSlide = index === SLIDES.length - 1;

  return (
    <EditorialCanvas>
      {/* Watermark — top-right "EZ" */}
      <View pointerEvents="none" style={styles.watermarkWrap}>
        <WatermarkNumeral>EZ</WatermarkNumeral>
      </View>

      <View style={styles.safeContent}>
        {/* === HEADER === */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.wordmark, { color: colors.primary }]}>EventEz</Text>
            <View style={styles.pulseHost}>
              <Animated.View
                style={[styles.pulseRing, { backgroundColor: colors.accent }, pulseStyle]}
              />
              <View style={[styles.pulseDot, { backgroundColor: colors.accent }]} />
            </View>
          </View>
          <View style={styles.headerRight}>
            {/* Toggle FR/EN — la langue est auto-détectée au 1er launch, ce
                sélecteur permet de la corriger en un tap. Toujours visible. */}
            <View style={[styles.langToggle, { backgroundColor: isDark ? colors.card : '#F4F0E8' }]}>
              {(['fr', 'en'] as const).map((lng) => {
                const active = activeLang === lng;
                return (
                  <Pressable
                    key={lng}
                    onPress={() => setLanguage(lng)}
                    hitSlop={6}
                    style={[styles.langOption, active && { backgroundColor: colors.primary }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={lng === 'fr' ? 'Français' : 'English'}
                  >
                    <Text
                      style={[
                        styles.langOptionText,
                        { color: active ? '#FFFFFF' : colors.gray600 },
                      ]}
                    >
                      {lng.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* "Passer" — chip visible (pas un simple texte gris), masqué sur le
                dernier slide où "Commencer" fait déjà sortir. */}
            {!isLastSlide && (
              <Pressable
                onPress={() => completeAndExit(false)}
                hitSlop={8}
                style={[styles.skipPill, { backgroundColor: isDark ? colors.card : '#F4F0E8' }]}
                accessibilityRole="button"
                accessibilityLabel={t('auth.onboardingSkip')}
              >
                <Text style={[styles.skipText, { color: colors.gray700 }]}>
                  {t('auth.onboardingSkip')}
                </Text>
                <Ionicons name="arrow-forward" size={13} color={colors.gray700} />
              </Pressable>
            )}
          </View>
        </View>

        {/* === FEATURE PAGER (full-bleed cards with hero illustration) === */}
        <View style={styles.pagerSection}>
          <FlatList
            ref={flatListRef}
            data={SLIDES}
            renderItem={renderCard}
            keyExtractor={(s) => s.id}
            horizontal
            pagingEnabled
            snapToInterval={CARD_WIDTH}
            snapToAlignment="start"
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            bounces={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, i) => ({ length: CARD_WIDTH, offset: CARD_WIDTH * i, index: i })}
          />
        </View>

        {/* === FOOTER : dots + CTA === paddingBottom dynamique pour ne pas
            être recouvert par la barre de nav Android (gestures ou 3-button). */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 16 }]}>
          {/* Pager dots */}
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === index
                    ? { width: 24, backgroundColor: colors.primary }
                    : { width: 6, backgroundColor: colors.primary + '33' },
                ]}
              />
            ))}
          </View>

          {/* Primary CTA */}
          <TouchableOpacity
            style={[
              styles.primaryCTA,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
            ]}
            onPress={isLastSlide ? () => completeAndExit(false) : goToNext}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={isLastSlide ? t('auth.onboardingStart') : t('auth.onboardingNext')}
          >
            <Text style={styles.primaryCTAText}>
              {isLastSlide ? t('auth.onboardingStart') : t('auth.onboardingNext')}
            </Text>
            <Ionicons
              name={isLastSlide ? 'checkmark-circle' : 'arrow-forward'}
              size={18}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* "J'ai déjà un compte" — bouton secondaire bordé (action
              principale pour un revenant, ne doit pas être un lien discret). */}
          <Pressable
            onPress={() => completeAndExit(true)}
            hitSlop={8}
            style={[styles.secondaryCTA, { borderColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel={t('auth.onboardingHasAccount')}
          >
            <Text style={[styles.secondaryCTAText, { color: colors.primary }]}>
              {t('auth.onboardingHasAccount')}
            </Text>
          </Pressable>
        </View>
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  watermarkWrap: {
    position: 'absolute',
    top: -24,
    right: -48,
  },

  safeContent: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langToggle: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 2,
  },
  langOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langOptionText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  wordmark: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.6,
  },
  skipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  skipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    letterSpacing: 0.1,
  },
  pulseHost: {
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Pager section — takes most of the screen
  pagerSection: {
    flex: 1,
  },

  // Card (full-screen-width slide)
  card: {
    width: CARD_WIDTH,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    position: 'relative',
  },
  // Big numeral watermark per slide (behind illustration)
  slideNumeral: {
    position: 'absolute',
    top: 40,
    left: 12,
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 180,
    lineHeight: 180,
    letterSpacing: -8,
  },
  decorDot: {
    position: 'absolute',
    top: 100,
    right: 40,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  decorLine: {
    position: 'absolute',
    top: 60,
    left: 24,
    width: 60,
    height: 1,
  },

  illustrationWrap: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    zIndex: 1,
  },

  cardBody: {
    paddingHorizontal: 4,
    zIndex: 1,
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
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1.2,
    marginBottom: 12,
  },
  caption: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    paddingRight: 12,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
  },

  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },

  primaryCTA: {
    height: 56,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  primaryCTAText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  secondaryCTA: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 15,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  secondaryCTAText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    letterSpacing: 0.1,
  },
});
