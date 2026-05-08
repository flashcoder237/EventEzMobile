import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { usersAPI, auditAPI, analyticsAPI } from '../../api';
import { RootStackParamList } from '../../types';
import { KPICard } from '../../components/charts';
import RoleGuard from '../../components/auth/RoleGuard';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AdminDashboardScreen() {
  const { t } = useTranslation();
  return (
    <RoleGuard allow={['admin']} watermark={t('admin.dashboard.watermark')} title={t('admin.dashboard.guardTitle')}>
      <AdminDashboardContent />
    </RoleGuard>
  );
}

function AdminDashboardContent() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const { currency: platformCurrency } = useCommissionConfig();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEvents: 0,
    totalRevenue: 0,
    pendingVerifications: 0,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    // Le RoleGuard parent garantit que user.role === 'admin' (ou is_staff). Le
    // fetch est inutile pour les non-admins, mais le guard les a déjà bloqués.
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, analyticsRes, auditRes, verificationRes] = await Promise.all([
        usersAPI.getUsers({ page_size: 1 }).catch(() => ({ data: { count: 0 } })),
        analyticsAPI.getDashboardSummary().catch(() => ({ data: null })),
        auditAPI.getRecentLogs({ limit: 5 }).catch(() => ({ data: [] })),
        usersAPI.getPendingVerification().catch(() => ({ data: [] })),
      ]);

      setStats({
        totalUsers: usersRes.data?.count || 0,
        totalEvents: analyticsRes.data?.total_events || 0,
        totalRevenue: analyticsRes.data?.total_revenue || 0,
        pendingVerifications: Array.isArray(verificationRes.data)
          ? verificationRes.data.length
          : verificationRes.data?.count || 0,
      });

      const logs = auditRes.data?.results || auditRes.data || [];
      setRecentLogs(Array.isArray(logs) ? logs.slice(0, 5) : []);
    } catch (error) {
      if (__DEV__) console.error('Erreur admin dashboard:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const quickActions: { icon: keyof typeof Ionicons.glyphMap; title: string; screen: string; color: string }[] = [
    { icon: 'people-outline', title: t('admin.dashboard.actions.users'), screen: 'UserManagement', color: '#4F46E5' },
    { icon: 'receipt-outline', title: t('admin.dashboard.actions.subscriptions'), screen: 'SubscriptionManagement', color: '#A855F7' },
    { icon: 'shield-outline', title: t('admin.dashboard.actions.audit'), screen: 'AuditLogs', color: '#10B981' },
    { icon: 'megaphone-outline', title: t('admin.dashboard.actions.announcements'), screen: 'AnnouncementsAdmin', color: '#3B82F6' },
    { icon: 'pricetag-outline', title: t('admin.dashboard.actions.ads'), screen: 'AdminAds', color: '#EC4899' },
    { icon: 'cloud-download-outline', title: t('admin.dashboard.actions.clientReleases'), screen: 'ClientReleaseAdmin', color: '#7C3AED' },
    { icon: 'settings-outline', title: t('admin.dashboard.actions.settings'), screen: 'PlatformSettings', color: '#F59E0B' },
    { icon: 'cash-outline', title: t('admin.dashboard.actions.treasury'), screen: 'TreasuryOverview', color: '#EF4444' },
  ];

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
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('admin.dashboard.eyebrow')}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('admin.dashboard.title')}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <KPICard title={t('admin.dashboard.kpiUsers')} value={stats.totalUsers} icon="people-outline" color="#4F46E5" />
          <KPICard title={t('admin.dashboard.kpiEvents')} value={stats.totalEvents} icon="calendar-outline" color="#A855F7" />
        </View>
        <View style={styles.kpiRow}>
          <KPICard title={t('admin.dashboard.kpiRevenue')} value={`${stats.totalRevenue.toLocaleString()} ${platformCurrency}`} icon="cash-outline" color="#10B981" />
          <KPICard title={t('admin.dashboard.kpiVerifications')} value={stats.pendingVerifications} icon="shield-checkmark-outline" color="#F59E0B" />
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionEyebrow, { color: colors.gray500 }]}>{t('admin.dashboard.quickActions')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
          {quickActions.map((action, idx) => (
            <TouchableOpacity
              key={action.screen}
              style={[styles.rowItem, idx < quickActions.length - 1 && { borderBottomWidth: 1, borderBottomColor: hairline }]}
              onPress={() => navigation.navigate(action.screen as any)}
              activeOpacity={0.6}
            >
              <View style={[styles.iconWell, { backgroundColor: `${action.color}15` }]}>
                <Ionicons name={action.icon} size={18} color={action.color} />
              </View>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{action.title}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <Text style={[styles.sectionEyebrow, { color: colors.gray500 }]}>{t('admin.dashboard.recentActivity')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
          {recentLogs.length > 0 ? recentLogs.map((log, idx) => (
            <View
              key={log.id || idx}
              style={[styles.logItem, idx < recentLogs.length - 1 && { borderBottomWidth: 1, borderBottomColor: hairline }]}
            >
              <View style={[styles.logDot, {
                backgroundColor: log.severity === 'critical' ? '#EF4444'
                  : log.severity === 'warning' ? '#F59E0B'
                  : '#10B981'
              }]} />
              <View style={styles.logContent}>
                <Text style={[styles.logAction, { color: colors.text }]} numberOfLines={1}>
                  {log.action_display || log.action}
                </Text>
                <Text style={[styles.logTime, { color: colors.gray400 }]}>
                  {new Date(log.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          )) : (
            <Text style={[styles.emptyText, { color: colors.gray500 }]}>{t('admin.dashboard.noActivity')}</Text>
          )}
          {recentLogs.length > 0 && (
            <TouchableOpacity
              style={[styles.viewAllBtn, { borderTopColor: hairline }]}
              onPress={() => navigation.navigate('AuditLogs')}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>{t('admin.dashboard.viewAllAudit')}</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  kpiRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { flex: 1, fontFamily: FontFamily.semiBold, fontSize: FontSizes.base },
  logItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logContent: { flex: 1 },
  logAction: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  logTime: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs, marginTop: 2 },
  emptyText: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm, textAlign: 'center', padding: Spacing.xl },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  viewAllText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
});
