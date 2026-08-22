/**
 * AuditLogDetailScreen — détail complet d'un log d'audit (admin/modérateur).
 *
 * Affiche ce que la liste masquait : IP, user-agent, et surtout le diff
 * avant/après (`details.changes`). Le backend expose déjà ces champs
 * (AuditLogSerializer) et l'endpoint GET /audit/logs/{id}/ (auditAPI.getLog).
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { auditAPI } from '../../api';
import { RootStackParamList } from '../../types';
import RoleGuard from '../../components/auth/RoleGuard';
import Badge from '../../components/ui/Badge';
import ErrorState from '../../components/ui/ErrorState';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { FontFamily, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import { getApiErrorMessage } from '../../lib/utils/errorHandling';
import { targetLabel } from './AuditLogsScreen';

type DetailRoute = RouteProp<RootStackParamList, 'AuditLogDetail'>;

interface AuditLog {
  id: number;
  timestamp: string;
  user: number | null;
  user_display: { id: number; username?: string; email?: string; full_name?: string } | null;
  action: string;
  action_display: string;
  target_display: unknown;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  severity: string;
  severity_display: string;
}

const SEVERITY_COLOR: Record<string, string> = {
  info: '#3B82F6', warning: '#F59E0B', error: '#EF4444', critical: '#DC2626',
};
const SEVERITY_VARIANT: Record<string, 'info' | 'warning' | 'destructive'> = {
  info: 'info', warning: 'warning', error: 'destructive', critical: 'destructive',
};

export default function AuditLogDetailScreen() {
  const { t } = useTranslation();
  return (
    <RoleGuard allow={['admin', 'moderator']} watermark="LOG" title={t('admin.audit.detail.guardTitle')}>
      <AuditLogDetailContent />
    </RoleGuard>
  );
}

function AuditLogDetailContent() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<DetailRoute>();
  const { logId } = route.params;
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [log, setLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLog = useCallback(async () => {
    setError(null);
    try {
      const res = await auditAPI.getLog(String(logId));
      setLog(res.data);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, { fallbackKey: 'admin.audit.detail.loadError' }).message);
    } finally {
      setLoading(false);
    }
  }, [logId, t]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  const Row = ({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string | null }) => {
    if (!value) return null;
    return (
      <View style={[styles.row, { borderBottomColor: hairline }]}>
        <View style={styles.rowLabel}>
          <Ionicons name={icon} size={15} color={colors.gray400} />
          <Text style={[styles.rowLabelText, { color: colors.gray500 }]}>{label}</Text>
        </View>
        <Text style={[styles.rowValue, { color: colors.gray900 }]} selectable>{value}</Text>
      </View>
    );
  };

  // Le diff avant/après est sous details.changes = { field: {old, new} } ou
  // details brut selon l'action. On rend de façon défensive.
  const renderChanges = () => {
    const changes = log?.details?.changes;
    if (!changes || typeof changes !== 'object') return null;
    const entries = Object.entries(changes);
    if (!entries.length) return null;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
        <Text style={[styles.cardTitle, { color: colors.gray900 }]}>{t('admin.audit.detail.changes')}</Text>
        {entries.map(([field, val]) => {
          const v = val as any;
          const before = v && typeof v === 'object' && 'old' in v ? v.old : undefined;
          const after = v && typeof v === 'object' && 'new' in v ? v.new : undefined;
          const asText = (x: any) => (x === null || x === undefined ? '—' : typeof x === 'object' ? JSON.stringify(x) : String(x));
          return (
            <View key={field} style={styles.change}>
              <Text style={[styles.changeField, { color: colors.gray700 }]}>{field}</Text>
              {before !== undefined || after !== undefined ? (
                <View style={styles.diffRow}>
                  <Text style={[styles.diffOld, { color: colors.error }]} selectable>{asText(before)}</Text>
                  <Ionicons name="arrow-forward" size={13} color={colors.gray400} />
                  <Text style={[styles.diffNew, { color: '#16A34A' }]} selectable>{asText(after)}</Text>
                </View>
              ) : (
                <Text style={[styles.rowValue, { color: colors.gray900 }]} selectable>{asText(v)}</Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // Détails restants (hors `changes`), rendus en JSON lisible.
  const renderRawDetails = () => {
    if (!log?.details) return null;
    const { changes, ...rest } = log.details;
    if (!rest || Object.keys(rest).length === 0) return null;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
        <Text style={[styles.cardTitle, { color: colors.gray900 }]}>{t('admin.audit.detail.metadata')}</Text>
        <Text style={[styles.rawJson, { color: colors.gray600 }]} selectable>
          {JSON.stringify(rest, null, 2)}
        </Text>
      </View>
    );
  };

  const formatFull = (iso?: string) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>LOG</WatermarkNumeral>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('admin.audit.detail.eyebrow')}</Text>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {log?.action_display || t('admin.audit.detail.title')}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchLog} />
        ) : log ? (
          <ScrollView contentContainerStyle={[centeredContent(CARD_MAX), { padding: Spacing.lg, paddingBottom: Spacing['3xl'] }]}>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
              <View style={styles.badgeRow}>
                <View style={[styles.severityDot, { backgroundColor: SEVERITY_COLOR[log.severity] || SEVERITY_COLOR.info }]} />
                <Badge label={log.severity_display || log.severity} variant={SEVERITY_VARIANT[log.severity] || 'info'} size="sm" />
              </View>
              <Row icon="flash-outline" label={t('admin.audit.detail.action')} value={log.action_display || log.action} />
              <Row icon="cube-outline" label={t('admin.audit.detail.target')} value={targetLabel(log.target_display)} />
              <Row icon="person-outline" label={t('admin.audit.detail.user')} value={log.user_display?.full_name || log.user_display?.email || (log.user ? `#${log.user}` : t('admin.audit.detail.system'))} />
              <Row icon="time-outline" label={t('admin.audit.detail.timestamp')} value={formatFull(log.timestamp)} />
              <Row icon="globe-outline" label={t('admin.audit.detail.ip')} value={log.ip_address} />
              <Row icon="phone-portrait-outline" label={t('admin.audit.detail.userAgent')} value={log.user_agent} />
            </View>

            {renderChanges()}
            {renderRawDetails()}
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  iconDisc: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  eyebrow: { fontFamily: FontFamily.semiBold, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { fontFamily: FontFamily.displayBold, fontSize: 22, marginTop: 2 },
  card: { borderRadius: BorderRadius.xl, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.md },
  cardTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base, marginBottom: Spacing.sm },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  severityDot: { width: 10, height: 10, borderRadius: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.md },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  rowLabelText: { fontFamily: FontFamily.medium, fontSize: 13 },
  rowValue: { fontFamily: FontFamily.regular, fontSize: 13, flex: 1, textAlign: 'right' },
  change: { paddingVertical: Spacing.sm, gap: 4 },
  changeField: { fontFamily: FontFamily.semiBold, fontSize: 13 },
  diffRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  diffOld: { fontFamily: FontFamily.regular, fontSize: 13, textDecorationLine: 'line-through' },
  diffNew: { fontFamily: FontFamily.semiBold, fontSize: 13 },
  rawJson: { fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
});
