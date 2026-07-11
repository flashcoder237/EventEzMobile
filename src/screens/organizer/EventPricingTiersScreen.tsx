import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { FontFamily, Spacing, BorderRadius } from '../../constants/theme';
import { ticketTypesAPI, priceTiersAPI } from '../../api';
import DateTimePickerField from '../../components/ui/DateTimePickerField';
import { RootStackParamList, TicketType } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'EventPricingTiers'>;

interface DraftTier {
  label: string;
  price: string;
  maxQuantity: string;
  endsAt?: Date;
}

const emptyDraft = (): DraftTier => ({ label: '', price: '', maxQuantity: '', endsAt: undefined });

export default function EventPricingTiersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { eventId, eventCurrency } = route.params;
  const { colors } = useTheme();
  const { showError, showSuccess } = useAlert();
  const { t } = useTranslation();
  const currency = eventCurrency || '';

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openForm, setOpenForm] = useState<string | null>(null); // ticketType id
  const [draft, setDraft] = useState<DraftTier>(emptyDraft());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await ticketTypesAPI.getTicketTypes({ event: eventId });
      const data: any = res.data;
      const list = (data?.results ?? data ?? []) as TicketType[];
      // Exclut les billets gratuits (paliers non pertinents).
      setTicketTypes(list.filter((tt) => (tt.price ?? 0) > 0));
    } catch {
      setTicketTypes([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const startAdd = (ttId: string) => {
    setDraft(emptyDraft());
    setOpenForm(ttId);
  };

  const submitTier = async (tt: TicketType) => {
    const price = parseFloat(draft.price.replace(',', '.'));
    if (!draft.label.trim()) {
      showError(t('pricingTiers.error'), t('pricingTiers.labelRequired'));
      return;
    }
    if (isNaN(price) || price < 0) {
      showError(t('pricingTiers.error'), t('pricingTiers.priceInvalid'));
      return;
    }
    const maxQty = draft.maxQuantity.trim() ? parseInt(draft.maxQuantity, 10) : null;
    setSaving(true);
    try {
      await priceTiersAPI.create({
        ticket_type: tt.id as any,
        label: draft.label.trim(),
        price,
        max_quantity: maxQty && maxQty > 0 ? maxQty : null,
        ends_at: draft.endsAt ? draft.endsAt.toISOString() : null,
        order: (tt.price_tiers?.length ?? 0),
      });
      showSuccess(t('pricingTiers.added'), '');
      setOpenForm(null);
      setDraft(emptyDraft());
      await load();
    } catch (e: any) {
      showError(t('pricingTiers.error'), e?.response?.data?.detail || t('pricingTiers.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const deleteTier = async (tierId: number) => {
    try {
      await priceTiersAPI.remove(tierId);
      await load();
    } catch {
      showError(t('pricingTiers.error'), t('pricingTiers.deleteFailed'));
    }
  };

  const money = (n: number) => `${Math.round(n).toLocaleString()}${currency ? ` ${currency}` : ''}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('pricingTiers.title')}</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.intro, { color: colors.gray500 }]}>{t('pricingTiers.intro')}</Text>

          {ticketTypes.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="pricetags-outline" size={40} color={colors.gray400} />
              <Text style={[styles.emptyText, { color: colors.gray500 }]}>{t('pricingTiers.noTickets')}</Text>
            </View>
          ) : (
            ticketTypes.map((tt) => {
              const tiers = tt.price_tiers ?? [];
              const ttId = String(tt.id);
              return (
                <View key={ttId} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.cardHead}>
                    <Text style={[styles.ticketName, { color: colors.text }]} numberOfLines={1}>{tt.name}</Text>
                    <Text style={[styles.basePrice, { color: colors.gray500 }]}>
                      {t('pricingTiers.base')}: {money(tt.price)}
                    </Text>
                  </View>

                  {tiers.length === 0 ? (
                    <Text style={[styles.noTier, { color: colors.gray400 }]}>{t('pricingTiers.noTier')}</Text>
                  ) : (
                    tiers
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((tier) => (
                        <View key={tier.id} style={[styles.tierRow, { borderTopColor: colors.border }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.tierLabel, { color: colors.text }]}>{tier.label}</Text>
                            <Text style={[styles.tierMeta, { color: colors.gray500 }]}>
                              {money(tier.price)}
                              {tier.max_quantity ? ` · ${t('pricingTiers.firstN', { count: tier.max_quantity })}` : ''}
                              {tier.ends_at ? ` · ${t('pricingTiers.until', { date: new Date(tier.ends_at).toLocaleDateString('fr-FR') })}` : ''}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => deleteTier(tier.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel={t('pricingTiers.delete')}
                          >
                            <Ionicons name="trash-outline" size={18} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                      ))
                  )}

                  {openForm === ttId ? (
                    <View style={[styles.form, { borderTopColor: colors.border }]}>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                        placeholder={t('pricingTiers.labelPlaceholder')}
                        placeholderTextColor={colors.gray400}
                        value={draft.label}
                        onChangeText={(v) => setDraft((d) => ({ ...d, label: v }))}
                        maxLength={60}
                      />
                      <View style={styles.inputRow}>
                        <TextInput
                          style={[styles.input, styles.inputHalf, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                          placeholder={t('pricingTiers.pricePlaceholder')}
                          placeholderTextColor={colors.gray400}
                          value={draft.price}
                          onChangeText={(v) => setDraft((d) => ({ ...d, price: v }))}
                          keyboardType="numeric"
                        />
                        <TextInput
                          style={[styles.input, styles.inputHalf, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                          placeholder={t('pricingTiers.qtyPlaceholder')}
                          placeholderTextColor={colors.gray400}
                          value={draft.maxQuantity}
                          onChangeText={(v) => setDraft((d) => ({ ...d, maxQuantity: v.replace(/[^0-9]/g, '') }))}
                          keyboardType="number-pad"
                        />
                      </View>
                      <DateTimePickerField
                        label={t('pricingTiers.untilLabel')}
                        value={draft.endsAt}
                        onChange={(date) => setDraft((d) => ({ ...d, endsAt: date }))}
                      />
                      <Text style={[styles.hint, { color: colors.gray400 }]}>{t('pricingTiers.constraintHint')}</Text>
                      <View style={styles.formActions}>
                        <TouchableOpacity
                          style={[styles.formBtn, { backgroundColor: colors.surface }]}
                          onPress={() => { setOpenForm(null); setDraft(emptyDraft()); }}
                        >
                          <Text style={[styles.formBtnText, { color: colors.gray700 }]}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.formBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
                          onPress={() => submitTier(tt)}
                          disabled={saving}
                        >
                          {saving
                            ? <ActivityIndicator size="small" color="#FFF" />
                            : <Text style={[styles.formBtnText, { color: '#FFF' }]}>{t('pricingTiers.save')}</Text>}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.addBtn, { borderColor: colors.primary }]}
                      onPress={() => startAdd(ttId)}
                      accessibilityRole="button"
                      accessibilityLabel={t('pricingTiers.addTier')}
                    >
                      <Ionicons name="add" size={16} color={colors.primary} />
                      <Text style={[styles.addBtnText, { color: colors.primary }]}>{t('pricingTiers.addTier')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 17, letterSpacing: -0.3 },

  content: { padding: Spacing.lg, paddingBottom: Spacing.xl * 2, gap: Spacing.md },
  intro: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },

  emptyBox: { alignItems: 'center', gap: 10, paddingVertical: Spacing.xl * 1.5 },
  emptyText: { fontFamily: FontFamily.regular, fontSize: 14, textAlign: 'center' },

  card: { borderWidth: 1, borderRadius: BorderRadius.xl, padding: Spacing.md },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 },
  ticketName: { fontFamily: FontFamily.bold, fontSize: 15, letterSpacing: -0.2, flexShrink: 1 },
  basePrice: { fontFamily: FontFamily.medium, fontSize: 12 },
  noTier: { fontFamily: FontFamily.regular, fontSize: 12, paddingVertical: 8 },

  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1 },
  tierLabel: { fontFamily: FontFamily.semiBold, fontSize: 14 },
  tierMeta: { fontFamily: FontFamily.regular, fontSize: 12, marginTop: 2 },

  form: { borderTopWidth: 1, paddingTop: Spacing.md, marginTop: 6, gap: Spacing.sm },
  inputRow: { flexDirection: 'row', gap: Spacing.sm },
  input: {
    borderWidth: 1, borderRadius: BorderRadius.lg, paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: FontFamily.medium, fontSize: 14,
  },
  inputHalf: { flex: 1 },
  hint: { fontFamily: FontFamily.regular, fontSize: 11 },
  formActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  formBtn: {
    flex: 1, paddingVertical: 11, borderRadius: BorderRadius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  formBtnText: { fontFamily: FontFamily.bold, fontSize: 14 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderStyle: 'dashed', borderRadius: BorderRadius.lg,
    paddingVertical: 10, marginTop: 10,
  },
  addBtnText: { fontFamily: FontFamily.semiBold, fontSize: 13 },
});
