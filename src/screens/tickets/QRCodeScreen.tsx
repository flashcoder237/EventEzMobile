import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAlert } from '../../contexts/AlertContext';
import { ticketPurchasesAPI, registrationsAPI } from '../../api/client';
import { TicketPurchase, RootStackParamList } from '../../types';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type QRCodeRouteProp = RouteProp<RootStackParamList, 'QRCode'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QR_SIZE = SCREEN_WIDTH - Spacing.xl * 4;

export default function QRCodeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<QRCodeRouteProp>();
  const { ticketId } = route.params;
  const { showError } = useAlert();

  const [ticket, setTicket] = useState<TicketPurchase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      const response = await ticketPurchasesAPI.getTicketPurchase(ticketId);
      setTicket(response.data);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      showError('Erreur', 'Impossible de charger les détails du billet');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!ticket) return;
    const eventTitle = (ticket as any)?.event?.title || (ticket as any)?.event_title || 'Événement';
    try {
      await Share.share({
        message: `Mon billet pour ${eventTitle}\n\nRéférence: ${String(ticketId).slice(0, 8).toUpperCase()}`,
        title: 'Mon billet EventEz',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusConfig = (status?: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return { color: Colors.success, bg: Colors.successLight, label: 'Confirmé', icon: 'checkmark-circle' };
      case 'pending':
        return { color: Colors.warning, bg: Colors.warningLight, label: 'En attente', icon: 'time' };
      case 'cancelled':
        return { color: Colors.error, bg: Colors.errorLight, label: 'Annulé', icon: 'close-circle' };
      case 'checked_in':
        return { color: Colors.success, bg: Colors.successLight, label: 'Validé', icon: 'checkmark-done-circle' };
      default:
        return { color: Colors.success, bg: Colors.successLight, label: 'Confirmé', icon: 'checkmark-circle' };
    }
  };

  // Helper pour vérifier si le paiement est requis
  const isPaymentRequired = (t: TicketPurchase | null): boolean => {
    if (!t) return false;
    // Vérifier d'abord le champ payment_required
    if (t.payment_required === true) return true;
    // Fallback: vérifier si le total_price > 0 et status pending
    if (t.total_price && t.total_price > 0 && t.status === 'pending') return true;
    return false;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // URL de vérification (format unifié mobile + web)
  const getVerificationUrl = (): string => {
    const registrationId = ticket?.registration_id || ticket?.registration;
    // URL frontend pour la vérification
    const frontendUrl = 'http://localhost:3000'; // TODO: configurer via env
    return `${frontendUrl}/verify/${registrationId}`;
  };

  // Génère l'URL du QR code via l'API externe (même rendu que le web)
  const getQRCodeImageUrl = (): string => {
    const verificationUrl = getVerificationUrl();
    const size = 200;
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(verificationUrl)}&size=${size}x${size}&format=png&qzone=1&margin=0&bgcolor=FFFFFF&color=5B21B6`;
  };

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.gray900} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mon Billet</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.gray400} />
          <Text style={styles.errorText}>Billet non trouvé</Text>
        </View>
      </SafeAreaView>
    );
  }

  const event = (ticket as any)?.event;
  const ticketType = typeof ticket.ticket_type === 'object' ? ticket.ticket_type : null;
  const statusConfig = getStatusConfig(ticket.status);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Billet</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={Colors.gray900} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Ticket Card */}
        <View style={styles.card}>
          {/* Event Info */}
          <View style={styles.eventInfo}>
            <View style={[styles.typeBadge, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
              <Ionicons name="ticket" size={14} color={Colors.primary} />
              <Text style={[styles.typeBadgeText, { color: Colors.primary }]}>Billet</Text>
            </View>

            <Text style={styles.eventTitle} numberOfLines={2}>
              {event?.title || (ticket as any)?.event_title || 'Événement'}
            </Text>

            <View style={styles.eventMeta}>
              {event?.start_date && (
                <View style={styles.eventMetaItem}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                  <Text style={styles.eventMetaText}>{formatDate(event.start_date)}</Text>
                </View>
              )}
              {event?.start_date && (
                <View style={styles.eventMetaItem}>
                  <Ionicons name="time-outline" size={16} color={Colors.primary} />
                  <Text style={styles.eventMetaText}>{formatTime(event.start_date)}</Text>
                </View>
              )}
              {(event?.location_name || event?.location_city) && (
                <View style={styles.eventMetaItem}>
                  <Ionicons name="location-outline" size={16} color={Colors.primary} />
                  <Text style={styles.eventMetaText}>
                    {event.location_name || event.location_city}
                  </Text>
                </View>
              )}
            </View>

            {/* View Event Button */}
            <TouchableOpacity
              style={styles.viewEventButton}
              onPress={() => {
                const eventId = event?.id || (ticket as any)?.event_id;
                if (eventId) {
                  navigation.navigate('EventDetails', { eventId });
                }
              }}
            >
              <Ionicons name="eye-outline" size={18} color={Colors.primary} />
              <Text style={styles.viewEventButtonText}>Voir les détails de l'événement</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerCircleLeft} />
            <View style={styles.dividerLine} />
            <View style={styles.dividerCircleRight} />
          </View>

          {/* QR Code Section */}
          <View style={styles.qrSection}>
            <View style={styles.qrContainer}>
              <Image
                source={{ uri: getQRCodeImageUrl() }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.qrHint}>
              Présentez ce QR code à l'entrée de l'événement
            </Text>
          </View>

          {/* Ticket Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Statut</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type de billet</Text>
              <Text style={styles.detailValue}>
                {ticketType?.name || ticket.ticket_type_name || 'Standard'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quantité</Text>
              <Text style={styles.detailValue}>{ticket.quantity || 1}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Prix unitaire</Text>
              <Text style={styles.detailValue}>
                {ticket.unit_price ? `${ticket.unit_price.toLocaleString()} FCFA` : 'Gratuit'}
              </Text>
            </View>
            {ticket.discount_amount && ticket.discount_amount > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Réduction</Text>
                <Text style={[styles.detailValue, { color: Colors.success }]}>
                  -{ticket.discount_amount.toLocaleString()} FCFA
                </Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total payé</Text>
              <Text style={[styles.detailValue, styles.totalPrice]}>
                {ticket.total_price ? `${ticket.total_price.toLocaleString()} FCFA` : 'Gratuit'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Référence</Text>
              <Text style={styles.detailValue}>{String(ticketId).slice(0, 8).toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Attendee Info if available */}
        {(ticket.attendee_name || ticket.attendee_email) && (
          <View style={styles.attendeeCard}>
            <Text style={styles.sectionTitle}>Participant</Text>
            {ticket.attendee_name && (
              <View style={styles.attendeeRow}>
                <Ionicons name="person-outline" size={18} color={Colors.gray500} />
                <Text style={styles.attendeeText}>{ticket.attendee_name}</Text>
              </View>
            )}
            {ticket.attendee_email && (
              <View style={styles.attendeeRow}>
                <Ionicons name="mail-outline" size={18} color={Colors.gray500} />
                <Text style={styles.attendeeText}>{ticket.attendee_email}</Text>
              </View>
            )}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <View style={styles.instructionItem}>
            <View style={styles.instructionIcon}>
              <Ionicons name="scan-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.instructionText}>
              Le QR code sera scanné à l'entrée
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.instructionIcon}>
              <Ionicons name="phone-portrait-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.instructionText}>
              Gardez votre téléphone chargé
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.instructionIcon}>
              <Ionicons name="time-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.instructionText}>
              Arrivez à l'heure pour éviter les files
            </Text>
          </View>
        </View>

        {/* Check-in status */}
        {ticket.is_checked_in && (
          <View style={styles.checkedInBanner}>
            <Ionicons name="checkmark-done-circle" size={24} color={Colors.success} />
            <View style={styles.checkedInText}>
              <Text style={styles.checkedInTitle}>Billet validé</Text>
              {ticket.checked_in_at && (
                <Text style={styles.checkedInDate}>
                  Entrée le {formatDate(ticket.checked_in_at)} à {formatTime(ticket.checked_in_at)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Payment required banner */}
        {ticket.status === 'pending' && isPaymentRequired(ticket) && (
          <View style={styles.paymentRequiredBanner}>
            <Ionicons name="warning" size={24} color={Colors.warning} />
            <View style={styles.paymentRequiredText}>
              <Text style={styles.paymentRequiredTitle}>Paiement en attente</Text>
              <Text style={styles.paymentRequiredDesc}>
                Finalisez votre paiement pour confirmer votre inscription
              </Text>
            </View>
          </View>
        )}

        {/* Complete payment button */}
        {ticket.status === 'pending' && isPaymentRequired(ticket) && (
          <TouchableOpacity
            style={styles.completePaymentButton}
            onPress={() => {
              const regId = ticket.registration_id || ticket.registration;
              if (regId) {
                navigation.navigate('Payment', { registrationId: regId });
              }
            }}
          >
            <Ionicons name="card-outline" size={20} color={Colors.white} />
            <Text style={styles.completePaymentText}>Finaliser le paiement</Text>
          </TouchableOpacity>
        )}

        {/* Buy more tickets button - for confirmed tickets */}
        {(ticket.status === 'confirmed' || ticket.status === 'completed') && (
          <TouchableOpacity
            style={styles.buyMoreButton}
            onPress={() => {
              const eventId = event?.id || ticket.event_id;
              if (eventId) {
                navigation.navigate('TicketPurchase', { eventId, additionalTickets: true });
              }
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.buyMoreButtonText}>Acheter plus de billets</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: Spacing.xl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollView: {
    flex: 1,
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: Colors.gray200,
    overflow: 'hidden',
  },

  // Event Info
  eventInfo: {
    padding: Spacing.lg,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  typeBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
  },
  eventTitle: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  eventMeta: {
    gap: Spacing.sm,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  eventMetaText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },
  viewEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  viewEventButtonText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -Spacing.lg,
  },
  dividerCircleLeft: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    marginLeft: -12,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  dividerCircleRight: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    marginRight: -12,
  },

  // QR Section
  qrSection: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  qrContainer: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  qrImage: {
    width: QR_SIZE,
    height: QR_SIZE,
  },
  qrPlaceholder: {
    width: QR_SIZE,
    height: QR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderInner: {
    width: QR_SIZE - 40,
    height: QR_SIZE - 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrHint: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.md,
    textAlign: 'center',
  },

  // Details Section
  detailsSection: {
    padding: Spacing.lg,
    backgroundColor: Colors.gray50,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  detailValue: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  totalPrice: {
    color: Colors.primary,
    fontSize: FontSizes.base,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
  },

  // Attendee Card
  attendeeCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  sectionTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  attendeeText: {
    fontSize: FontSizes.sm,
    color: Colors.gray700,
  },

  // Instructions
  instructions: {
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  instructionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    flex: 1,
  },

  // Checked In Banner
  checkedInBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.successLight,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  checkedInText: {
    flex: 1,
  },
  checkedInTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.success,
  },
  checkedInDate: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginTop: 2,
  },

  // Payment Required Banner
  paymentRequiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.warningLight,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  paymentRequiredText: {
    flex: 1,
  },
  paymentRequiredTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.warning,
  },
  paymentRequiredDesc: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    marginTop: 2,
  },

  // Complete Payment Button
  completePaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
  },
  completePaymentText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },

  // Buy More Tickets Button
  buyMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: Spacing.sm,
  },
  buyMoreButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
});
