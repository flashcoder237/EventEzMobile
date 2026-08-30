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
import * as WebBrowser from 'expo-web-browser';
import { exhibitorsAPI } from '../../api/exhibitors';
import { Spacing, Shadows, BorderRadius, FontFamily, FontSizes } from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import type { RootStackParamList } from '../../types';
import { getApiErrorMessage } from '../../lib/utils/errorHandling';
import { formatPriceAmount, displayCurrency } from '../../lib/utils/priceFormatters';

// Méthodes de paiement proposées pour un stand (mobile money + carte).
// Le backend route vers le bon PSP selon la méthode + le pays de l'event.
const BOOTH_PAY_METHODS: Array<{ id: string; labelKey: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: 'mtn_money', labelKey: 'myBoothMobile.payMtn', icon: 'phone-portrait-outline' },
  { id: 'orange_money', labelKey: 'myBoothMobile.payOrange', icon: 'phone-portrait-outline' },
  { id: 'credit_card', labelKey: 'myBoothMobile.payCard', icon: 'card-outline' },
];

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Booking {
  id: string;
  event: string;
  event_title?: string;
  status: string;
  booth_code?: string;
  total_amount?: string | number;
  amount_paid?: string | number;
  amount_remaining?: string | number;
  currency?: string;
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
  const [loadError, setLoadError] = useState(false);
  // Paiement de stand : quel booking a son sélecteur de méthode ouvert + spinner.
  const [payingFor, setPayingFor] = useState<string | null>(null);
  const [payMethodOpen, setPayMethodOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // getMyBookings est la requête critique : son échec = état d'erreur (et non "vide").
      const bkRes = await exhibitorsAPI.getMyBookings();
      const bks: Booking[] = bkRes?.data?.results || bkRes?.data || [];
      // On garde toutes les réservations ACTIVES : payées (accès stand) ET
      // en attente de paiement (pending/partially_paid) → l'exposant peut payer.
      const active = bks.filter((b) => b.status !== 'cancelled');
      setBookings(active);

      // Un contrat par salon (host_event = event de la booking) — non bloquant.
      const ctRes = await exhibitorsAPI.getSalesContracts().catch(() => null);
      const cts: Contract[] = ctRes?.data?.results || ctRes?.data || [];
      const byEvent: Record<string, Contract> = {};
      cts.forEach((c) => { byEvent[c.host_event] = c; });
      setContracts(byEvent);
      setLoadError(false);
    } catch {
      setLoadError(true);
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
        getApiErrorMessage(e, t, { fallbackKey: 'myBoothMobile.acceptError', fallbackValues: { defaultValue: 'Impossible d\'accepter.' } }).message);
    } finally {
      setAccepting(null);
    }
  };

  // Paiement d'un stand : initie le paiement (kind=full) via la méthode choisie,
  // ouvre la page PSP en WebBrowser, puis rafraîchit le statut au retour.
  const payBooth = async (booking: Booking, method: string) => {
    setPayMethodOpen(null);
    setPayingFor(booking.id);
    try {
      const res = await exhibitorsAPI.payBooking(booking.id, {
        payment_method: method,
        kind: 'full',
        idempotency_key: `booth-${booking.id}-${method}-full`,
      });
      const data = res?.data || {};
      const url = data.payment_url || data.authorization_url;
      if (url) {
        await WebBrowser.openBrowserAsync(url);
      } else {
        // Certains PSP confirment sans redirection (push USSD) → on informe.
        showSuccess(t('myBoothMobile.paymentInitiated', { defaultValue: 'Paiement initié. Valide-le sur ton téléphone.' }));
      }
      await load();
    } catch (e: any) {
      showError(
        t('common.error', { defaultValue: 'Erreur' }),
        getApiErrorMessage(e, t, {
          fallbackKey: 'myBoothMobile.payError',
          fallbackValues: { defaultValue: 'Impossible d\'initier le paiement du stand.' },
        }).message,
      );
    } finally {
      setPayingFor(null);
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
          contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, ...centeredContent(CARD_MAX) }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {loadError ? (
            <View style={styles.center}>
              <Ionicons name="cloud-offline-outline" size={40} color={colors.gray400} />
              <Text style={[styles.empty, { color: colors.gray500, marginTop: Spacing.sm }]}>
                {t('common.errorLoading', { defaultValue: 'Erreur de chargement' })}
              </Text>
              <TouchableOpacity
                onPress={() => { setLoading(true); load(); }}
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('common.retry', { defaultValue: 'Réessayer' })}
              >
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={styles.retryText}>{t('common.retry', { defaultValue: 'Réessayer' })}</Text>
              </TouchableOpacity>
            </View>
          ) : bookings.length === 0 ? (
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
                    <BookingStatusChip status={bk.status} colors={colors} t={t} />
                  </View>

                  {/* Paiement du stand : réservation acceptée mais pas encore réglée */}
                  {(bk.status === 'pending' || bk.status === 'partially_paid') && (
                    <View style={[styles.payBox, { borderTopColor: hairline }]}>
                      <View style={styles.payAmountRow}>
                        <Text style={[styles.payLabel, { color: colors.gray600 }]}>
                          {bk.status === 'partially_paid'
                            ? t('myBoothMobile.amountRemaining', { defaultValue: 'Reste à payer' })
                            : t('myBoothMobile.amountDue', { defaultValue: 'Montant du stand' })}
                        </Text>
                        <Text style={[styles.payAmount, { color: colors.text }]}>
                          {formatPriceAmount(Number(
                            bk.status === 'partially_paid' ? (bk.amount_remaining ?? 0) : (bk.total_amount ?? 0),
                          ))} {displayCurrency(bk.currency)}
                        </Text>
                      </View>

                      {payMethodOpen === bk.id ? (
                        <View style={{ gap: Spacing.xs }}>
                          {BOOTH_PAY_METHODS.map((m) => (
                            <TouchableOpacity
                              key={m.id}
                              onPress={() => payBooth(bk, m.id)}
                              disabled={payingFor === bk.id}
                              style={[styles.payMethod, { borderColor: hairline, backgroundColor: colors.gray50 }]}
                              activeOpacity={0.8}
                            >
                              <Ionicons name={m.icon} size={18} color={colors.primary} />
                              <Text style={[styles.payMethodText, { color: colors.text }]}>
                                {t(m.labelKey, { defaultValue: m.id })}
                              </Text>
                              {payingFor === bk.id && <ActivityIndicator size="small" color={colors.primary} />}
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => setPayMethodOpen(bk.id)}
                          disabled={payingFor === bk.id}
                          style={[styles.cta, { backgroundColor: colors.primary }]}
                          activeOpacity={0.85}
                        >
                          {payingFor === bk.id
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Ionicons name="card" size={18} color="#fff" />}
                          <Text style={styles.ctaText}>{t('myBoothMobile.payBooth', { defaultValue: 'Payer mon stand' })}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

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

function BookingStatusChip({ status, colors, t }: { status: string; colors: any; t: any }) {
  const map: Record<string, { key: string; def: string; bg: string; fg: string }> = {
    paid: { key: 'myBoothMobile.statusPaid', def: 'Payé', bg: `${colors.success}18`, fg: colors.success },
    partially_paid: { key: 'myBoothMobile.statusPartial', def: 'Acompte versé', bg: `${colors.warning}18`, fg: colors.warning },
    pending: { key: 'myBoothMobile.statusPending', def: 'À payer', bg: `${colors.warning}18`, fg: colors.warning },
  };
  const cfg = map[status];
  if (!cfg) return null;
  return (
    <View style={[styles.statusChip, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.statusChipText, { color: cfg.fg }]}>{t(cfg.key, { defaultValue: cfg.def })}</Text>
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
  empty: { fontSize: 14, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  retryText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm, color: '#fff' },
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
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  statusChipText: { fontSize: 11, fontFamily: FontFamily.bold, letterSpacing: 0.3 },
  payBox: { borderTopWidth: 1, paddingTop: 12, marginTop: 6, gap: 10 },
  payAmountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  payLabel: { fontSize: 13, fontFamily: FontFamily.regular },
  payAmount: { fontSize: 15, fontFamily: FontFamily.bold },
  payMethod: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: BorderRadius.md, paddingVertical: 12, paddingHorizontal: 14,
  },
  payMethodText: { flex: 1, fontSize: 14, fontFamily: FontFamily.semiBold },
});
