// ============================================
// WeddingTablesManageScreen — plan de table nominatif (organisateur)
// ============================================
//
// Atterrissage depuis MyEvents → "Plan de table". Version LISTE (pas canvas) :
// tables avec occupation, invités confirmés non placés, assignation par choix
// de table, création/édition/suppression de tables. La garde de capacité est
// appliquée côté backend (l'action assign refuse un dépassement).
//
// ⚠️ Écran de GESTION organisateur, nav interne. weddingOrganizerAPI + event.id.

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
type RouteProps = RouteProp<RootStackParamList, 'WeddingTablesManage'>;

interface Table {
  id: string;
  name: string;
  capacity: number;
  seats_taken: number;
  seats_available: number;
}

interface Guest {
  id: string;
  invitee_name?: string;
  invitee_email: string;
  status: string;
  total_headcount?: number;
  table?: string | null;
}

export default function WeddingTablesManageScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { eventId, eventTitle } = route.params;
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { showError, showConfirm } = useAlert();
  const { toastSuccess } = useFeedback();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [tables, setTables] = useState<Table[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Création / édition d'une table (modal partagé)
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [editTableId, setEditTableId] = useState<string | null>(null);
  const [tName, setTName] = useState('');
  const [tCapacity, setTCapacity] = useState('8');
  const [savingTable, setSavingTable] = useState(false);

  // Assignation : invité choisi → on ouvre le choix de table
  const [assignGuest, setAssignGuest] = useState<Guest | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoadFailed(false);
      const [tblRes, glRes] = await Promise.all([
        weddingOrganizerAPI.getTables(eventId),
        weddingOrganizerAPI.getGuestList(eventId),
      ]);
      setTables(tblRes.data?.results || tblRes.data || []);
      setGuests(glRes.data?.guests || []);
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

  const acceptedGuests = guests.filter((g) => g.status === 'accepted');
  const unassigned = acceptedGuests.filter((g) => !g.table);

  const openCreateTable = () => {
    setEditTableId(null);
    setTName('');
    setTCapacity('8');
    setTableModalOpen(true);
  };

  const openEditTable = (table: Table) => {
    setEditTableId(table.id);
    setTName(table.name || '');
    setTCapacity(String(table.capacity ?? 8));
    setTableModalOpen(true);
  };

  const saveTable = async () => {
    if (!tName.trim()) return;
    const capacity = Math.max(1, parseInt(tCapacity, 10) || 1);
    setSavingTable(true);
    try {
      if (editTableId) {
        await weddingOrganizerAPI.updateTable(editTableId, { name: tName.trim(), capacity });
        toastSuccess(t('organizer.weddingTables.updated'));
      } else {
        await weddingOrganizerAPI.createTable({ event: eventId, name: tName.trim(), capacity });
        toastSuccess(t('organizer.weddingTables.created'));
      }
      setTableModalOpen(false);
      await fetchData();
    } catch (error: any) {
      const { message } = getApiErrorMessage(error, t, { fallbackKey: 'organizer.weddingTables.error' });
      showError(t('common.error'), message);
    } finally {
      setSavingTable(false);
    }
  };

  const removeTable = (table: Table) => {
    showConfirm(
      t('organizer.weddingTables.deleteTitle'),
      t('organizer.weddingTables.deleteMessage', { name: table.name }),
      async () => {
        setBusy(table.id);
        try {
          await weddingOrganizerAPI.deleteTable(table.id);
          toastSuccess(t('organizer.weddingTables.deleted'));
          await fetchData();
        } catch (error: any) {
          const { message } = getApiErrorMessage(error, t, { fallbackKey: 'organizer.weddingTables.error' });
          showError(t('common.error'), message);
        } finally {
          setBusy(null);
        }
      },
    );
  };

  const doAssign = async (tableId: string, guest: Guest) => {
    setBusy(guest.id);
    setAssignGuest(null);
    try {
      await weddingOrganizerAPI.assignGuest(tableId, guest.id);
      toastSuccess(t('organizer.weddingTables.assigned'));
      await fetchData();
    } catch (error: any) {
      // Le backend renvoie une erreur de capacité explicite.
      const { message } = getApiErrorMessage(error, t, { fallbackKey: 'organizer.weddingTables.capacityError' });
      showError(t('common.error'), message);
    } finally {
      setBusy(null);
    }
  };

  const doUnassign = async (guest: Guest) => {
    setBusy(guest.id);
    try {
      await weddingOrganizerAPI.unassignGuest(guest.id);
      toastSuccess(t('organizer.weddingTables.unassigned'));
      await fetchData();
    } catch (error: any) {
      const { message } = getApiErrorMessage(error, t, { fallbackKey: 'organizer.weddingTables.error' });
      showError(t('common.error'), message);
    } finally {
      setBusy(null);
    }
  };

  const guestLabel = (g: Guest) => {
    const base = g.invitee_name || g.invitee_email;
    const extra = (g.total_headcount ?? 1) - 1;
    return extra > 0 ? `${base}  +${extra}` : base;
  };

  const renderTable = ({ item }: { item: Table }) => {
    const seated = acceptedGuests.filter((g) => g.table === item.id);
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.subtle, { color: colors.gray500 }]}>
              {t('organizer.weddingTables.occupancy', { taken: item.seats_taken, capacity: item.capacity })}
              {'  ·  '}
              {item.seats_available > 0
                ? t('organizer.weddingTables.available', { n: item.seats_available })
                : t('organizer.weddingTables.full')}
            </Text>
          </View>
          <View style={styles.rowCenter}>
            <TouchableOpacity onPress={() => openEditTable(item)} style={styles.iconBtnSm} accessibilityRole="button" accessibilityLabel={t('common.edit')}>
              <Ionicons name="create-outline" size={18} color={colors.gray500} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeTable(item)} disabled={busy === item.id} style={styles.iconBtnSm} accessibilityRole="button" accessibilityLabel={t('common.delete')}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        {seated.length > 0 ? (
          <View style={styles.seatedList}>
            {seated.map((g) => (
              <View key={g.id} style={[styles.seatedRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                <Text style={[styles.seatedName, { color: colors.text }]} numberOfLines={1}>{guestLabel(g)}</Text>
                <TouchableOpacity onPress={() => doUnassign(g)} disabled={busy === g.id} accessibilityRole="button" accessibilityLabel={t('organizer.weddingTables.unassign')}>
                  {busy === g.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="close" size={16} color={colors.gray500} />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyInline, { color: colors.gray300 }]}>{t('organizer.weddingTables.tableEmpty')}</Text>
        )}
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

  const listHeader = (
    <View>
      {/* Invités non placés */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('organizer.weddingTables.unassignedTitle', { count: unassigned.length })}
        </Text>
        {unassigned.length === 0 ? (
          <Text style={[styles.emptyInline, { color: colors.gray300 }]}>{t('organizer.weddingTables.allSeated')}</Text>
        ) : (
          <View style={styles.chipWrap}>
            {unassigned.map((g) => (
              <TouchableOpacity
                key={g.id}
                onPress={() => tables.length > 0 && setAssignGuest(g)}
                disabled={tables.length === 0 || busy === g.id}
                style={[styles.chip, { borderColor: hairline, backgroundColor: colors.background }]}
                accessibilityRole="button"
                accessibilityLabel={t('organizer.weddingTables.assignGuest', { name: guestLabel(g) })}
              >
                {busy === g.id ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="person-add-outline" size={14} color={colors.primary} />
                )}
                <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>{guestLabel(g)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {tables.length === 0 && unassigned.length > 0 ? (
          <Text style={[styles.hint, { color: colors.gray500 }]}>{t('organizer.weddingTables.createFirst')}</Text>
        ) : null}
      </View>

      {/* Créer une table */}
      <TouchableOpacity
        style={[styles.addTableBtn, { borderColor: colors.primary }]}
        onPress={openCreateTable}
        accessibilityRole="button"
      >
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text style={[styles.addTableText, { color: colors.primary }]}>{t('organizer.weddingTables.addTable')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{t('organizer.weddingTables.title')}</Text>
          {eventTitle ? <Text style={[styles.headerSub, { color: colors.gray500 }]} numberOfLines={1}>{eventTitle}</Text> : null}
        </View>
        <View style={styles.backBtn} />
      </View>

      {loadFailed ? (
        <ErrorState onRetry={fetchData} />
      ) : (
        <FlatList
          data={tables}
          keyExtractor={(tb) => tb.id}
          renderItem={renderTable}
          ListHeaderComponent={listHeader}
          contentContainerStyle={[centeredContent(CARD_MAX), styles.listContent]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyItems}>
              <Ionicons name="grid-outline" size={36} color={colors.gray300} />
              <Text style={[styles.emptyText, { color: colors.gray500 }]}>{t('organizer.weddingTables.noTables')}</Text>
            </View>
          }
        />
      )}

      {/* Modal création/édition table */}
      <Modal visible={tableModalOpen} transparent animationType="slide" onRequestClose={() => setTableModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + Spacing.lg,  backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editTableId ? t('organizer.weddingTables.editTable') : t('organizer.weddingTables.newTable')}
            </Text>
            <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>{t('organizer.weddingTables.name')}</Text>
            <TextInput
              value={tName}
              onChangeText={setTName}
              placeholder={t('organizer.weddingTables.namePlaceholder')}
              placeholderTextColor={colors.gray300}
              style={[styles.input, { color: colors.text, borderColor: hairline, backgroundColor: colors.background }]}
            />
            <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>{t('organizer.weddingTables.capacity')}</Text>
            <TextInput
              value={tCapacity}
              onChangeText={setTCapacity}
              keyboardType="number-pad"
              style={[styles.input, { color: colors.text, borderColor: hairline, backgroundColor: colors.background }]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: hairline }]} onPress={() => setTableModalOpen(false)}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: colors.primary }]}
                onPress={saveTable}
                disabled={savingTable || !tName.trim()}
              >
                {savingTable ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('common.save')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal choix de table pour un invité */}
      <Modal visible={!!assignGuest} transparent animationType="slide" onRequestClose={() => setAssignGuest(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + Spacing.lg,  backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
              {assignGuest ? t('organizer.weddingTables.assignTo', { name: guestLabel(assignGuest) }) : ''}
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {tables.map((tb) => {
                const need = assignGuest?.total_headcount ?? 1;
                const fits = tb.seats_available >= need;
                return (
                  <TouchableOpacity
                    key={tb.id}
                    disabled={!fits}
                    onPress={() => assignGuest && doAssign(tb.id, assignGuest)}
                    style={[styles.tablePick, { borderColor: hairline, opacity: fits ? 1 : 0.4 }]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.tablePickName, { color: colors.text }]}>{tb.name}</Text>
                    <Text style={[styles.tablePickSeats, { color: fits ? colors.gray500 : '#DC2626' }]}>
                      {fits
                        ? t('organizer.weddingTables.available', { n: tb.seats_available })
                        : t('organizer.weddingTables.full')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={[styles.modalBtn, { borderColor: hairline, marginTop: Spacing.md }]} onPress={() => setAssignGuest(null)}>
              <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
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
  listContent: { padding: Spacing.md, paddingBottom: Spacing['2xl'] },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardInfo: { flex: 1, paddingRight: Spacing.sm },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md },
  subtle: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: 3 },
  sectionTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm, marginBottom: Spacing.sm },
  iconBtnSm: { padding: 4 },
  seatedList: { marginTop: Spacing.sm, gap: 6 },
  seatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },
  seatedName: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm, flex: 1, paddingRight: Spacing.sm },
  emptyInline: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, fontStyle: 'italic', marginTop: 6 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  chipText: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm, flexShrink: 1 },
  hint: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: Spacing.sm },
  addTableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  addTableText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  emptyItems: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
  emptyText: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg, maxHeight: '85%' },
  modalTitle: { fontFamily: FontFamily.bold, fontSize: FontSizes.lg, marginBottom: Spacing.sm },
  fieldLabel: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs, marginTop: Spacing.sm, marginBottom: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.md,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  modalBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: BorderRadius.md, paddingVertical: Spacing.md },
  modalBtnPrimary: { borderWidth: 0 },
  modalBtnText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md },
  tablePick: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  tablePickName: { fontFamily: FontFamily.medium, fontSize: FontSizes.md },
  tablePickSeats: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs },
});
