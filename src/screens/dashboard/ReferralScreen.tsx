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
import { FontFamily, FontSizes, Spacing, BorderRadius, Shadows } from '../../constants/theme';

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

  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const codesRes = await referralsAPI.getCodes();
      const codesData: ReferralCode[] = codesRes.data.results || codesRes.data || [];
      setCodes(codesData);

      if (codesData.length > 0) {
        try {
          const statsRes = await referralsAPI.getStats(codesData[0].id);
          setStats(statsRes.data);
        } catch {
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
      {[
        { icon: 'hand-left-outline' as const, value: String(stats?.total_clicks || 0), label: 'Clics', color: colors.info },
        { icon: 'people-outline' as const, value: String(stats?.total_conversions || 0), label: 'Conversions', color: colors.success },
        { icon: 'cash-outline' as const, value: formatCurrency(stats?.total_earnings || 0), label: 'Gains', color: colors.primary },
      ].map((s, i) => (
        <View
          key={i}
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: hairline },
            Shadows.sm,
          ]}
        >
          <View style={[styles.statIcon, { backgroundColor: `${s.color}15` }]}>
            <Ionicons name={s.icon} size={18} color={s.color} />
          </View>
          <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>
            {s.value}
          </Text>
          <Text style={[styles.statLabel, { color: colors.gray500 }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  );

  const renderCodeCard = ({ item }: { item: ReferralCode }) => {
    const isCopied = copiedId === item.id;
    const eventName = item.event_title || item.event_name;

    return (
      <View
        style={[
          styles.codeCard,
          { backgroundColor: colors.card, borderColor: hairline },
          Shadows.sm,
        ]}
      >
        {eventName && (
          <Text style={[styles.codeEventName, { color: colors.gray500 }]} numberOfLines={1}>
            {eventName}
          </Text>
        )}

        <View style={styles.codeRow}>
          <View
            style={[
              styles.codeBox,
              {
                backgroundColor: isDark ? colors.gray100 : colors.gray50,
                borderColor: hairline,
              },
            ]}
          >
            <Text style={[styles.codeText, { color: colors.primary }]}>{item.code}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.copyButton,
              {
                backgroundColor: isCopied ? `${colors.success}15` : `${colors.primary}15`,
                borderColor: isCopied ? `${colors.success}30` : hairline,
              },
            ]}
            onPress={() => handleCopy(item.code, item.id)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={isCopied ? 'checkmark' : 'copy-outline'}
              size={18}
              color={isCopied ? colors.success : colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: colors.primary }, Shadows.sm]}
            onPress={() => handleShare(item.code, eventName)}
            activeOpacity={0.85}
          >
            <Ionicons name="share-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.codeDetails}>
          {item.commission_percentage != null && (
            <View style={[styles.detailChip, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline }]}>
              <Text style={[styles.detailChipText, { color: colors.text }]}>
                {item.commission_percentage}% commission
              </Text>
            </View>
          )}
          {item.usage_limit != null && (
            <View style={[styles.detailChip, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline }]}>
              <Text style={[styles.detailChipText, { color: colors.text }]}>
                {item.usage_count || 0}/{item.usage_limit} utilisations
              </Text>
            </View>
          )}
          {item.total_clicks != null && (
            <View style={[styles.detailChip, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline }]}>
              <Text style={[styles.detailChipText, { color: colors.text }]}>
                {item.total_clicks} clic{(item.total_clicks || 0) !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {item.valid_until && (
          <Text style={[styles.validUntil, { color: colors.gray500 }]}>
            Valide jusqu'au{' '}
            {new Date(item.valid_until).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        )}
      </View>
    );
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
          <Text style={[styles.eyebrow, { color: colors.accent }]}>PROGRAMME</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Parrainage</Text>
        </View>
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
            <View
              style={[
                styles.descriptionCard,
                { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}20` },
              ]}
            >
              <View style={[styles.descriptionIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="gift-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.descriptionText, { color: colors.text }]}>
                Partagez vos codes de parrainage et gagnez des commissions sur chaque inscription.
              </Text>
            </View>

            {renderStatsCard()}

            <Text style={[styles.sectionEyebrow, { color: colors.gray500 }]}>MES CODES</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="link-outline" size={48} color={colors.gray400} />
            <Text style={[styles.emptyText, { color: colors.text }]}>Aucun code de parrainage</Text>
            <Text style={[styles.emptySubtext, { color: colors.gray500 }]}>
              Vos codes de parrainage apparaîtront ici lorsqu'ils seront disponibles.
            </Text>
          </View>
        }
        renderItem={renderCodeCard}
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
  eyebrow: {
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
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  descriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  descriptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionText: {
    flex: 1,
    fontSize: FontSizes.sm,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    gap: 4,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.md,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  codeCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
  },
  codeEventName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  codeBox: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  codeText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.lg,
    textAlign: 'center',
    letterSpacing: 2,
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  detailChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  detailChipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
  },
  validUntil: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.sm,
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
