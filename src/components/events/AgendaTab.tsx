import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Session, RootStackParamList } from '../../types';
import { FontFamily, FontSizes, BorderRadius, Spacing, TextStyles } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../ui/LoadingOverlay';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export interface AgendaTabProps {
  sessions: Session[];
  loadingSessions: boolean;
}

type SessionStatus = 'past' | 'live' | 'upcoming';

const TYPE_LABELS: Record<string, string> = {
  keynote: 'Keynote',
  talk: 'Talk',
  workshop: 'Atelier',
  panel: 'Panel',
  break: 'Pause',
  networking: 'Réseautage',
  meal: 'Repas',
  other: 'Session',
};

// ============================================================================
// Helpers
// ============================================================================

function fmtTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(start: Date, end: Date): string {
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m.toString().padStart(2, '0')}`;
}

function fmtDayLabel(d: Date): { dow: string; dom: string; mon: string } {
  return {
    dow: d.toLocaleDateString('fr-FR', { weekday: 'long' }).toUpperCase(),
    dom: d.getDate().toString().padStart(2, '0'),
    mon: d.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase().replace('.', ''),
  };
}

function getStatus(start: Date, end: Date | null, now: Date): SessionStatus {
  if (end && now > end) return 'past';
  if (now < start) return 'upcoming';
  if (end && now >= start && now <= end) return 'live';
  if (!end && now >= start) return 'live'; // ongoing without explicit end
  return 'upcoming';
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ============================================================================
// Component
// ============================================================================

export default function AgendaTab({ sessions, loadingSessions }: AgendaTabProps) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const now = useMemo(() => new Date(), []);

  // Group sessions by day, sorted by start time within each day
  const groupedByDay = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    const groups = new Map<string, { date: Date; sessions: Session[] }>();
    [...sessions]
      .filter(s => s.start_time)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .forEach(s => {
        const start = new Date(s.start_time);
        const key = dayKey(start);
        if (!groups.has(key)) {
          groups.set(key, { date: start, sessions: [] });
        }
        groups.get(key)!.sessions.push(s);
      });
    return Array.from(groups.values());
  }, [sessions]);

  // ─── States ──────────────────────────────────────────────────────────────
  if (loadingSessions) {
    return (
      <View style={styles.section}>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>Programme</Text>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Déroulé de la journée</Text>
        <View style={styles.emptyTab}>
          <LoadingSpinner />
          <Text style={[styles.emptyTabText, { color: colors.gray500 }]}>Chargement du programme…</Text>
        </View>
      </View>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>Programme</Text>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Déroulé de la journée</Text>
        <View style={styles.emptyTab}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name="calendar-outline" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Programme à venir</Text>
          <Text style={[styles.emptyTabText, { color: colors.gray500 }]}>
            L&apos;organisateur n&apos;a pas encore publié le déroulé.
          </Text>
        </View>
      </View>
    );
  }

  const totalSessions = sessions.length;
  const isMultiDay = groupedByDay.length > 1;
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  return (
    <View style={styles.section}>
      {/* === Header === */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>
            Programme · {totalSessions} session{totalSessions > 1 ? 's' : ''}
            {isMultiDay && ` · ${groupedByDay.length} jours`}
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Déroulé de la journée
          </Text>
        </View>
      </View>

      {/* === Timeline groups === */}
      {groupedByDay.map((day, dayIndex) => {
        const { dow, dom, mon } = fmtDayLabel(day.date);
        return (
          <View key={dayKey(day.date)} style={dayIndex > 0 ? { marginTop: Spacing.lg } : null}>
            {/* Day header (only shown if multi-day OR explicitly with date tile) */}
            {isMultiDay && (
              <View style={styles.dayHeader}>
                <View style={[styles.dayTile, { backgroundColor: colors.primaryBg }]}>
                  <Text style={[styles.dayTileDay, { color: colors.primary }]}>{dom}</Text>
                  <Text style={[styles.dayTileMonth, { color: colors.primary }]}>{mon}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <Text style={[styles.dayHeaderEyebrow, { color: colors.gray500 }]}>JOUR {dayIndex + 1}</Text>
                  <Text style={[styles.dayHeaderTitle, { color: colors.text }]}>
                    {dow.charAt(0) + dow.slice(1).toLowerCase()}
                  </Text>
                </View>
                <Text style={[styles.dayHeaderCount, { color: colors.gray500 }]}>
                  {day.sessions.length}
                </Text>
              </View>
            )}

            {/* Timeline */}
            <View style={styles.timeline}>
              {day.sessions.map((session, idx) => {
                const start = new Date(session.start_time);
                const end = session.end_time ? new Date(session.end_time) : null;
                const status = getStatus(start, end, now);
                const isLast = idx === day.sessions.length - 1;
                const speakers = session.speakers_detail || [];
                const typeLabel = session.session_type
                  ? TYPE_LABELS[session.session_type] || session.session_type
                  : null;

                const statusConfig = {
                  past: { dotColor: colors.gray300, ringColor: colors.gray200 },
                  live: { dotColor: colors.accent, ringColor: colors.accent + '33' },
                  upcoming: { dotColor: colors.primary, ringColor: colors.primary + '33' },
                }[status];

                return (
                  <View key={session.id || idx} style={styles.timelineRow}>
                    {/* Left rail: time + node */}
                    <View style={styles.rail}>
                      <Text
                        style={[
                          styles.timeText,
                          {
                            color: status === 'past' ? colors.gray400 : colors.text,
                            textDecorationLine: status === 'past' ? 'line-through' : 'none',
                          },
                        ]}
                      >
                        {fmtTime(start)}
                      </Text>
                      {end && (
                        <Text style={[styles.durationText, { color: colors.gray500 }]}>
                          {fmtDuration(start, end)}
                        </Text>
                      )}

                      {/* Node + connecting line */}
                      <View style={styles.nodeWrap}>
                        {status === 'live' && (
                          <View
                            style={[
                              styles.nodeRing,
                              { backgroundColor: statusConfig.ringColor },
                            ]}
                          />
                        )}
                        <View
                          style={[
                            styles.node,
                            {
                              backgroundColor: statusConfig.dotColor,
                              borderColor: status === 'live' ? colors.accent : colors.background,
                            },
                          ]}
                        />
                        {!isLast && (
                          <View
                            style={[
                              styles.connector,
                              {
                                borderLeftColor: status === 'past' ? colors.gray200 : colors.primary + '33',
                                // RN n'expose pas borderLeftStyle ; on utilise
                                // borderStyle qui s'applique aux 4 côtés (les
                                // autres sont à 0 dans le style de base).
                                borderStyle: 'dashed',
                              },
                            ]}
                          />
                        )}
                      </View>
                    </View>

                    {/* Right: card */}
                    <TouchableOpacity
                      style={[
                        styles.card,
                        {
                          backgroundColor: colors.card,
                          borderColor: status === 'live' ? colors.accent : hairline,
                          borderWidth: status === 'live' ? 1.5 : 1,
                        },
                      ]}
                      onPress={() =>
                        session.id && navigation.navigate('SessionDetails', { sessionId: String(session.id) })
                      }
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={`Session ${session.title} à ${fmtTime(start)}`}
                    >
                      {/* Top row: status + type */}
                      <View style={styles.cardTopRow}>
                        {status === 'live' && (
                          <View style={[styles.livePill, { backgroundColor: colors.accent }]}>
                            <View style={styles.livePulse} />
                            <Text style={styles.livePillText}>EN COURS</Text>
                          </View>
                        )}
                        {status === 'past' && (
                          <View style={[styles.statusPill, { backgroundColor: colors.gray100 }]}>
                            <Text style={[styles.statusPillText, { color: colors.gray500 }]}>TERMINÉ</Text>
                          </View>
                        )}
                        {typeLabel && (
                          <View
                            style={[
                              styles.typePill,
                              {
                                backgroundColor: status === 'past' ? colors.gray100 : colors.primaryBg,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.typePillText,
                                { color: status === 'past' ? colors.gray500 : colors.primary },
                              ]}
                            >
                              {typeLabel}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Title */}
                      <Text
                        style={[
                          styles.title,
                          {
                            color: status === 'past' ? colors.gray500 : colors.text,
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {session.title}
                      </Text>

                      {/* Speakers row */}
                      {speakers.length > 0 && (
                        <View style={styles.metaRow}>
                          <Ionicons name="person-outline" size={11} color={colors.gray500} />
                          <Text style={[styles.metaText, { color: colors.gray600 }]} numberOfLines={1}>
                            {speakers.map((s: any) => s.full_name).join(' · ')}
                          </Text>
                        </View>
                      )}

                      {/* Location row */}
                      {!!(session.location || session.room) && (
                        <View style={styles.metaRow}>
                          <Ionicons name="location-outline" size={11} color={colors.gray500} />
                          <Text style={[styles.metaText, { color: colors.gray600 }]} numberOfLines={1}>
                            {session.room
                              ? `${session.room}${session.location ? ` · ${session.location}` : ''}`
                              : session.location}
                          </Text>
                        </View>
                      )}

                      {/* Description */}
                      {session.description && (
                        <Text
                          style={[styles.description, { color: colors.gray500 }]}
                          numberOfLines={2}
                        >
                          {session.description}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const RAIL_WIDTH = 64;
const NODE_SIZE = 12;

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  eyebrow: {
    ...TextStyles.eyebrow,
    marginBottom: 4,
  },
  sectionTitle: {
    ...TextStyles.h3,
    letterSpacing: -0.4,
  },

  // === Empty / Loading ===
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.2,
  },
  emptyTabText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },

  // === Day header (multi-day only) ===
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dayTile: {
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  dayTileDay: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    lineHeight: 22,
    letterSpacing: -0.6,
  },
  dayTileMonth: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  dayHeaderEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  dayHeaderTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  dayHeaderCount: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.2,
    marginLeft: 'auto',
  },

  // === Timeline ===
  timeline: {
    paddingLeft: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 90,
  },
  rail: {
    width: RAIL_WIDTH,
    alignItems: 'flex-end',
    paddingRight: Spacing.sm,
  },
  timeText: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15,
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  durationText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    letterSpacing: 0.3,
    marginTop: 2,
    textTransform: 'uppercase',
  },

  // Node + connector
  nodeWrap: {
    position: 'absolute',
    right: -NODE_SIZE / 2,
    top: 4,
    bottom: 0,
    width: NODE_SIZE,
    alignItems: 'center',
  },
  nodeRing: {
    position: 'absolute',
    top: 0,
    width: NODE_SIZE + 8,
    height: NODE_SIZE + 8,
    borderRadius: (NODE_SIZE + 8) / 2,
    transform: [{ translateX: -4 }],
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    borderWidth: 2,
    zIndex: 2,
  },
  connector: {
    position: 'absolute',
    top: NODE_SIZE + 6,
    bottom: -10,
    left: NODE_SIZE / 2 - 0.5,
    borderLeftWidth: 1.5,
  },

  // === Card ===
  card: {
    flex: 1,
    marginLeft: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg + 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  livePulse: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#fff',
  },
  livePillText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: '#fff',
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typePillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.3,
    lineHeight: 20,
    marginBottom: 6,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaText: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: -0.1,
  },

  description: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
});
