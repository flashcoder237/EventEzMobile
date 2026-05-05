/**
 * OnboardingScreen — first-launch welcome (editorial)
 * Shown on the very first app open, before any auth.
 *
 * Redesigned via AIDesigner (run 1093ce9f) — illustrations as hero,
 * editorial canvas with per-slide numeral watermarks, accent word in coral.
 */

import React, { useEffect, useRef, useState } from 'react';
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

import { FontFamily } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
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
  eyebrow: string;       // small uppercase tag
  titleStart: string;    // text before the accent word
  titleAccent: string;   // accent word (rendered in coral)
  titleEnd: string;      // text after the accent word
  body: string;
  Illustration: React.ComponentType<{ color?: string; size?: number }>;
  illustrationEntry: EntryPreset;
  illustrationIdle: IdlePreset;
};

const SLIDES: FeatureSlide[] = [
  {
    id: '1',
    numeral: '01',
    eyebrow: '01 · EXPLORATION',
    titleStart: 'Découvre ce qui ',
    titleAccent: 'bouge',
    titleEnd: ' près de toi.',
    body: 'De Bonanjo à Yaoundé, trouve concerts, ateliers, soirées.',
    Illustration: PeopleSearch,
    illustrationEntry: 'scaleIn',
    illustrationIdle: 'float',
  },
  {
    id: '2',
    numeral: '02',
    eyebrow: '02 · BILLETTERIE',
    titleStart: 'Réserve en ',
    titleAccent: 'deux taps',
    titleEnd: '.',
    body: 'Mobile Money, carte, PayPal — paiement sécurisé intégré.',
    Illustration: OnlinePayments,
    illustrationEntry: 'slideUp',
    illustrationIdle: 'breathe',
  },
  {
    id: '3',
    numeral: '03',
    eyebrow: '03 · SOCIAL',
    titleStart: 'Garde l\'œil sur ',
    titleAccent: 'tes favoris',
    titleEnd: '.',
    body: 'Sauvegarde, suis tes organisateurs, ne rate plus rien.',
    Illustration: SaveToBookmarks,
    illustrationEntry: 'fadeIn',
    illustrationIdle: 'sway',
  },
  {
    id: '4',
    numeral: '04',
    eyebrow: '04 · ACCÈS',
    titleStart: 'Ton ',
    titleAccent: 'QR',
    titleEnd: ' dans la poche.',
    body: 'Hors-ligne, scanné en 1 seconde à l\'entrée.',
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
  const [index, setIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Pulsing coral dot in header (was the only animation on the original screen)
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.75);
  useEffect(() => {
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
  }, [pulseScale, pulseOpacity]);
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
              {item.eyebrow}
            </Text>
          </View>

          {/* Title with coral accent word */}
          <Text style={[styles.title, { color: colors.text }]}>
            {item.titleStart}
            <Text style={{ color: colors.accent }}>{item.titleAccent}</Text>
            {item.titleEnd}
          </Text>

          {/* Caption */}
          <Text style={[styles.caption, { color: colors.gray500 }]}>{item.body}</Text>
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
          <Text style={[styles.wordmark, { color: colors.primary }]}>EventEz</Text>
          <View style={styles.pulseHost}>
            <Animated.View
              style={[styles.pulseRing, { backgroundColor: colors.accent }, pulseStyle]}
            />
            <View style={[styles.pulseDot, { backgroundColor: colors.accent }]} />
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
            accessibilityLabel={isLastSlide ? 'Commencer' : 'Suivant'}
          >
            <Text style={styles.primaryCTAText}>
              {isLastSlide ? 'Commencer' : 'Suivant'}
            </Text>
            <Ionicons
              name={isLastSlide ? 'checkmark-circle' : 'arrow-forward'}
              size={18}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Tertiary link */}
          <Pressable
            onPress={() => completeAndExit(true)}
            hitSlop={12}
            style={styles.secondaryCTA}
            accessibilityRole="link"
            accessibilityLabel="J'ai déjà un compte"
          >
            <Text style={[styles.secondaryCTAText, { color: colors.primary }]}>
              J&apos;ai déjà un compte
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
  wordmark: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.6,
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
    marginTop: 16,
    paddingVertical: 6,
  },
  secondaryCTAText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    letterSpacing: 0.1,
  },
});
