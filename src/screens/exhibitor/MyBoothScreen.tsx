import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { exhibitorsAPI } from '../../api/exhibitors';
import { Spacing, Shadows } from '../../constants/theme';
import type { RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Booking {
  id: string;
  event: string;
  event_title?: string;
  status: string;
  booth_code?: string;
}
interface Contract {
  id: string;
  host_event: string;
  status: 'pending' | 'accepted' | 'revoked';
  platform_commission_rate_snapshot: string | null;
  platform_fixed_fee_snapshot: string | null;
  host_share_pct_snapshot: string | null;
  net_exhibitor_pct: string;
  currency: string;
}

/**
 * Espace exposant mobile (« Mon stand ») — MVP centré vente déléguée.
 * Liste les réservations de stand payées et, pour chaque salon ayant activé la
 * vente déléguée, affiche le contrat à accepter puis le raccourci de création
 * d'événement rattaché.
 */
export default function MyBoothScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { showSuccess, showError } = useAlert();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [contracts, setContracts] = useState<Record<string, Contract>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const bkRes = await exhibitorsAPI.getMyBookings().catch(() => null);
      const bks: Booking[] = bkRes?.data?.results || bkRes?.data || [];
      const paid = bks.filter((b) => b.status === 'paid');
      setBookings(paid);

      // Un contrat par salon (host_event = event de la booking).
      const ctRes = await exhibitorsAPI.getSalesContracts().catch(() => null);
      const cts: Contract[] = ctRes?.data?.results || ctRes?.data || [];
      const byEvent: Record<string, Contract> = {};
      cts.forEach((c) => { byEvent[c.host_event] = c; });
      setContracts(byEvent);
    } catch {
      /* silencieux */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const accept = async (contract: Contract) => {
    setAccepting(contract.id);
    try {
      await exhibitorsAPI.acceptSalesContract(contract.id);
      showSuccess(t('myBoothMobile.accepted', { defaultValue: 'Conditions acceptées.' }));
      await load();
    } catch (e: any) {
      showError(t('common.error', { defaultValue: 'Erreur' }),
        e?.response?.data?.detail || t('myBoothMobile.acceptError', { defaultValue: 'Impossible d\'accepter.' }));
    } finally {
      setAccepting(null);
    }
  };

  const rawPct = (v: string | null) =>
    v == null ? '—' : `${parseFloat(v).toFixed(1).replace(/\.0$/, '')}%`;
  const commissionPct = (v: string | null) =>
    v == null ? '—' : `${(parseFloat(v) * 100).toFixed(1).replace(/\.0$/, '')}%`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('myBoothMobile.eyebrow', { defaultValue: 'EXPOSANT' })}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t('myBoothMobile.title', { defaultValue: 'Mon stand' })}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {bookings.length === 0 ? (
            <View style={styles.center}>
              <Text style={[styles.empty, { color: colors.gray500 }]}>
                {t('myBoothMobile.empty', { defaultValue: 'Aucune réservation de stand payée.' })}
              </Text>
            </View>
          ) : (
            bookings.map((bk) => {
              const contract = contracts[bk.event];
              return (
                <View key={bk.id} style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
                  <View style={styles.cardHead}>
                    <View style={[styles.iconWell, { backgroundColor: `${colors.primary}15` }]}>
                      <Ionicons name="storefront-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                        {bk.event_title || t('myBoothMobile.show', { defaultValue: 'Salon' })}
                      </Text>
                      {!!bk.booth_code && (
                        <Text style={[styles.sub, { color: colors.gray500 }]}>{bk.booth_code}</Text>
                      )}
                    </View>
                  </View>

                  {/* Contrat de vente déléguée pour ce salon */}
                  {contract && (
                    <View style={[styles.contractBox, { borderTopColor: hairline }]}>
                      <Text style={[styles.contractTitle, { color: colors.text }]}>
                        {t('myBoothMobile.salesTitle', { defaultValue: 'Vente déléguée' })}
                      </Text>
                      <Row label={t('myBoothMobile.commission', { defaultValue: 'Commission EventEz' })}
                           value={`${commissionPct(contract.platform_commission_rate_snapshot)} + ${contract.platform_fixed_fee_snapshot ?? '0'} ${contract.currency}`}
                           colors={colors} />
                      <Row label={t('myBoothMobile.hostShare', { defaultValue: 'Part de l\'organisateur' })}
                           value={rawPct(contract.host_share_pct_snapshot)} colors={colors} />
                      <Row label={t('myBoothMobile.net', { defaultValue: 'Ce que vous touchez' })}
                           value={rawPct(contract.net_exhibitor_pct)} highlight colors={colors} />

                      {contract.status === 'accepted' ? (
                        <TouchableOpacity
                          onPress={() => navigation.navigate('EventCreate', { hostEventId: bk.event } as any)}
                          style={[styles.cta, { backgroundColor: colors.primary }]}
                        >
                          <Ionicons name="add" size={18} color="#fff" />
                          <Text style={styles.ctaText}>{t('myBoothMobile.createEvent', { defaultValue: 'Créer mon événement' })}</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={() => accept(contract)}
                          disabled={accepting === contract.id}
                          style={[styles.cta, { backgroundColor: colors.primary }]}
                        >
                          {accepting === contract.id
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={styles.ctaText}>{t('myBoothMobile.acceptCta', { defaultValue: 'J\'accepte ces conditions' })}</Text>}
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Row({ label, value, highlight, colors }: { label: string; value: string; highlight?: boolean; colors: any }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.gray600 }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: highlight ? colors.primary : colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: 8, paddingBottom: 12 },
  backDisc: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  empty: { fontSize: 14 },
  card: { borderRadius: 18, borderWidth: 1, padding: Spacing.lg, gap: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWell: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 12.5, marginTop: 2 },
  contractBox: { borderTopWidth: 1, paddingTop: 12, marginTop: 6, gap: 6 },
  contractTitle: { fontSize: 13.5, fontWeight: '700', marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '700' },
  cta: { marginTop: 10, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingVertical: 12 },
  ctaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
