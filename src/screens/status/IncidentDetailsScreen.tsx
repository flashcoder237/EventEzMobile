import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../contexts/ThemeContext';
import { statusAPI } from '../../api';
import { StaggeredItem } from '../../components/ui/Animations';
import { Alert as AlertIllustration, AnimatedIllustration } from '../../components/illustrations';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../constants/theme';
import type { Incident, IncidentSeverity, IncidentStatus, RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'IncidentDetails'>;

const STATUS_DOT_COLOR: Record<IncidentStatus, string> = {
  scheduled: '#38BDF8',
  investigating: '#F59E0B',
  identified: '#F97316',
  monitoring: '#6366F1',
  resolved: '#10B981',
};

const SEVERITY_GRADIENTS: Record<IncidentSeverity, readonly [string, string, string]> = {
  critical: ['#DC2626', '#B91C1C', '#7F1D1D'] as const,
  major: ['#EA580C', '#C2410C', '#7C2D12'] as const,
  minor: ['#D97706', '#B45309', '#78350F'] as const,
};

const RESOLVED_GRADIENT = ['#059669', '#047857', '#064E3B'] as const;

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

export default function IncidentDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { colors, isDark } = useTheme();
  const { incidentId } = route.params;
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncident();
  }, [incidentId]);

  const fetchIncident = async () => {
    setLoading(true);
    try {
      const res = await statusAPI.getIncident(incidentId);
      setIncident(res.data);
    } catch {
      setIncident(null);
    } finally {
      setLoading(false);
    }
  };

  const isResolved = incident?.status === 'resolved';
  const gradient = isResolved
    ? RESOLVED_GRADIENT
    : incident
      ? SEVERITY_GRADIENTS[incident.severity]
      : SEVERITY_GRADIENTS.major;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

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
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>Incident</Text>
          <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Détails</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : !incident ? (
          <View style={styles.centered}>
            <AnimatedIllustration entry="fadeIn" idle="breathe">
              <AlertIllustration color={colors.gray300} size={140} />
            </AnimatedIllustration>
            <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>Incident introuvable</Text>
            <Text style={[styles.emptySub, { color: colors.gray400 }]}>
              Cet incident n'existe plus ou n'est pas accessible publiquement.
            </Text>
          </View>
        ) : (
          <>
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
                    name={isResolved ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                    size={14}
                    color="#FFFFFF"
                  />
                  <Text style={styles.heroBadgeText}>
                    {isResolved ? 'Résolu' : incident.status_display}
                  </Text>
                </View>
                <Text style={styles.heroTitle}>{incident.title}</Text>
                <Text style={styles.heroSub}>{incident.public_message}</Text>
              </LinearGradient>
            </StaggeredItem>

            {/* Pills */}
            <StaggeredItem index={1}>
              <View style={styles.pillsRow}>
                <View
                  style={[
                    styles.pill,
                    { backgroundColor: STATUS_DOT_COLOR[incident.status] + '1a' },
                  ]}
                >
                  <View
                    style={[styles.pillDot, { backgroundColor: STATUS_DOT_COLOR[incident.status] }]}
                  />
                  <Text style={[styles.pillText, { color: STATUS_DOT_COLOR[incident.status] }]}>
                    {incident.status_display}
                  </Text>
                </View>
                <View style={[styles.pill, { backgroundColor: colors.gray100 }]}>
                  <Text style={[styles.pillText, { color: colors.gray700 }]}>
                    {incident.severity_display}
                  </Text>
                </View>
                {incident.is_blocking && (
                  <View style={[styles.pill, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="lock-closed" size={10} color="#DC2626" />
                    <Text style={[styles.pillText, { color: '#DC2626' }]}>Bloquant</Text>
                  </View>
                )}
                <View style={[styles.pill, { backgroundColor: colors.primaryBg }]}>
                  <Text style={[styles.pillText, { color: colors.primary }]}>
                    {incident.impact_display}
                  </Text>
                </View>
              </View>
            </StaggeredItem>

            {/* Affected services */}
            {(incident.affected_services_labels?.length ?? 0) > 0 && (
              <StaggeredItem index={2}>
                <View style={styles.section}>
                  <Text style={[styles.sectionEyebrow, { color: colors.gray400 }]}>
                    Services touchés
                  </Text>
                  <View style={styles.servicesRow}>
                    {incident.affected_services_labels!.map((svc) => (
                      <View
                        key={svc.key}
                        style={[
                          styles.serviceTag,
                          { backgroundColor: colors.card, borderColor: colors.gray100 },
                        ]}
                      >
                        <Text style={[styles.serviceTagText, { color: colors.gray700 }]}>
                          {svc.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </StaggeredItem>
            )}

            {/* Meta card */}
            <StaggeredItem index={3}>
              <View style={[styles.metaCard, { backgroundColor: colors.card }, Shadows.card]}>
                <MetaRow
                  icon="time-outline"
                  label="Démarré"
                  value={formatDateTime(incident.started_at)}
                  colors={colors}
                />
                {incident.resolved_at && (
                  <MetaRow
                    icon="checkmark-done-outline"
                    label="Résolu"
                    value={formatDateTime(incident.resolved_at)}
                    colors={colors}
                    accent="#10B981"
                  />
                )}
                {incident.scheduled_start && (
                  <MetaRow
                    icon="calendar-outline"
                    label="Début planifié"
                    value={formatDateTime(incident.scheduled_start)}
                    colors={colors}
                  />
                )}
                {incident.scheduled_end && (
                  <MetaRow
                    icon="calendar-outline"
                    label="Fin planifiée"
                    value={formatDateTime(incident.scheduled_end)}
                    colors={colors}
                  />
                )}
              </View>
            </StaggeredItem>

            {/* Timeline */}
            <View style={styles.timelineSection}>
              <StaggeredItem index={4}>
                <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Historique</Text>
              </StaggeredItem>
              {(incident.updates?.length ?? 0) === 0 ? (
                <StaggeredItem index={5}>
                  <View style={[styles.emptyTimelineCard, { backgroundColor: colors.card }, Shadows.card]}>
                    <Ionicons name="chatbubbles-outline" size={32} color={colors.gray300} />
                    <Text style={[styles.emptyTimelineText, { color: colors.gray400 }]}>
                      Aucune mise à jour publiée pour le moment.
                    </Text>
                  </View>
                </StaggeredItem>
              ) : (
                <View style={styles.timeline}>
                  {incident.updates!.map((upd, idx) => {
                    const color = STATUS_DOT_COLOR[upd.status];
                    const isLast = idx === incident.updates!.length - 1;
                    return (
                      <StaggeredItem key={upd.id} index={5 + idx}>
                        <View style={styles.timelineItem}>
                          <View style={styles.timelineLeft}>
                            <View
                              style={[
                                styles.timelineDot,
                                {
                                  backgroundColor: color,
                                  borderColor: colors.background,
                                },
                              ]}
                            />
                            {!isLast && (
                              <View
                                style={[styles.timelineLine, { backgroundColor: colors.gray100 }]}
                              />
                            )}
                          </View>
                          <View
                            style={[
                              styles.timelineContent,
                              { backgroundColor: colors.card },
                              Shadows.card,
                            ]}
                          >
                            <View style={styles.timelineHeader}>
                              <Text style={[styles.timelineStatus, { color }]}>
                                {upd.status_display}
                              </Text>
                              <Text style={[styles.timelineTime, { color: colors.gray400 }]}>
                                {formatDateTime(upd.created_at)}
                              </Text>
                            </View>
                            <Text style={[styles.timelineMsg, { color: colors.gray700 }]}>
                              {upd.message}
                            </Text>
                            {upd.created_by_name && (
                              <Text style={[styles.timelineAuthor, { color: colors.gray400 }]}>
                                — {upd.created_by_name}
                              </Text>
                            )}
                          </View>
                        </View>
                      </StaggeredItem>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetaRow({
  icon,
  label,
  value,
  colors,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
  accent?: string;
}) {
  return (
    <View style={styles.metaRow}>
      <View
        style={[
          styles.metaIcon,
          { backgroundColor: accent ? accent + '1a' : colors.gray50 },
        ]}
      >
        <Ionicons name={icon} size={14} color={accent || colors.gray500} />
      </View>
      <Text style={[styles.metaLabel, { color: colors.gray400 }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: colors.gray700 }]}>{value}</Text>
    </View>
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
  content: { padding: Spacing.lg, paddingBottom: Spacing['3xl'] },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['5xl'],
    gap: Spacing.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    marginTop: Spacing.sm,
  },
  emptySub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    maxWidth: 280,
  },

  // Hero
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
  heroSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 22,
  },

  // Pills
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
    letterSpacing: 0.2,
  },

  // Sections
  section: { marginBottom: Spacing.md },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  servicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  serviceTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  serviceTagText: { fontFamily: FontFamily.medium, fontSize: FontSizes.xs },

  // Meta card
  metaCard: {
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  metaIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
    minWidth: 100,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    flex: 1,
    textAlign: 'right',
  },

  // Timeline
  timelineSection: { marginTop: Spacing.sm },
  sectionTitle: {
    ...TextStyles.h4,
    marginBottom: Spacing.md,
  },
  emptyTimelineCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTimelineText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  timeline: { paddingLeft: 2 },
  timelineItem: { flexDirection: 'row', gap: Spacing.md },
  timelineLeft: { alignItems: 'center', width: 16 },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    marginTop: 8,
  },
  timelineLine: { width: 2, flex: 1, marginTop: 4 },
  timelineContent: {
    flex: 1,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    flexWrap: 'wrap',
    gap: 4,
  },
  timelineStatus: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timelineTime: { fontFamily: FontFamily.regular, fontSize: FontSizes.xs },
  timelineMsg: { fontFamily: FontFamily.regular, fontSize: FontSizes.sm, lineHeight: 20 },
  timelineAuthor: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginTop: 6,
    fontStyle: 'italic',
  },
});
