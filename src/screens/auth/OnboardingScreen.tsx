/**
 * OnboardingScreen
 * Displays a multi-slide welcome experience for first-time users.
 * Shown after the first successful login.
 * Uses AsyncStorage to track if onboarding has been completed.
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  StatusBar,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Events as EventsIllustration, Searching as SearchingIllustration, OnlinePayments, Conference } from '../../components/illustrations';
import GradientButton from '../../components/ui/GradientButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ONBOARDING_COMPLETE_KEY = 'eventez_onboarding_complete';

interface OnboardingSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  bgGradient: readonly [string, string];
  title: string;
  subtitle: string;
  description: string;
  illustration: React.ReactElement;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'sparkles',
    iconColor: '#4F46E5',
    bgGradient: ['#EEF2FF', '#E0E7FF'] as const,
    title: 'Bienvenue sur EventEz',
    subtitle: 'Votre compagnon evenementiel',
    description:
      'Decouvrez les meilleurs evenements pres de chez vous et ne manquez plus aucune occasion.',
    illustration: <EventsIllustration color="#4F46E5" size={160} />,
  },
  {
    id: '2',
    icon: 'search',
    iconColor: '#3B82F6',
    bgGradient: ['#EFF6FF', '#DBEAFE'] as const,
    title: 'Trouvez vos evenements',
    subtitle: 'Parcourez, filtrez, decouvrez',
    description:
      'Explorez par categorie, localisation ou date. Trouvez exactement ce qui vous interesse.',
    illustration: <SearchingIllustration color="#3B82F6" size={160} />,
  },
  {
    id: '3',
    icon: 'ticket',
    iconColor: '#22C55E',
    bgGradient: ['#F0FDF4', '#DCFCE7'] as const,
    title: 'Achetez vos billets',
    subtitle: 'Paiement mobile facile',
    description:
      'Payez facilement via Mobile Money, carte bancaire ou PayPal. Recevez vos billets instantanement.',
    illustration: <OnlinePayments color="#22C55E" size={160} />,
  },
  {
    id: '4',
    icon: 'qr-code',
    iconColor: '#A855F7',
    bgGradient: ['#FDF2F8', '#FCE7F3'] as const,
    title: 'Profitez !',
    subtitle: 'Check-in avec QR code',
    description:
      'Presentez votre QR code a l\'entree et profitez pleinement de votre evenement. C\'est aussi simple que ca !',
    illustration: <Conference color="#A855F7" size={160} />,
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { colors, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    } catch (error) {
      if (__DEV__) console.error('[Onboarding] Error saving completion state:', error);
    }
    onComplete();
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      {/* Illustration area */}
      <View style={styles.illustrationArea}>
        <LinearGradient
          colors={isDark ? [item.bgGradient[0] + '40', item.bgGradient[1] + '40'] as const : item.bgGradient}
          style={styles.illustrationGradient}
        >
          {/* Decorative background circles */}
          <View style={styles.decorCircleOuter} />
          <View style={styles.decorCircleMid} />

          {/* Illustration */}
          <View style={styles.iconWrapper}>
            {item.illustration}
          </View>
        </LinearGradient>
      </View>

      {/* Text content */}
      <View style={styles.textContent}>
        <Text style={[styles.slideSubtitle, { color: colors.primary }]}>{item.subtitle}</Text>
        <Text style={[styles.slideTitle, { color: colors.gray900 }]}>{item.title}</Text>
        <Text style={[styles.slideDescription, { color: colors.gray500 }]}>{item.description}</Text>
      </View>
    </View>
  );

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Skip button */}
        {!isLastSlide && (
          <View style={styles.skipContainer}>
            <GradientButton
              title="Passer"
              onPress={handleSkip}
              variant="ghost"
              size="sm"
            />
          </View>
        )}

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
        />

        {/* Bottom section */}
        <View style={styles.bottomSection}>
          {/* Pagination dots */}
          <View style={styles.pagination}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex
                    ? [styles.dotActive, { backgroundColor: colors.primary }]
                    : [styles.dotInactive, { backgroundColor: colors.gray300 }],
                ]}
              />
            ))}
          </View>

          {/* Action button */}
          <View style={styles.actionContainer}>
            <GradientButton
              title={isLastSlide ? "C'est parti !" : 'Suivant'}
              onPress={handleNext}
              variant="primary"
              size="xl"
              fullWidth
              iconRight={isLastSlide ? 'rocket-outline' : 'arrow-forward'}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  safeArea: {
    flex: 1,
  },
  skipContainer: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  illustrationArea: {
    flex: 1,
    maxHeight: '50%',
  },
  illustrationGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: BorderRadius['3xl'],
    borderBottomRightRadius: BorderRadius['3xl'],
    overflow: 'hidden',
    position: 'relative',
  },
  decorCircleOuter: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  decorCircleMid: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.lg,
  },
  floatIcon1: {
    position: 'absolute',
    top: '20%',
    right: '15%',
  },
  floatIcon2: {
    position: 'absolute',
    bottom: '25%',
    left: '12%',
  },
  floatIcon3: {
    position: 'absolute',
    top: '35%',
    left: '20%',
  },
  floatIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  textContent: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['2xl'],
    alignItems: 'center',
  },
  slideSubtitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  slideTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['3xl'],
    color: Colors.gray900,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: FontSizes['3xl'] * 1.2,
  },
  slideDescription: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: FontSizes.base * 1.6,
    maxWidth: 320,
  },
  bottomSection: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing.lg,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: Colors.gray300,
  },
  actionContainer: {
    width: '100%',
  },
});
