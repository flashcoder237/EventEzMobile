import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event, WaitlistEntry } from '../../types';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing, TextStyles } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import ConvertedPrice from '../common/ConvertedPrice';

export interface TicketsTabProps {
  event: Event;
  waitlistEntry: WaitlistEntry | null;
  joiningWaitlist: boolean;
  getTicketAvailability: (ticket: any) => number;
  areAllTicketsSoldOut: () => boolean;
  onJoinWaitlist: () => void;
  onLeaveWaitlist: () => void;
}

// Tier color mapping — adapts to common ticket-type names. Falls back to
// primary indigo so any custom name still renders in-brand.
function tierAccent(name: string): { color: string; bg: string; label: string } {
  const lower = name.toLowerCase();
  if (lower.includes('vip') || lower.includes('platinum') || lower.includes('platine')) {
    return { color: '#A78BFA', bg: '#A78BFA1A', label: 'VIP' };
  }
  if (lower.includes('gold') || lower.includes('or ') || lower === 'or') {
    return { color: '#F59E0B', bg: '#F59E0B1A', label: 'GOLD' };
  }
  if (lower.includes('early') || lower.includes('bird') || lower.includes('preventes')) {
    return { color: '#10B981', bg: '#10B9811A', label: 'EARLY' };
  }
  if (lower.includes('etudiant') || lower.includes('etudiante')) {
    return { color: '#3B82F6', bg: '#3B82F61A', label: 'ÉTUDIANT' };
  }
  return { color: '#4F46E5', bg: '#4F46E51A', label: 'STANDARD' };
}

