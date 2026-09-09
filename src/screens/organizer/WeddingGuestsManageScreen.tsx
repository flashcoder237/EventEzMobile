// ============================================
// WeddingGuestsManageScreen — gestion invités & RSVP (organisateur)
// ============================================
//
// Atterrissage depuis MyEvents → "Invités & RSVP". Vue organisateur du module
// mariage : liste des invités + stats (couverts confirmés, non placés), édition
// du RSVP d'un invité (party_size / régime / note — l'invité répond souvent par
// téléphone), relance individuelle ou groupée des invités en attente.
//
// ⚠️ NE PAS confondre avec WeddingRsvpScreen (écran INVITÉ, deep link public).
// Ici tout passe par weddingOrganizerAPI (auth organisateur, event.id UUID).

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { useFeedback } from '../../contexts/FeedbackContext';
import { weddingOrganizerAPI } from '../../api';
import type { RootStackParamList } from '../../types';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import ErrorState from '../../components/ui/ErrorState';
import { getApiErrorMessage } from '../../lib/utils/errorHandling';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'WeddingGuestsManage'>;

interface Guest {
  id: string;
  invitee_name?: string;
  invitee_email: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  party_size?: number;
  dietary_requirements?: string;
  rsvp_note?: string;
  total_headcount?: number;
  table_name?: string | null;
}

interface Stats {
  total_invited: number;
  accepted: number;
  declined: number;
  pending: number;
  confirmed_headcount: number;
  unassigned: number;
}

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  accepted: { bg: '#10B98115', fg: '#059669' },
  declined: { bg: '#EF444415', fg: '#DC2626' },
  pending: { bg: '#F59E0B15', fg: '#B45309' },
  cancelled: { bg: '#9CA3AF15', fg: '#6B7280' },
};

