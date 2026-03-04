import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { useCommissionConfig } from '../../hooks/useCommissionConfig';
import { usersAPI, auditAPI, analyticsAPI } from '../../api/client';
import { RootStackParamList } from '../../types';
import { KPICard } from '../../components/charts';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AdminDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
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
    fetchData();
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
      console.error('Erreur admin dashboard:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const quickActions = [
    { icon: 'people-outline' as const, title: 'Utilisateurs', screen: 'UserManagement' as const },
    { icon: 'receipt-outline' as const, title: 'Abonnements', screen: 'SubscriptionManagement' as const },
    { icon: 'shield-outline' as const, title: 'Audit', screen: 'AuditLogs' as const },
    { icon: 'settings-outline' as const, title: 'Parametres', screen: 'PlatformSettings' as const },
    { icon: 'cash-outline' as const, title: 'Tresorerie', screen: 'TreasuryOverview' as const },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.gray50 }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Administration</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <KPICard title="Utilisateurs" value={stats.totalUsers} icon="people-outline" color="#7C3AED" />
          <KPICard title="Evenements" value={stats.totalEvents} icon="calendar-outline" color="#EC4899" />
        </View>
        <View style={styles.kpiRow}>
          <KPICard title="Revenus" value={`${stats.totalRevenue.toLocaleString()} ${platformCurrency}`} icon="cash-outline" color="#10B981" />
          <KPICard title="Verifications" value={stats.pendingVerifications} icon="shield-checkmark-outline" color="#F59E0B" />
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Actions rapides</Text>
        <View style={[styles.actionsCard, { backgroundColor: colors.card }]}>
          {quickActions.map((action, idx) => (
            <TouchableOpacity
              key={action.screen}
              style={[styles.actionItem, idx < quickActions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.gray100 }]}
              onPress={() => navigation.navigate(action.screen as any)}
              activeOpacity={0.6}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name={action.icon} size={20} color={colors.primary} />
              </View>
              <Text style={[styles.actionTitle, { color: colors.gray900 }]}>{action.title}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Activite recente</Text>
        <View style={[styles.actionsCard, { backgroundColor: colors.card }]}>
          {recentLogs.length > 0 ? recentLogs.map((log, idx) => (
            <View
              key={log.id || idx}
              style={[styles.logItem, idx < recentLogs.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.gray100 }]}
            >
              <View style={[styles.logDot, {
                backgroundColor: log.severity === 'critical' ? '#EF4444'
                  : log.severity === 'warning' ? '#F59E0B'
                  : '#10B981'
              }]} />
              <View style={styles.logContent}>
                <Text style={[styles.logAction, { color: colors.gray900 }]} numberOfLines={1}>
                  {log.action_display || log.action}
                </Text>
                <Text style={[styles.logTime, { color: colors.gray400 }]}>
                  {new Date(log.timestamp).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          )) : (
            <Text style={[styles.emptyText, { color: colors.gray400 }]}>Aucune activite recente</Text>
          )}
          {recentLogs.length > 0 && (
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate('AuditLogs')}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>Voir tout l'audit</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...TextStyles.h3 },
  scrollContent: { paddingHorizontal: Spacing.lg },
  kpiRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  sectionTitle: { ...TextStyles.h4, marginTop: Spacing.xl, marginBottom: Spacing.sm },
  actionsCard: { borderRadius: BorderRadius['2xl'], ...Shadows.card, overflow: 'hidden' },
  actionItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  actionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { flex: 1, fontFamily: FontFamily.medium, fontSize: FontSizes.base },
  logItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logContent: { flex: 1 },
  logAction: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  logTime: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: 2 },
  emptyText: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm, textAlign: 'center', padding: Spacing.xl },
  viewAllBtn: { alignItems: 'center', paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  viewAllText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
});
