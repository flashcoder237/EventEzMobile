import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useStatus } from '../../contexts/StatusContext';
import { Alert as AlertIllustration, AnimatedIllustration } from '../../components/illustrations';
import { StaggeredItem } from '../../components/ui/Animations';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../constants/theme';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { centeredContent, WIDE_MAX } from '../../constants/layout';
import { IncidentSeverity, IncidentStatus, RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SEVERITY_GRADIENTS: Record<IncidentSeverity, readonly [string, string, string]> = {
  critical: ['#DC2626', '#B91C1C', '#7F1D1D'] as const,
  major: ['#EA580C', '#C2410C', '#7C2D12'] as const,
  minor: ['#D97706', '#B45309', '#78350F'] as const,
};

const SEVERITY_KEY: Record<IncidentSeverity, string> = {
  critical: 'maintenance.severityCritical',
  major: 'maintenance.severityMajor',
  minor: 'maintenance.severityMinor',
};

const STATUS_KEY: Record<IncidentStatus, string> = {
  scheduled: 'maintenance.statusScheduled',
  investigating: 'maintenance.statusInvestigating',
  identified: 'maintenance.statusIdentified',
  monitoring: 'maintenance.statusMonitoring',
  resolved: 'maintenance.statusResolved',
};

const STATUS_COLORS: Record<IncidentStatus, { bg: string; text: string }> = {
  scheduled: { bg: '#E0F2FE', text: '#0369A1' },
  investigating: { bg: '#FEF3C7', text: '#B45309' },
  identified: { bg: '#FFEDD5', text: '#C2410C' },
  monitoring: { bg: '#E0E7FF', text: '#4338CA' },
  resolved: { bg: '#D1FAE5', text: '#047857' },
};

function formatDateTime(iso: string | null, locale: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function MaintenanceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const { blockingIncident, lastServiceIncident, refresh, isLoading } = useStatus();
  const locale = i18n.language === 'en' ? 'en-US' : 'fr-FR';

  const incident = blockingIncident || lastServiceIncident;
  const severity = (incident?.severity || 'major') as IncidentSeverity;
  const status = (incident?.status || 'investigating') as IncidentStatus;
  const isScheduled = status === 'scheduled';
  const gradient = SEVERITY_GRADIENTS[severity] || SEVERITY_GRADIENTS.major;
  const statusColor = STATUS_COLORS[status];

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>MNT</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <StaggeredItem index={0}>
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroBadge}>
              <Ionicons
                name={isScheduled ? 'construct-outline' : 'alert-circle-outline'}
                size={14}
                color="#FFFFFF"
              />
              <Text style={styles.heroBadgeText}>
                {isScheduled ? t('maintenance.heroBadgeScheduled') : t('maintenance.heroBadgeIncident')}
              </Text>
            </View>

            <Text style={styles.heroTitle}>
              {incident?.title || t('maintenance.heroTitleFallback')}
            </Text>

            <Text style={styles.heroSubtitle}>
              {incident?.public_message ||
                t('maintenance.heroSubtitleFallback')}
            </Text>
          </LinearGradient>
        </StaggeredItem>

        {/* Meta pills */}
        {incident && (
          <StaggeredItem index={1}>
            <View style={styles.pillsRow}>
              <View style={[styles.pill, { backgroundColor: statusColor.bg }]}>
                <Text style={[styles.pillText, { color: statusColor.text }]}>
                  {t(STATUS_KEY[status])}
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: colors.errorBg }]}>
                <Text style={[styles.pillText, { color: colors.error }]}>
                  {t(SEVERITY_KEY[severity])}
                </Text>
              </View>
              {incident.is_blocking && (
                <View style={[styles.pill, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="lock-closed" size={11} color="#DC2626" />
                  <Text style={[styles.pillText, { color: '#DC2626' }]}>{t('maintenance.blocking')}</Text>
                </View>
              )}
            </View>
          </StaggeredItem>
        )}

        {/* Latest update card */}
        {incident?.latest_update && (
          <StaggeredItem index={2}>
            <View style={[styles.updateCard, { backgroundColor: colors.card }, Shadows.card]}>
              <View style={styles.updateHeader}>
                <View style={[styles.updateIcon, { backgroundColor: colors.primaryBg }]}>
                  <Ionicons name="time-outline" size={14} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.updateEyebrow, { color: colors.gray400 }]}>
                    {t('maintenance.lastUpdate')}
                  </Text>
                  <Text style={[styles.updateTime, { color: colors.gray700 }]}>
                    {formatDateTime(incident.latest_update.created_at, locale)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.updateMessage, { color: colors.gray700 }]}>
                {incident.latest_update.message}
              </Text>
            </View>
          </StaggeredItem>
        )}

        {/* Started at */}
        {incident?.started_at && (
          <StaggeredItem index={3}>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={13} color={colors.gray400} />
              <Text style={[styles.metaText, { color: colors.gray400 }]}>
                {t('maintenance.startedAt', { date: formatDateTime(incident.started_at, locale) })}
              </Text>
            </View>
          </StaggeredItem>
        )}

        {/* Actions */}
        <StaggeredItem index={4}>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }, Shadows.coloredPrimary]}
              onPress={refresh}
              activeOpacity={0.85}
              disabled={isLoading}
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>{t('maintenance.refresh')}</Text>
            </TouchableOpacity>

            {/* Voir le détail de CET incident (avec timeline des updates) —
                CTA principal après "Rafraîchir" car c'est ce que l'utilisateur
                veut le plus souvent : suivre l'évolution. */}
            {incident?.id && (
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.gray200, backgroundColor: colors.card }]}
                onPress={() => navigation.navigate('IncidentDetails', { incidentId: incident.id })}
                activeOpacity={0.7}
              >
                <Ionicons name="trending-up-outline" size={18} color={colors.gray700} />
                <Text style={[styles.secondaryBtnText, { color: colors.gray700 }]}>
                  {t('maintenance.viewEvolution')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.gray200, backgroundColor: colors.card }]}
              onPress={() => navigation.navigate('SystemStatus')}
              activeOpacity={0.7}
            >
              <Ionicons name="pulse-outline" size={18} color={colors.gray700} />
              <Text style={[styles.secondaryBtnText, { color: colors.gray700 }]}>
                {t('maintenance.globalStatus')}
              </Text>
            </TouchableOpacity>
          </View>
        </StaggeredItem>

        {/* Illustration + footer */}
        <StaggeredItem index={5}>
          <View style={styles.illoWrap}>
            <AnimatedIllustration entry="fadeIn" idle="breathe">
              <AlertIllustration color={colors.primary} size={160} />
            </AnimatedIllustration>
          </View>

          <Text style={[styles.footer, { color: colors.gray400 }]}>
            {t('maintenance.footer')}
          </Text>
        </StaggeredItem>
      </ScrollView>
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['3xl'],
    ...centeredContent(WIDE_MAX),
  },
  hero: {
    borderRadius: BorderRadius['4xl'],
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: Spacing.md,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    ...TextStyles.h2,
    color: '#FFFFFF',
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 22,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  pillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
    letterSpacing: 0.2,
  },
  updateCard: {
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  updateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  updateIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  updateTime: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    marginTop: 1,
  },
  updateMessage: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  metaText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
  },
  actions: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  primaryBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
  },
  secondaryBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
  },
  illoWrap: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  footer: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    textAlign: 'center',
    maxWidth: 300,
    alignSelf: 'center',
    lineHeight: 18,
  },
});
