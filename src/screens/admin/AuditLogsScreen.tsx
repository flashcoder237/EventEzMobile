import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { auditAPI } from '../../api';
import { AuditLog, AuditSeverity, RootStackParamList } from '../../types';
import Badge from '../../components/ui/Badge';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type SeverityFilter = 'all' | AuditSeverity;

const severityConfig: Record<string, { label: string; color: string; variant: 'default' | 'info' | 'warning' | 'destructive' }> = {
  info: { label: 'Info', color: '#3B82F6', variant: 'info' },
  warning: { label: 'Warning', color: '#F59E0B', variant: 'warning' },
  error: { label: 'Erreur', color: '#EF4444', variant: 'destructive' },
  critical: { label: 'Critique', color: '#DC2626', variant: 'destructive' },
};

export default function AuditLogsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [logsRes, statsRes] = await Promise.all([
        auditAPI.getLogs({ page_size: 50, ordering: '-timestamp' }),
        auditAPI.getStatistics().catch(() => ({ data: null })),
      ]);

      const data = logsRes.data?.results || logsRes.data || [];
      setLogs(Array.isArray(data) ? data : []);
      setStats(statsRes.data);
    } catch (error) {
      if (__DEV__) console.error('Erreur audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const filteredLogs = severityFilter === 'all'
    ? logs
    : logs.filter(l => l.severity === severityFilter);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderLog = ({ item }: { item: AuditLog }) => {
    const sev = severityConfig[item.severity || 'info'] || severityConfig.info;

    return (
      <View style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.gray100 }]}>
        <View style={styles.logHeader}>
          <View style={[styles.severityDot, { backgroundColor: sev.color }]} />
          <Text style={[styles.logAction, { color: colors.gray900 }]} numberOfLines={1}>
            {item.action_display || item.action}
          </Text>
          <Badge label={sev.label} variant={sev.variant} size="sm" />
        </View>
        {item.target_display && (
          <Text style={[styles.logTarget, { color: colors.gray500 }]} numberOfLines={1}>
            Cible: {item.target_display}
          </Text>
        )}
        <View style={[styles.logFooter, { borderTopColor: colors.gray100 }]}>
          <View style={styles.logMeta}>
            <Ionicons name="person-outline" size={12} color={colors.gray400} />
            <Text style={[styles.logMetaText, { color: colors.gray400 }]}>
              {item.user_display?.email || item.user_display?.name || `User #${item.user}`}
            </Text>
          </View>
          <Text style={[styles.logTime, { color: colors.gray400 }]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const filters: { key: SeverityFilter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'info', label: 'Info' },
    { key: 'warning', label: 'Warning' },
    { key: 'error', label: 'Erreur' },
    { key: 'critical', label: 'Critique' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.gray50 }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.gray700} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Logs d'audit</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Stats summary */}
      {stats && (
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderBottomColor: colors.gray100 }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.gray900 }]}>{stats.total_logs || logs.length}</Text>
            <Text style={[styles.statLabel, { color: colors.gray400 }]}>Total</Text>
          </View>
          {Object.entries(stats.by_severity || {}).map(([sev, count]) => (
            <View key={sev} style={styles.statItem}>
              <Text style={[styles.statValue, { color: severityConfig[sev]?.color || colors.gray900 }]}>{String(count)}</Text>
              <Text style={[styles.statLabel, { color: colors.gray400 }]}>{severityConfig[sev]?.label || sev}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Severity Filters */}
      <View style={[styles.filtersRow, { borderBottomColor: colors.gray100 }]}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, { backgroundColor: colors.gray100 }, severityFilter === f.key && { backgroundColor: colors.primary }]}
            onPress={() => setSeverityFilter(f.key)}
          >
            <Text style={[styles.filterText, { color: colors.gray600 }, severityFilter === f.key && { color: '#FFFFFF' }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredLogs}
        renderItem={renderLog}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="shield-outline" size={48} color={colors.gray300} />
            <Text style={[styles.emptyText, { color: colors.gray400 }]}>Aucun log d'audit</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...TextStyles.h3 },
  statsRow: { flexDirection: 'row', paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderBottomWidth: 1, gap: Spacing.lg },
  statItem: { alignItems: 'center' },
  statValue: { fontFamily: FontFamily.displayBold, fontSize: FontSizes.lg },
  statLabel: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: 2 },
  filtersRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.xs, borderBottomWidth: 1 },
  filterBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  filterText: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs },
  listContent: { padding: Spacing.lg, flexGrow: 1 },
  logCard: { borderRadius: BorderRadius.xl, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.sm },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  logAction: { flex: 1, fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  logTarget: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: Spacing.xs, marginLeft: 20 },
  logFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1 },
  logMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logMetaText: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs },
  logTime: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.md },
  emptyText: { fontFamily: FontFamily.regular, fontSize: FontSizes.base },
});