export default function TicketsTab({
  event,
  waitlistEntry,
  joiningWaitlist,
  getTicketAvailability,
  areAllTicketsSoldOut,
  onJoinWaitlist,
  onLeaveWaitlist,
}: TicketsTabProps) {
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const isBilletterie = event.event_type === 'billetterie';
  const tickets = event.ticket_types || [];

  return (
    <View style={styles.section}>
      {/* === Header === */}
      <Text style={[styles.eyebrow, { color: colors.accent }]}>
        {isBilletterie ? `Billets · ${tickets.length} formule${tickets.length > 1 ? 's' : ''}` : 'Inscription'}
      </Text>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {isBilletterie ? 'Choisis ta place' : "Rejoins l'événement"}
      </Text>

      {tickets.length > 0 ? (
        <>
          {tickets.map((ticket, index) => {
            const available = getTicketAvailability(ticket);
            const isSoldOut = available <= 0;
            const isLowStock = !isSoldOut && available <= 10;
            const accent = tierAccent(ticket.name);
            const isFree = ticket.price === 0;

            return (
              <View
                key={index}
                style={[
                  styles.ticketCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isSoldOut ? colors.gray200 : hairline,
                  },
                ]}
              >
                {/* Left perforated rail — ticket-stub feel */}
                <View
                  style={[
                    styles.perforatedRail,
                    { backgroundColor: isSoldOut ? colors.gray100 : `${accent.color}1A` },
                  ]}
                >
                  <View style={[styles.perforation, { backgroundColor: colors.background, top: -8 }]} />
                  <View style={[styles.perforation, { backgroundColor: colors.background, bottom: -8 }]} />
                </View>

                <View style={styles.ticketBody}>
                  {/* Top row: tier pill + low-stock urgency */}
                  <View style={styles.ticketTopRow}>
                    <View
                      style={[
                        styles.tierPill,
                        { backgroundColor: isSoldOut ? colors.gray100 : accent.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tierPillText,
                          { color: isSoldOut ? colors.gray500 : accent.color },
                        ]}
                      >
                        {accent.label}
                      </Text>
                    </View>
                    {isLowStock && !isSoldOut && (
                      <View style={[styles.urgencyPill, { backgroundColor: colors.accent }]}>
                        <Ionicons name="flash" size={9} color="#fff" />
                        <Text style={styles.urgencyText}>
                          PLUS QUE {available}
                        </Text>
                      </View>
                    )}
                    {isSoldOut && (
                      <View style={[styles.soldOutPill, { backgroundColor: colors.gray100 }]}>
                        <Text style={[styles.soldOutText, { color: colors.gray500 }]}>ÉPUISÉ</Text>
                      </View>
                    )}
                  </View>

                  {/* Name */}
                  <Text
                    style={[
                      styles.ticketName,
                      { color: isSoldOut ? colors.gray500 : colors.text },
                    ]}
                  >
                    {ticket.name}
                  </Text>

                  {/* Description */}
                  {ticket.description && (
                    <Text
                      style={[styles.ticketDescription, { color: colors.gray500 }]}
                      numberOfLines={2}
                    >
                      {ticket.description}
                    </Text>
                  )}

                  {/* Bottom row: availability + price */}
                  <View style={[styles.ticketBottom, { borderTopColor: hairline }]}>
                    <View style={styles.availabilityWrap}>
                      <View
                        style={[
                          styles.availabilityDot,
                          {
                            backgroundColor: isSoldOut
                              ? colors.gray300
                              : isLowStock
                              ? colors.accent
                              : '#10B981',
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.availabilityText,
                          {
                            color: isSoldOut
                              ? colors.gray500
                              : isLowStock
                              ? colors.accent
                              : '#10B981',
                          },
                        ]}
                      >
                        {isSoldOut
                          ? 'Épuisé'
                          : isLowStock
                          ? `${available} place${available > 1 ? 's' : ''} restante${available > 1 ? 's' : ''}`
                          : `${available} disponibles`}
                      </Text>
                    </View>

                    <View style={styles.priceWrap}>
                      {isFree ? (
                        <Text style={[styles.priceFree, { color: '#10B981' }]}>GRATUIT</Text>
                      ) : (
                        <>
                          <Text
                            style={[
                              styles.price,
                              { color: isSoldOut ? colors.gray400 : colors.text },
                            ]}
                          >
                            {ticket.price.toLocaleString()}{' '}
                            <Text style={styles.currency}>{event.currency || 'XAF'}</Text>
                          </Text>
                          <ConvertedPrice amount={ticket.price} eventCurrency={event.currency || 'XAF'} />
                        </>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}

          {/* === Waitlist banner — only when all sold out === */}
          {areAllTicketsSoldOut() && (
            <View
              style={[
                styles.waitlistCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.accent + '40',
                },
              ]}
            >
              <View style={[styles.waitlistIconDisc, { backgroundColor: `${colors.accent}1A` }]}>
                <Ionicons name="time" size={20} color={colors.accent} />
              </View>
              <View style={styles.waitlistTextWrap}>
                <Text style={[styles.waitlistEyebrow, { color: colors.accent }]}>
                  TOUT EST PARTI
                </Text>
                <Text style={[styles.waitlistTitle, { color: colors.text }]}>
                  {waitlistEntry ? 'Tu es sur la liste' : 'Liste d\'attente'}
                </Text>
                <Text style={[styles.waitlistBody, { color: colors.gray600 }]}>
                  {waitlistEntry
                    ? 'On te prévient dès qu\'une place se libère.'
                    : 'Sois notifié·e si une place se libère.'}
                </Text>
              </View>
              {waitlistEntry ? (
                <TouchableOpacity
                  style={[styles.waitlistBtnGhost, { borderColor: colors.gray300 }]}
                  onPress={onLeaveWaitlist}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.waitlistBtnGhostText, { color: colors.gray600 }]}>Quitter</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.waitlistBtnFilled, { backgroundColor: colors.accent }]}
                  onPress={onJoinWaitlist}
                  disabled={joiningWaitlist}
                  activeOpacity={0.85}
                >
                  {joiningWaitlist ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="notifications" size={14} color="#fff" />
                      <Text style={styles.waitlistBtnFilledText}>Me prévenir</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyTab}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryBg }]}>
            <Ionicons
              name={isBilletterie ? 'ticket-outline' : 'people-outline'}
              size={28}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {isBilletterie ? 'Bientôt en vente' : 'Inscription gratuite'}
          </Text>
          <Text style={[styles.emptyText, { color: colors.gray500 }]}>
            {isBilletterie
              ? "Les billets seront mis en vente sous peu."
              : 'Pas de billet à acheter — inscris-toi simplement.'}
          </Text>
        </View>
      )}
    </View>
  );
}

const PERF_RAIL_WIDTH = 8;

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    ...TextStyles.eyebrow,
    marginBottom: 4,
  },
  sectionTitle: {
    ...TextStyles.h3,
    letterSpacing: -0.4,
    marginBottom: Spacing.md,
  },

  // === Ticket card (stub style) ===
  ticketCard: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg + 2,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    minHeight: 130,
  },
  perforatedRail: {
    width: PERF_RAIL_WIDTH,
    position: 'relative',
  },
  perforation: {
    position: 'absolute',
    left: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  ticketBody: {
    flex: 1,
    padding: Spacing.md,
    gap: 8,
  },
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  tierPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tierPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  urgencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgencyText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.8,
    color: '#fff',
  },
  soldOutPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  soldOutText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.2,
  },

  ticketName: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.base + 1,
    letterSpacing: -0.3,
    lineHeight: 21,
  },
  ticketDescription: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
  },

  ticketBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    marginTop: 4,
  },
  availabilityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availabilityText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: -0.1,
  },
  priceWrap: {
    alignItems: 'flex-end',
  },
  price: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 18,
    letterSpacing: -0.4,
  },
  currency: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  priceFree: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 14,
    letterSpacing: 1.2,
  },

  // === Waitlist ===
  waitlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg + 2,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  waitlistIconDisc: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitlistTextWrap: {
    flex: 1,
  },
  waitlistEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  waitlistTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.2,
  },
  waitlistBody: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  waitlistBtnFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
  },
  waitlistBtnFilledText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: '#fff',
    letterSpacing: 0.2,
  },
  waitlistBtnGhost: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  waitlistBtnGhostText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },

  // === Empty state ===
  emptyTab: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.2,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    lineHeight: 19,
  },
});
