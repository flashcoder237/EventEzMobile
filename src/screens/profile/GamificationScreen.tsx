import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { gamificationAPI } from '../../api';
import { RootStackParamList } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function GamificationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const [badges, setBadges] = useState<any[]>([]);
  const [points, setPoints] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'badges' | 'leaderboard'>('badges');

  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

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
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>RÉCOMPENSES</Text>
          <Text style={[styles.title, { color: colors.text }]}>Badges & Points</Text>
        </View>
      </View>

      {/* Points Card */}
      <View
        style={[
          styles.pointsCard,
          { backgroundColor: colors.card, borderColor: hairline },
          Shadows.sm,
        ]}
      >
        <View style={[styles.pointsIcon, { backgroundColor: 'rgba(255,215,0,0.12)' }]}>
          <Ionicons name="trophy" size={28} color="#E0A800" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pointsEyebrow, { color: colors.gray500 }]}>SOLDE</Text>
          <Text style={[styles.pointsValue, { color: colors.text }]}>
            {points?.total_points || points?.balance || 0}
          </Text>
          <Text style={[styles.pointsLabel, { color: colors.gray500 }]}>points cumulés</Text>
        </View>
      </View>

      {/* Tabs */}
      <View
        style={[
          styles.tabs,
          { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline },
        ]}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === 'badges' && [styles.activeTab, { backgroundColor: colors.card }, Shadows.sm]]}
          onPress={() => setActiveTab('badges')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, { color: activeTab === 'badges' ? colors.text : colors.gray500 }]}>
            Badges ({badges.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboard' && [styles.activeTab, { backgroundColor: colors.card }, Shadows.sm]]}
          onPress={() => setActiveTab('leaderboard')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, { color: activeTab === 'leaderboard' ? colors.text : colors.gray500 }]}>
            Classement
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'badges' ? (
        <FlatList
          key="badges-grid"
          data={badges}
          numColumns={3}
          contentContainerStyle={styles.badgesGrid}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="ribbon-outline" size={48} color={colors.gray400} />
              <Text style={[styles.emptyText, { color: colors.text }]}>Aucun badge pour le moment</Text>
              <Text style={[styles.emptySubtext, { color: colors.gray500 }]}>
                Participez à des événements pour gagner des badges.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.badgeItem}>
              <View
                style={[
                  styles.badgeIcon,
                  {
                    backgroundColor: `${colors.primary}15`,
                    borderColor: hairline,
                  },
                ]}
              >
                <Ionicons name={item.icon || 'ribbon'} size={26} color={colors.primary} />
              </View>
              <Text style={[styles.badgeName, { color: colors.text }]} numberOfLines={2}>
                {item.badge_name || item.name}
              </Text>
              {item.earned_at && (
                <Text style={[styles.badgeDate, { color: colors.gray500 }]}>
                  {new Date(item.earned_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                </Text>
              )}
            </View>
          )}
        />
      ) : (
        <FlatList
          key="leaderboard-list"
          data={leaderboard}
          contentContainerStyle={styles.leaderboardList}
          keyExtractor={(item, index) => item.id || String(index)}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="podium-outline" size={48} color={colors.gray400} />
              <Text style={[styles.emptyText, { color: colors.text }]}>Classement non disponible</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.leaderboardItem,
                { backgroundColor: colors.card, borderColor: hairline },
                Shadows.sm,
              ]}
            >
              <Text style={[styles.rank, { color: index < 3 ? colors.primary : colors.gray500 }]}>
                {index === 0 ? '\u{1F947}' : index === 1 ? '\u{1F948}' : index === 2 ? '\u{1F949}' : `${index + 1}`}
              </Text>
              <View style={styles.leaderboardInfo}>
                <Text style={[styles.leaderboardName, { color: colors.text }]} numberOfLines={1}>
                  {item.user_name || item.username || 'Utilisateur'}
                </Text>
              </View>
              <Text style={[styles.leaderboardPoints, { color: colors.primary }]}>
                {item.total_points || 0} pts
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  iconDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
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
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.4,
  },
  pointsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  pointsIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  pointsValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: 32,
    letterSpacing: -1,
  },
  pointsLabel: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.full,
  },
  activeTab: {},
  tabText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },
  badgesGrid: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  badgeItem: {
    flex: 1 / 3,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  badgeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  badgeName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
    textAlign: 'center',
  },
  badgeDate: {
    fontSize: 10,
    marginTop: 2,
  },
  leaderboardList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
  },
  rank: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.md,
    width: 32,
    textAlign: 'center',
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  leaderboardName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },
  leaderboardPoints: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.xs,
  },
  emptyText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.md,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
