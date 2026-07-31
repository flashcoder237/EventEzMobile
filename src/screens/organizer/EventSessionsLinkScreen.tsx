import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ticketTypesAPI, sessionsAPI } from '../../api';
import { RootStackParamList, TicketType, Session } from '../../types';
import {
  Colors,
  FontFamily,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { StaggeredItem } from '../../components/ui/Animations';
import { centeredContent, WIDE_MAX } from '../../constants/layout';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, 'EventSessionsLink'>;

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const sortLinks = (arr: string[]) => [...arr].map(String).sort();
const linksEqual = (a: string[], b: string[]) =>
  JSON.stringify(sortLinks(a)) === JSON.stringify(sortLinks(b));

export default function EventSessionsLinkScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();
  const { eventId } = route.params;
  const { t } = useTranslation();
  const { showSuccess, showError } = useAlert();
  const { colors, isDark } = useTheme();

  const sessionTypeLabel = React.useCallback((type?: string) => {
    switch (type) {
      case 'keynote': return t('organizer.sessionsLink.typeKeynote');
      case 'talk': return t('organizer.sessionsLink.typeTalk');
      case 'panel': return t('organizer.sessionsLink.typePanel');
      case 'workshop': return t('organizer.sessionsLink.typeWorkshop');
      case 'networking': return t('organizer.sessionsLink.typeNetworking');
      case 'break': return t('organizer.sessionsLink.typeBreak');
      case 'lunch': return t('organizer.sessionsLink.typeLunch');
      default: return t('organizer.sessionsLink.typeDefault');
    }
  }, [t]);
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [links, setLinks] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [ticketsRes, sessionsRes] = await Promise.all([
        ticketTypesAPI.getTicketTypes({ event: eventId }),
        sessionsAPI.getSessions({ event: eventId }),
      ]);
      const ticketsList: TicketType[] = ticketsRes.data?.results || ticketsRes.data || [];
      const sessionsList: Session[] = sessionsRes.data?.results || sessionsRes.data || [];

      setTickets(ticketsList);
      setSessions(sessionsList);

      const initialLinks: Record<string, string[]> = {};
      ticketsList.forEach((t) => {
        initialLinks[String(t.id)] = (t.included_sessions || []).map(String);
      });
      setLinks(initialLinks);
    } catch (error) {
      if (__DEV__) console.error('Erreur chargement liaisons:', error);
      showError(t('organizer.sessionsLink.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const initialLinksRef = useMemo(() => {
    const map: Record<string, string[]> = {};
    tickets.forEach((t) => {
      map[String(t.id)] = (t.included_sessions || []).map(String);
    });
    return map;
  }, [tickets]);

  const isModified = useMemo(() => {
    return tickets.some((t) => {
      const id = String(t.id);
      return !linksEqual(links[id] || [], initialLinksRef[id] || []);
    });
  }, [tickets, links, initialLinksRef]);

  const toggleSession = (ticketId: string, sessionId: string) => {
    setLinks((prev) => {
      const current = prev[ticketId] || [];
      const updated = current.includes(sessionId)
        ? current.filter((id) => id !== sessionId)
        : [...current, sessionId];
      return { ...prev, [ticketId]: updated };
    });
  };

  const setAll = (ticketId: string, all: boolean) => {
    setLinks((prev) => ({
      ...prev,
      [ticketId]: all ? sessions.map((s) => String(s.id)) : [],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = tickets
        .filter((t) => {
          const id = String(t.id);
          return !linksEqual(links[id] || [], initialLinksRef[id] || []);
        })
        .map((t) =>
          ticketTypesAPI.patchTicketType(String(t.id), {
            included_sessions: links[String(t.id)] || [],
          })
        );
      await Promise.all(updates);
      showSuccess(t('organizer.sessionsLink.saveSuccess'));
      await fetchData();
    } catch (error: any) {
      if (__DEV__) console.error('Erreur sauvegarde liaisons:', error);
      showError(error?.response?.data?.detail || t('organizer.sessionsLink.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const renderTicket = (ticket: TicketType, index: number) => {
    const ticketId = String(ticket.id);
    const linked = links[ticketId] || [];
    const all = sessions.length > 0 && linked.length === sessions.length;
    const none = linked.length === 0;

    return (
      <StaggeredItem index={index} key={ticketId}>
        <View
          style={[
            styles.ticketCard,
            { backgroundColor: colors.card, borderColor: hairline },
            Shadows.sm,
          ]}
        >
          {/* Ticket header */}
          <View style={[styles.ticketHeader, { borderBottomColor: hairline }]}>
            <View style={styles.ticketHeaderLeft}>
              <View style={[styles.ticketDisc, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="ticket" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ticketName, { color: colors.text }]} numberOfLines={1}>
                  {ticket.name}
                </Text>
                <Text style={[styles.ticketPrice, { color: colors.gray500 }]}>
                  {ticket.price > 0
                    ? Number(ticket.price).toLocaleString('fr-FR')
                    : t('organizer.sessionsLink.free')}
                </Text>
              </View>
            </View>
            <View style={[styles.linkPill, { backgroundColor: none ? `${colors.accent}15` : `${colors.primary}15` }]}>
              <Text style={[styles.linkPillText, { color: none ? colors.accent : colors.primary }]}>
                {none
                  ? t('organizer.sessionsLink.linkAll')
                  : `${linked.length}/${sessions.length}`}
              </Text>
            </View>
          </View>

          {/* Bulk toggle */}
          <View style={styles.bulkRow}>
            <TouchableOpacity
              onPress={() => setAll(ticketId, true)}
              disabled={all}
              activeOpacity={0.8}
              style={[
                styles.bulkBtn,
                {
                  backgroundColor: all ? colors.gray100 : `${colors.primary}10`,
                  opacity: all ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons name="checkmark-done" size={13} color={colors.primary} />
              <Text style={[styles.bulkBtnText, { color: colors.primary }]}>{t('organizer.sessionsLink.selectAll')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAll(ticketId, false)}
              disabled={none}
              activeOpacity={0.8}
              style={[
                styles.bulkBtn,
                {
                  backgroundColor: none ? colors.gray100 : `${colors.gray500}10`,
                  opacity: none ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons name="close" size={13} color={colors.gray600} />
              <Text style={[styles.bulkBtnText, { color: colors.gray600 }]}>{t('organizer.sessionsLink.selectNone')}</Text>
            </TouchableOpacity>
          </View>

          {/* Sessions list */}
          <View style={styles.sessionsList}>
            {sessions.map((session) => {
              const sId = String(session.id);
              const checked = linked.includes(sId);
              return (
                <TouchableOpacity
                  key={sId}
                  onPress={() => toggleSession(ticketId, sId)}
                  activeOpacity={0.7}
                  style={[
                    styles.sessionRow,
                    {
                      backgroundColor: checked ? `${colors.primary}08` : 'transparent',
                      borderColor: checked ? `${colors.primary}30` : hairline,
                    },
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  accessibilityLabel={t('organizer.sessionsLink.sessionA11y', { title: session.title, state: checked ? t('organizer.sessionsLink.stateIncluded') : t('organizer.sessionsLink.stateExcluded') })}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: checked ? colors.primary : 'transparent',
                        borderColor: checked ? colors.primary : colors.gray400,
                      },
                    ]}
                  >
                    {checked && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sessionTitle, { color: colors.text }]} numberOfLines={1}>
                      {session.title}
                    </Text>
                    <Text style={[styles.sessionMeta, { color: colors.gray500 }]} numberOfLines={1}>
                      {sessionTypeLabel(session.session_type)}
                      {session.start_time ? ` • ${formatTime(session.start_time)}` : ''}
                      {session.location ? ` • ${session.location}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </StaggeredItem>
    );
  };

  const canSave = isModified && !saving;

  return (
    <EditorialCanvas edges={['top', 'bottom']}>
      <WatermarkNumeral>×</WatermarkNumeral>

      {/* === HEADER === */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? colors.background : 'rgba(255,255,255,0.6)',
            borderBottomColor: hairline,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.iconDisc, { backgroundColor: colors.gray100 }]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('organizer.sessionsLink.back')}
          >
            <Ionicons name="chevron-back" size={18} color={colors.gray600} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('organizer.sessionsLink.headerEyebrow')}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('organizer.sessionsLink.headerTitle')}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : tickets.length === 0 || sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}10` }]}>
            <Ionicons name="link" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.emptyEyebrow, { color: colors.accent }]}>{t('organizer.sessionsLink.emptyEyebrow')}</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {tickets.length === 0 ? t('organizer.sessionsLink.emptyTicketsTitle') : t('organizer.sessionsLink.emptySessionsTitle')}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.gray500 }]}>
            {t('organizer.sessionsLink.emptySubtitle')}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {/* Info note */}
          <View style={[styles.infoNote, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}20` }]}>
            <Ionicons name="information-circle" size={16} color={colors.primary} style={{ marginTop: 1 }} />
            <Text style={[styles.infoNoteText, { color: colors.text }]}>
              {(() => {
                const note = t('organizer.sessionsLink.infoNote');
                const parts = note.split(/<bold>(.*?)<\/bold>/);
                return parts.map((part, idx) => (
                  idx % 2 === 1
                    ? <Text key={idx} style={{ fontFamily: FontFamily.semiBold }}>{part}</Text>
                    : <Text key={idx}>{part}</Text>
                ));
              })()}
            </Text>
          </View>

          {tickets.map((t, i) => renderTicket(t, i))}

          <View style={{ height: 96 }} />
        </ScrollView>
      )}

      {/* Sticky save bar */}
      {tickets.length > 0 && sessions.length > 0 && (
        <View
          style={[
            styles.saveBar,
            {
              backgroundColor: colors.card,
              borderTopColor: hairline,
            },
          ]}
        >
          <View style={styles.saveBarInner}>
          <Text style={[styles.saveBarHint, { color: colors.gray500 }]}>
            {isModified ? t('organizer.sessionsLink.modifications') : t('organizer.sessionsLink.noModifications')}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.85}
            style={[styles.saveBtn, !canSave && { opacity: 0.4 }]}
            accessibilityRole="button"
            accessibilityLabel={t('organizer.sessionsLink.saveA11y')}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {saving ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="save" size={16} color={Colors.white} />
                <Text style={styles.saveBtnLabel}>{t('organizer.sessionsLink.save')}</Text>
              </>
            )}
          </TouchableOpacity>
          </View>
        </View>
      )}
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  // === HEADER ===
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 30,
    letterSpacing: -1.2,
    lineHeight: 34,
  },

  // === LIST ===
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    ...centeredContent(WIDE_MAX),
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xl * 2,
  },

  // === INFO NOTE ===
  infoNote: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    alignItems: 'flex-start',
  },
  infoNoteText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },

  // === TICKET CARD ===
  ticketCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  ticketHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ticketDisc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketName: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  ticketPrice: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    marginTop: 1,
  },
  linkPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  linkPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1,
  },

  // === BULK ROW ===
  bulkRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  bulkBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.3,
  },

  // === SESSIONS LIST ===
  sessionsList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xs,
    gap: 6,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    letterSpacing: -0.2,
  },
  sessionMeta: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    marginTop: 1,
  },

  // === EMPTY ===
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl * 2,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 6,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.6,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },

  // === SAVE BAR ===
  // Fond bord-à-bord (absolute plein largeur) ; contenu plafonné via saveBarInner.
  saveBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
  },
  saveBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    ...centeredContent(WIDE_MAX),
  },
  saveBarHint: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    overflow: 'hidden',
    minWidth: 140,
    justifyContent: 'center',
  },
  saveBtnLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: 0.3,
  },
});
