/**
 * CitiesSection — section "Par ville" du Discover screen.
 *
 * Pattern visuel coherent avec les autres sections (Categories grid, Free) :
 *  - sectionHeader avec eyebrow + title + bouton "Voir tout"
 *  - FlatList horizontale de cards 140x100 avec watermark 3-letter code
 *  - Tap → EventSearch avec city pre-rempli
 *
 * Parité visuelle avec le web (/events/in) : meme watermark code IATA-style
 * (DLA, ABJ, PAR), meme grille metadata (nom + pays + count).
 *
 * Le data flow :
 *  - Mount → fetch eventsAPI.getCities() (cache 5 min cote backend)
 *  - Loading → 3 cards skeleton
 *  - Empty (aucune ville) → section masquee (pas d'erreur visible)
 *  - Error → section masquee (silent fail, pas critique)
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { eventsAPI, getMediaUrl } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import {
  FontFamily,
  Spacing,
  BorderRadius,
} from '../../constants/theme';
import type { RootStackParamList } from '../../types';

const TOUCH_OPACITY = 0.7;

interface CityWithCount {
  /** Nom EXACT depuis Event.location_city (a passer tel quel au filtre). */
  name: string;
  /** Code ISO 3166-1 alpha-2 si dispo via la table City backend (CM/FR/...). */
  country_code?: string;
  /** Nom du pays affichable ("Cameroun", "France"). */
  country?: string;
  /** Nombre d'events futurs valides (server-side count). */
  event_count: number;
  /** 0-3 URLs absolues d'events banner pour slideshow en fond (backend extension). */
  sample_images?: string[];
}

/** Code 3-letter style IATA (DLA, ABJ, PAR) — strip accents + uppercase. */
function cityCode(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .slice(0, 3)
    .toUpperCase();
}

type Nav = NativeStackNavigationProp<RootStackParamList>;


interface CityCardProps {
  city: CityWithCount;
  onPress: () => void;
}

/** Duree d'affichage de chaque image dans le slideshow (ms). */
const SLIDESHOW_INTERVAL = 4000;
/** Duree du crossfade entre 2 images (ms). */
const CROSSFADE_DURATION = 800;

/**
 * Card 140x100 avec slideshow d'images d'events en fond + overlay sombre.
 * Si sample_images est vide → fallback watermark seul (comportement
 * original). Sinon : crossfade auto entre 1-3 images toutes les 4s.
 *
 * Memo : evite les re-renders quand la liste parent re-render. L'animation
 * tourne dans Animated.Value local — pas de prop drilling, pas de leak.
 */
