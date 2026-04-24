import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../contexts/ThemeContext';
import { useStatus } from '../../contexts/StatusContext';
import { StaggeredItem } from '../../components/ui/Animations';
import { WellDone, AnimatedIllustration } from '../../components/illustrations';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../constants/theme';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import type {
  Incident,
  RootStackParamList,
  ServiceHealthStatus,
  ServiceStatus,
} from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const STATUS_META: Record<
  ServiceHealthStatus,
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap; text: string }
> = {
  operational: {
    label: 'Opérationnel',
    color: '#10B981',
    icon: 'checkmark-circle',
    text: 'Tous les services fonctionnent normalement.',
  },
  maintenance: {
    label: 'Maintenance',
    color: '#6366F1',
    icon: 'construct',
    text: 'Maintenance planifiée en cours.',
  },
  degraded: {
    label: 'Performance dégradée',
    color: '#F59E0B',
    icon: 'alert-circle',
    text: "Certains services sont plus lents que d'habitude.",
  },
  partial: {
    label: 'Panne partielle',
    color: '#F97316',
    icon: 'warning',
    text: 'Un service rencontre des difficultés.',
  },
  major: {
    label: 'Panne majeure',
    color: '#EF4444',
    icon: 'close-circle',
    text: 'Un incident majeur est en cours.',
  },
};

