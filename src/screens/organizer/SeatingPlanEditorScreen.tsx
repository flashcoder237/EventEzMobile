// ============================================
// SeatingPlanEditorScreen — édition d'un plan + preview des zones
// ============================================
//
// Approche pragmatique mobile (pas de canvas drag-drop) :
//   - Liste les zones du plan en cards
//   - Chaque zone → couleur + nom + capacité + nombre de réservés + grille
//     rows × cols stockée dans plan.layout_data.zones[zone_id]
//   - "Aperçu visuel" en bas : empile les zones en blocs colorés avec une
//     mini-grille de dots (rendu read-only) — le spectateur voit la même
//     chose dans VenueTab côté event details.
//   - Bouton "+" → modal créer zone (nom, couleur, rows, cols, prix)
//   - Long-press sur une zone → menu Modifier / Supprimer
//
// Le total_seats du plan est recalculé côté mobile à partir de la somme des
// capacités des zones puis sauvegardé via updatePlan. Le backend ne le
// recalcule pas automatiquement.

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { seatingAPI } from '../../api';
import type { SeatingPlan, SeatingZone, RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { centeredContent, WIDE_MAX } from '../../constants/layout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'SeatingPlanEditor'>;

// Palette pour la sélection couleur dans le modal — les valeurs hex sont
// stockées telles quelles côté backend (CharField max_length=7).
const ZONE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280',
];

interface ZoneFormState {
  name: string;
  color: string;
  rows: string;
  cols: string;
  priceModifier: string;
}

const EMPTY_ZONE_FORM: ZoneFormState = {
  name: '',
  color: ZONE_COLORS[0],
  rows: '6',
  cols: '10',
  priceModifier: '0',
};