export default function WeddingGuestsManageScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { eventId, eventTitle } = route.params;
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { showError } = useAlert();
  const { toastSuccess } = useFeedback();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [guests, setGuests] = useState<Guest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [remindingAll, setRemindingAll] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  // Édition RSVP (modal)
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [editParty, setEditParty] = useState('0');
  const [editDiet, setEditDiet] = useState('');
  const [editNote, setEditNote] = useState('');
  const [savingRsvp, setSavingRsvp] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoadFailed(false);
      const res = await weddingOrganizerAPI.getGuestList(eventId);
      setGuests(res.data?.guests || []);
      setStats(res.data?.stats || null);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleRemindPending = async () => {
    if (remindingAll || (stats?.pending ?? 0) === 0) return;
    setRemindingAll(true);
    try {
      const res = await weddingOrganizerAPI.remindPending(eventId);
      const sent = res.data?.sent ?? 0;
      const skipped = res.data?.skipped ?? 0;
      toastSuccess(
        skipped > 0
          ? t('organizer.weddingGuests.remindSentWithSkipped', { sent, skipped })
          : t('organizer.weddingGuests.remindSent', { sent }),
      );
      await fetchData();
    } catch (error: any) {
      const { message } = getApiErrorMessage(error, t, { fallbackKey: 'organizer.weddingGuests.remindError' });
      showError(t('common.error'), message);
    } finally {
      setRemindingAll(false);
    }
  };

  const handleRemindOne = async (guest: Guest) => {
    setRowBusy(guest.id);
    try {
      await weddingOrganizerAPI.remindOne(guest.id);
      toastSuccess(t('organizer.weddingGuests.remindOneSent'));
      await fetchData();
    } catch (error: any) {
      const { message } = getApiErrorMessage(error, t, { fallbackKey: 'organizer.weddingGuests.remindError' });
      showError(t('common.error'), message);
    } finally {
      setRowBusy(null);
    }
  };

  const openEdit = (guest: Guest) => {
    setEditGuest(guest);
    setEditParty(String(guest.party_size ?? 0));
    setEditDiet(guest.dietary_requirements ?? '');
    setEditNote(guest.rsvp_note ?? '');
  };

  const submitRsvp = async () => {
    if (!editGuest) return;
    // party_size borné 0..20 (aligné backend). On envoie un entier propre.
    const party = Math.max(0, Math.min(20, parseInt(editParty, 10) || 0));
    setSavingRsvp(true);
    try {
      await weddingOrganizerAPI.setGuestRsvp(editGuest.id, {
        party_size: party,
        dietary_requirements: editDiet.trim(),
        rsvp_note: editNote.trim(),
      });
      toastSuccess(t('organizer.weddingGuests.rsvpUpdated'));
      setEditGuest(null);
      await fetchData();
    } catch (error: any) {
      const { message } = getApiErrorMessage(error, t, { fallbackKey: 'organizer.weddingGuests.rsvpError' });
      showError(t('common.error'), message);
    } finally {
      setSavingRsvp(false);
    }
  };

  const renderStats = () => {
    if (!stats) return null;
    const cards = [
      { label: t('organizer.weddingGuests.stats.invited'), value: stats.total_invited },
      { label: t('organizer.weddingGuests.stats.accepted'), value: stats.accepted },
      { label: t('organizer.weddingGuests.stats.pending'), value: stats.pending },
      { label: t('organizer.weddingGuests.stats.headcount'), value: stats.confirmed_headcount, accent: true },
    ];
    return (
      <View style={styles.statsRow}>
        {cards.map((c) => (
          <View
            key={c.label}
            style={[
              styles.statCard,
              { backgroundColor: c.accent ? `${colors.primary}12` : colors.card, borderColor: c.accent ? `${colors.primary}30` : hairline },
            ]}
          >
            <Text style={[styles.statValue, { color: c.accent ? colors.primary : colors.text }]}>{c.value}</Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]} numberOfLines={1}>{c.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderItem = ({ item }: { item: Guest }) => {
    const sc = STATUS_COLOR[item.status] || STATUS_COLOR.pending;
    const headcount = item.status === 'accepted' ? (item.total_headcount ?? 1) : null;
    const canEdit = item.status !== 'declined' && item.status !== 'cancelled';
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {item.invitee_name || item.invitee_email}
            </Text>
            {item.invitee_name ? (
              <Text style={[styles.subtle, { color: colors.gray500 }]} numberOfLines={1}>{item.invitee_email}</Text>
            ) : null}
          </View>
          <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.fg }]}>
              {t(`organizer.weddingGuests.status.${item.status}`)}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          {headcount !== null && (
            <View style={styles.metaChip}>
              <Ionicons name="people-outline" size={14} color={colors.gray500} />
              <Text style={[styles.metaText, { color: colors.gray500 }]}>{headcount}</Text>
            </View>
          )}
          {item.dietary_requirements ? (
            <View style={styles.metaChip}>
              <Ionicons name="restaurant-outline" size={14} color="#F59E0B" />
              <Text style={[styles.metaText, { color: colors.gray500 }]} numberOfLines={1}>
                {item.dietary_requirements}
              </Text>
            </View>
          ) : null}
          {item.table_name ? (
            <View style={styles.metaChip}>
              <Ionicons name="grid-outline" size={14} color={colors.gray500} />
              <Text style={[styles.metaText, { color: colors.gray500 }]} numberOfLines={1}>{item.table_name}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actionsRow}>
          {item.status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: hairline }]}
              onPress={() => handleRemindOne(item)}
              disabled={rowBusy === item.id}
              accessibilityRole="button"
              accessibilityLabel={t('organizer.weddingGuests.remindOne')}
            >
              {rowBusy === item.id ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="notifications-outline" size={16} color="#B45309" />
              )}
              <Text style={[styles.actionText, { color: colors.text }]}>
                {t('organizer.weddingGuests.remindOne')}
              </Text>
            </TouchableOpacity>
          )}
          {canEdit && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: hairline }]}
              onPress={() => openEdit(item)}
              accessibilityRole="button"
              accessibilityLabel={t('organizer.weddingGuests.editRsvp')}
            >
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                {t('organizer.weddingGuests.editRsvp')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {t('organizer.weddingGuests.title')}
          </Text>
          {eventTitle ? (
            <Text style={[styles.headerSub, { color: colors.gray500 }]} numberOfLines={1}>{eventTitle}</Text>
          ) : null}
        </View>
        {(stats?.pending ?? 0) > 0 ? (
          <TouchableOpacity
            onPress={handleRemindPending}
            disabled={remindingAll}
            style={[styles.remindAllBtn, { backgroundColor: `${colors.primary}12` }]}
            accessibilityRole="button"
            accessibilityLabel={t('organizer.weddingGuests.remindPending', { count: stats?.pending ?? 0 })}
          >
            {remindingAll ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="notifications-outline" size={18} color={colors.primary} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>

      {loadFailed ? (
        <ErrorState onRetry={fetchData} />
      ) : (
        <FlatList
          data={guests}
          keyExtractor={(g) => g.id}
          renderItem={renderItem}
          ListHeaderComponent={renderStats}
          contentContainerStyle={[centeredContent(CARD_MAX), styles.listContent]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={40} color={colors.gray300} />
              <Text style={[styles.emptyText, { color: colors.gray500 }]}>
                {t('organizer.weddingGuests.empty')}
              </Text>
            </View>
          }
        />
      )}

      {/* Modal édition RSVP */}
      <Modal visible={!!editGuest} transparent animationType="slide" onRequestClose={() => setEditGuest(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + Spacing.lg,  backgroundColor: colors.card }]}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('organizer.weddingGuests.editRsvpTitle')}
              </Text>
              <Text style={[styles.modalSub, { color: colors.gray500 }]} numberOfLines={1}>
                {editGuest?.invitee_name || editGuest?.invitee_email}
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>
                {t('organizer.weddingGuests.partySize')}
              </Text>
              <TextInput
                value={editParty}
                onChangeText={setEditParty}
                keyboardType="number-pad"
                style={[styles.input, { color: colors.text, borderColor: hairline, backgroundColor: colors.background }]}
              />

              <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>
                {t('organizer.weddingGuests.dietary')}
              </Text>
              <TextInput
                value={editDiet}
                onChangeText={setEditDiet}
                placeholder={t('organizer.weddingGuests.dietaryPlaceholder')}
                placeholderTextColor={colors.gray300}
                style={[styles.input, { color: colors.text, borderColor: hairline, backgroundColor: colors.background }]}
              />

              <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>
                {t('organizer.weddingGuests.note')}
              </Text>
              <TextInput
                value={editNote}
                onChangeText={setEditNote}
                multiline
                style={[styles.input, styles.inputMulti, { color: colors.text, borderColor: hairline, backgroundColor: colors.background }]}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { borderColor: hairline }]}
                  onPress={() => setEditGuest(null)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: colors.primary }]}
                  onPress={submitRsvp}
                  disabled={savingRsvp}
                  accessibilityRole="button"
                >
                  {savingRsvp ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('common.save')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, paddingHorizontal: Spacing.xs },
  headerTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.lg },
  headerSub: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: 1 },
  remindAllBtn: { width: 40, height: 40, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing.md, paddingBottom: Spacing['2xl'] },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 72,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    alignItems: 'flex-start',
  },
  statValue: { fontFamily: FontFamily.bold, fontSize: FontSizes.xl },
  statLabel: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: 2 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardInfo: { flex: 1, paddingRight: Spacing.sm },
  title: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md },
  subtle: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: 1 },
  statusPill: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: BorderRadius.full },
  statusText: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '48%' },
  metaText: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },
  actionText: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  empty: { alignItems: 'center', paddingVertical: Spacing['2xl'], gap: Spacing.sm },
  emptyText: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  modalTitle: { fontFamily: FontFamily.bold, fontSize: FontSizes.lg },
  modalSub: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm, marginTop: 2, marginBottom: Spacing.md },
  fieldLabel: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs, marginTop: Spacing.sm, marginBottom: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.md,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  modalBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  modalBtnPrimary: { borderWidth: 0 },
  modalBtnText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md },
});
