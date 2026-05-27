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

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { getLocales } from 'expo-localization';

import { eventsAPI, getMediaUrl } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
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
  /**
   * True quand l'ecran Discover est focus. Sert a suspendre les animations
   * quand l'utilisateur navigue ailleurs (gain batterie). On a essaye une
   * detection viewport-level via FlatList.onViewableItemsChanged mais ca
   * cause "Changing onViewableItemsChanged nullability on the fly is not
   * supported" en prod + crash test env. La granularite "screen focus"
   * est suffisante en pratique (10 cards = pas de gaspillage notable).
   */
  isVisible: boolean;
}

/** Duree d'affichage de chaque image dans le slideshow (ms). */
const SLIDESHOW_INTERVAL = 4000;
/** Duree du crossfade entre 2 images (ms). */
const CROSSFADE_DURATION = 800;

/**
 * Card 220x140 avec slideshow d'images d'events en fond + overlay sombre.
 * Si sample_images est vide → fallback watermark seul (comportement
 * original). Sinon : crossfade auto entre 1-3 images toutes les 4s,
 * UNIQUEMENT quand la card est dans le viewport (isVisible=true).
 *
 * Memo : evite les re-renders quand la liste parent re-render. L'animation
 * tourne dans Animated.Value local — pas de prop drilling, pas de leak.
 */
const CityCard = memo(function CityCard({ city, onPress, isVisible }: CityCardProps) {
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
  // crossfade de CROSSFADE_DURATION. Skip si :
  //   - 0 ou 1 image (statique, rien a alterner)
  //   - la card n'est pas visible (offscreen → pas de batterie gaspillee)
  useEffect(() => {
    if (images.length < 2 || !isVisible) return;

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
  }, [images.length, isVisible, fadeAnim]);

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

/**
 * Resout le pays courant de l'utilisateur depuis plusieurs sources, en
 * priorite descendante :
 *   1. user.country (champ profil rempli au signup)
 *   2. getLocales()[0]?.regionCode (region du device, ISO 2-letter)
 *
 * Retourne un set de tokens (lowercase) qui peuvent matcher city.country
 * ("cameroun", "cameroon") OU city.country_code ("cm") pour le tri.
 */
function useUserCountryTokens(): Set<string> {
  const { user } = useAuth();
  return useMemo(() => {
    const tokens = new Set<string>();
    const raw = (user as any)?.country?.toString().trim();
    if (raw) tokens.add(raw.toLowerCase());
    try {
      const region = getLocales()[0]?.regionCode;
      if (region) tokens.add(region.toLowerCase());
    } catch {
      // expo-localization indisponible — silent fallback
    }
    return tokens;
  }, [user]);
}

/**
 * Tri stable des villes : celles du pays user en tete, sinon ordre
 * d'origine (deja par event_count desc cote serveur).
 */
function sortByUserCountry(
  cities: CityWithCount[],
  userTokens: Set<string>,
): CityWithCount[] {
  if (userTokens.size === 0) return cities;
  const matches = (c: CityWithCount): boolean => {
    const country = c.country?.toLowerCase() || '';
    const code = c.country_code?.toLowerCase() || '';
    return userTokens.has(country) || userTokens.has(code);
  };
  // Stable sort : matches first, then everything else in original order.
  return [...cities].sort((a, b) => {
    const am = matches(a) ? 1 : 0;
    const bm = matches(b) ? 1 : 0;
    return bm - am;
  });
}


function CitiesSectionImpl({ limit = 10 }: CitiesSectionProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const userCountryTokens = useUserCountryTokens();

  const [cities, setCities] = useState<CityWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Detection focus screen : true tant que Discover est focused.
  // Quand l'utilisateur navigue ailleurs, on passe a false → toutes les
  // CityCard suspendent leurs animations slideshow (gain batterie).
  // Granularite "screen-level" car la viewport-level via FlatList est
  // instable (cf. note dans CityCardProps.isVisible).
  const [isFocused, setIsFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await eventsAPI.getCities();
        if (cancelled) return;
        const list = (res.data?.results || []) as CityWithCount[];
        // Filtre : on garde uniquement les villes avec au moins 1 event
        // (la section se mute toute seule si tout est a 0).
        const filtered = list.filter((c) => c.event_count > 0);
        // Tri : villes du pays user en premier, le reste apres
        const sorted = sortByUserCountry(filtered, userCountryTokens);
        setCities(sorted.slice(0, limit));
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
  }, [limit, userCountryTokens]);

  const onCityPress = useCallback(
    (city: CityWithCount) => {
      // Passe le nom EXACT du backend → backend filter `city` icontains match.
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
            <CityCard
              city={item}
              onPress={() => onCityPress(item)}
              isVisible={isFocused}
            />
          )}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
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

// Cards plus grandes (220x140 vs 140x100) — plus d'impact visuel pour les
// images slideshow en fond. L'utilisateur voit ~1.5 cards a la fois sur un
// ecran 390pt, ce qui invite naturellement au scroll.
const CARD_W = 220;
const CARD_H = 140;

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
    zIndex: 2,  // au-dessus du watermark / background image
  },
  cityName: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 24,
    letterSpacing: -0.7,
    lineHeight: 26,
  },
  countrySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginTop: 3,
    letterSpacing: -0.1,
  },

  // Watermark code 3-lettres : grand, opacity faible, en arriere-plan
  watermark: {
    position: 'absolute',
    top: -12,
    right: -6,
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 82,
    letterSpacing: -4,
    lineHeight: 82,
    zIndex: 1,
  },

  // Pill compte events en bas
  countPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    zIndex: 2,
  },
  countPillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
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