export default function SeatingPlanEditorScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { planId } = route.params;
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { showSuccess, showError, showConfirm } = useAlert();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [plan, setPlan] = useState<SeatingPlan | null>(null);
  const [zones, setZones] = useState<SeatingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal zone
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<SeatingZone | null>(null);
  const [zoneForm, setZoneForm] = useState<ZoneFormState>(EMPTY_ZONE_FORM);
  const [zoneSubmitting, setZoneSubmitting] = useState(false);

  const fetchPlan = useCallback(async () => {
    try {
      const res = await seatingAPI.getPlan(planId);
      const p: SeatingPlan = res.data;
      setPlan(p);
      // Le serializer SeatingPlan inclut déjà zones via prefetch_related.
      setZones(p.zones || []);
    } catch (error: any) {
      showError(t('common.error'), error?.response?.data?.detail || t('organizer.seatingPlanEditor.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [planId, showError, t]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlan();
  };

  // Récupère la grille (rows/cols) stockée dans layout_data pour une zone.
  // Fallback : capacité→sqrt si pas encore configuré, ce qui donne une grille
  // approximativement carrée.
  const getZoneGrid = useCallback((zoneId: string, capacity: number) => {
    const stored = plan?.layout_data?.zones?.[zoneId];
    if (stored?.rows && stored?.cols) {
      return { rows: stored.rows, cols: stored.cols, label_prefix: stored.label_prefix || '' };
    }
    const side = Math.max(2, Math.ceil(Math.sqrt(Math.max(1, capacity))));
    return { rows: side, cols: side, label_prefix: '' };
  }, [plan]);

  const totalCapacity = useMemo(
    () => zones.reduce((sum, z) => sum + (z.capacity || 0), 0),
    [zones],
  );

  // Synchronise plan.total_seats avec la somme des capacités locales.
  // Appelé après chaque mutation de zone. Best-effort — si l'update échoue
  // (rare), le backend gardera l'ancien total_seats jusqu'au prochain trigger.
  const syncTotalSeats = useCallback(async (newTotal: number, layoutPatch?: SeatingPlan['layout_data']) => {
    if (!plan) return;
    if (newTotal === plan.total_seats && !layoutPatch) return;
    try {
      const res = await seatingAPI.updatePlan(plan.id, {
        total_seats: newTotal,
        ...(layoutPatch ? { layout_data: layoutPatch } : {}),
      });
      setPlan(res.data || null);
    } catch (error: any) {
      if (__DEV__) console.warn('[Seating] sync total_seats failed', error?.response?.data);
    }
  }, [plan]);

  // ── Zone create / edit / delete ──────────────────────────────────────────

  const openCreateZone = () => {
    setEditingZone(null);
    setZoneForm(EMPTY_ZONE_FORM);
    setZoneModalOpen(true);
  };

  const openEditZone = (zone: SeatingZone) => {
    const grid = getZoneGrid(zone.id, zone.capacity);
    setEditingZone(zone);
    setZoneForm({
      name: zone.name,
      color: zone.color || ZONE_COLORS[0],
      rows: String(grid.rows),
      cols: String(grid.cols),
      priceModifier: String(zone.price_modifier ?? 0),
    });
    setZoneModalOpen(true);
  };

  const closeZoneModal = () => {
    if (zoneSubmitting) return;
    setZoneModalOpen(false);
    setEditingZone(null);
  };

  const submitZone = async () => {
    const name = zoneForm.name.trim();
    const rows = parseInt(zoneForm.rows, 10);
    const cols = parseInt(zoneForm.cols, 10);
    const priceModifier = parseFloat(zoneForm.priceModifier.replace(',', '.')) || 0;

    if (!name) {
      showError(t('organizer.seatingPlanEditor.zoneNameRequiredTitle'), t('organizer.seatingPlanEditor.zoneNameRequiredMessage'));
      return;
    }
    if (!Number.isFinite(rows) || rows < 1 || rows > 50) {
      showError(t('organizer.seatingPlanEditor.rowsInvalidTitle'), t('organizer.seatingPlanEditor.rowsInvalidMessage'));
      return;
    }
    if (!Number.isFinite(cols) || cols < 1 || cols > 50) {
      showError(t('organizer.seatingPlanEditor.colsInvalidTitle'), t('organizer.seatingPlanEditor.colsInvalidMessage'));
      return;
    }

    const capacity = rows * cols;
    setZoneSubmitting(true);
    try {
      let updatedZone: SeatingZone;
      if (editingZone) {
        const res = await seatingAPI.updateZone(editingZone.id, {
          name,
          color: zoneForm.color,
          capacity,
          price_modifier: priceModifier,
        });
        updatedZone = res.data;
        setZones(prev => prev.map(z => z.id === editingZone.id ? updatedZone : z));
      } else {
        const res = await seatingAPI.createZone({
          seating_plan: planId,
          name,
          color: zoneForm.color,
          capacity,
          price_modifier: priceModifier,
          order: zones.length,
        });
        updatedZone = res.data;
        setZones(prev => [...prev, updatedZone]);
      }

      // Sauvegarde rows/cols dans layout_data du plan.
      const newLayout = {
        ...(plan?.layout_data || {}),
        zones: {
          ...(plan?.layout_data?.zones || {}),
          [updatedZone.id]: { rows, cols, label_prefix: name.charAt(0).toUpperCase() },
        },
      };
      const newTotal = (editingZone
        ? zones.map(z => z.id === editingZone.id ? updatedZone : z)
        : [...zones, updatedZone]
      ).reduce((sum, z) => sum + (z.capacity || 0), 0);

      await syncTotalSeats(newTotal, newLayout);
      showSuccess(
        editingZone ? t('organizer.seatingPlanEditor.zoneUpdated') : t('organizer.seatingPlanEditor.zoneCreated'),
        t('organizer.seatingPlanEditor.zoneCapacityInfo', { capacity, rows, cols }),
      );
      setZoneModalOpen(false);
      setEditingZone(null);
    } catch (error: any) {
      showError(t('common.error'), error?.response?.data?.detail || t('organizer.seatingPlanEditor.saveError'));
    } finally {
      setZoneSubmitting(false);
    }
  };

  const handleDeleteZone = (zone: SeatingZone) => {
    showConfirm(
      t('organizer.seatingPlanEditor.deleteZoneTitle'),
      t('organizer.seatingPlanEditor.deleteZoneMessage', { name: zone.name, capacity: zone.capacity }),
      async () => {
        try {
          await seatingAPI.deleteZone(zone.id);
          const next = zones.filter(z => z.id !== zone.id);
          setZones(next);
          // Cleanup layout_data + sync total_seats
          const layoutZones = { ...(plan?.layout_data?.zones || {}) };
          delete layoutZones[zone.id];
          await syncTotalSeats(
            next.reduce((sum, z) => sum + (z.capacity || 0), 0),
            { ...(plan?.layout_data || {}), zones: layoutZones },
          );
          showSuccess(t('organizer.seatingPlanEditor.zoneDeleted'), '');
        } catch (error: any) {
          showError(t('common.error'), error?.response?.data?.detail || t('organizer.seatingPlanEditor.deleteError'));
        }
      },
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]} numberOfLines={1}>
            {t('organizer.seatingPlanEditor.eyebrow')}
          </Text>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {plan?.name || '…'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }, Shadows.sm]}
          onPress={openCreateZone}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('organizer.seatingPlanEditor.addZoneA11y')}
        >
          <Ionicons name="add" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* Sticky stats résumé */}
          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>{totalCapacity}</Text>
              <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('organizer.seatingPlans.seatsLabel')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: hairline }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{zones.length}</Text>
              <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('organizer.seatingPlans.zonesLabel')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: hairline }]} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: '#10B981' }]}>{plan?.reserved_seats ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('organizer.seatingPlans.reservedLabel')}</Text>
            </View>
          </View>

          {/* === Aperçu visuel === */}
          {zones.length > 0 && (
            <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
              <Text style={[styles.previewEyebrow, { color: colors.accent }]}>{t('organizer.seatingPlanEditor.previewEyebrow')}</Text>
              {/* Bandeau "Scène" */}
              <View style={[styles.stageBar, { backgroundColor: isDark ? colors.gray200 : colors.gray100 }]}>
                <Text style={[styles.stageBarText, { color: colors.gray500 }]}>{t('organizer.seatingPlanEditor.stage')}</Text>
              </View>
              {zones.map((zone) => {
                const grid = getZoneGrid(zone.id, zone.capacity);
                // Limite l'aperçu à 12 colonnes max pour rester lisible.
                const previewCols = Math.min(12, grid.cols);
                const previewRows = Math.min(8, grid.rows);
                return (
                  <View key={zone.id} style={styles.previewZone}>
                    <View style={styles.previewZoneHead}>
                      <View style={[styles.zoneColorDot, { backgroundColor: zone.color }]} />
                      <Text style={[styles.previewZoneName, { color: colors.text }]} numberOfLines={1}>
                        {zone.name}
                      </Text>
                      <Text style={[styles.previewZoneMeta, { color: colors.gray500 }]}>
                        {grid.rows}×{grid.cols}
                      </Text>
                    </View>
                    <View style={styles.previewGrid}>
                      {Array.from({ length: previewRows }).map((_, r) => (
                        <View key={r} style={styles.previewRow}>
                          {Array.from({ length: previewCols }).map((_, c) => (
                            <View
                              key={c}
                              style={[styles.previewSeat, { backgroundColor: zone.color }]}
                            />
                          ))}
                        </View>
                      ))}
                      {grid.cols > previewCols && (
                        <Text style={[styles.previewTruncated, { color: colors.gray500 }]}>
                          {t('organizer.seatingPlanEditor.truncatedCols', { count: grid.cols - previewCols })}
                        </Text>
                      )}
                      {grid.rows > previewRows && (
                        <Text style={[styles.previewTruncated, { color: colors.gray500 }]}>
                          {t('organizer.seatingPlanEditor.truncatedRows', { count: grid.rows - previewRows })}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* === Liste éditable des zones === */}
          {zones.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="apps-outline" size={48} color={colors.gray300} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('organizer.seatingPlanEditor.noZoneTitle')}</Text>
              <Text style={[styles.emptyText, { color: colors.gray500 }]}>
                {t('organizer.seatingPlanEditor.noZoneText')}
              </Text>
              <TouchableOpacity
                style={[styles.emptyCta, { backgroundColor: colors.primary }]}
                onPress={openCreateZone}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.emptyCtaText}>{t('organizer.seatingPlanEditor.addZone')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.zonesList}>
              <Text style={[styles.sectionEyebrow, { color: colors.gray500 }]}>{t('organizer.seatingPlans.zonesLabel')}</Text>
              {zones.map((zone) => {
                const grid = getZoneGrid(zone.id, zone.capacity);
                return (
                  <TouchableOpacity
                    key={zone.id}
                    style={[styles.zoneRow, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
                    onPress={() => openEditZone(zone)}
                    onLongPress={() => handleDeleteZone(zone)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={t('organizer.seatingPlanEditor.editZoneA11y', { name: zone.name })}
                  >
                    <View style={[styles.zoneColorBlock, { backgroundColor: zone.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.zoneName, { color: colors.text }]} numberOfLines={1}>
                        {zone.name}
                      </Text>
                      <Text style={[styles.zoneMeta, { color: colors.gray500 }]}>
                        {t('organizer.seatingPlanEditor.zoneMeta', { capacity: zone.capacity, rows: grid.rows, cols: grid.cols })}
                        {Number(zone.price_modifier) !== 0 ? ` · +${zone.price_modifier}` : ''}
                      </Text>
                    </View>
                    {zone.reserved_count != null && zone.reserved_count > 0 && (
                      <View style={[styles.zonePill, { backgroundColor: '#10B98115' }]}>
                        <Text style={[styles.zonePillText, { color: '#059669' }]}>
                          {zone.reserved_count} ✓
                        </Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* === ZONE MODAL === */}
      <Modal
        visible={zoneModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeZoneModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalEyebrow, { color: colors.accent }]}>
                {editingZone ? t('organizer.seatingPlanEditor.modalEdit') : t('organizer.seatingPlanEditor.modalNew')}
              </Text>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('organizer.seatingPlanEditor.zone')}</Text>

              <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>{t('organizer.seatingPlans.nameField')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline, color: colors.text }]}
                value={zoneForm.name}
                onChangeText={(v) => setZoneForm({ ...zoneForm, name: v })}
                placeholder={t('organizer.seatingPlanEditor.zoneNamePlaceholder')}
                placeholderTextColor={colors.gray400}
                editable={!zoneSubmitting}
                maxLength={100}
              />

              <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>{t('organizer.seatingPlanEditor.colorField')}</Text>
              <View style={styles.colorRow}>
                {ZONE_COLORS.map(c => {
                  const active = c === zoneForm.color;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c, borderColor: active ? colors.text : 'transparent' },
                      ]}
                      onPress={() => !zoneSubmitting && setZoneForm({ ...zoneForm, color: c })}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={t('organizer.seatingPlanEditor.colorA11y', { color: c })}
                    >
                      {active && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>{t('organizer.seatingPlanEditor.rowsField')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline, color: colors.text }]}
                    value={zoneForm.rows}
                    onChangeText={(v) => setZoneForm({ ...zoneForm, rows: v })}
                    keyboardType="number-pad"
                    editable={!zoneSubmitting}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>{t('organizer.seatingPlanEditor.colsField')}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline, color: colors.text }]}
                    value={zoneForm.cols}
                    onChangeText={(v) => setZoneForm({ ...zoneForm, cols: v })}
                    keyboardType="number-pad"
                    editable={!zoneSubmitting}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>{t('organizer.seatingPlanEditor.priceModifierField')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline, color: colors.text }]}
                value={zoneForm.priceModifier}
                onChangeText={(v) => setZoneForm({ ...zoneForm, priceModifier: v })}
                placeholder={t('organizer.seatingPlanEditor.priceModifierPlaceholder')}
                placeholderTextColor={colors.gray400}
                keyboardType="decimal-pad"
                editable={!zoneSubmitting}
              />
              <Text style={[styles.helpText, { color: colors.gray500 }]}>
                {t('organizer.seatingPlanEditor.calculatedCapacity', { count: (parseInt(zoneForm.rows, 10) || 0) * (parseInt(zoneForm.cols, 10) || 0) })}
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.gray100 }]}
                  onPress={closeZoneModal}
                  disabled={zoneSubmitting}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.modalBtnText, { color: colors.gray700 }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary }, zoneSubmitting && { opacity: 0.6 }]}
                  onPress={submitZone}
                  disabled={zoneSubmitting}
                  activeOpacity={0.85}
                >
                  {zoneSubmitting ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={[styles.modalBtnText, { color: Colors.white }]}>
                      {editingZone ? t('common.save') : t('organizer.seatingPlanEditor.createZone')}
                    </Text>
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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: Spacing.lg, gap: Spacing.lg, ...centeredContent(WIDE_MAX) },

  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.4,
  },
  statLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  statDivider: { width: 1, height: 28 },

  // Preview
  previewCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  previewEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  stageBar: {
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  stageBarText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
  },
  previewZone: { gap: 6 },
  previewZoneHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zoneColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  previewZoneName: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },
  previewZoneMeta: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
  },
  previewGrid: { gap: 3 },
  previewRow: {
    flexDirection: 'row',
    gap: 3,
  },
  previewSeat: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 2,
    maxWidth: 18,
  },
  previewTruncated: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    marginTop: 2,
  },

  // Zones list
  zonesList: { gap: Spacing.sm },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  zoneColorBlock: {
    width: 8,
    height: 40,
    borderRadius: 4,
  },
  zoneName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.2,
  },
  zoneMeta: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  zonePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  zonePillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.4,
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: { fontFamily: FontFamily.displayBold, fontSize: FontSizes.lg, marginTop: Spacing.sm },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: Spacing.md,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
  },
  emptyCtaText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: '#fff',
    letterSpacing: 0.4,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
  },
  modalEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  modalTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.5,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: Spacing.sm,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 14,
    fontFamily: FontFamily.regular,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },
  helpText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginTop: 4,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.4,
  },
});
