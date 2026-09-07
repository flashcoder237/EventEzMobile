// ============================================
// WeddingGiftsManageScreen — gestion cagnotte & liste de cadeaux (organisateur)
// ============================================
//
// Atterrissage depuis MyEvents → "Cagnotte & cadeaux". Vue organisateur :
// créer la liste, éditer son titre/description, la masquer/afficher, ajouter/
// éditer/supprimer des items (cadeau ou cagnotte, avec lien externe), voir le
// total récolté et partager le lien public.
//
// ⚠️ NE PAS confondre avec WeddingGiftRegistryScreen (écran INVITÉ, deep link).
// ⚠️ Mono-devise : la devise vient de l'événement, JAMAIS de sélecteur ici.
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
  Switch,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { useFeedback } from '../../contexts/FeedbackContext';
import { weddingsAPI, weddingOrganizerAPI } from '../../api';
import type { RootStackParamList } from '../../types';
import { getWeddingGiftRegistryUrl } from '../../constants/urls';
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
type RouteProps = RouteProp<RootStackParamList, 'WeddingGiftsManage'>;

interface GiftItem {
  id: string;
  kind: 'gift' | 'cash_fund';
  name: string;
  target_amount: string;
  external_url?: string;
  is_reserved: boolean;
  amount_collected: string;
}

interface Registry {
  id: string;
  title: string;
  description?: string;
  is_active: boolean;
  currency: string;
  total_raised: string;
  event_slug?: string;
  items: GiftItem[];
}

