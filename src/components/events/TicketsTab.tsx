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
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

export interface TicketsTabProps {
  event: Event;
  waitlistEntry: WaitlistEntry | null;
  joiningWaitlist: boolean;
  getTicketAvailability: (ticket: any) => number;
  areAllTicketsSoldOut: () => boolean;
  onJoinWaitlist: () => void;
  onLeaveWaitlist: () => void;
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

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>
        {event.event_type === 'billetterie' ? 'Types de billets' : 'Inscription'}
      </Text>
      {event.ticket_types && event.ticket_types.length > 0 ? (
        <>
          {event.ticket_types.map((ticket, index) => {
            const available = getTicketAvailability(ticket);
            const isSoldOut = available <= 0;

            return (
              <View key={index} style={[styles.ticketCard, { backgroundColor: colors.gray50 }, isSoldOut && styles.ticketCardSoldOut]}>
                <View style={styles.ticketInfo}>
                  <Text style={[styles.ticketName, { color: colors.gray900 }]}>{ticket.name}</Text>
                  {ticket.description && (
                    <Text style={[styles.ticketDescription, { color: colors.gray500 }]}>{ticket.description}</Text>
                  )}
                  <Text style={[styles.ticketAvailability, isSoldOut && styles.ticketSoldOut]}>
                    {isSoldOut
                      ? 'Epuise'
                      : `${available} disponible${available > 1 ? 's' : ''}`}
                  </Text>
                </View>
                <View style={styles.ticketPriceContainer}>
                  <Text style={[styles.ticketPrice, { color: colors.primary }, isSoldOut && { color: colors.gray400 }]}>
                    {ticket.price > 0 ? `${ticket.price.toLocaleString()} FCFA` : 'Gratuit'}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Waitlist Section */}
          {areAllTicketsSoldOut() && (
            <View style={styles.waitlistSection}>
              <View style={styles.waitlistInfo}>
                <Ionicons name="time-outline" size={24} color={colors.warning} />
                <View style={styles.waitlistTextContainer}>
                  <Text style={[styles.waitlistTitle, { color: colors.gray900 }]}>Tous les billets sont epuises</Text>
                  <Text style={[styles.waitlistDescription, { color: colors.gray600 }]}>
                    {waitlistEntry
                      ? 'Vous etes sur la liste d\'attente. Vous serez notifie si une place se libere.'
                      : 'Rejoignez la liste d\'attente pour etre notifie si une place se libere.'}
                  </Text>
                </View>
              </View>
              {waitlistEntry ? (
                <TouchableOpacity
                  style={[styles.leaveWaitlistButton, { backgroundColor: colors.card, borderColor: colors.gray300 }]}
                  onPress={onLeaveWaitlist}
                >
                  <Text style={[styles.leaveWaitlistText, { color: colors.gray600 }]}>Quitter la liste</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.joinWaitlistButton}
                  onPress={onJoinWaitlist}
                  disabled={joiningWaitlist}
                >
                  {joiningWaitlist ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="notifications-outline" size={18} color={Colors.white} />
                      <Text style={styles.joinWaitlistText}>Rejoindre la liste d'attente</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyTab}>
          <Ionicons name="ticket-outline" size={40} color={colors.gray300} />
          <Text style={[styles.emptyTabText, { color: colors.gray500 }]}>
            {event.event_type === 'billetterie'
              ? 'Aucun type de billet disponible'
              : 'Inscription gratuite'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyTabText: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.md,
  },
  // Ticket Card
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  ticketCardSoldOut: {
    opacity: 0.6,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketName: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: 2,
  },
  ticketDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginBottom: 4,
  },
  ticketAvailability: {
    fontSize: FontSizes.xs,
    color: Colors.success,
    fontFamily: FontFamily.medium,
  },
  ticketSoldOut: {
    color: Colors.error,
  },
  ticketPriceContainer: {
    marginLeft: Spacing.md,
  },
  ticketPrice: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.primary,
  },
  ticketPriceSoldOut: {
    color: Colors.gray400,
  },
  // Waitlist Section
  waitlistSection: {
    backgroundColor: Colors.warningLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  waitlistInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  waitlistTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  waitlistTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: 4,
  },
  waitlistDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
  joinWaitlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warning,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  joinWaitlistText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  leaveWaitlistButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  leaveWaitlistText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray600,
  },
});
