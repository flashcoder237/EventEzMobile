/**
 * RefundsListScreen — Suivi des demandes de remboursement.
 *
 * Affiche les refunds de l'utilisateur courant avec leur statut visible
 * (requested, processing, completed, rejected). Permet de tracker une demande
 * après l'avoir soumise depuis RefundRequestScreen.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { refundsAPI } from '../../api';
import { Refund, RefundStatus, RootStackParamList } from '../../types';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface StatusConfig {
  labelKey: string;
  bg: string;
  fg: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const STATUS_CONFIG: Record<RefundStatus, StatusConfig> = {
  requested: { labelKey: 'refundsList.statusRequested', bg: '#FEF3C7', fg: '#92400E', icon: 'hourglass-outline' },
  processing: { labelKey: 'refundsList.statusProcessing', bg: '#DBEAFE', fg: '#1E40AF', icon: 'sync-outline' },
  completed: { labelKey: 'refundsList.statusCompleted', bg: '#D1FAE5', fg: '#065F46', icon: 'checkmark-circle-outline' },
  rejected: { labelKey: 'refundsList.statusRejected', bg: '#FEE2E2', fg: '#991B1B', icon: 'close-circle-outline' },
};

function formatDateRelative(iso: string, t: (k: string, opts?: any) => string, locale: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return t('refundsList.justNow');
    if (diff < 3600) return t('refundsList.minutesAgo', { count: Math.floor(diff / 60) });
    if (diff < 86400) return t('refundsList.hoursAgo', { count: Math.floor(diff / 3600) });
    if (diff < 604800) return t('refundsList.daysAgo', { count: Math.floor(diff / 86400) });
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function RefundsListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { showError } = useAlert();
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';

  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRefunds = useCallback(async () => {
    try {
      const response = await refundsAPI.getRefunds();
      const data = response.data?.results || response.data || [];
      setRefunds(data);
    } catch (error) {
      if (__DEV__) console.error('Error fetching refunds:', error);
      showError(t('refundsList.errorTitle'), t('refundsList.loadError'));
    } finally {
      setLoading(false);
    }
  }, [showError, t]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  // Refresh quand l'écran reprend le focus (typiquement: retour depuis
  // RefundRequestScreen après soumission, ou retour app après quelques
  // heures où l'organizer a pu traiter une demande). Évite d'avoir à
  // pull-to-refresh manuellement à chaque visite.
  useFocusEffect(
    useCallback(() => {
      fetchRefunds();
    }, [fetchRefunds]),
  );

  // Auto-refresh léger pendant que l'écran est ouvert : si l'utilisateur
  // a récemment soumis une demande, la transition `requested → processing`
  // ou `processing → completed` est intéressante à voir sans interaction.
  // 30s = compromis entre fraîcheur et load serveur. Déclenché uniquement
  // si au moins un refund est encore non-terminal.
  useEffect(() => {
    const hasPending = refunds.some(
      r => r.status === 'requested' || r.status === 'processing',
    );
    if (!hasPending) return;
    const timer = setInterval(() => {
      fetchRefunds();
    }, 30_000);
    return () => clearInterval(timer);
  }, [refunds, fetchRefunds]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRefunds();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Refund }) => {
    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.requested;
    const eventTitle =
      (item.payment_details as any)?.event_title ||
      (item.payment_details as any)?.registration?.event?.title ||
      t('refundsList.paymentFallback');
    const currency = (item.payment_details as any)?.currency || 'XAF';

    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.06)' },
          Shadows.sm,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={12} color={status.fg} />
            <Text style={[styles.statusPillText, { color: status.fg }]}>{t(status.labelKey)}</Text>
          </View>
          <Text style={[styles.cardDate, { color: colors.gray500 }]}>
            {formatDateRelative(item.requested_at, t, dateLocale)}
          </Text>
        </View>

        <Text style={[styles.cardEvent, { color: colors.text }]} numberOfLines={1}>
          {eventTitle}
        </Text>

        <View style={styles.cardAmountRow}>
          <Text style={[styles.cardAmountLabel, { color: colors.gray500 }]}>{t('refundsList.amountLabel')}</Text>
          <Text style={[styles.cardAmount, { color: colors.text }]}>
            {Number(item.amount).toLocaleString(dateLocale)} {currency}
          </Text>
        </View>

        {item.reason ? (
          <Text style={[styles.cardReason, { color: colors.gray600 }]} numberOfLines={2}>
            {item.reason}
          </Text>
        ) : null}

        {item.status === 'rejected' && item.notes ? (
          <View style={[styles.rejectionNote, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
            <Ionicons name="information-circle" size={14} color="#991B1B" />
            <Text style={styles.rejectionNoteText} numberOfLines={3}>
              {item.notes}
            </Text>
          </View>
        ) : null}

        {item.status === 'completed' && item.transaction_id ? (
          <Text style={[styles.cardTxn, { color: colors.gray400 }]} numberOfLines={1}>
            {t('refundsList.txRefPrefix', { ref: item.transaction_id })}
          </Text>
        ) : null}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.gray100 }]}>
        <Ionicons name="receipt-outline" size={32} color={colors.gray400} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('refundsList.emptyTitle')}</Text>
      <Text style={[styles.emptyText, { color: colors.gray500 }]}>
        {t('refundsList.emptyMessage')}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>BACK</WatermarkNumeral>
        <LoadingSpinner />
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>BACK</WatermarkNumeral>
      <View style={{ flex: 1 }}>
        <View style={[styles.header, { borderBottomColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.06)' }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.iconDisc, { backgroundColor: colors.gray100 }]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('refundsList.backA11y')}
          >
            <Ionicons name="chevron-back" size={18} color={colors.gray600} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('refundsList.eyebrow')}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('refundsList.title')}</Text>
          </View>
        </View>

        <FlatList
          data={refunds}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, refunds.length === 0 && { flex: 1 }]}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconDisc: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
  },
  cardDate: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
  },
  cardEvent: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  cardAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardAmountLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  cardAmount: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  cardReason: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  cardTxn: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    marginTop: 6,
  },
  rejectionNote: {
    flexDirection: 'row',
    gap: 6,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: 8,
    alignItems: 'flex-start',
  },
  rejectionNoteText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 11,
    lineHeight: 15,
    color: '#991B1B',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 18,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
  },
});
