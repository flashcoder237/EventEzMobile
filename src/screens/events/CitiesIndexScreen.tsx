/**
 * CitiesIndexScreen — hub /events/in du mobile.
 *
 * Architecture :
 *  - Header editorial (back + watermark "MAP")
 *  - Hero : eyebrow + title + stats (N villes · M evts)
 *  - Search bar sticky avec debounce 300ms → `?search=` au backend
 *  - SectionList groupee par pays :
 *      Section "Pres de chez toi" (pays user / region device) en 1er
 *      Puis chaque autre pays en section separee (tri par count desc)
 *  - Chaque section = grille 2 colonnes de city cards
 *  - Empty state contextuel : pas de match VS aucune ville
 *
 * Pourquoi SectionList + grouping pays ? Le hub peut remonter jusqu'a 200
 * villes (cap backend). En grille plate ca devient illisible, et la
 * pertinence cognitive du "pays" est l'axe naturel de navigation. Pays
 * user en premier reduit le scroll dans 90% des cas.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useWindowDimensions,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
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
import { getLocales } from 'expo-localization';

import { eventsAPI, getMediaUrl } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  FontFamily,
  Spacing,
  BorderRadius,
} from '../../constants/theme';
import { centeredContent } from '../../constants/layout';
import type { RootStackParamList } from '../../types';
import { ErrorState } from '../../components/ui/ErrorState';

const TOUCH_OPACITY = 0.7;
const SEARCH_DEBOUNCE_MS = 300;
const CARD_HEIGHT = 120;

const GRID_HORIZONTAL_PADDING = Spacing.lg;
const GRID_GAP = Spacing.md;
// Largeur de contenu plafonnée (type iPhone) pour ne pas étirer la grille sur
// grand écran (iPad en mode compat iPhone).
const MAX_CONTENT_WIDTH = 520;

interface CityWithCount {
  id?: number;
  name: string;
  country_code?: string;
  country?: string;
  event_count: number;
  /** 0-3 URLs banner pour fond statique (1ere image utilisee sur le hub). */
  sample_images?: string[];
}

/** Chunk a list into rows of N items. Sert au rendu grille via SectionList. */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function cityCode(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .slice(0, 3)
    .toUpperCase();
}

/**
 * Detecte le(s) pays prioritaire(s) du user via :
 *  1. user.country (profile) — source autoritative si dispo
 *  2. device region (expo-localization) — fallback
 * Renvoie un Set de tokens lowercase pour matching tolerant ("cm" / "cameroun").
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
      // expo-localization peut throw sur certains envs (Web non supporte) ;
      // pas grave, on tombe juste sur l'affichage standard sans pays user.
    }
    return tokens;
  }, [user]);
}

function isUserCity(c: CityWithCount, userTokens: Set<string>): boolean {
  if (userTokens.size === 0) return false;
  const country = c.country?.toLowerCase() || '';
  const code = c.country_code?.toLowerCase() || '';
  return userTokens.has(country) || userTokens.has(code);
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Section {
  /** Cle d'identification ; soit nom pays, soit sentinelle "_near". */
  key: string;
  /** Label affiche en header de section. */
  title: string;
  /** Rangees de city cards : `[[c1, c2], [c3, c4], [c5]]`. */
  data: CityWithCount[][];
  /** Total events tous events de la section confondus. Affiche en sous-titre. */
  totalEvents: number;
  /** Total villes. */
  totalCities: number;
}

