/**
 * OnboardingScreen — first-launch welcome (editorial)
 * Shown on the very first app open, before any auth.
 * Ported from AIDesigner artifact (run 972fc2ba) — editorial, indigo + corail.
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import {
  Colors,
  FontFamily,
  Spacing,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH;

export const ONBOARDING_COMPLETE_KEY = 'eventez_onboarding_complete';

type FeatureSlide = {
  id: string;
  numeral: string;
  eyebrow: string;
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const SLIDES: FeatureSlide[] = [
  {
    id: '1',
    numeral: '01',
    eyebrow: 'EXPLORATION',
    title: 'Découvrez ce qui bouge près de vous.',
    body: 'De Bonanjo à Deido, trouvez les meilleurs concerts, ateliers et soirées.',
    icon: 'compass',
  },
  {
    id: '2',
    numeral: '02',
    eyebrow: 'BILLETTERIE',
    title: 'Réservez vos billets en quelques secondes.',
    body: 'Paiement mobile sécurisé intégré. Moins d\'attente, plus de fête.',
    icon: 'ticket',
  },
  {
    id: '3',
    numeral: '03',
    eyebrow: 'PORTEFEUILLE',
    title: 'Gérez vos accès directs dans l\'app.',
    body: 'QR codes hors-ligne. Ne perdez plus jamais vos entrées.',
    icon: 'wallet',
  },
];

interface Props {
  onComplete: (goToLogin?: boolean) => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const { colors, isDark } = useTheme();
  const [index, setIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Pulsing corail dot in header
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

  // Cascade entry animations for hero block
  const heroEyebrowY = useSharedValue(16);
  const heroEyebrowOp = useSharedValue(0);
  const heroTitleY = useSharedValue(16);
  const heroTitleOp = useSharedValue(0);
  useEffect(() => {
    heroEyebrowY.value = withDelay(220, withTiming(0, { duration: 700, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
    heroEyebrowOp.value = withDelay(220, withTiming(1, { duration: 700 }));
    heroTitleY.value = withDelay(360, withTiming(0, { duration: 700, easing: Easing.bezier(0.16, 1, 0.3, 1) }));
    heroTitleOp.value = withDelay(360, withTiming(1, { duration: 700 }));
  }, [heroEyebrowY, heroEyebrowOp, heroTitleY, heroTitleOp]);
  const heroEyebrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: heroEyebrowY.value }],
    opacity: heroEyebrowOp.value,
  }));
  const heroTitleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: heroTitleY.value }],
    opacity: heroTitleOp.value,
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

  const renderCard = ({ item }: { item: FeatureSlide }) => (
    <View style={styles.card}>
      {/* Vertical accent line */}
      <View style={[styles.cardLineTrack, { backgroundColor: colors.primary + '1A' }]} />

      {/* Top row: icon disc + giant numeral */}
      <View style={styles.cardTopRow}>
        <View style={[styles.iconDisc, { backgroundColor: colors.primary }]}>
          <Ionicons name={item.icon} size={20} color="#FFFFFF" />
        </View>
        <Text
          style={[
            styles.cardNumeral,
            { color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(9,9,11,0.10)' },
          ]}
        >
          {item.numeral}
        </Text>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={[styles.cardEyebrow, { color: colors.accent }]}>{item.eyebrow}</Text>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.cardCaption, { color: colors.gray500 }]}>{item.body}</Text>
      </View>
    </View>
  );

  return (
    <EditorialCanvas>
      {/* Watermark — top-right "EZ" */}
      <View pointerEvents="none" style={styles.watermarkWrap}>
        <WatermarkNumeral>EZ</WatermarkNumeral>
      </View>

      {/* Decorative accents */}
      <View
        pointerEvents="none"
        style={[styles.decorLine, { backgroundColor: colors.primary + '33' }]}
      />
      <View
        pointerEvents="none"
        style={[styles.decorDot, { backgroundColor: colors.accent }]}
      />

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

        {/* === HERO === */}
        <View style={styles.hero}>
          <Animated.View style={[styles.eyebrowPillWrap, heroEyebrowStyle]}>
            <View
              style={[
                styles.eyebrowPill,
                {
                  borderColor: colors.primary + '26',
                  backgroundColor: isDark ? colors.card : '#F4F3F0',
                },
              ]}
            >
              <Text style={[styles.eyebrowPillText, { color: colors.primary }]}>
                CAMEROUN · DOUALA
              </Text>
            </View>
          </Animated.View>

          <Animated.Text style={[styles.heroTitle, { color: colors.text }, heroTitleStyle]}>
            L&apos;énergie de la ville dans la paume de votre main.{'\n'}
            <Text style={{ color: colors.accent }}>Vibrez</Text> au rythme de l&apos;instant.
          </Animated.Text>
        </View>

        {/* === FEATURE PAGER === */}
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
        </View>

        {/* === BOTTOM CTAs === */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.primaryCTA,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
            ]}
            onPress={() => completeAndExit(false)}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Commencer"
          >
            <Text style={styles.primaryCTAText}>Commencer</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>

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
  // Decorative
  watermarkWrap: {
    position: 'absolute',
    top: -24,
    right: -48,
  },
  decorLine: {
    position: 'absolute',
    top: '32%',
    left: 0,
    width: 64,
    height: 1,
  },
  decorDot: {
    position: 'absolute',
    top: '48%',
    right: 32,
    width: 6,
    height: 6,
    borderRadius: 3,
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

  // Hero
  hero: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  eyebrowPillWrap: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  eyebrowPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  eyebrowPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10.5,
    letterSpacing: 1.6,
  },
  heroTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 36,
    lineHeight: 38,
    letterSpacing: -1.4,
  },

  // Pager section
  pagerSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 8,
    marginTop: 24,
  },

  // Card
  card: {
    width: CARD_WIDTH,
    paddingHorizontal: 24,
    paddingVertical: 16,
    height: 240,
    justifyContent: 'space-between',
    position: 'relative',
  },
  cardLineTrack: {
    position: 'absolute',
    left: 24,
    top: 64,
    bottom: 16,
    width: 2,
    borderRadius: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingLeft: 16,
    height: 56,
  },
  iconDisc: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  cardNumeral: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 64,
    lineHeight: 56,
    letterSpacing: -3,
  },
  cardBody: {
    paddingLeft: 16,
    paddingTop: 12,
  },
  cardEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  cardCaption: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    paddingRight: 16,
  },

  // Pager dots
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },

  // Footer / CTAs
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
  },
  primaryCTA: {
    height: 56,
    borderRadius: 18,
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
    marginTop: 18,
    paddingVertical: 6,
  },
  secondaryCTAText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    letterSpacing: 0.1,
  },
});
