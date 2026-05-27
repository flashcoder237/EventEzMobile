/**
 * CitiesIndexScreen — equivalent /events/in du web sur mobile.
 *
 * Hub : toutes les villes ayant au moins 1 evenement. Cible du deep link
 * `eventez://events/in` (Universal Link parite web).
 *
 * Layout :
 *  - Header editorial (eyebrow PAR VILLE + watermark "MAP" en arriere-plan)
 *  - Stats compteur (N villes, M evenements total)
 *  - Grille 2 colonnes de cards (meme card design que CitiesSection)
 *  - Empty state si aucune ville
 *
 * Tap card → EventSearch avec city pre-rempli.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { ErrorState } from '../../components/ui/ErrorState';

const TOUCH_OPACITY = 0.7;

interface CityWithCount {
  name: string;
  country_code?: string;
  country?: string;
  event_count: number;
  /** 0-3 URLs banner pour fond statique (utilise la 1ere sur le hub). */
  sample_images?: string[];
}

function cityCode(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .slice(0, 3)
    .toUpperCase();
}

type Nav = NativeStackNavigationProp<RootStackParamList>;


export default function CitiesIndexScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();

  const [cities, setCities] = useState<CityWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const loadCities = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await eventsAPI.getCities();
      const list = (res.data?.results || []) as CityWithCount[];
      setCities(list.filter((c) => c.event_count > 0));
    } catch (err) {
      setFailed(true);
      if (__DEV__) console.warn('[CitiesIndex] getCities failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCities();
  }, [loadCities]);

  const totalEvents = useMemo(
    () => cities.reduce((acc, c) => acc + c.event_count, 0),
    [cities],
  );

  const onCityPress = useCallback(
    (city: CityWithCount) => {
      navigation.navigate('EventSearch', { city: city.name });
    },
    [navigation],
  );

  const renderCity = useCallback(
    ({ item }: { item: CityWithCount }) => {
      const countLabel =
        item.event_count === 1
          ? t('discover.cityEventsCountOne')
          : t('discover.cityEventsCount', { count: item.event_count });

      // Sur le hub (grille de 20+ cards), on prend juste la 1ere image en
      // fond statique. Pas de slideshow ici (overhead trop important sur
      // tous les visibles + l'user scrolle vite).
      const bgImage = item.sample_images?.[0]
        ? getMediaUrl(item.sample_images[0])
        : null;
      const hasBg = !!bgImage;

      return (
        <TouchableOpacity
          activeOpacity={TOUCH_OPACITY}
          onPress={() => onCityPress(item)}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${countLabel}`}
          style={[
            styles.gridCard,
            {
              backgroundColor: colors.card,
              borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.06)',
            },
          ]}
        >
          {hasBg ? (
            <>
              <Image
                source={{ uri: bgImage! }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.75)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </>
          ) : (
            <Text
              style={[
                styles.watermark,
                { color: isDark ? `${colors.primary}22` : `${colors.primary}14` },
              ]}
              numberOfLines={1}
            >
              {cityCode(item.name)}
            </Text>
          )}
          <View style={styles.cardContent}>
            <Text
              style={[
                styles.cityName,
                { color: hasBg ? '#FFFFFF' : colors.text },
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {(item.country || item.country_code) && (
              <Text
                style={[
                  styles.countrySubtitle,
                  { color: hasBg ? 'rgba(255,255,255,0.85)' : colors.gray500 },
                ]}
                numberOfLines={1}
              >
                {item.country || item.country_code}
              </Text>
            )}
          </View>
          <View
            style={[
              styles.countPill,
              {
                backgroundColor: hasBg
                  ? 'rgba(255,255,255,0.92)'
                  : colors.primaryBg,
              },
            ]}
          >
            <Text style={[styles.countPillText, { color: colors.primary }]}>
              {countLabel}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [colors, isDark, t, onCityPress],
  );

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safe, { backgroundColor: colors.background }]}
    >
      {/* Header avec back button + watermark MAP en background */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={TOUCH_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={[styles.backBtn, { backgroundColor: colors.card }]}
        >
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Hero editorial : watermark "MAP" + eyebrow + title + stats */}
      <View style={styles.hero}>
        <Text
          style={[
            styles.heroWatermark,
            { color: isDark ? `${colors.primary}10` : `${colors.primary}08` },
          ]}
          numberOfLines={1}
        >
          MAP
        </Text>
        <Text style={[styles.heroEyebrow, { color: colors.accent }]}>
          {t('discover.citiesEyebrow')}
        </Text>
        <Text style={[styles.heroTitle, { color: colors.text }]}>
          {t('discover.citiesIndexTitle')}
        </Text>
        {cities.length > 0 && (
          <Text style={[styles.heroSubtitle, { color: colors.gray600 }]}>
            {t('discover.citiesIndexSubtitle', {
              count: cities.length,
              total: totalEvents,
            })}
          </Text>
        )}
      </View>

      {failed ? (
        <ErrorState
          message={t('common.errorLoading') || 'Error'}
          onRetry={loadCities}
        />
      ) : (
        <FlatList
          data={loading ? Array.from({ length: 8 }) as CityWithCount[] : cities}
          keyExtractor={(item, idx) =>
            loading ? `city-skel-${idx}` : (item as CityWithCount).name
          }
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.gridContent}
          renderItem={loading ? renderSkeletonCell : renderCity}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="location-outline"
                  size={48}
                  color={colors.gray400}
                  style={{ marginBottom: Spacing.md }}
                />
                <Text style={[styles.emptyText, { color: colors.gray600 }]}>
                  {t('discover.citiesIndexEmpty')}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}


function renderSkeletonCell() {
  // ColorTheme local pour cohérence — on relit via Hook impossible ici
  // (callback), donc grayed-out via static style is OK pour skeleton.
  return (
    <View
      style={[
        styles.gridCard,
        styles.skeletonCard,
      ]}
    >
      <View style={styles.skeletonLineLg} />
      <View style={styles.skeletonLineSm} />
      <View style={styles.skeletonPill} />
    </View>
  );
}


// =====================================================================
// STYLES
// =====================================================================

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  // === HERO editorial ===
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  heroWatermark: {
    position: 'absolute',
    top: 0,
    right: -30,
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 160,
    letterSpacing: -10,
    lineHeight: 140,
  },
  heroEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 6,
    zIndex: 2,
  },
  heroTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 36,
    letterSpacing: -1.5,
    lineHeight: 38,
    marginBottom: Spacing.sm,
    zIndex: 2,
  },
  heroSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    letterSpacing: -0.1,
    zIndex: 2,
  },

  // === Grid 2 colonnes ===
  gridContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  row: {
    gap: Spacing.md,
  },

  gridCard: {
    flex: 1,
    height: 110,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  cardContent: {
    zIndex: 2,
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

  // === Empty state ===
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
    marginTop: Spacing.xl,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    lineHeight: 20,
  },

  // === Skeleton ===
  skeletonCard: {
    backgroundColor: '#F3F4F6',
    borderColor: 'transparent',
  },
  skeletonLineLg: {
    width: '70%',
    height: 16,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  skeletonLineSm: {
    width: '50%',
    height: 10,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  skeletonPill: {
    width: 56,
    height: 14,
    borderRadius: BorderRadius.full,
    backgroundColor: '#E5E7EB',
  },
});