const CityCard = memo(function CityCard({ city, onPress }: CityCardProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  // Resoud les URL en absolu (les sample_images peuvent etre relatives).
  // getMediaUrl peut retourner null si l'input est falsy → filter post-map.
  const images: string[] = (city.sample_images || [])
    .map((u) => getMediaUrl(u))
    .filter((u): u is string => !!u)
    .slice(0, 3);
  const hasSlideshow = images.length > 0;

  // Index courant + Animated.Value pour fade-in de l'image suivante.
  const [currentIdx, setCurrentIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Loop slideshow : avance toutes les SLIDESHOW_INTERVAL ms, avec
  // crossfade de CROSSFADE_DURATION. Skip si 0 ou 1 image (statique).
  useEffect(() => {
    if (images.length < 2) return;

    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: CROSSFADE_DURATION / 2,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIdx((prev) => (prev + 1) % images.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: CROSSFADE_DURATION / 2,
          useNativeDriver: true,
        }).start();
      });
    }, SLIDESHOW_INTERVAL);

    return () => clearInterval(interval);
  }, [images.length, fadeAnim]);

  const countLabel =
    city.event_count === 1
      ? t('discover.cityEventsCountOne')
      : t('discover.cityEventsCount', { count: city.event_count });

  return (
    <TouchableOpacity
      activeOpacity={TOUCH_OPACITY}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${city.name}, ${countLabel}`}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.06)',
        },
      ]}
    >
      {/* === Background : slideshow OU watermark === */}
      {hasSlideshow ? (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
            <Image
              source={{ uri: images[currentIdx] }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          </Animated.View>
          {/* Overlay sombre pour garantir la lisibilite du texte */}
          <LinearGradient
            colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.75)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : (
        // Fallback : watermark code 3-lettres (comportement original)
        <Text
          style={[
            styles.watermark,
            { color: isDark ? `${colors.primary}22` : `${colors.primary}14` },
          ]}
          numberOfLines={1}
        >
          {cityCode(city.name)}
        </Text>
      )}

      {/* === Contenu principal (texte par-dessus le bg) === */}
      <View style={styles.cardContent}>
        <Text
          style={[
            styles.cityName,
            { color: hasSlideshow ? '#FFFFFF' : colors.text },
          ]}
          numberOfLines={1}
        >
          {city.name}
        </Text>
        {(city.country || city.country_code) && (
          <Text
            style={[
              styles.countrySubtitle,
              { color: hasSlideshow ? 'rgba(255,255,255,0.85)' : colors.gray500 },
            ]}
            numberOfLines={1}
          >
            {city.country || city.country_code}
          </Text>
        )}
      </View>

      {/* === Pill count en bas === */}
      <View
        style={[
          styles.countPill,
          {
            backgroundColor: hasSlideshow
              ? 'rgba(255,255,255,0.92)'
              : colors.primaryBg,
          },
        ]}
      >
        <Text
          style={[
            styles.countPillText,
            { color: hasSlideshow ? colors.primary : colors.primary },
          ]}
        >
          {countLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

/** Skeleton card pour l'etat loading initial (3 boites animees). */
const CityCardSkeleton = memo(function CityCardSkeleton() {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.card,
        styles.cardSkeleton,
        {
          backgroundColor: colors.card,
          borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.06)',
        },
      ]}
    >
      <View style={[styles.skeletonLineLg, { backgroundColor: colors.gray100 }]} />
      <View style={[styles.skeletonLineSm, { backgroundColor: colors.gray100 }]} />
      <View style={[styles.skeletonPill, { backgroundColor: colors.gray100 }]} />
    </View>
  );
});

interface CitiesSectionProps {
  /**
   * Limite le nombre de villes affichees dans le scroll horizontal.
   * Default : 10 (couvre la majorite des cas, le reste accessible via Voir tout).
   */
  limit?: number;
}

function CitiesSectionImpl({ limit = 10 }: CitiesSectionProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();

  const [cities, setCities] = useState<CityWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await eventsAPI.getCities();
        if (cancelled) return;
        const list = (res.data?.results || []) as CityWithCount[];
        // Filtre : on garde uniquement les villes avec au moins 1 event
        // (la sectionne se mute toute seule si tout est a 0).
        setCities(list.filter((c) => c.event_count > 0).slice(0, limit));
      } catch (err) {
        if (!cancelled) setFailed(true);
        if (__DEV__) console.warn('[CitiesSection] getCities failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  const onCityPress = useCallback(
    (city: CityWithCount) => {
      // Passe le nom EXACT du backend → location_city __icontains match.
      navigation.navigate('EventSearch', { city: city.name });
    },
    [navigation],
  );

  const onSeeAll = useCallback(() => {
    navigation.navigate('CitiesIndex');
  }, [navigation]);

  // Etats no-content : on masque la section pour ne pas polluer Discover.
  if (failed) return null;
  if (!loading && cities.length === 0) return null;

  return (
    <View style={styles.section}>
      {/* === HEADER (meme pattern que les autres sections Discover) === */}
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>
            {t('discover.citiesEyebrow')}
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('discover.citiesTitle')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onSeeAll}
          activeOpacity={TOUCH_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={t('common.seeAll')}
          style={[styles.seeAllBtn, { backgroundColor: colors.gray100 }]}
        >
          <Text style={[styles.seeAllText, { color: colors.gray700 }]}>
            {t('common.seeAll')}
          </Text>
          <Ionicons name="arrow-forward" size={13} color={colors.gray700} />
        </TouchableOpacity>
      </View>

      {/* === SCROLL HORIZONTAL === */}
      {loading ? (
        // 3 skeletons fixes le temps que le fetch arrive
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[0, 1, 2]}
          keyExtractor={(idx) => `city-skel-${idx}`}
          contentContainerStyle={styles.listContent}
          renderItem={() => <CityCardSkeleton />}
        />
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={cities}
          keyExtractor={(c) => c.name}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <CityCard city={item} onPress={() => onCityPress(item)} />
          )}
          removeClippedSubviews
          initialNumToRender={4}
          maxToRenderPerBatch={6}
          windowSize={5}
        />
      )}
    </View>
  );
}

export const CitiesSection = memo(CitiesSectionImpl);
export default CitiesSection;


// =====================================================================
// STYLES — alignes sur les tokens DiscoverScreen + style guide editorial
// =====================================================================

const CARD_W = 140;
const CARD_H = 100;

const styles = StyleSheet.create({
  section: { marginTop: Spacing.xl },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 26,
    letterSpacing: -0.9,
    lineHeight: 28,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  seeAllText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: -0.1,
  },

  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingVertical: 4,
  },

  // === CARD ===
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  cardContent: {
    zIndex: 2,  // au-dessus du watermark
  },
  cityName: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    letterSpacing: -0.5,
    lineHeight: 20,
  },
  countrySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: -0.1,
  },

  // Watermark code 3-lettres : grand, opacity faible, en arriere-plan
  watermark: {
    position: 'absolute',
    top: -8,
    right: -4,
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 56,
    letterSpacing: -3,
    lineHeight: 56,
    zIndex: 1,
  },

  // Pill compte events en bas
  countPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    zIndex: 2,
  },
  countPillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    letterSpacing: -0.1,
  },

  // === SKELETON ===
  cardSkeleton: {
    justifyContent: 'space-between',
  },
  skeletonLineLg: {
    width: '70%',
    height: 16,
    borderRadius: 4,
  },
  skeletonLineSm: {
    width: '50%',
    height: 10,
    borderRadius: 3,
  },
  skeletonPill: {
    width: 56,
    height: 14,
    borderRadius: BorderRadius.full,
  },
});