export default function WeddingGiftsManageScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { eventId, eventTitle } = route.params;
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { showError, showConfirm } = useAlert();
  const { toastSuccess } = useFeedback();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [registry, setRegistry] = useState<Registry | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  // Édition en-tête registre
  const [editHeaderOpen, setEditHeaderOpen] = useState(false);
  const [regTitle, setRegTitle] = useState('');
  const [regDesc, setRegDesc] = useState('');
  const [savingHeader, setSavingHeader] = useState(false);

  // Item (create + edit partagent le même modal)
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemKind, setItemKind] = useState<'gift' | 'cash_fund'>('gift');
  const [itemAmount, setItemAmount] = useState('');
  const [itemUrl, setItemUrl] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoadFailed(false);
      // Lecture de la liste de cadeaux de l'événement (endpoint list filtrable
      // par event UUID ; lecture publique, mais on est authentifié organisateur).
      const res = await weddingsAPI.getRegistryByEvent(eventId);
      const list = res?.data?.results || res?.data || [];
      setRegistry(Array.isArray(list) && list.length > 0 ? list[0] : null);
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

  const handleCreateRegistry = async () => {
    setCreating(true);
    try {
      const res = await weddingOrganizerAPI.createRegistry({ event: eventId });
      setRegistry(res.data || null);
      toastSuccess(t('organizer.weddingGifts.registryCreated'));
      await fetchData();
    } catch (error: any) {
      const { message } = getApiErrorMessage(error, t, { fallbackKey: 'organizer.weddingGifts.error' });
      showError(t('common.error'), message);
    } finally {
      setCreating(false);
    }
  };

  const openEditHeader = () => {
    if (!registry) return;
    setRegTitle(registry.title || '');
    setRegDesc(registry.description || '');
    setEditHeaderOpen(true);
  };

  const saveHeader = async () => {
    if (!registry) return;
    setSavingHeader(true);
    try {
      await weddingOrganizerAPI.updateRegistry(registry.id, {
        title: regTitle.trim(),
        description: regDesc.trim(),
      });
      toastSuccess(t('organizer.weddingGifts.registryUpdated'));
      setEditHeaderOpen(false);
      await fetchData();
    } catch (error: any) {
      const { message } = getApiErrorMessage(error, t, { fallbackKey: 'organizer.weddingGifts.error' });
      showError(t('common.error'), message);
    } finally {
      setSavingHeader(false);
    }
  };

  const toggleActive = async () => {
    if (!registry) return;
    try {
      await weddingOrganizerAPI.updateRegistry(registry.id, { is_active: !registry.is_active });
      await fetchData();
    } catch (error: any) {
      const { message } = getApiErrorMessage(error, t, { fallbackKey: 'organizer.weddingGifts.error' });
      showError(t('common.error'), message);
    }
  };

  const openCreateItem = () => {
    setEditItemId(null);
    setItemName('');
    setItemKind('gift');
    setItemAmount('');
    setItemUrl('');
    setItemModalOpen(true);
  };

  const openEditItem = (item: GiftItem) => {
    setEditItemId(item.id);
    setItemName(item.name || '');
    setItemKind(item.kind);
    setItemAmount(item.target_amount || '');
    setItemUrl(item.external_url || '');
    setItemModalOpen(true);
  };

  const saveItem = async () => {
    if (!registry || !itemName.trim()) return;
    setSavingItem(true);
    try {
      if (editItemId) {
        await weddingOrganizerAPI.updateItem(editItemId, {
          name: itemName.trim(),
          target_amount: itemAmount || '0',
          external_url: itemUrl.trim(),
        });
        toastSuccess(t('organizer.weddingGifts.itemUpdated'));
      } else {
        await weddingOrganizerAPI.createItem({
          registry: registry.id,
          kind: itemKind,
          name: itemName.trim(),
          target_amount: itemAmount || '0',
          ...(itemUrl.trim() ? { external_url: itemUrl.trim() } : {}),
        });
        toastSuccess(t('organizer.weddingGifts.itemAdded'));
      }
      setItemModalOpen(false);
      await fetchData();
    } catch (error: any) {
      const { message } = getApiErrorMessage(error, t, { fallbackKey: 'organizer.weddingGifts.error' });
      showError(t('common.error'), message);
    } finally {
      setSavingItem(false);
    }
  };

  const removeItem = (item: GiftItem) => {
    showConfirm(
      t('organizer.weddingGifts.deleteItemTitle'),
      t('organizer.weddingGifts.deleteItemMessage', { name: item.name }),
      async () => {
        try {
          await weddingOrganizerAPI.deleteItem(item.id);
          toastSuccess(t('organizer.weddingGifts.itemDeleted'));
          await fetchData();
        } catch (error: any) {
          const { message } = getApiErrorMessage(error, t, { fallbackKey: 'organizer.weddingGifts.error' });
          showError(t('common.error'), message);
        }
      },
    );
  };

  const shareLink = async () => {
    if (!registry?.event_slug) return;
    const url = getWeddingGiftRegistryUrl(registry.event_slug);
    try {
      await Share.share({ message: url, url });
    } catch {
      /* l'utilisateur a annulé le partage */
    }
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

  const header = (
    <View style={[styles.headerBar, { borderBottomColor: hairline }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t('common.back')}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.headerTitleWrap}>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {t('organizer.weddingGifts.title')}
        </Text>
        {eventTitle ? (
          <Text style={[styles.headerSub, { color: colors.gray500 }]} numberOfLines={1}>{eventTitle}</Text>
        ) : null}
      </View>
      <View style={styles.backBtn} />
    </View>
  );

  if (loadFailed) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {header}
        <ErrorState onRetry={fetchData} />
      </SafeAreaView>
    );
  }

  if (!registry) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        {header}
        <View style={styles.empty}>
          <Ionicons name="gift-outline" size={44} color={colors.gray300} />
          <Text style={[styles.emptyText, { color: colors.gray500 }]}>
            {t('organizer.weddingGifts.noRegistry')}
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleCreateRegistry}
            disabled={creating}
            accessibilityRole="button"
          >
            {creating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>{t('organizer.weddingGifts.create')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currency = registry.currency;

  const listHeader = (
    <View>
      {/* En-tête registre */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <View style={styles.rowCenter}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{registry.title}</Text>
              {!registry.is_active && (
                <View style={[styles.statusPill, { backgroundColor: '#F59E0B15' }]}>
                  <Text style={[styles.statusText, { color: '#B45309' }]}>{t('organizer.weddingGifts.hidden')}</Text>
                </View>
              )}
            </View>
            {registry.description ? (
              <Text style={[styles.subtle, { color: colors.gray500 }]} numberOfLines={2}>{registry.description}</Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={openEditHeader} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={t('common.edit')}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.visibilityRow, { borderTopColor: hairline }]}>
          <Text style={[styles.visibilityLabel, { color: colors.text }]}>
            {t('organizer.weddingGifts.visible')}
          </Text>
          <Switch value={registry.is_active} onValueChange={toggleActive} trackColor={{ true: colors.primary }} />
        </View>
      </View>

      {/* Total récolté + partage */}
      <View style={[styles.totalCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
        <View>
          <Text style={[styles.totalLabel, { color: colors.primary }]}>{t('organizer.weddingGifts.totalRaised')}</Text>
          <Text style={[styles.totalValue, { color: colors.primary }]}>{registry.total_raised} {currency}</Text>
        </View>
        {registry.event_slug ? (
          <TouchableOpacity onPress={shareLink} style={[styles.shareBtn, { backgroundColor: colors.primary }]} accessibilityRole="button" accessibilityLabel={t('organizer.weddingGifts.share')}>
            <Ionicons name="share-social-outline" size={16} color="#fff" />
            <Text style={styles.shareText}>{t('organizer.weddingGifts.share')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Ajouter un item */}
      <TouchableOpacity
        style={[styles.addItemBtn, { borderColor: colors.primary }]}
        onPress={openCreateItem}
        accessibilityRole="button"
      >
        <Ionicons name="add" size={18} color={colors.primary} />
        <Text style={[styles.addItemText, { color: colors.primary }]}>{t('organizer.weddingGifts.addItem')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: GiftItem }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
      <View style={styles.cardTop}>
        <View style={styles.rowCenter}>
          <Ionicons
            name={item.kind === 'cash_fund' ? 'wallet-outline' : 'gift-outline'}
            size={18}
            color={item.kind === 'cash_fund' ? colors.primary : '#EC4899'}
          />
          <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={styles.rowCenter}>
          <TouchableOpacity onPress={() => openEditItem(item)} style={styles.iconBtnSm} accessibilityRole="button" accessibilityLabel={t('common.edit')}>
            <Ionicons name="create-outline" size={18} color={colors.gray500} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => removeItem(item)} style={styles.iconBtnSm} accessibilityRole="button" accessibilityLabel={t('common.delete')}>
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.subtle, { color: colors.gray500 }]}>
        {item.kind === 'cash_fund'
          ? `${item.amount_collected}${Number(item.target_amount) > 0 ? ` / ${item.target_amount}` : ''} ${currency}`
          : item.is_reserved
            ? t('organizer.weddingGifts.reserved')
            : `${item.target_amount} ${currency}`}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {header}
      <FlatList
        data={registry.items}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[centeredContent(CARD_MAX), styles.listContent]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyItems}>
            <Text style={[styles.emptyText, { color: colors.gray500 }]}>{t('organizer.weddingGifts.noItems')}</Text>
          </View>
        }
      />

      {/* Modal édition en-tête */}
      <Modal visible={editHeaderOpen} transparent animationType="slide" onRequestClose={() => setEditHeaderOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('organizer.weddingGifts.editRegistry')}</Text>
              <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>{t('organizer.weddingGifts.registryTitle')}</Text>
              <TextInput
                value={regTitle}
                onChangeText={setRegTitle}
                style={[styles.input, { color: colors.text, borderColor: hairline, backgroundColor: colors.background }]}
              />
              <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>{t('organizer.weddingGifts.registryDescription')}</Text>
              <TextInput
                value={regDesc}
                onChangeText={setRegDesc}
                multiline
                style={[styles.input, styles.inputMulti, { color: colors.text, borderColor: hairline, backgroundColor: colors.background }]}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, { borderColor: hairline }]} onPress={() => setEditHeaderOpen(false)}>
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: colors.primary }]} onPress={saveHeader} disabled={savingHeader}>
                  {savingHeader ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('common.save')}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal item (create/edit) */}
      <Modal visible={itemModalOpen} transparent animationType="slide" onRequestClose={() => setItemModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editItemId ? t('organizer.weddingGifts.editItem') : t('organizer.weddingGifts.newItem')}
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>{t('organizer.weddingGifts.itemName')}</Text>
              <TextInput
                value={itemName}
                onChangeText={setItemName}
                style={[styles.input, { color: colors.text, borderColor: hairline, backgroundColor: colors.background }]}
              />

              {!editItemId && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>{t('organizer.weddingGifts.itemKind')}</Text>
                  <View style={styles.kindRow}>
                    {(['gift', 'cash_fund'] as const).map((k) => (
                      <TouchableOpacity
                        key={k}
                        onPress={() => setItemKind(k)}
                        style={[
                          styles.kindChip,
                          { borderColor: itemKind === k ? colors.primary : hairline, backgroundColor: itemKind === k ? `${colors.primary}12` : 'transparent' },
                        ]}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.kindText, { color: itemKind === k ? colors.primary : colors.text }]}>
                          {t(`organizer.weddingGifts.kind.${k}`)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>
                {t('organizer.weddingGifts.targetAmount')} ({currency})
              </Text>
              <TextInput
                value={itemAmount}
                onChangeText={setItemAmount}
                keyboardType="numeric"
                style={[styles.input, { color: colors.text, borderColor: hairline, backgroundColor: colors.background }]}
              />

              <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>{t('organizer.weddingGifts.externalUrl')}</Text>
              <TextInput
                value={itemUrl}
                onChangeText={setItemUrl}
                autoCapitalize="none"
                keyboardType="url"
                placeholder="https://…"
                placeholderTextColor={colors.gray300}
                style={[styles.input, { color: colors.text, borderColor: hairline, backgroundColor: colors.background }]}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, { borderColor: hairline }]} onPress={() => setItemModalOpen(false)}>
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: colors.primary }]}
                  onPress={saveItem}
                  disabled={savingItem || !itemName.trim()}
                >
                  {savingItem ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('common.save')}</Text>}
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
  headerBar: {
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
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  title: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md },
  subtle: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm, marginTop: 4 },
  statusPill: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  statusText: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs },
  iconBtn: { padding: 4 },
  iconBtnSm: { padding: 4 },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  visibilityLabel: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  totalCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs, textTransform: 'uppercase' },
  totalValue: { fontFamily: FontFamily.bold, fontSize: FontSizes.xl, marginTop: 2 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  shareText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm, color: '#fff' },
  addItemBtn: {
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
  addItemText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  itemName: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md, flexShrink: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.lg },
  emptyItems: { alignItems: 'center', paddingVertical: Spacing.lg },
  emptyText: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm, textAlign: 'center' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  primaryBtnText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md, color: '#fff' },
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
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  kindRow: { flexDirection: 'row', gap: Spacing.sm },
  kindChip: { flex: 1, alignItems: 'center', borderWidth: 1, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm },
  kindText: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  modalBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: BorderRadius.md, paddingVertical: Spacing.md },
  modalBtnPrimary: { borderWidth: 0 },
  modalBtnText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.md },
});
