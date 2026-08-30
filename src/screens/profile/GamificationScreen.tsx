import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { gamificationAPI } from '../../api';
import { RootStackParamList } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { GamificationScreenSkeleton } from '../../components/ui/Skeleton';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, FontFamily, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { StaggeredItem } from '../../components/ui/Animations';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TierConfig = { points: number; name: string; eyebrow: string; color: string; icon: keyof typeof Ionicons.glyphMap };

/**
 * Correspondance nom de badge backend → Ionicons.
 *
 * Le backend stocke des noms au format Lucide/Feather (`message-circle`,
 * `check-circle`, `zap`, `crown`…), qu'Ionicons ne connaît PAS : chaque badge
 * s'affichait avec un « ? ». On traduit ici plutôt que côté serveur — les
 * noms stockés restent agnostiques de la bibliothèque d'icônes du client, et
 * le web peut faire sa propre correspondance.
 */
const BADGE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'award': 'ribbon',
  'calendar': 'calendar',
  'check-circle': 'checkmark-circle',
  'crown': 'diamond',
  'flag': 'flag',
  'heart': 'heart',
  'message-circle': 'chatbubble-ellipses',
  'rocket': 'rocket',
  'star': 'star',
  'thumbs-up': 'thumbs-up',
  'trending-up': 'trending-up',
  'trophy': 'trophy',
  'users': 'people',
  'zap': 'flash',
};

/** Icône Ionicons d'un badge, avec repli sur `ribbon` si le nom est inconnu. */
/**
 * Couleur d'accent d'un badge, validée.
 *
 * `Badge.color` est saisi en admin : une valeur vide ou malformée ne doit pas
 * produire un dégradé cassé (`NaN` dans LinearGradient fige le rendu natif).
 */
export function badgeAccent(color: string | null | undefined, fallback: string): string {
  return typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color.trim())
    ? color.trim()
    : fallback;
}

/**
 * Éclaircit (`amount > 0`) ou assombrit (`amount < 0`) une couleur hex, pour
 * dériver le second ton du dégradé depuis la couleur propre au badge — plutôt
 * que d'imposer une seconde couleur fixe qui jurerait avec les 14 teintes.
 */
