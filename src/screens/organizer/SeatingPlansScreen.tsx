// ============================================
// SeatingPlansScreen — liste des plans de placement d'un event
// ============================================
//
// Atterrissage depuis MyEvents → "Plans de placement". Permet de créer
// plusieurs plans (utile pour des événements avec configuration variable —
// ex : un même hall en mode concert vs en mode conférence).
//
// La création (modal léger) ne demande qu'un nom + description ; la
// configuration détaillée des zones est faite ensuite dans
// SeatingPlanEditorScreen.

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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { seatingAPI } from '../../api';
import type { SeatingPlan, RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'SeatingPlans'>;

export default function SeatingPlansScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { eventId } = route.params;
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { showSuccess, showError, showConfirm } = useAlert();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [plans, setPlans] = useState<SeatingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Création
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await seatingAPI.getPlans({ event: eventId });
      const data: SeatingPlan[] = res.data?.results || res.data || [];
      setPlans(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showError(t('common.error'), error?.response?.data?.detail || t('organizer.seatingPlans.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId, showError, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh quand on revient de l'éditeur — total_seats peut avoir changé
  // après création de zones.
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const submitCreate = async () => {
    const name = createName.trim();
    if (!name) {
      showError(t('organizer.seatingPlans.nameRequiredTitle'), t('organizer.seatingPlans.nameRequiredMessage'));
      return;
    }
    setCreating(true);
    try {
      const res = await seatingAPI.createPlan({
        event: eventId,
        name,
        description: createDescription.trim() || undefined,
        total_seats: 0,
        is_active: true,
      });
      const created = res.data;
      if (created?.id) {
        setPlans(prev => [created, ...prev]);
        // Saute directement dans l'éditeur pour ajouter des zones.
        navigation.navigate('SeatingPlanEditor', { planId: created.id });
      } else {
        await fetchData();
      }
      setCreateOpen(false);
      setCreateName('');
      setCreateDescription('');
      showSuccess(t('organizer.seatingPlans.createSuccessTitle'), t('organizer.seatingPlans.createSuccessMessage'));
    } catch (error: any) {
      showError(t('common.error'), error?.response?.data?.detail || t('organizer.seatingPlans.createError'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (plan: SeatingPlan) => {
    showConfirm(
      t('organizer.seatingPlans.deleteConfirmTitle'),
      t('organizer.seatingPlans.deleteConfirmMessage', { name: plan.name }),
      async () => {
        try {
          await seatingAPI.deletePlan(plan.id);
          setPlans(prev => prev.filter(p => p.id !== plan.id));
          showSuccess(t('organizer.seatingPlans.deletedTitle'), '');
        } catch (error: any) {
          showError(t('common.error'), error?.response?.data?.detail || t('organizer.seatingPlans.deleteError'));
        }
      },
    );
  };

  const renderItem = ({ item }: { item: SeatingPlan }) => {
    const reserved = item.reserved_seats ?? 0;
    const fillPct = item.total_seats > 0 ? Math.min(100, (reserved / item.total_seats) * 100) : 0;
    const zonesCount = item.zones?.length ?? 0;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
        onPress={() => navigation.navigate('SeatingPlanEditor', { planId: item.id })}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('organizer.seatingPlans.editA11y', { name: item.name })}
      >
        <View style={styles.cardTop}>
          <View style={[styles.iconWell, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="grid-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            {item.description ? (
              <Text style={[styles.description, { color: colors.gray500 }]} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </View>
          {!item.is_active && (
            <View style={[styles.statusPill, { backgroundColor: '#F59E0B15' }]}>
              <Text style={[styles.statusText, { color: '#B45309' }]}>{t('organizer.seatingPlans.inactive')}</Text>
            </View>
          )}
        </View>

        <View style={[styles.statsRow, { borderTopColor: hairline }]}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>{item.total_seats}</Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('organizer.seatingPlans.seatsLabel')}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: hairline }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>{zonesCount}</Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('organizer.seatingPlans.zonesLabel')}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: hairline }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{reserved}</Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>{t('organizer.seatingPlans.reservedLabel')}</Text>
          </View>
        </View>

        {item.total_seats > 0 && (
          <View style={[styles.progressTrack, { backgroundColor: isDark ? colors.gray100 : colors.gray100 }]}>
            <View style={[styles.progressFill, { width: `${fillPct}%`, backgroundColor: colors.primary }]} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('organizer.seatingPlans.eyebrow')}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('organizer.seatingPlans.title')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }, Shadows.sm]}
          onPress={() => setCreateOpen(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('organizer.seatingPlans.newPlanA11y')}
        >
          <Ionicons name="add" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, plans.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="grid-outline" size={48} color={colors.gray300} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('organizer.seatingPlans.emptyTitle')}</Text>
              <Text style={[styles.emptyText, { color: colors.gray500 }]}>
                {t('organizer.seatingPlans.emptyText')}
              </Text>
            </View>
          }
        />
      )}

      {/* === CREATE MODAL === */}
      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => !creating && setCreateOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalEyebrow, { color: colors.accent }]}>{t('organizer.seatingPlans.modalEyebrow')}</Text>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('organizer.seatingPlans.modalTitle')}</Text>

            <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>{t('organizer.seatingPlans.nameField')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline, color: colors.text }]}
              value={createName}
              onChangeText={setCreateName}
              placeholder={t('organizer.seatingPlans.namePlaceholder')}
              placeholderTextColor={colors.gray400}
              editable={!creating}
              maxLength={200}
            />

            <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>{t('organizer.seatingPlans.descriptionField')}</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline, color: colors.text }]}
              value={createDescription}
              onChangeText={setCreateDescription}
              placeholder={t('organizer.seatingPlans.descriptionPlaceholder')}
              placeholderTextColor={colors.gray400}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!creating}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.gray100 }]}
                onPress={() => !creating && setCreateOpen(false)}
                disabled={creating}
                activeOpacity={0.85}
              >
                <Text style={[styles.modalBtnText, { color: colors.gray700 }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }, creating && { opacity: 0.6 }]}
                onPress={submitCreate}
                disabled={creating}
                activeOpacity={0.85}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={[styles.modalBtnText, { color: Colors.white }]}>{t('organizer.seatingPlans.createAndAdd')}</Text>
                )}
              </TouchableOpacity>
            </View>
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
  listContent: { padding: Spacing.lg, gap: Spacing.sm, ...centeredContent(CARD_MAX) },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.3,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginTop: 2,
    lineHeight: 17,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: FontSizes.lg,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  statDivider: { width: 1, height: 24 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: Spacing.xs,
  },
  progressFill: {
    height: '100%',
  },
  empty: {
    flex: 1,
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
  textArea: { minHeight: 70 },
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
