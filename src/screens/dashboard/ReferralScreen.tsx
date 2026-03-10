import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Share,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { referralsAPI } from '../../api';
import { RootStackParamList } from '../../types';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useTheme } from '../../contexts/ThemeContext';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ReferralCode {
  id: string;
  code: string;
  code_type?: string;
  event_name?: string;
  event_title?: string;
  commission_percentage?: number;
  usage_limit?: number;
  usage_count?: number;
  total_clicks?: number;
  total_conversions?: number;
  total_earnings?: number;
  is_active?: boolean;
  valid_until?: string;
  created_at: string;
}

interface ReferralStats {
  total_clicks: number;
  total_conversions: number;
  total_earnings: number;
  conversion_rate?: number;
}

export default function ReferralScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { currency: platformCurrency } = useCommissionConfig();
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const codesRes = await referralsAPI.getCodes();
      const codesData: ReferralCode[] = codesRes.data.results || codesRes.data || [];
      setCodes(codesData);

      // Fetch stats for the first code if available, or aggregate
      if (codesData.length > 0) {
        try {
          const statsRes = await referralsAPI.getStats(codesData[0].id);
          setStats(statsRes.data);
        } catch {
          // Aggregate from codes data as fallback
          const aggregated: ReferralStats = {
            total_clicks: codesData.reduce((sum, c) => sum + (c.total_clicks || 0), 0),
            total_conversions: codesData.reduce((sum, c) => sum + (c.total_conversions || 0), 0),
            total_earnings: codesData.reduce((sum, c) => sum + (c.total_earnings || 0), 0),
          };
          setStats(aggregated);
        }
      } else {
        setStats({ total_clicks: 0, total_conversions: 0, total_earnings: 0 });
      }
    } catch (error) {
      if (__DEV__) console.error('Erreur referrals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleCopy = async (code: string, id: string) => {
    try {
      await Clipboard.setStringAsync(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      if (__DEV__) console.error('Erreur copie:', error);
      Alert.alert('Erreur', 'Impossible de copier le code.');
    }
  };

  const handleShare = async (code: string, eventName?: string) => {
    try {
      const message = eventName
        ? `Rejoins-moi sur EventEz pour "${eventName}" ! Utilise mon code de parrainage : ${code}`
        : `Rejoins EventEz avec mon code de parrainage : ${code}`;

      await Share.share({
        message,
        title: 'Parrainage EventEz',
      });
    } catch (error) {
      if (__DEV__) console.error('Erreur partage:', error);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: platformCurrency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderStatsCard = () => (
    <View style={styles.statsRow}>
      <View style={[styles.statCard, { backgroundColor: colors.card }]}>
        <Ionicons name="hand-left-outline" size={22} color={colors.info} />
        <Text style={[styles.statValue, { color: colors.text }]}>{stats?.total_clicks || 0}</Text>
        <Text style={[styles.statLabel, { color: colors.textLight }]}>Clics</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: colors.card }]}>
        <Ionicons name="people-outline" size={22} color={colors.success} />
        <Text style={[styles.statValue, { color: colors.text }]}>{stats?.total_conversions || 0}</Text>
        <Text style={[styles.statLabel, { color: colors.textLight }]}>Conversions</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: colors.card }]}>
        <Ionicons name="cash-outline" size={22} color={colors.primary} />
        <Text style={[styles.statValue, { color: colors.text }]}>{formatCurrency(stats?.total_earnings || 0)}</Text>
        <Text style={[styles.statLabel, { color: colors.textLight }]}>Gains</Text>
      </View>
    </View>
  );

  const renderCodeCard = ({ item }: { item: ReferralCode }) => {
    const isCopied = copiedId === item.id;
    const eventName = item.event_title || item.event_name;

    return (
      <View style={[styles.codeCard, { backgroundColor: colors.card }]}>
        {eventName && (
          <Text style={[styles.codeEventName, { color: colors.textSecondary }]} numberOfLines={1}>
            {eventName}
          </Text>
        )}

        <View style={styles.codeRow}>
          <View style={[styles.codeBox, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
            <Text style={[styles.codeText, { color: colors.primary }]}>{item.code}</Text>
          </View>
          <TouchableOpacity
            style={[styles.copyButton, { backgroundColor: colors.primaryBg }, isCopied && { backgroundColor: colors.successLight }]}
            onPress={() => handleCopy(item.code, item.id)}
          >
            <Ionicons
              name={isCopied ? 'checkmark' : 'copy-outline'}
              size={18}
              color={isCopied ? colors.success : colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: colors.primary }]}
            onPress={() => handleShare(item.code, eventName)}
          >
            <Ionicons name="share-outline" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.codeDetails}>
          {item.commission_percentage != null && (
            <View style={[styles.detailChip, { backgroundColor: colors.gray100 }]}>
              <Text style={[styles.detailChipText, { color: colors.textSecondary }]}>
                {item.commission_percentage}% commission
              </Text>
            </View>
          )}
          {item.usage_limit != null && (
            <View style={[styles.detailChip, { backgroundColor: colors.gray100 }]}>
              <Text style={[styles.detailChipText, { color: colors.textSecondary }]}>
                {item.usage_count || 0}/{item.usage_limit} utilisations
              </Text>
            </View>
          )}
          {item.total_clicks != null && (
            <View style={[styles.detailChip, { backgroundColor: colors.gray100 }]}>
              <Text style={[styles.detailChipText, { color: colors.textSecondary }]}>
                {item.total_clicks} clic{(item.total_clicks || 0) !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {item.valid_until && (
          <Text style={[styles.validUntil, { color: colors.textLight }]}>
            Valide jusqu'au {new Date(item.valid_until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        )}
      </View>
    );
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Parrainage</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={codes}
        contentContainerStyle={styles.listContent}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <>
            {/* Description */}
            <View style={[styles.descriptionCard, { backgroundColor: colors.primaryBg }]}>
              <Ionicons name="gift-outline" size={24} color={colors.primary} />
              <Text style={[styles.descriptionText, { color: colors.primary }]}>
                Partagez vos codes de parrainage et gagnez des commissions sur chaque inscription !
              </Text>
            </View>

            {/* Stats */}
            {renderStatsCard()}

            {/* Section Title */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Mes codes de parrainage</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="link-outline" size={48} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>Aucun code de parrainage</Text>
            <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
              Vos codes de parrainage apparaitront ici lorsqu'ils seront disponibles.
            </Text>
          </View>
        }
        renderItem={renderCodeCard}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text },
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  descriptionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm },
  descriptionText: { flex: 1, fontSize: FontSizes.sm, color: Colors.primary, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  statCard: { flex: 1, alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.xl, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xs, ...Shadows.card },
  statValue: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.text, marginTop: Spacing.xs },
  statLabel: { fontSize: FontSizes.xs, color: Colors.textLight, marginTop: 2 },
  sectionTitle: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  codeCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.card },
  codeEventName: { fontSize: FontSizes.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  codeBox: { flex: 1, backgroundColor: Colors.gray50, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
  codeText: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.primary, textAlign: 'center', letterSpacing: 2 },
  copyButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  copyButtonDone: { backgroundColor: Colors.successLight },
  shareButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  codeDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm },
  detailChip: { backgroundColor: Colors.gray100, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  detailChipText: { fontSize: FontSizes.xs, color: Colors.textSecondary, fontWeight: '500' },
  validUntil: { fontSize: FontSizes.xs, color: Colors.textLight, marginTop: Spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl * 2 },
  emptyText: { fontSize: FontSizes.md, color: Colors.textLight, fontWeight: '600', marginTop: Spacing.md },
  emptySubtext: { fontSize: FontSizes.sm, color: Colors.textLight, marginTop: Spacing.xs, textAlign: 'center', paddingHorizontal: Spacing.xl },
});
