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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { registrationsAPI, ticketTransfersAPI } from '../../api/client';
import { Registration, RootStackParamList } from '../../types';
import { TransferTicketModal } from '../../components/tickets';
import { useOfflineTickets, useEventReminders } from '../../hooks';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { useAlert } from '../../contexts/AlertContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RegistrationDetailsRouteProp = RouteProp<RootStackParamList, 'RegistrationDetails'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QR_SIZE = SCREEN_WIDTH - Spacing.xl * 4;

export default function RegistrationDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RegistrationDetailsRouteProp>();
  const { registrationId } = route.params;
  const { showError, showSuccess, showConfirm } = useAlert();

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [selectedTicketForTransfer, setSelectedTicketForTransfer] = useState<{
    id: number;
    ticket_type_name: string;
    quantity: number;
  } | null>(null);
  const { cacheTicket, isOnline } = useOfflineTickets();
  const { hasReminder, toggleReminder, permissionGranted } = useEventReminders();
  const [reminderEnabled, setReminderEnabled] = useState(false);

  useEffect(() => {
    fetchRegistration();
  }, [registrationId]);

  // Check if reminder is enabled for this event
  useEffect(() => {
    if (registration) {
      const event = registration.event_detail || (typeof registration.event === 'object' ? registration.event : null);
      if (event?.id) {
        setReminderEnabled(hasReminder(event.id));
      }
    }
  }, [registration, hasReminder]);

  const fetchRegistration = async () => {
    try {
      const response = await registrationsAPI.getRegistration(registrationId);
      const reg = response.data;
      setRegistration(reg);

      // Cache tickets for offline access
      if (reg.tickets && reg.tickets.length > 0) {
        const event = reg.event_detail || (typeof reg.event === 'object' ? reg.event : null);
        for (const ticket of reg.tickets) {
          if (ticket.qr_code && ticket.is_paid) {
            const ticketType = typeof ticket.ticket_type === 'object' ? ticket.ticket_type : null;
            cacheTicket({
              id: ticket.id,
              registration: {
                id: reg.id,
                reference_code: reg.reference_code,
                event: {
                  id: event?.id || reg.event_id || '',
                  title: event?.title || 'Événement',
                  start_date: event?.start_date || '',
                },
              },
              ticket_type_name: ticketType?.name || ticket.ticket_type_name || 'Billet',
              quantity: ticket.quantity || 1,
              qr_code: ticket.qr_code,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching registration:', error);
      showError('Erreur', 'Impossible de charger les détails de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!registration) return;
    const event = registration.event_detail || registration.event;
    const eventTitle = typeof event === 'object' ? event.title : 'Événement';
    try {
      await Share.share({
        message: `Mon inscription pour ${eventTitle}\n\nRéférence: ${registration.reference_code}`,
        title: 'Mon inscription EventEz',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleToggleReminder = async () => {
    if (!registration) return;

    const event = registration.event_detail || (typeof registration.event === 'object' ? registration.event : null);
    if (!event?.id) return;

    const isNowEnabled = await toggleReminder({
      id: event.id,
      title: event.title || 'Événement',
      start_date: event.start_date || '',
      location_name: event.location_name,
      location_city: event.location_city,
    }, registrationId);

    setReminderEnabled(isNowEnabled);

    if (isNowEnabled) {
      showSuccess('Rappel activé', 'Vous recevrez une notification 24h et 1h avant l\'événement');
    } else {
      showSuccess('Rappel désactivé', 'Vous ne recevrez plus de notification pour cet événement');
    }
  };

  const handleCancelRegistration = () => {
    showConfirm(
      'Annuler l\'inscription',
      'Voulez-vous vraiment annuler votre inscription à cet événement ?',
      async () => {
        try {
          await registrationsAPI.cancelRegistration(registrationId);
          showSuccess('Succès', 'Votre inscription a été annulée');
          navigation.goBack();
        } catch (error) {
          showError('Erreur', 'Impossible d\'annuler l\'inscription');
        }
      }
    );
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

  const getStatusConfig = (status: string, approvalStatus?: string) => {
    if (approvalStatus === 'pending') {
      return { color: Colors.warning, bg: Colors.warningLight, label: 'En attente de validation', icon: 'hourglass-outline' };
    }
    switch (status) {
      case 'confirmed':
      case 'completed':
        return { color: Colors.success, bg: Colors.successLight, label: 'Confirmée', icon: 'checkmark-circle' };
      case 'pending':
      case 'pending_approval':
        return { color: Colors.warning, bg: Colors.warningLight, label: 'En attente', icon: 'time' };
      case 'cancelled':
        return { color: Colors.error, bg: Colors.errorLight, label: 'Annulée', icon: 'close-circle' };
      case 'rejected':
        return { color: Colors.error, bg: Colors.errorLight, label: 'Refusée', icon: 'close-circle' };
      case 'checked_in':
        return { color: Colors.success, bg: Colors.successLight, label: 'Validée', icon: 'checkmark-done-circle' };
      default:
        return { color: Colors.gray500, bg: Colors.gray100, label: status || 'Inconnu', icon: 'help-circle' };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!registration) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.gray900} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inscription</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.gray400} />
          <Text style={styles.errorText}>Inscription non trouvée</Text>
        </View>
      </SafeAreaView>
    );
  }

  const event = registration.event_detail || (typeof registration.event === 'object' ? registration.event : null);
  const statusConfig = getStatusConfig(registration.status, registration.approval_status);
  const isActive = registration.status !== 'cancelled' && registration.status !== 'rejected';
  const isBilletterie = registration.tickets && registration.tickets.length > 0;
  const totalTicketQuantity = isBilletterie
    ? registration.tickets!.reduce((sum: number, t: any) => sum + (t.quantity || 1), 0)
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isBilletterie
            ? `Mes Billets (${totalTicketQuantity})`
            : 'Mon Inscription'}
        </Text>
        <View style={styles.headerActions}>
          {/* Reminder Button */}
          {isActive && permissionGranted && (
            <TouchableOpacity
              style={[styles.reminderButton, reminderEnabled && styles.reminderButtonActive]}
              onPress={handleToggleReminder}
            >
              <Ionicons
                name={reminderEnabled ? 'notifications' : 'notifications-outline'}
                size={22}
                color={reminderEnabled ? Colors.primary : Colors.gray600}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={Colors.gray900} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Registration Card */}
        <View style={styles.card}>
          {/* Event Info */}
          <View style={styles.eventInfo}>
            <View style={[styles.typeBadge, { backgroundColor: isBilletterie ? 'rgba(99, 102, 241, 0.1)' : 'rgba(139, 92, 246, 0.1)' }]}>
              <Ionicons name={isBilletterie ? "ticket" : "document-text"} size={14} color={isBilletterie ? Colors.primary : "#8B5CF6"} />
              <Text style={[styles.typeBadgeText, { color: isBilletterie ? Colors.primary : '#8B5CF6' }]}>
                {isBilletterie ? `${totalTicketQuantity} Billet${totalTicketQuantity > 1 ? 's' : ''}` : 'Inscription'}
              </Text>
            </View>

            <Text style={styles.eventTitle} numberOfLines={2}>
              {event?.title || 'Événement'}
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
              {event?.location_type === 'online' ? (
                <View style={styles.eventMetaItem}>
                  <Ionicons name="videocam-outline" size={16} color={Colors.primary} />
                  <Text style={styles.eventMetaText}>Événement en ligne</Text>
                </View>
              ) : event?.location_type === 'hybrid' ? (
                <>
                  <View style={styles.eventMetaItem}>
                    <Ionicons name="location-outline" size={16} color={Colors.primary} />
                    <Text style={styles.eventMetaText}>
                      {event.location_name || event.location_city}
                    </Text>
                  </View>
                  <View style={styles.eventMetaItem}>
                    <Ionicons name="videocam-outline" size={16} color={Colors.primary} />
                    <Text style={styles.eventMetaText}>+ Option en ligne</Text>
                  </View>
                </>
              ) : !!(event?.location_name || event?.location_city) && (
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
                const eventId = (typeof registration.event === 'string' ? registration.event : event?.id);
                if (eventId) {
                  navigation.navigate('EventDetails', { eventId });
                }
              }}
            >
              <Ionicons name="eye-outline" size={18} color={Colors.primary} />
              <Text style={styles.viewEventButtonText}>Voir les détails de l'événement</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </TouchableOpacity>

            {/* Online Event Access Card */}
            {(event?.location_type === 'online' || event?.location_type === 'hybrid') && (
              <View style={styles.onlineAccessCard}>
                <View style={styles.onlineAccessHeader}>
                  <Ionicons name="videocam" size={20} color="#3B82F6" />
                  <Text style={styles.onlineAccessTitle}>Accès à l'événement en ligne</Text>
                </View>
                {event.online_platform && (
                  <Text style={styles.onlinePlatform}>Via {event.online_platform}</Text>
                )}
                {event.online_instructions && (
                  <Text style={styles.onlineInstructions}>{event.online_instructions}</Text>
                )}
                {!!(event.online_meeting_id || event.online_passcode) && (
                  <View style={styles.onlineMeetingDetails}>
                    {event.online_meeting_id && (
                      <View style={styles.meetingDetailRow}>
                        <Text style={styles.meetingDetailLabel}>ID de réunion :</Text>
                        <Text style={styles.meetingDetailValue}>{event.online_meeting_id}</Text>
                      </View>
                    )}
                    {event.online_passcode && (
                      <View style={styles.meetingDetailRow}>
                        <Text style={styles.meetingDetailLabel}>Code d'accès :</Text>
                        <Text style={styles.meetingDetailValue}>{event.online_passcode}</Text>
                      </View>
                    )}
                  </View>
                )}
                {event.online_url ? (
                  <TouchableOpacity
                    style={styles.joinOnlineButton}
                    onPress={() => {
                      Linking.openURL(event.online_url!).catch(() => {
                        showError('Erreur', 'Impossible d\'ouvrir le lien de l\'événement');
                      });
                    }}
                  >
                    <Ionicons name="videocam" size={18} color={Colors.white} />
                    <Text style={styles.joinOnlineButtonText}>Rejoindre l'événement</Text>
                  </TouchableOpacity>
                ) : event.online_platform?.toLowerCase() === 'eventez_visio' || event.online_platform?.toLowerCase() === 'eventez visio' ? (
                  <View style={styles.eventezVisioInfo}>
                    <Ionicons name="information-circle" size={18} color="#3B82F6" />
                    <Text style={styles.eventezVisioText}>
                      La visioconférence EventEz sera disponible le jour de l'événement
                    </Text>
                  </View>
                ) : !event.online_meeting_id && !event.online_passcode ? (
                  <View style={styles.eventezVisioInfo}>
                    <Ionicons name="time-outline" size={18} color={Colors.gray500} />
                    <Text style={styles.eventezVisioText}>
                      Les informations de connexion seront communiquées avant l'événement
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
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
              {registration.qr_code ? (
                <Image
                  source={{ uri: registration.qr_code }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <View style={styles.qrPlaceholderInner}>
                    <Ionicons name="qr-code" size={80} color="#8B5CF6" />
                  </View>
                </View>
              )}
            </View>
            <Text style={styles.qrHint}>
              Présentez ce QR code à l'entrée de l'événement
            </Text>
          </View>

          {/* Registration Details */}
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
              <Text style={styles.detailLabel}>Référence</Text>
              <Text style={styles.detailValue}>{registration.reference_code}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date d'inscription</Text>
              <Text style={styles.detailValue}>{formatDate(registration.created_at)}</Text>
            </View>
            {registration.confirmed_at && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Confirmée le</Text>
                <Text style={styles.detailValue}>{formatDate(registration.confirmed_at)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tickets List - For billetterie type */}
        {registration.tickets && registration.tickets.length > 0 && (
          <View style={styles.ticketsCard}>
            <Text style={styles.sectionTitle}>Mes billets</Text>
            {registration.tickets.map((ticket: any, index: number) => {
              const ticketType = typeof ticket.ticket_type === 'object' ? ticket.ticket_type : null;
              const ticketStatus = ticket.status || 'confirmed';
              const ticketStatusConfig = getStatusConfig(ticketStatus);

              return (
                <TouchableOpacity
                  key={ticket.id || index}
                  style={styles.ticketItem}
                  onPress={() => {
                    if (ticket.id) {
                      navigation.navigate('QRCode', { ticketId: ticket.id });
                    }
                  }}
                >
                  <View style={styles.ticketItemLeft}>
                    <View style={styles.ticketIconContainer}>
                      <Ionicons name="ticket" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.ticketItemInfo}>
                      <Text style={styles.ticketItemName}>
                        {ticketType?.name || ticket.ticket_type_name || 'Billet'}
                      </Text>
                      <View style={styles.ticketItemMeta}>
                        <Text style={styles.ticketItemQuantity}>
                          Qté: {ticket.quantity || 1}
                        </Text>
                        <View style={[styles.ticketItemStatusBadge, { backgroundColor: ticketStatusConfig.bg }]}>
                          <Text style={[styles.ticketItemStatusText, { color: ticketStatusConfig.color }]}>
                            {ticketStatusConfig.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.ticketItemRight}>
                    <Text style={styles.ticketItemPrice}>
                      {ticket.total_price ? `${Number(ticket.total_price).toLocaleString()} FCFA` : 'Gratuit'}
                    </Text>
                    {/* Transfer button */}
                    {ticket.is_paid && !ticket.is_checked_in && (
                      <TouchableOpacity
                        style={styles.transferButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          const ticketType = typeof ticket.ticket_type === 'object' ? ticket.ticket_type : null;
                          setSelectedTicketForTransfer({
                            id: ticket.id,
                            ticket_type_name: ticketType?.name || ticket.ticket_type_name || 'Billet',
                            quantity: ticket.quantity || 1,
                          });
                          setTransferModalVisible(true);
                        }}
                      >
                        <Ionicons name="gift-outline" size={18} color={Colors.primary} />
                      </TouchableOpacity>
                    )}
                    <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
                  </View>
                </TouchableOpacity>
              );
            })}
            {/* Total des billets */}
            <View style={styles.ticketsTotalRow}>
              <Text style={styles.ticketsTotalLabel}>
                Total ({registration.tickets.reduce((sum: number, t: any) => sum + (t.quantity || 1), 0)} billet{registration.tickets.reduce((sum: number, t: any) => sum + (t.quantity || 1), 0) > 1 ? 's' : ''})
              </Text>
              <Text style={styles.ticketsTotalValue}>
                {registration.tickets.reduce((sum: number, t: any) => sum + (Number(t.total_price) || 0), 0).toLocaleString()} FCFA
              </Text>
            </View>
          </View>
        )}

        {/* Form Data */}
        {registration.form_data && Object.keys(registration.form_data).length > 0 && (
          <View style={styles.formDataCard}>
            <Text style={styles.sectionTitle}>Informations fournies</Text>
            {Object.entries(registration.form_data).map(([key, value]) => (
              <View key={key} style={styles.formDataRow}>
                <Text style={styles.formDataLabel}>{key}</Text>
                <Text style={styles.formDataValue}>{String(value)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <View style={styles.instructionItem}>
            <View style={[styles.instructionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Ionicons name="scan-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.instructionText}>
              Le QR code sera scanné à l'entrée
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={[styles.instructionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Ionicons name="phone-portrait-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.instructionText}>
              Gardez votre téléphone chargé
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={[styles.instructionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Ionicons name="time-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.instructionText}>
              Arrivez à l'heure pour éviter les files
            </Text>
          </View>
        </View>

        {/* Actions */}
        {isActive && (
          <View style={styles.actionsSection}>
            {/* Buy more tickets - for confirmed billetterie registrations */}
            {(registration.status === 'confirmed' || registration.status === 'completed') &&
              registration.tickets && registration.tickets.length > 0 && (
              <TouchableOpacity
                style={styles.buyMoreButton}
                onPress={() => {
                  const eventId = (typeof registration.event === 'string' ? registration.event : event?.id);
                  if (eventId) {
                    navigation.navigate('TicketPurchase', { eventId, additionalTickets: true });
                  }
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                <Text style={styles.buyMoreButtonText}>Acheter plus de billets</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelRegistration}
            >
              <Ionicons name="close-circle-outline" size={20} color={Colors.error} />
              <Text style={styles.cancelButtonText}>Annuler mon inscription</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: Spacing.xl * 2 }} />
      </ScrollView>

      {/* Transfer Ticket Modal */}
      <TransferTicketModal
        visible={transferModalVisible}
        onClose={() => {
          setTransferModalVisible(false);
          setSelectedTicketForTransfer(null);
        }}
        ticket={selectedTicketForTransfer}
        onTransferComplete={() => {
          fetchRegistration();
        }}
      />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  reminderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderButtonActive: {
    backgroundColor: Colors.primaryLight,
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
    backgroundColor: Colors.primaryBg,
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
    borderColor: '#8B5CF6',
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
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
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

  // Tickets List
  ticketsCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  ticketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  ticketItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ticketIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketItemInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  ticketItemName: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  ticketItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  ticketItemQuantity: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  ticketItemStatusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  ticketItemStatusText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
  },
  ticketItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ticketItemPrice: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
  transferButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketsTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
  },
  ticketsTotalLabel: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
  },
  ticketsTotalValue: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.primary,
  },

  // Form Data
  formDataCard: {
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
  formDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  formDataLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    flex: 1,
  },
  formDataValue: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray900,
    flex: 2,
    textAlign: 'right',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    flex: 1,
  },

  // Actions
  actionsSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  buyMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  buyMoreButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  cancelButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.error,
  },

  // Online Access Card
  onlineAccessCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  onlineAccessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  onlineAccessTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: '#1D4ED8',
  },
  onlinePlatform: {
    fontSize: FontSizes.sm,
    color: '#3B82F6',
    marginBottom: Spacing.xs,
  },
  onlineInstructions: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  onlineMeetingDetails: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  meetingDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  meetingDetailLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  meetingDetailValue: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray900,
  },
  joinOnlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  joinOnlineButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  eventezVisioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  eventezVisioText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
});
