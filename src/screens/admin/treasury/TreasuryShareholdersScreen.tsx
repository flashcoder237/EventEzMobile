import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../../contexts/ThemeContext';
import { useCommissionConfig } from '../../../hooks/useCommissionConfig';
import { treasuryAPI } from '../../../api';
import { RootStackParamList, Shareholder, DividendDistribution } from '../../../types';
import Badge from '../../../components/ui/Badge';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type TabType = 'shareholders' | 'dividends';

const SHAREHOLDER_COLOR = '#A855F7';

export default function TreasuryShareholdersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
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
      if (__DEV__) console.error('Erreur actionnaires:', error);
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
  const ownershipComplete = totalOwnership === 100;

  const renderShareholder = ({ item }: { item: Shareholder }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
      <View style={styles.cardRow}>
        <View style={[styles.avatar, { backgroundColor: `${SHAREHOLDER_COLOR}15` }]}>
          <Text style={[styles.avatarText, { color: SHAREHOLDER_COLOR }]}>
            {(item.name?.[0] || '?').toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.gray500 }]} numberOfLines={1}>
            Depuis {new Date(item.joined_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <Text style={[styles.percentage, { color: SHAREHOLDER_COLOR }]}>{item.ownership_percentage}%</Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.05)' }]}>
        <View style={[styles.bar, { width: `${item.ownership_percentage}%`, backgroundColor: SHAREHOLDER_COLOR }]} />
      </View>
    </View>
  );

  const renderDividend = ({ item }: { item: DividendDistribution }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
      <View style={styles.cardRow}>
        <View style={[styles.iconWell, { backgroundColor: '#10B98115' }]}>
          <Ionicons name="cash-outline" size={18} color="#10B981" />
        </View>
        <View style={styles.info}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {item.total_amount.toLocaleString()} {platformCurrency}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.gray500 }]} numberOfLines={1}>
            {new Date(item.period_start).toLocaleDateString('fr-FR', { month: 'short' })} - {new Date(item.period_end).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <Badge
          label={item.status === 'distributed' ? 'Distribué' : item.status === 'approved' ? 'Approuvé' : 'Brouillon'}
          variant={item.status === 'distributed' ? 'success' : item.status === 'approved' ? 'info' : 'secondary'}
          size="sm"
        />
      </View>
    </View>
  );

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'shareholders', label: 'Actionnaires', count: shareholders.length },
    { key: 'dividends', label: 'Dividendes', count: dividends.length },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>LE CAPITAL</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Actionnaires</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md }}>
        <View style={[styles.ownershipCard, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.ownershipEyebrow, { color: colors.gray500 }]}>PARTS ATTRIBUÉES</Text>
            <Text style={[styles.ownershipValue, { color: ownershipComplete ? '#10B981' : '#F59E0B' }]}>
              {totalOwnership}%
            </Text>
          </View>
          <View style={[styles.ownershipBadge, { backgroundColor: ownershipComplete ? '#10B98115' : '#F59E0B15' }]}>
            <Ionicons
              name={ownershipComplete ? 'checkmark-circle' : 'alert-circle-outline'}
              size={14}
              color={ownershipComplete ? '#10B981' : '#F59E0B'}
            />
            <Text style={[styles.ownershipBadgeText, { color: ownershipComplete ? '#10B981' : '#F59E0B' }]}>
              {ownershipComplete ? 'Complet' : `Reste ${100 - totalOwnership}%`}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.lg }}>
          {tabs.map((t) => {
            const active = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.filterPill,
                  active
                    ? { backgroundColor: colors.text, borderColor: colors.text }
                    : { backgroundColor: colors.card, borderColor: hairline },
                ]}
                onPress={() => setActiveTab(t.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, { color: active ? colors.background : colors.gray600 }]}>
                  {t.label} ({t.count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
            <Text style={[styles.emptyText, { color: colors.gray500 }]}>
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
  headerEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.4,
  },
  ownershipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  ownershipEyebrow: { fontFamily: FontFamily.bold, fontSize: 9, letterSpacing: 1.2, marginBottom: 2 },
  ownershipValue: { fontFamily: FontFamily.displayBold, fontSize: FontSizes['2xl'], letterSpacing: -0.5 },
  ownershipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  ownershipBadgeText: { fontFamily: FontFamily.bold, fontSize: FontSizes.xs },
  filtersRow: {
    paddingVertical: Spacing.md,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, flexGrow: 1 },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: FontFamily.bold, fontSize: FontSizes.sm },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, marginHorizontal: Spacing.md },
  cardTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base },
  cardSubtitle: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs, marginTop: 2 },
  percentage: { fontFamily: FontFamily.displayBold, fontSize: FontSizes.lg, letterSpacing: -0.3 },
  barTrack: {
    height: 4,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: 2,
    overflow: 'hidden',
  },
  bar: { height: 4, borderRadius: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.md },
  emptyText: { fontFamily: FontFamily.medium, fontSize: FontSizes.base },
});
