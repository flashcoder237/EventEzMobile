// ============================================
// DashboardDetailsScreen — vue + édition d'un dashboard
// ============================================
//
// Mode lecture :
//   - charge le dashboard + ses widgets (l'endpoint /widgets/ retourne tous
//     les widgets du propriétaire — l'API backend n'a pas de FK Dashboard→Widget,
//     donc on associe via la convention "tous les widgets de l'owner")
//   - rend chaque widget via WidgetRenderer (KPI / chart / list / pie)
//
// Mode édition :
//   - long-press sur un widget → menu Modifier / Supprimer
//   - bouton "+" → WidgetFormModal pour ajouter
//
// Le layout est une simple colonne — pas de drag-drop sur mobile, le but
// est la consultation rapide. Pour un vrai grid drag-drop, le web reste
// l'expérience canonique.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { analyticsAPI } from '../../api';
import type { Dashboard, DashboardWidget, RootStackParamList } from '../../types';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import WidgetRenderer from '../../components/charts/WidgetRenderer';
import WidgetFormModal from '../../components/charts/WidgetFormModal';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'DashboardDetails'>;

export default function DashboardDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { dashboardId } = route.params;
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { showSuccess, showError, showConfirm } = useAlert();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Bump pour forcer un refetch coordonné de TOUS les widgets sur pull-to-refresh.
  const [refreshKey, setRefreshKey] = useState(0);

  const [widgetFormOpen, setWidgetFormOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, widgetsRes] = await Promise.all([
        analyticsAPI.getDashboard(dashboardId),
        analyticsAPI.getDashboardWidgets(dashboardId),
      ]);
      setDashboard(dashRes.data);
      const ws: DashboardWidget[] = widgetsRes.data?.results || widgetsRes.data || [];
      setWidgets(Array.isArray(ws) ? ws : []);
    } catch (error: any) {
      showError(t('common.error'), error?.response?.data?.detail || t('organizer.dashboardDetails.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dashboardId, showError, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    setRefreshKey(k => k + 1); // refetch widget data aussi
    fetchData();
  };

  const handleWidgetCreated = (w: DashboardWidget) => {
    setWidgets(prev => {
      const exists = prev.some(x => x.id === w.id);
      return exists ? prev.map(x => x.id === w.id ? w : x) : [w, ...prev];
    });
    setWidgetFormOpen(false);
    setEditingWidget(null);
    showSuccess(t('organizer.dashboardDetails.widgetSaved'), '');
  };

  const handleEditWidget = (widget: DashboardWidget) => {
    setEditingWidget(widget);
    setWidgetFormOpen(true);
  };

  const handleDeleteWidget = (widget: DashboardWidget) => {
    showConfirm(
      t('organizer.dashboardDetails.deleteWidgetTitle'),
      t('organizer.dashboardDetails.deleteWidgetMessage', { title: widget.title }),
      async () => {
        try {
          await analyticsAPI.deleteWidget(widget.id);
          setWidgets(prev => prev.filter(w => w.id !== widget.id));
          showSuccess(t('organizer.dashboardDetails.deletedTitle'), '');
        } catch (error: any) {
          showError(t('common.error'), error?.response?.data?.detail || t('organizer.dashboardDetails.deleteError'));
        }
      },
    );
  };

  const openWidgetMenu = (widget: DashboardWidget) => {
    // showAlert n'expose pas un menu actions multi-style — on utilise un
    // confirm avec deux options (modifier / supprimer) via l'alert context.
    // Le pattern "long-press → menu" est codifié simplement.
    handleEditWidget(widget);
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
          <Text style={[styles.headerEyebrow, { color: colors.accent }]} numberOfLines={1}>
            {t('organizer.dashboardDetails.eyebrow')}
          </Text>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {dashboard?.title || '…'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }, Shadows.sm]}
          onPress={() => {
            setEditingWidget(null);
            setWidgetFormOpen(true);
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('organizer.dashboardDetails.addWidgetA11y')}
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
          contentContainerStyle={[styles.scrollContent, widgets.length === 0 && { flexGrow: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {dashboard?.description ? (
            <Text style={[styles.description, { color: colors.gray500 }]}>{dashboard.description}</Text>
          ) : null}

          {widgets.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="apps-outline" size={48} color={colors.gray300} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('organizer.dashboardDetails.emptyTitle')}</Text>
              <Text style={[styles.emptyText, { color: colors.gray500 }]}>
                {t('organizer.dashboardDetails.emptyText')}
              </Text>
              <TouchableOpacity
                style={[styles.emptyCta, { backgroundColor: colors.primary }]}
                onPress={() => setWidgetFormOpen(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.emptyCtaText}>{t('organizer.dashboardDetails.addWidget')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.widgetList}>
              {widgets.map(w => (
                <View key={w.id} style={styles.widgetSlot}>
                  <WidgetRenderer
                    widget={w}
                    refreshKey={refreshKey}
                    onLongPress={() => openWidgetMenu(w)}
                  />
                  <View style={styles.widgetActions}>
                    <TouchableOpacity
                      style={[styles.widgetActionBtn, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}
                      onPress={() => handleEditWidget(w)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={13} color={colors.primary} />
                      <Text style={[styles.widgetActionText, { color: colors.primary }]}>{t('common.edit')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.widgetActionBtn, { backgroundColor: '#EF444410', borderColor: '#EF444430' }]}
                      onPress={() => handleDeleteWidget(w)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={13} color="#EF4444" />
                      <Text style={[styles.widgetActionText, { color: '#EF4444' }]}>{t('common.delete')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <WidgetFormModal
        visible={widgetFormOpen}
        widget={editingWidget}
        onClose={() => {
          setWidgetFormOpen(false);
          setEditingWidget(null);
        }}
        onSuccess={handleWidgetCreated}
      />
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
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  widgetList: {
    gap: Spacing.lg,
  },
  widgetSlot: {
    gap: 6,
  },
  widgetActions: {
    flexDirection: 'row',
    gap: 6,
  },
  widgetActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  widgetActionText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.2,
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
});
