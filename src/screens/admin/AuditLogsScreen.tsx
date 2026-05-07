import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { auditAPI } from '../../api';
import { AuditLog, AuditSeverity, RootStackParamList } from '../../types';
import Badge from '../../components/ui/Badge';
import ExportButton from '../../components/common/ExportButton';
import RoleGuard from '../../components/auth/RoleGuard';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type SeverityFilter = 'all' | AuditSeverity;
type DateFilter = 'all' | '7d' | '30d' | '90d';

/**
 * Renvoie les query params backend pour une plage relative.
 * `start_date` et `end_date` sont au format ISO date (YYYY-MM-DD), backend
 * les compare via `timestamp__gte` / `timestamp__lte`.
 */
function buildDateRangeParams(range: DateFilter): Record<string, string> {
  if (range === 'all') return {};
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const now = new Date();
  const start = new Date(now.getTime() - days * 86400_000);
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: now.toISOString().slice(0, 10),
  };
}

const severityConfig: Record<string, { label: string; color: string; variant: 'default' | 'info' | 'warning' | 'destructive' }> = {
  info: { label: 'Info', color: '#3B82F6', variant: 'info' },
  warning: { label: 'Warning', color: '#F59E0B', variant: 'warning' },
  error: { label: 'Erreur', color: '#EF4444', variant: 'destructive' },
  critical: { label: 'Critique', color: '#DC2626', variant: 'destructive' },
};

export default function AuditLogsScreen() {
  return (
    <RoleGuard allow={['admin', 'moderator']} watermark="LOG" title="Audit & journaux">
      <AuditLogsContent />
    </RoleGuard>
  );
}

function AuditLogsContent() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateParams = buildDateRangeParams(dateFilter);
      const [logsRes, statsRes] = await Promise.all([
        auditAPI.getLogs({ page_size: 50, ordering: '-timestamp', ...dateParams }),
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
      <View
        style={[
          styles.logCard,
          { backgroundColor: colors.card, borderColor: hairline },
          Shadows.sm,
        ]}
      >
        <View style={styles.logHeader}>
          <View style={[styles.severityDot, { backgroundColor: sev.color }]} />
          <Text style={[styles.logAction, { color: colors.text }]} numberOfLines={1}>
            {item.action_display || item.action}
          </Text>
          <Badge label={sev.label} variant={sev.variant} size="sm" />
        </View>
        {item.target_display && (
          <Text style={[styles.logTarget, { color: colors.gray500 }]} numberOfLines={1}>
            Cible: {item.target_display}
          </Text>
        )}
        <View style={[styles.logFooter, { borderTopColor: hairline }]}>
          <View style={styles.logMeta}>
            <Ionicons name="person-outline" size={12} color={colors.gray400} />
            <Text style={[styles.logMetaText, { color: colors.gray500 }]}>
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

  const dateFilters: { key: DateFilter; label: string }[] = [
    { key: 'all', label: 'Tout' },
    { key: '7d', label: '7 jours' },
    { key: '30d', label: '30 jours' },
    { key: '90d', label: '90 jours' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>TRAÇABILITÉ</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Logs d'audit</Text>
        </View>
        <ExportButton
          endpoint="/audit/logs/export/"
          filename="audit_logs"
          params={buildDateRangeParams(dateFilter)}
          compact
        />
      </View>

      {/* Stats summary */}
      {stats && (
        <View
          style={[
            styles.statsCard,
            { backgroundColor: colors.card, borderColor: hairline },
            Shadows.sm,
          ]}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total_logs || logs.length}</Text>
            <Text style={[styles.statLabel, { color: colors.gray500 }]}>Total</Text>
          </View>
          {Object.entries(stats.by_severity || {}).slice(0, 3).map(([sev, count]) => (
            <React.Fragment key={sev}>
              <View style={[styles.statDivider, { backgroundColor: hairline }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: severityConfig[sev]?.color || colors.text }]}>{String(count)}</Text>
                <Text style={[styles.statLabel, { color: colors.gray500 }]}>{severityConfig[sev]?.label || sev}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}

      {/* Date Range Filters — pilote la requête backend (start_date / end_date) */}
      <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.lg }}>
          {dateFilters.map((f) => {
            const active = dateFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterPill,
                  active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.card, borderColor: hairline },
                ]}
                onPress={() => setDateFilter(f.key)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Période : ${f.label}`}
              >
                <Text style={[styles.filterText, { color: active ? '#FFFFFF' : colors.gray600 }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Severity Filters — filtre côté client sur les logs déjà chargés */}
      <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, paddingHorizontal: Spacing.lg }}>
          {filters.map((f) => {
            const active = severityFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterPill,
                  active
                    ? { backgroundColor: colors.text, borderColor: colors.text }
                    : { backgroundColor: colors.card, borderColor: hairline },
                ]}
                onPress={() => setSeverityFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterText, { color: active ? colors.background : colors.gray600 }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
            <Text style={[styles.emptyText, { color: colors.gray500 }]}>Aucun log d'audit</Text>
          </View>
        }
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
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingVertical: Spacing.md,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.4,
  },
  statLabel: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs, marginTop: 2 },
  statDivider: { width: 1 },
  filtersRow: {
    paddingVertical: Spacing.md,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterText: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, flexGrow: 1 },
  logCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  logAction: { flex: 1, fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm },
  logTarget: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs, marginTop: Spacing.xs, marginLeft: 20 },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  logMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  logMetaText: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs },
  logTime: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'], gap: Spacing.md },
  emptyText: { fontFamily: FontFamily.medium, fontSize: FontSizes.base },
});