export function shadeColor(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 0xff) + amount);
  const g = clamp(((n >> 8) & 0xff) + amount);
  const b = clamp((n & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function badgeIcon(name?: string | null): keyof typeof Ionicons.glyphMap {
  if (!name) return 'ribbon';
  const mapped = BADGE_ICONS[name];
  if (mapped) return mapped;
  // Nom déjà au format Ionicons (badge créé en admin) : on l'accepte tel quel.
  // `glyphMap` est optionnel : absent sous certains mocks de test, et une
  // future version de la lib pourrait le retirer — on ne doit pas planter
  // l'écran des badges pour autant.
  const glyphs = (Ionicons as any)?.glyphMap;
  if (glyphs && name in glyphs) return name as keyof typeof Ionicons.glyphMap;
  return 'ribbon';
}

const TIER_BASE: { points: number; eyebrow: string; color: string; icon: keyof typeof Ionicons.glyphMap; nameKey: string }[] = [
  { points: 0, eyebrow: 'TIER 01', color: '#CD7F32', icon: 'shield-outline', nameKey: 'tier1Name' },
  { points: 500, eyebrow: 'TIER 02', color: '#9CA3AF', icon: 'shield-half', nameKey: 'tier2Name' },
  { points: 2000, eyebrow: 'TIER 03', color: '#F59E0B', icon: 'shield', nameKey: 'tier3Name' },
  { points: 5000, eyebrow: 'TIER 04', color: '#A855F7', icon: 'star', nameKey: 'tier4Name' },
  { points: 10000, eyebrow: 'TIER 05', color: '#EF4444', icon: 'flame', nameKey: 'tier5Name' },
];

function getTier(points: number, tiers: TierConfig[]) {
  let tier = tiers[0];
  let next = tiers[1];
  for (let i = 0; i < tiers.length; i++) {
    if (points >= tiers[i].points) {
      tier = tiers[i];
      next = tiers[i + 1] || tier;
    }
  }
  return { tier, next };
}

export default function GamificationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const TIER_CONFIG: TierConfig[] = TIER_BASE.map((tier) => ({
    ...tier,
    name: t(`gamification.${tier.nameKey}`),
  }));

  const [badges, setBadges] = useState<any[]>([]);
  const [points, setPoints] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'badges' | 'leaderboard'>('badges');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [badgesRes, pointsRes, lbRes] = await Promise.all([
        gamificationAPI.getMyBadges(),
        gamificationAPI.getPointsBalance(),
        gamificationAPI.getLeaderboard(),
      ]);
      setBadges(badgesRes.data.results || badgesRes.data || []);
      setPoints(pointsRes.data);
      setLeaderboard(lbRes.data.results || lbRes.data || []);
    } catch (error) {
      if (__DEV__) console.error('Erreur gamification:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>XP</WatermarkNumeral>
        <GamificationScreenSkeleton />
      </EditorialCanvas>
    );
  }

  const totalPoints = points?.total_points || points?.balance || 0;
  const { tier, next } = getTier(totalPoints, TIER_CONFIG);
  const isMaxTier = tier === next;
  const tierProgress = isMaxTier
    ? 100
    : ((totalPoints - tier.points) / (next.points - tier.points)) * 100;
  const pointsToNext = isMaxTier ? 0 : next.points - totalPoints;

  // === BADGE CARD ===
  const renderBadge = ({ item, index }: { item: any; index: number }) => {
    const earned = !!item.earned_at;
    // Chaque badge porte SA couleur en base (`Badge.color`), déjà exposée par
    // l'API — elle était ignorée au profit d'un violet uniforme, ce qui rendait
    // la collection indifférenciée. Repli sur `colors.primary` si absente.
    const accent = badgeAccent(item.color, colors.primary);
    return (
      <StaggeredItem index={index} staggerDelay={50}>
        <View style={styles.badgeCol}>
          <View
            style={[
              styles.badgeCard,
              {
                backgroundColor: colors.card,
                borderColor: earned ? accent : hairline,
              },
              earned ? Shadows.sm : { opacity: 0.55 },
            ]}
          >
            {/* Halo teinté : donne du relief au médaillon sans masquer la
                lisibilité du nom en dessous. Uniquement si obtenu — un badge
                verrouillé doit rester visiblement éteint. */}
            {earned && (
              <View
                pointerEvents="none"
                style={[styles.badgeGlow, { backgroundColor: `${accent}14` }]}
              />
            )}
            {earned && (
              <View style={[styles.badgeRibbon, { backgroundColor: '#10B981' }]}>
                <Ionicons name="checkmark" size={8} color="#FFFFFF" />
              </View>
            )}
            {earned ? (
              // Médaillon en dégradé : le badge obtenu se distingue au premier
              // coup d'œil d'un badge encore verrouillé.
              <LinearGradient
                colors={[accent, shadeColor(accent, -28)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.badgeIconBoxE}
              >
                <Ionicons name={badgeIcon(item.icon)} size={28} color="#FFFFFF" />
              </LinearGradient>
            ) : (
              <View style={[styles.badgeIconBoxE, { backgroundColor: colors.gray100 }]}>
                <Ionicons name={badgeIcon(item.icon)} size={28} color={colors.gray400} />
              </View>
            )}
          </View>
          <Text style={[styles.badgeNameE, { color: colors.text }]} numberOfLines={2}>
            {item.badge_name || item.name}
          </Text>
          {earned ? (
            <Text style={[styles.badgeDateE, { color: colors.gray500 }]}>
              {new Date(item.earned_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }).toUpperCase()}
            </Text>
          ) : (
            <Text style={[styles.badgeDateE, { color: colors.gray400 }]}>{t('gamification.lockedLabel')}</Text>
          )}
        </View>
      </StaggeredItem>
    );
  };

  // === LEADERBOARD ROW ===
  const renderLeaderRow = ({ item, index }: { item: any; index: number }) => {
    const isTop3 = index < 3;
    const medal = index === 0 ? '\u{1F947}' : index === 1 ? '\u{1F948}' : index === 2 ? '\u{1F949}' : null;

    return (
      <StaggeredItem index={index} staggerDelay={60}>
        <View
          style={[
            styles.leaderRow,
            {
              backgroundColor: colors.card,
              borderColor: isTop3 ? `${colors.primary}40` : hairline,
            },
            isTop3 ? Shadows.sm : Shadows.xs,
          ]}
        >
          <View
            style={[
              styles.rankBadge,
              { backgroundColor: isTop3 ? `${colors.primary}15` : colors.gray100 },
            ]}
          >
            {medal ? (
              <Text style={styles.rankMedal}>{medal}</Text>
            ) : (
              <Text style={[styles.rankNumber, { color: colors.gray600 }]}>{index + 1}</Text>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.leaderNameE, { color: colors.text }]} numberOfLines={1}>
              {item.user_name || item.username || t('gamification.fallbackUser')}
            </Text>
            <Text style={[styles.leaderSub, { color: colors.gray500 }]}>
              {t((item.badges_count || 0) > 1 ? 'gamification.badgeOther' : 'gamification.badgeOne', { count: item.badges_count || 0 })}
            </Text>
          </View>

          <View style={styles.leaderPointsCol}>
            <Text style={[styles.leaderPointsValue, { color: colors.text }]}>
              {item.total_points || 0}
            </Text>
            <Text style={[styles.leaderPointsLabel, { color: colors.gray500 }]}>{t('gamification.pointsLabel')}</Text>
          </View>
        </View>
      </StaggeredItem>
    );
  };

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>XP</WatermarkNumeral>

      {/* === HEADER === */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? colors.background : 'rgba(255,255,255,0.6)',
            borderBottomColor: hairline,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.iconDisc, { backgroundColor: colors.gray100 }]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={18} color={colors.gray600} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('gamification.headerEyebrow')}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{t('gamification.headerTitle')}</Text>
          </View>
          <View style={[styles.tierPill, { backgroundColor: `${tier.color}15` }]}>
            <Ionicons name={tier.icon} size={11} color={tier.color} />
            <Text style={[styles.tierPillText, { color: tier.color }]}>{tier.name}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* === HERO POINTS CARD (gradient + tier progress) === */}
        <View style={[styles.heroCard, Shadows.lg]}>
          <LinearGradient
            colors={['#0F172A', '#1E1B4B', tier.color]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroCircle1} />
          <View style={styles.heroCircle2} />
          <Text style={styles.heroWatermark}>XP</Text>

          <View style={styles.heroTopRow}>
            <View style={styles.heroEyebrowCol}>
              <Text style={styles.heroEyebrow}>{t('gamification.heroEyebrow')}</Text>
              <View style={styles.heroTierBadge}>
                <Ionicons name={tier.icon} size={10} color="#FFFFFF" />
                <Text style={styles.heroTierBadgeText}>{tier.eyebrow}</Text>
              </View>
            </View>
          </View>

          <View style={styles.heroPointsRow}>
            <Text style={styles.heroPointsValue} numberOfLines={1} adjustsFontSizeToFit>
              {totalPoints.toLocaleString()}
            </Text>
            <Text style={styles.heroPointsUnit}>{t('gamification.heroPointsUnit')}</Text>
          </View>

          <View style={styles.heroDivider} />

          {/* Tier progress */}
          <View style={styles.tierProgressBlock}>
            <View style={styles.tierProgressTop}>
              <Text style={styles.tierProgressLabel}>
                {isMaxTier ? t('gamification.tierMaxLabel') : t('gamification.tierNextLabel', { tier: next.name.toUpperCase() })}
              </Text>
              <Text style={styles.tierProgressValue}>
                {isMaxTier ? t('gamification.tierMaxValue') : t('gamification.pointsToNext', { count: pointsToNext })}
              </Text>
            </View>
            <View style={styles.tierProgressBar}>
              <View
                style={[
                  styles.tierProgressFill,
                  { width: `${Math.min(tierProgress, 100)}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {/* === STAT STRIP === */}
        <View
          style={[
            styles.statStrip,
            { backgroundColor: colors.card, borderColor: hairline },
          ]}
        >
          <View style={[styles.statCell, { borderRightColor: hairline }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {badges.filter((b) => b.earned_at).length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('gamification.statBadges')}</Text>
          </View>
          <View style={[styles.statCell, { borderRightColor: hairline }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {points?.points_today || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('gamification.statToday')}</Text>
          </View>
          <View style={styles.statCellLast}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {points?.streak_days || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('gamification.statStreak')}</Text>
          </View>
        </View>

        {/* === TABS === */}
        <View style={[styles.tabsBar, { backgroundColor: colors.gray100 }]}>
          {([
            { key: 'badges' as const, label: t('gamification.tabBadges'), count: badges.length },
            { key: 'leaderboard' as const, label: t('gamification.tabLeaderboard'), count: leaderboard.length },
          ]).map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabSeg,
                  active && { backgroundColor: colors.card, ...Shadows.xs },
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabSegText,
                    { color: active ? colors.text : colors.gray500 },
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={[styles.tabSegBadge, { backgroundColor: active ? colors.gray200 : 'transparent' }]}>
                    <Text style={[styles.tabSegBadgeText, { color: active ? colors.gray700 : colors.gray400 }]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* === CONTENT === */}
        {activeTab === 'badges' ? (
          badges.length === 0 ? (
            <View style={styles.emptyStateE}>
              <View style={[styles.emptyIconE, { backgroundColor: `${colors.primary}10` }]}>
                <Ionicons name="ribbon-outline" size={40} color={colors.primary} />
              </View>
              <Text style={[styles.emptyEyebrowE, { color: colors.accent }]}>{t('gamification.emptyBadgesEyebrow')}</Text>
              <Text style={[styles.emptyTitleE, { color: colors.text }]}>{t('gamification.emptyBadgesTitle')}</Text>
              <Text style={[styles.emptyTextE, { color: colors.gray500 }]}>
                {t('gamification.emptyBadgesText')}
              </Text>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>
                {t('gamification.collectionEyebrow', { earned: badges.filter((b) => b.earned_at).length, total: badges.length })}
              </Text>
              <Text style={[styles.sectionTitleE, { color: colors.text }]}>{t('gamification.collectionTitle')}</Text>
              <FlatList
                data={badges}
                numColumns={3}
                keyExtractor={(item) => item.id}
                renderItem={renderBadge}
                scrollEnabled={false}
                contentContainerStyle={styles.badgesGridE}
                columnWrapperStyle={{ gap: 8, marginBottom: Spacing.sm }}
              />
            </View>
          )
        ) : leaderboard.length === 0 ? (
          <View style={styles.emptyStateE}>
            <View style={[styles.emptyIconE, { backgroundColor: `${colors.primary}10` }]}>
              <Ionicons name="podium-outline" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.emptyEyebrowE, { color: colors.accent }]}>{t('gamification.emptyLeaderboardEyebrow')}</Text>
            <Text style={[styles.emptyTitleE, { color: colors.text }]}>{t('gamification.emptyLeaderboardTitle')}</Text>
            <Text style={[styles.emptyTextE, { color: colors.gray500 }]}>
              {t('gamification.emptyLeaderboardText')}
            </Text>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.sectionEyebrow, { color: colors.accent }]}>
              {t('gamification.leaderboardEyebrow')}
            </Text>
            <Text style={[styles.sectionTitleE, { color: colors.text }]}>{t('gamification.leaderboardTitle')}</Text>
            {leaderboard.map((item, index) => (
              <View key={item.id || index}>
                {renderLeaderRow({ item, index })}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  // === HEADER ===
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 30,
    letterSpacing: -1.2,
    lineHeight: 34,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  tierPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1,
  },

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 140,
    ...centeredContent(CARD_MAX),
  },

  // === HERO CARD ===
  heroCard: {
    borderRadius: 28,
    padding: Spacing.lg,
    minHeight: 220,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  heroCircle1: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(190,255,90,0.12)',
  },
  heroWatermark: {
    position: 'absolute',
    bottom: 14,
    right: 18,
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 80,
    letterSpacing: -3,
    color: 'rgba(255,255,255,0.06)',
    lineHeight: 80,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  heroEyebrowCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    flexWrap: 'wrap',
  },
  heroEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  heroTierBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  heroPointsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: Spacing.md,
  },
  heroPointsValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 50,
    color: '#FFFFFF',
    letterSpacing: -2.2,
    lineHeight: 52,
  },
  heroPointsUnit: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.2,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: Spacing.md,
  },
  tierProgressBlock: {
    gap: 8,
  },
  tierProgressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierProgressLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
  },
  tierProgressValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  tierProgressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  tierProgressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },

  // === STAT STRIP ===
  statStrip: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCell: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    borderRightWidth: 1,
    alignItems: 'flex-start',
  },
  statCellLast: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    alignItems: 'flex-start',
  },
  statValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    lineHeight: 24,
  },
  statLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.3,
    marginTop: 4,
    textTransform: 'uppercase',
  },

  // === TABS ===
  tabsBar: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  tabSeg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.full,
  },
  tabSegText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  tabSegBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabSegBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
  },

  // === SECTION ===
  section: {
    marginTop: Spacing.sm,
  },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionTitleE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    lineHeight: 26,
    marginBottom: Spacing.md,
  },

  // === BADGES GRID ===
  badgesGridE: {
    paddingTop: 4,
  },
  badgeCol: {
    // `maxWidth: 33.33%` EN PLUS de flex:1 — sans lui, une rangée incomplète
    // (2 badges sur 3 colonnes, cas d'un compte récent) étire les cartes sur
    // toute la largeur : une seule carte géante à l'écran, la suivante hors
    // champ. `flex:1` seul répartit l'espace sur le nombre RÉEL d'items de la
    // rangée, pas sur `numColumns`.
    flex: 1,
    maxWidth: '33.33%',
    alignItems: 'center',
    gap: 4,
  },
  badgeCard: {
    width: '92%',
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeRibbon: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  badgeIconBoxE: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Halo derrière le médaillon — `absoluteFill` pour ne pas influer sur le
  // layout de la carte (qui reste carrée via aspectRatio).
  badgeGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  badgeNameE: {
    fontFamily: FontFamily.displayBold,
    fontSize: 11,
    letterSpacing: -0.2,
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 4,
  },
  badgeDateE: {
    fontFamily: FontFamily.bold,
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // === LEADERBOARD ===
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankMedal: {
    fontSize: 22,
  },
  rankNumber: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  leaderNameE: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14,
    letterSpacing: -0.3,
    lineHeight: 17,
  },
  leaderSub: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  leaderPointsCol: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  leaderPointsValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 17,
    letterSpacing: -0.5,
    lineHeight: 19,
  },
  leaderPointsLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    marginTop: 2,
  },

  // === EMPTY ===
  emptyStateE: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyIconE: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyEyebrowE: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  emptyTitleE: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.6,
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTextE: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
  },
});
