import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function GamificationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const [badges, setBadges] = useState<any[]>([]);
  const [points, setPoints] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Badges & Points</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Points Card */}
      <View style={[styles.pointsCard, { backgroundColor: colors.card }]}>
        <Ionicons name="trophy" size={32} color="#FFD700" />
        <Text style={[styles.pointsValue, { color: colors.primary }]}>{points?.total_points || points?.balance || 0}</Text>
        <Text style={[styles.pointsLabel, { color: colors.textLight }]}>Points</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.gray100 }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'badges' && [styles.activeTab, { backgroundColor: colors.card }]]}
          onPress={() => setActiveTab('badges')}
        >
          <Text style={[styles.tabText, { color: colors.textLight }, activeTab === 'badges' && { color: colors.primary }]}>
            Badges ({badges.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboard' && [styles.activeTab, { backgroundColor: colors.card }]]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Text style={[styles.tabText, { color: colors.textLight }, activeTab === 'leaderboard' && { color: colors.primary }]}>
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
              <Ionicons name="ribbon-outline" size={48} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>Aucun badge pour le moment</Text>
              <Text style={[styles.emptySubtext, { color: colors.textLight }]}>Participez a des evenements pour gagner des badges !</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.badgeItem}>
              <View style={[styles.badgeIcon, { backgroundColor: item.color || colors.primaryBg }]}>
                <Ionicons name={item.icon || 'ribbon'} size={28} color={colors.primary} />
              </View>
              <Text style={[styles.badgeName, { color: colors.text }]} numberOfLines={2}>{item.badge_name || item.name}</Text>
              {item.earned_at && (
                <Text style={[styles.badgeDate, { color: colors.textLight }]}>
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
              <Ionicons name="podium-outline" size={48} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>Classement non disponible</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={[styles.leaderboardItem, { backgroundColor: colors.card }, index < 3 && { borderLeftColor: colors.primary, borderLeftWidth: 3 }]}>
              <Text style={[styles.rank, { color: colors.textLight }, index < 3 && styles.topRank]}>
                {index === 0 ? '\u{1F947}' : index === 1 ? '\u{1F948}' : index === 2 ? '\u{1F949}' : `${index + 1}`}
              </Text>
              <View style={styles.leaderboardInfo}>
                <Text style={[styles.leaderboardName, { color: colors.text }]}>{item.user_name || item.username || 'Utilisateur'}</Text>
              </View>
              <Text style={[styles.leaderboardPoints, { color: colors.primary }]}>{item.total_points || 0} pts</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text },
  pointsCard: { alignItems: 'center', backgroundColor: Colors.white, marginHorizontal: Spacing.md, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.md },
  pointsValue: { fontSize: 36, fontWeight: '800', color: Colors.primary, marginTop: Spacing.xs },
  pointsLabel: { fontSize: FontSizes.sm, color: Colors.textLight },
  tabs: { flexDirection: 'row', marginHorizontal: Spacing.md, backgroundColor: Colors.gray100, borderRadius: BorderRadius.lg, padding: 4, marginBottom: Spacing.md },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.md },
  activeTab: { backgroundColor: Colors.white, ...Shadows.md },
  tabText: { fontSize: FontSizes.sm, color: Colors.textLight, fontWeight: '600' },
  activeTabText: { color: Colors.primary },
  badgesGrid: { paddingHorizontal: Spacing.md },
  badgeItem: { flex: 1 / 3, alignItems: 'center', marginBottom: Spacing.lg, paddingHorizontal: Spacing.xs },
  badgeIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  badgeName: { fontSize: FontSizes.xs, color: Colors.text, textAlign: 'center', fontWeight: '600' },
  badgeDate: { fontSize: 10, color: Colors.textLight, marginTop: 2 },
  leaderboardList: { paddingHorizontal: Spacing.md },
  leaderboardItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.xs },
  topThree: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  rank: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.textLight, width: 32, textAlign: 'center' },
  topRank: { fontSize: 20 },
  leaderboardInfo: { flex: 1, marginLeft: Spacing.sm },
  leaderboardName: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.text },
  leaderboardPoints: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.primary },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl * 2 },
  emptyText: { fontSize: FontSizes.md, color: Colors.textLight, fontWeight: '600', marginTop: Spacing.md },
  emptySubtext: { fontSize: FontSizes.sm, color: Colors.textLight, marginTop: Spacing.xs, textAlign: 'center' },
});
