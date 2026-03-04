import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../contexts/ThemeContext';
import { useCommissionConfig } from '../../../hooks/useCommissionConfig';
import { treasuryAPI } from '../../../api/client';
import { RootStackParamList, Shareholder, DividendDistribution } from '../../../types';
import Badge from '../../../components/ui/Badge';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TabType = 'shareholders' | 'dividends';

export default function TreasuryShareholdersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { currency: platformCurrency } = useCommissionConfig();
  const [activeTab, setActiveTab] = useState<TabType>('shareholders');
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [dividends, setDividends] = useState<DividendDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [shRes, divRes] = await Promise.all([
        treasuryAPI.getShareholders().catch(() => ({ data: [] })),
        treasuryAPI.getDividends().catch(() => ({ data: [] })),
      ]);
      setShareholders(shRes.data?.results || shRes.data || []);
      setDividends(divRes.data?.results || divRes.data || []);
    } catch (error) {
      console.error('Erreur actionnaires:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const totalOwnership = shareholders.reduce((sum, s) => sum + s.ownership_percentage, 0);

  const renderShareholder = ({ item }: { item: Shareholder }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
      <View style={styles.cardRow}>
        <View style={[styles.avatar, { backgroundColor: '#EC4899' }]}>
          <Text style={styles.avatarText}>
            {(item.name?.[0] || '?').toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.cardTitle, { color: colors.gray900 }]}>{item.name}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.gray500 }]}>
            Depuis {new Date(item.joined_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <View style={styles.percentageContainer}>
          <Text style={[styles.percentage, { color: colors.primary }]}>{item.ownership_percentage}%</Text>
        </View>
      </View>
      {/* Ownership bar */}
      <View style={[styles.barContainer, { backgroundColor: colors.gray100 }]}>
        <View style={[styles.bar, { width: `${item.ownership_percentage}%`, backgroundColor: '#EC4899' }]} />
      </View>
    </View>
  );

  const renderDividend = ({ item }: { item: DividendDistribution }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
      <View style={styles.cardRow}>
        <View style={[styles.divIcon, { backgroundColor: isDark ? '#1A2E1A' : '#D1FAE5' }]}>
          <Ionicons name="cash-outline" size={20} color="#10B981" />
        </View>
        <View style={styles.info}>
          <Text style={[styles.cardTitle, { color: colors.gray900 }]}>
            {item.total_amount.toLocaleString()} {platformCurrency}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.gray500 }]}>
            {new Date(item.period_start).toLocaleDateString('fr-FR', { month: 'short' })} - {new Date(item.period_end).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <Badge
          label={item.status === 'distributed' ? 'Distribue' : item.status === 'approved' ? 'Approuve' : 'Brouillon'}
          variant={item.status === 'distributed' ? 'success' : item.status === 'approved' ? 'info' : 'secondary'}
          size="sm"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.gray50 }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Actionnaires</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Total Ownership */}
      <View style={[styles.ownershipSummary, { backgroundColor: colors.card, borderBottomColor: colors.gray100 }]}>
        <Text style={[styles.ownershipLabel, { color: colors.gray500 }]}>Parts attribuees</Text>
        <Text style={[styles.ownershipValue, { color: totalOwnership === 100 ? '#10B981' : '#F59E0B' }]}>
          {totalOwnership}%
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.gray100 }]}>
        {(['shareholders', 'dividends'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: colors.gray500 }, activeTab === tab && { color: colors.primary }]}>
              {tab === 'shareholders' ? `Actionnaires (${shareholders.length})` : `Dividendes (${dividends.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={activeTab === 'shareholders' ? shareholders as any[] : dividends as any[]}
        renderItem={activeTab === 'shareholders' ? renderShareholder as any : renderDividend as any}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="pie-chart-outline" size={48} color={colors.gray300} />
            <Text style={[styles.emptyText, { color: colors.gray400 }]}>
              {activeTab === 'shareholders' ? 'Aucun actionnaire' : 'Aucun dividende'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...TextStyles.h3 },
  ownershipSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  ownershipLabel: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm },
  ownershipValue: { fontFamily: FontFamily.displayBold, fontSize: FontSizes.xl },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center' },
  tabText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  listContent: { padding: Spacing.lg, flexGrow: 1 },
  card: { borderRadius: BorderRadius.xl, borderWidth: 1, marginBottom: Spacing.sm, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: FontFamily.bold, fontSize: FontSizes.sm, color: '#FFFFFF' },
  divIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginHorizontal: Spacing.md },
  cardTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base },
  cardSubtitle: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: 2 },
  percentageContainer: { paddingHorizontal: Spacing.md },
  percentage: { fontFamily: FontFamily.displayBold, fontSize: FontSizes.lg },
  barContainer: { height: 4, marginHorizontal: Spacing.md, marginBottom: Spacing.md, borderRadius: 2 },
  bar: { height: 4, borderRadius: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.md },
  emptyText: { fontFamily: FontFamily.regular, fontSize: FontSizes.base },
});