const HERO_GRADIENTS: Record<ServiceHealthStatus, readonly [string, string, string]> = {
  operational: ['#059669', '#047857', '#064E3B'] as const,
  maintenance: ['#4F46E5', '#4338CA', '#312E81'] as const,
  degraded: ['#D97706', '#B45309', '#78350F'] as const,
  partial: ['#EA580C', '#C2410C', '#7C2D12'] as const,
  major: ['#DC2626', '#B91C1C', '#7F1D1D'] as const,
};

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Plateforme & authentification',
  events: 'Événements',
  payments: 'Paiements',
  messaging: 'Messagerie',
  notifications: 'Notifications',
  ai: 'Intelligence artificielle',
  analytics: 'Analytics',
  admin: 'Administration',
  transactional: 'Inscriptions',
  realtime: 'Temps réel',
  async: 'Notifications & tâches',
  geo: 'Géolocalisation',
  backoffice: 'Backoffice',
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function StatusScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useTheme();
  const { snapshot, isLoading, refresh, lastFetchedAt } = useStatus();

  const grouped = useMemo(() => {
    if (!snapshot) return [] as { category: string; services: ServiceStatus[] }[];
    const map = new Map<string, ServiceStatus[]>();
    for (const svc of snapshot.services) {
      if (!map.has(svc.category)) map.set(svc.category, []);
      map.get(svc.category)!.push(svc);
    }
    return Array.from(map.entries()).map(([category, services]) => ({ category, services }));
  }, [snapshot]);

  const overall = snapshot?.overall_status || 'operational';
  const overallMeta = STATUS_META[overall];
  const heroGradient = HERO_GRADIENTS[overall];

  const activeCount = snapshot?.active_incidents.length || 0;
  const servicesCount = snapshot?.services.length || 0;
  const resolvedCount = snapshot?.recent_resolved.length || 0;

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>STAT</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>

      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.circleBtn, { backgroundColor: colors.gray50 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <Ionicons name="arrow-back" size={22} color={colors.gray700} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>État du système</Text>
          <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Status</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.circleBtn,
            { backgroundColor: colors.gray50, opacity: isLoading ? 0.5 : 1 },
          ]}
          onPress={refresh}
          activeOpacity={0.7}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Rafraîchir"
          accessibilityState={{ busy: isLoading }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.gray700} />
          ) : (
            <Ionicons name="refresh" size={20} color={colors.gray700} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <StaggeredItem index={0}>
          <LinearGradient
            colors={heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroEyebrow}>Statut de la plateforme</Text>
            <Text style={styles.heroTitle}>EventEz · Status</Text>
            <View style={styles.heroStatusPill}>
              <Ionicons name={overallMeta.icon} size={16} color="#FFFFFF" />
              <View style={{ flex: 1 }}>
                <Text style={styles.heroStatusLabel}>{overallMeta.label}</Text>
                <Text style={styles.heroStatusSub}>{overallMeta.text}</Text>
              </View>
            </View>
          </LinearGradient>
        </StaggeredItem>

        {/* KPI Row */}
        {snapshot && (
          <StaggeredItem index={1}>
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { backgroundColor: colors.card }, Shadows.card]}>
                <Text style={[styles.kpiValue, { color: colors.gray900 }]}>{servicesCount}</Text>
                <Text style={[styles.kpiLabel, { color: colors.gray500 }]}>Services</Text>
              </View>
              <View style={[styles.kpiCard, { backgroundColor: colors.card }, Shadows.card]}>
                <Text style={[styles.kpiValue, { color: activeCount > 0 ? '#EF4444' : colors.gray900 }]}>
                  {activeCount}
                </Text>
                <Text style={[styles.kpiLabel, { color: colors.gray500 }]}>Actifs</Text>
              </View>
              <View style={[styles.kpiCard, { backgroundColor: colors.card }, Shadows.card]}>
                <Text style={[styles.kpiValue, { color: '#10B981' }]}>{resolvedCount}</Text>
                <Text style={[styles.kpiLabel, { color: colors.gray500 }]}>Résolus</Text>
              </View>
            </View>
          </StaggeredItem>
        )}

        {/* Active incidents */}
        {snapshot && snapshot.active_incidents.length > 0 && (
          <View style={styles.section}>
            <StaggeredItem index={2}>
              <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>
                Incidents en cours
              </Text>
            </StaggeredItem>
            {snapshot.active_incidents.map((incident, idx) => (
              <StaggeredItem key={incident.id} index={3 + idx}>
                <IncidentCard
                  incident={incident}
                  onPress={() => navigation.navigate('IncidentDetails', { incidentId: incident.id })}
                  colors={colors}
                />
              </StaggeredItem>
            ))}
          </View>
        )}

        {/* Services grouped by category */}
        <View style={styles.section}>
          <StaggeredItem index={10}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Services</Text>
          </StaggeredItem>
          {grouped.map((group, idx) => (
            <StaggeredItem key={group.category} index={11 + idx}>
              <View style={[styles.categoryCard, { backgroundColor: colors.card }, Shadows.card]}>
                <View style={[styles.categoryHeader, { backgroundColor: colors.gray50 }]}>
                  <Text style={[styles.categoryLabel, { color: colors.gray500 }]}>
                    {CATEGORY_LABELS[group.category] || group.category}
                  </Text>
                </View>
                {group.services.map((svc, i) => {
                  const meta = STATUS_META[svc.current_status];
                  return (
                    <View
                      key={svc.key}
                      style={[
                        styles.serviceRow,
                        i > 0 && { borderTopWidth: 1, borderTopColor: colors.gray100 },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.serviceLabel, { color: colors.gray900 }]} numberOfLines={1}>
                          {svc.label}
                        </Text>
                        <Text style={[styles.serviceDesc, { color: colors.gray400 }]} numberOfLines={1}>
                          {svc.description}
                        </Text>
                      </View>
                      <View style={styles.serviceStatusWrap}>
                        <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                        <Text style={[styles.serviceStatus, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </StaggeredItem>
          ))}
        </View>

        {/* All good banner */}
        {snapshot && snapshot.active_incidents.length === 0 && overall === 'operational' && (
          <StaggeredItem index={20}>
            <View style={[styles.goodBanner, { backgroundColor: colors.card }, Shadows.card]}>
              <AnimatedIllustration entry="scaleIn" idle="sway">
                <WellDone color="#10B981" size={120} />
              </AnimatedIllustration>
              <Text style={[styles.goodTitle, { color: colors.gray900 }]}>Tout roule</Text>
              <Text style={[styles.goodSub, { color: colors.gray500 }]}>
                Aucun incident en cours. Si vous rencontrez un problème, n'hésitez pas à contacter le support.
              </Text>
            </View>
          </StaggeredItem>
        )}

        {/* Recent resolved */}
        {snapshot && snapshot.recent_resolved.length > 0 && (
          <View style={styles.section}>
            <StaggeredItem index={21}>
              <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Historique récent</Text>
            </StaggeredItem>
            {snapshot.recent_resolved.map((incident, idx) => (
              <StaggeredItem key={incident.id} index={22 + idx}>
                <IncidentCard
                  incident={incident}
                  onPress={() => navigation.navigate('IncidentDetails', { incidentId: incident.id })}
                  colors={colors}
                  muted
                />
              </StaggeredItem>
            ))}
          </View>
        )}

        {lastFetchedAt && (
          <Text style={[styles.footer, { color: colors.gray400 }]}>
            Dernier rafraîchissement · {new Date(lastFetchedAt).toLocaleTimeString('fr-FR')}
          </Text>
        )}
      </ScrollView>
      </View>
    </EditorialCanvas>
  );
}

function IncidentCard({
  incident,
  onPress,
  colors,
  muted = false,
}: {
  incident: Incident;
  onPress: () => void;
  colors: any;
  muted?: boolean;
}) {
  const severityColor =
    incident.severity === 'critical'
      ? '#EF4444'
      : incident.severity === 'major'
        ? '#F97316'
        : '#F59E0B';
  return (
    <TouchableOpacity
      style={[
        styles.incidentCard,
        { backgroundColor: colors.card, opacity: muted ? 0.9 : 1 },
        Shadows.card,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Severity accent strip */}
      <View style={[styles.severityStrip, { backgroundColor: severityColor }]} />

      <View style={styles.incidentBody}>
        <View style={styles.incidentHeader}>
          <View style={[styles.badge, { backgroundColor: severityColor + '1a' }]}>
            <Text style={[styles.badgeText, { color: severityColor }]}>
              {incident.severity_display}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.gray100 }]}>
            <Text style={[styles.badgeText, { color: colors.gray700 }]}>
              {incident.status_display}
            </Text>
          </View>
          {incident.is_blocking && (
            <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.badgeText, { color: '#DC2626' }]}>Bloquant</Text>
            </View>
          )}
        </View>
        <Text style={[styles.incidentTitle, { color: colors.gray900 }]} numberOfLines={2}>
          {incident.title}
        </Text>
        <Text style={[styles.incidentMsg, { color: colors.gray500 }]} numberOfLines={2}>
          {incident.public_message}
        </Text>
        <View style={[styles.incidentFooter, { borderTopColor: colors.gray100 }]}>
          <Ionicons name="time-outline" size={12} color={colors.gray400} />
          <Text style={[styles.incidentMeta, { color: colors.gray400 }]}>
            {incident.resolved_at
              ? `Résolu ${formatDateTime(incident.resolved_at)}`
              : `Démarré ${formatDateTime(incident.started_at)}`}
          </Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={14} color={colors.gray400} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: { alignItems: 'center' },
  headerEyebrow: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: { ...TextStyles.h3, letterSpacing: -0.3 },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },

  // Hero
  hero: {
    borderRadius: BorderRadius['4xl'],
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  heroTitle: {
    ...TextStyles.h1,
    color: '#FFFFFF',
    marginBottom: Spacing.md,
  },
  heroStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroStatusLabel: {
    color: '#FFFFFF',
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.base,
  },
  heroStatusSub: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },

  // KPIs
  kpiRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  kpiCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
  },
  kpiValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['2xl'],
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },

  // Sections
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    ...TextStyles.h4,
    marginBottom: Spacing.sm,
  },

  // Category card
  categoryCard: {
    borderRadius: BorderRadius['2xl'],
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  categoryHeader: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  categoryLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  serviceLabel: { fontFamily: FontFamily.medium, fontSize: FontSizes.sm },
  serviceDesc: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs, marginTop: 2 },
  serviceStatusWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  serviceStatus: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.xs },

  // Incident card
  incidentCard: {
    borderRadius: BorderRadius['2xl'],
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  severityStrip: { width: 4 },
  incidentBody: { flex: 1, padding: Spacing.md },
  incidentHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeText: { fontFamily: FontFamily.semiBold, fontSize: 10, letterSpacing: 0.3 },
  incidentTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.base,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  incidentMsg: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  incidentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  incidentMeta: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs },

  // All good
  goodBanner: {
    padding: Spacing.xl,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  goodTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  goodSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },

  footer: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
