// ============================================
// DashboardsScreen — liste des dashboards perso de l'utilisateur
// ============================================
//
// Le builder mobile est plus modeste que le web (pas de drag-drop), mais
// permet quand même de créer plusieurs dashboards, naviguer dedans, et
// supprimer ceux qu'on n'utilise plus. Création = nom seul ; on peut
// remplir le détail / ajouter des widgets dans DashboardDetailsScreen.

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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { analyticsAPI } from '../../api';
import type { Dashboard, RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { showSuccess, showError, showConfirm } = useAlert();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [items, setItems] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Création
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await analyticsAPI.getDashboards();
      const data: Dashboard[] = res.data?.results || res.data || [];
      setItems(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showError(t('common.error'), error?.response?.data?.detail || t('organizer.dashboards.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh quand on revient depuis Details (suppression d'un widget peut
  // faire évoluer widgets_count, et la création d'un dashboard nouveau aussi).
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
    const title = createTitle.trim();
    if (!title) {
      showError(t('organizer.dashboards.titleRequiredTitle'), t('organizer.dashboards.titleRequiredMessage'));
      return;
    }
    setCreating(true);
    try {
      const res = await analyticsAPI.createDashboard({
        title,
        description: createDescription.trim() || undefined,
      });
      const created = res.data;
      if (created?.id) {
        setItems(prev => [created, ...prev]);
        // Saute directement dans le détail pour ajouter des widgets.
        navigation.navigate('DashboardDetails', { dashboardId: created.id });
      } else {
        await fetchData();
      }
      setCreateOpen(false);
      setCreateTitle('');
      setCreateDescription('');
      showSuccess(t('organizer.dashboards.createdTitle'), t('organizer.dashboards.createdMessage'));
    } catch (error: any) {
      showError(t('common.error'), error?.response?.data?.detail || t('organizer.dashboards.createError'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (dash: Dashboard) => {
    showConfirm(
      t('organizer.dashboards.deleteTitle'),
      t('organizer.dashboards.deleteMessage', { title: dash.title }),
      async () => {
        try {
          await analyticsAPI.deleteDashboard(dash.id);
          setItems(prev => prev.filter(d => d.id !== dash.id));
          showSuccess(t('organizer.dashboards.deletedTitle'), '');
        } catch (error: any) {
          showError(t('common.error'), error?.response?.data?.detail || t('organizer.dashboards.deleteError'));
        }
      },
    );
  };

  const renderItem = ({ item }: { item: Dashboard }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
      onPress={() => navigation.navigate('DashboardDetails', { dashboardId: item.id })}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={t('organizer.dashboards.openA11y', { title: item.title })}
    >
      <View style={[styles.iconWell, { backgroundColor: `${colors.primary}15` }]}>
        <Ionicons name="grid-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={[styles.description, { color: colors.gray500 }]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <View style={[styles.metaPill, { backgroundColor: isDark ? colors.gray100 : colors.gray50 }]}>
            <Ionicons name="apps-outline" size={11} color={colors.gray600} />
            <Text style={[styles.metaText, { color: colors.gray600 }]}>
              {t('organizer.dashboards.widgetCount', { count: item.widgets_count ?? 0 })}
            </Text>
          </View>
          {item.is_public && (
            <View style={[styles.metaPill, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="globe-outline" size={11} color="#059669" />
              <Text style={[styles.metaText, { color: '#059669' }]}>{t('organizer.dashboards.public')}</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
    </TouchableOpacity>
  );

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
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('organizer.dashboards.eyebrow')}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('organizer.dashboards.title')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }, Shadows.sm]}
          onPress={() => setCreateOpen(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('organizer.dashboards.newA11y')}
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
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, items.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="grid-outline" size={48} color={colors.gray300} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('organizer.dashboards.emptyTitle')}</Text>
              <Text style={[styles.emptyText, { color: colors.gray500 }]}>
                {t('organizer.dashboards.emptyText')}
              </Text>
            </View>
          }
        />
      )}

      {/* === CREATE MODAL === */}
      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => !creating && setCreateOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalEyebrow, { color: colors.accent }]}>{t('organizer.dashboards.modalEyebrow')}</Text>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('organizer.dashboards.modalTitle')}</Text>

            <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>{t('organizer.dashboards.titleField')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline, color: colors.text }]}
              value={createTitle}
              onChangeText={setCreateTitle}
              placeholder={t('organizer.dashboards.titlePlaceholder')}
              placeholderTextColor={colors.gray400}
              editable={!creating}
              maxLength={120}
            />

            <Text style={[styles.fieldLabel, { color: colors.gray500 }]}>{t('organizer.dashboards.descriptionField')}</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: isDark ? colors.gray100 : colors.gray50, borderColor: hairline, color: colors.text }]}
              value={createDescription}
              onChangeText={setCreateDescription}
              placeholder={t('organizer.dashboards.descriptionPlaceholder')}
              placeholderTextColor={colors.gray400}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!creating}
              maxLength={500}
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
                  <Text style={[styles.modalBtnText, { color: Colors.white }]}>{t('organizer.dashboards.createAndAdd')}</Text>
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
  listContent: { padding: Spacing.lg, gap: Spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, gap: 4 },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.3,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  metaText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.4,
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
  textArea: {
    minHeight: 70,
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