export default function CitiesIndexScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const userTokens = useUserCountryTokens();

  // Largeur de carte RÉACTIVE (grille 2 col), plafonnée à MAX_CONTENT_WIDTH pour
  // rester lisible sur grand écran. Basée sur la largeur réelle de la fenêtre
  // (useWindowDimensions) et non un SCREEN_WIDTH figé au chargement du module.
  const { width: windowWidth } = useWindowDimensions();
  const gridWidth = Math.min(windowWidth, MAX_CONTENT_WIDTH);
  const CARD_WIDTH = (gridWidth - GRID_HORIZONTAL_PADDING * 2 - GRID_GAP) / 2;

  const [cities, setCities] = useState<CityWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce query → backend (300ms). On ne fetch que si trim().length >= 1
  // (autorise les single-char comme "P" pour "Paris") ou si vide (reset).
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  const loadCities = useCallback(async (search?: string) => {
    setLoading(true);
    setFailed(false);
    try {
      const params: { search?: string; limit?: number } = { limit: 200 };
      if (search) params.search = search;
      const res = await eventsAPI.getCities(params);
      const list = (res.data?.results || []) as CityWithCount[];
      setCities(list.filter((c) => c.event_count > 0));
    } catch (err) {
      setFailed(true);
      if (__DEV__) console.warn('[CitiesIndex] getCities failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch a chaque changement de debouncedQuery (incluant le mount avec '').
  useEffect(() => {
    loadCities(debouncedQuery || undefined);
  }, [debouncedQuery, loadCities]);

  const totals = useMemo(() => {
    const totalEvents = cities.reduce((acc, c) => acc + c.event_count, 0);
    return { totalEvents, totalCities: cities.length };
  }, [cities]);

  // Construction des sections : pays user en premier, puis chaque autre pays
  // tri par event_count desc (les pays les plus actifs en haut).
  const sections: Section[] = useMemo(() => {
    if (cities.length === 0) return [];

    const userCities: CityWithCount[] = [];
    const byCountry = new Map<string, CityWithCount[]>();
    // Cles speciales pour villes legacy sans pays — pas un nom de pays
    // reel, donc on prefixe pour eviter une collision improbable.
    const UNKNOWN_KEY = '__unknown_country__';

    for (const c of cities) {
      if (isUserCity(c, userTokens)) {
        userCities.push(c);
      } else {
        const key = c.country || c.country_code || UNKNOWN_KEY;
        const list = byCountry.get(key) || [];
        list.push(c);
        byCountry.set(key, list);
      }
    }

    const out: Section[] = [];

    if (userCities.length > 0) {
      out.push({
        key: '_near',
        title: t('discover.citiesNearYou'),
        data: chunk(userCities, 2),
        totalEvents: userCities.reduce((a, c) => a + c.event_count, 0),
        totalCities: userCities.length,
      });
    }

    // Tri pays : par event_count total decroissant, puis alpha.
    // Les villes sans pays (UNKNOWN_KEY) sont poussees en fin de liste, peu
    // importe leur event_count (cas legacy a faible volume, mieux ailleurs).
    const countryEntries = Array.from(byCountry.entries()).sort(([na, ca], [nb, cb]) => {
      if (na === UNKNOWN_KEY && nb !== UNKNOWN_KEY) return 1;
      if (nb === UNKNOWN_KEY && na !== UNKNOWN_KEY) return -1;
      const sumA = ca.reduce((a, c) => a + c.event_count, 0);
      const sumB = cb.reduce((a, c) => a + c.event_count, 0);
      if (sumB !== sumA) return sumB - sumA;
      return na.localeCompare(nb);
    });

    for (const [country, list] of countryEntries) {
      out.push({
        key: country,
        title: country === UNKNOWN_KEY ? t('discover.citiesOtherCountries') : country,
        data: chunk(list, 2),
        totalEvents: list.reduce((a, c) => a + c.event_count, 0),
        totalCities: list.length,
      });
    }

    return out;
  }, [cities, userTokens, t]);

  const onCityPress = useCallback(
    (city: CityWithCount) => {
      navigation.navigate('EventSearch', { city: city.name });
    },
    [navigation],
  );

  const renderCity = useCallback(
    (item: CityWithCount) => {
      const countLabel =
        item.event_count === 1
          ? t('discover.cityEventsCountOne')
          : t('discover.cityEventsCount', { count: item.event_count });

      // Sur le hub (grille de 20+ cards), image statique (1ere sample). Pas
      // de slideshow : overhead trop important sur tous les visibles + l'user
      // scrolle vite et n'aura pas le temps de voir la rotation.
      const bgImage = item.sample_images?.[0]
        ? getMediaUrl(item.sample_images[0])
        : null;
      const hasBg = !!bgImage;

      return (
        <TouchableOpacity
          key={item.name}
          activeOpacity={TOUCH_OPACITY}
          onPress={() => onCityPress(item)}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${countLabel}`}
          style={[
            styles.gridCard,
            {
              width: CARD_WIDTH,
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

  const renderRow = useCallback(
    ({ item: row }: { item: CityWithCount[] }) => (
      <View style={styles.row}>
        {row.map(renderCity)}
        {/* Cellule fantome si la rangee est impaire pour aligner la grille */}
        {row.length === 1 && <View style={{ width: CARD_WIDTH }} />}
      </View>
    ),
    [renderCity],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => {
      const isUserSection = section.key === '_near';
      return (
        <View
          style={[
            styles.sectionHeader,
            { backgroundColor: colors.background },
          ]}
        >
          {isUserSection && (
            <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>
              {t('discover.citiesEyebrow')}
            </Text>
          )}
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionMeta, { color: colors.gray500 }]}>
              {section.totalCities}
            </Text>
          </View>
        </View>
      );
    },
    [colors, t],
  );

  // ─── Render ─────────────────────────────────────────────────────────

  const hasSearch = debouncedQuery.length > 0;
  const showEmpty = !loading && !failed && cities.length === 0;

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safe, { backgroundColor: colors.background }]}
    >
      {/* Header avec back button */}
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

      {failed ? (
        <ErrorState
          message={t('common.errorLoading') || 'Error'}
          onRetry={() => loadCities(debouncedQuery || undefined)}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, idx) => item.map((c) => c.name).join('|') + idx}
          renderItem={renderRow}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled
          ListHeaderComponent={
            <View style={styles.headerInner}>
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
                {!hasSearch && totals.totalCities > 0 && (
                  <Text style={[styles.heroSubtitle, { color: colors.gray600 }]}>
                    {t('discover.citiesIndexSubtitle', {
                      count: totals.totalCities,
                      total: totals.totalEvents,
                    })}
                  </Text>
                )}
              </View>

              {/* Search bar : toujours visible, debounce serveur. Le user
                  peut chercher "yao" → matche "Yaoundé", "Yaoundé I" etc. */}
              <View style={styles.searchBarWrap}>
                <View
                  style={[
                    styles.searchBar,
                    {
                      backgroundColor: colors.card,
                      borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                >
                  <Ionicons name="search" size={16} color={colors.gray500} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder={t('discover.citiesSearchPlaceholder')}
                    placeholderTextColor={colors.gray400}
                    value={query}
                    onChangeText={setQuery}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                    accessibilityLabel={t('discover.citiesSearchPlaceholder')}
                  />
                  {query.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setQuery('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.clear') || 'Clear'}
                    >
                      <Ionicons name="close-circle" size={16} color={colors.gray400} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            showEmpty ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name={hasSearch ? 'search-outline' : 'location-outline'}
                  size={48}
                  color={colors.gray400}
                  style={{ marginBottom: Spacing.md }}
                />
                <Text style={[styles.emptyText, { color: colors.gray600 }]}>
                  {hasSearch
                    ? t('discover.citiesNoMatch', { query: debouncedQuery })
                    : t('discover.citiesIndexEmpty')}
                </Text>
              </View>
            ) : loading ? (
              <View style={styles.skeletonGrid}>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <View
                    key={`skel-${idx}`}
                    style={[styles.gridCard, styles.skeletonCard, { width: CARD_WIDTH }]}
                  >
                    <View style={styles.skeletonLineLg} />
                    <View style={styles.skeletonLineSm} />
                    <View style={styles.skeletonPill} />
                  </View>
                ))}
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          // Perf : on a max 200 villes ; pas besoin de virtualisation aggressive
          // mais on garde des seuils raisonnables.
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={11}
        />
      )}
    </SafeAreaView>
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
    paddingBottom: Spacing.lg,
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

  // === SEARCH BAR ===
  searchBarWrap: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    padding: 0,
  },

  // === SECTION HEADER ===
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.8,
    lineHeight: 26,
    flex: 1,
  },
  sectionMeta: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: -0.1,
    marginLeft: 8,
  },

  // === ROW + CARDS ===
  listContent: {
    paddingBottom: Spacing['2xl'],
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
    ...centeredContent(MAX_CONTENT_WIDTH),
  },
  // Centre le header (hero + search) sur la même colonne plafonnée que la grille.
  headerInner: {
    ...centeredContent(MAX_CONTENT_WIDTH),
  },
  gridCard: {
    height: CARD_HEIGHT,
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

  // === EMPTY STATE ===
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

  // === SKELETON ===
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_HORIZONTAL_PADDING,
    gap: GRID_GAP,
  },
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
