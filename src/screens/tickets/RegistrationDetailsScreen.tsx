import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Dimensions,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { registrationsAPI, ticketTransfersAPI, paymentsAPI } from '../../api';
import { Registration, RootStackParamList } from '../../types';
import { TransferTicketModal } from '../../components/tickets';
import { useOfflineTickets, useEventReminders } from '../../hooks';
import { isPaymentSuccess, isPaymentFailed } from '../../hooks/usePaymentVerification';
import {
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
} from '../../constants/theme';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RegistrationDetailsRouteProp = RouteProp<RootStackParamList, 'RegistrationDetails'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QR_SIZE = SCREEN_WIDTH - Spacing.xl * 4;

export default function RegistrationDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RegistrationDetailsRouteProp>();
  const { registrationId } = route.params;
  const { showError, showSuccess, showConfirm } = useAlert();
  const { colors, isDark } = useTheme();

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
  const [verifyingPayment, setVerifyingPayment] = useState(false);

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
      if (__DEV__) console.error('Error fetching registration:', error);
      showError('Erreur', 'Impossible de charger les détails de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleAlreadyPaid = async () => {
    const paymentId = registration?.payment_info?.id || registration?.payment;
    if (!paymentId) {
      showError('Erreur', 'Aucun paiement associé à cette inscription');
      return;
    }
    setVerifyingPayment(true);
    try {
      const response = await paymentsAPI.verifyPayment(paymentId);
      const data = response.data;
      const status = (data?.status || data?.payment_status || data?.payment?.status || '').toLowerCase();

      if (isPaymentSuccess(status)) {
        showSuccess('Paiement confirmé', 'Votre paiement a été vérifié avec succès !');
        fetchRegistration(); // Refresh to show updated status
      } else if (isPaymentFailed(status)) {
        showError('Paiement échoué', data?.message || 'Le paiement n\'a pas abouti. Veuillez réessayer.');
      } else {
        showError('En cours', 'Le paiement est toujours en cours de traitement. Réessayez dans quelques instants.');
      }
    } catch (error: any) {
      if (__DEV__) console.error('[RegistrationDetails] Payment verification error:', error);
      showError(
        'Erreur de vérification',
        error?.response?.data?.message || 'Impossible de vérifier le paiement. Vérifiez votre connexion et réessayez.'
      );
    } finally {
      setVerifyingPayment(false);
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
      if (__DEV__) console.error('Error sharing:', error);
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
      return { color: colors.warning, bg: colors.warningLight, label: 'En attente de validation', icon: 'hourglass-outline' };
    }
    switch (status) {
      case 'confirmed':
      case 'completed':
        return { color: colors.success, bg: colors.successLight, label: 'Confirmée', icon: 'checkmark-circle' };
      case 'pending':
      case 'pending_approval':
        return { color: colors.warning, bg: colors.warningLight, label: 'En attente', icon: 'time' };
      case 'cancelled':
        return { color: colors.error, bg: colors.errorLight, label: 'Annulée', icon: 'close-circle' };
      case 'rejected':
        return { color: colors.error, bg: colors.errorLight, label: 'Refusée', icon: 'close-circle' };
      case 'checked_in':
        return { color: colors.success, bg: colors.successLight, label: 'Validée', icon: 'checkmark-done-circle' };
      default:
        return { color: colors.gray500, bg: colors.gray100, label: status || 'Inconnu', icon: 'help-circle' };
    }
  };

  if (loading) {
    return (
      <LoadingSpinner />
    );
  }

  if (!registration) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>INS</WatermarkNumeral>
        <View style={{ flex: 1, zIndex: 1 }}>
          <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.gray100 }]}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={colors.gray900} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Inscription</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.gray400} />
            <Text style={[styles.errorText, { color: colors.gray500 }]}>Inscription non trouvée</Text>
          </View>
        </View>
      </EditorialCanvas>
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
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>INS</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.gray100 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.gray900} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>
          {isBilletterie
            ? `Mes Billets (${totalTicketQuantity})`
            : 'Mon Inscription'}
        </Text>
        <View style={styles.headerActions}>
          {/* Reminder Button */}
          {isActive && permissionGranted && (
            <TouchableOpacity
              style={[styles.reminderButton, reminderEnabled && { backgroundColor: colors.primaryBg }]}
              onPress={handleToggleReminder}
            >
              <Ionicons
                name={reminderEnabled ? 'notifications' : 'notifications-outline'}
                size={22}
                color={reminderEnabled ? colors.primary : colors.gray600}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={colors.gray900} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Registration Card — editorial ticket (AIDesigner) */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray200, shadowColor: colors.primary }]}>
          {/* Event Info */}
          <View style={styles.eventInfo}>
            <View style={styles.topRow}>
              <View style={[styles.typeBadge, { backgroundColor: colors.accent }]}>
                <Ionicons name={isBilletterie ? "ticket" : "document-text"} size={12} color="#FFFFFF" />
                <Text style={styles.typeBadgeText}>
                  {isBilletterie ? `${totalTicketQuantity} Billet${totalTicketQuantity > 1 ? 's' : ''}` : 'Inscription'}
                </Text>
              </View>
              {event?.start_date && (
                <Text style={[styles.dateEyebrow, { color: colors.accent }]}>
                  {formatDate(event.start_date)}
                </Text>
              )}
            </View>

            <Text style={[styles.eventTitle, { color: colors.gray900 }]} numberOfLines={2}>
              {event?.title || 'Événement'}
            </Text>

            <View style={styles.eventMeta}>
              {event?.start_date && (
                <View style={styles.eventMetaItem}>
                  <Ionicons name="calendar-outline" size={16} color={colors.accent} />
                  <Text style={[styles.eventMetaText, { color: colors.gray600 }]}>{formatDate(event.start_date)}</Text>
                </View>
              )}
              {event?.start_date && (
                <View style={styles.eventMetaItem}>
                  <Ionicons name="time-outline" size={16} color={colors.primary} />
                  <Text style={[styles.eventMetaText, { color: colors.gray600 }]}>{formatTime(event.start_date)}</Text>
                </View>
              )}
              {event?.location_type === 'online' ? (
                <View style={styles.eventMetaItem}>
                  <Ionicons name="videocam-outline" size={16} color={colors.primary} />
                  <Text style={[styles.eventMetaText, { color: colors.gray600 }]}>Événement en ligne</Text>
                </View>
              ) : event?.location_type === 'hybrid' ? (
                <>
                  <View style={styles.eventMetaItem}>
                    <Ionicons name="location-outline" size={16} color={colors.primary} />
                    <Text style={[styles.eventMetaText, { color: colors.gray600 }]}>
                      {event.location_name || event.location_city}
                    </Text>
                  </View>
                  <View style={styles.eventMetaItem}>
                    <Ionicons name="videocam-outline" size={16} color={colors.primary} />
                    <Text style={[styles.eventMetaText, { color: colors.gray600 }]}>+ Option en ligne</Text>
                  </View>
                </>
              ) : !!(event?.location_name || event?.location_city) && (
                <View style={styles.eventMetaItem}>
                  <Ionicons name="location-outline" size={16} color={colors.primary} />
                  <Text style={[styles.eventMetaText, { color: colors.gray600 }]}>
                    {event.location_name || event.location_city}
                  </Text>
                </View>
              )}
            </View>

            {/* View Event Button */}
            <TouchableOpacity
              style={[styles.viewEventButton, { backgroundColor: colors.primaryBg }]}
              onPress={() => {
                const eventId = (typeof registration.event === 'string' ? registration.event : event?.id);
                if (eventId) {
                  navigation.navigate('EventDetails', { eventId });
                }
              }}
            >
              <Ionicons name="eye-outline" size={18} color={colors.primary} />
              <Text style={[styles.viewEventButtonText, { color: colors.primary }]}>Voir les détails de l'événement</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>

            {/* Online Event Access Card */}
            {(event?.location_type === 'online' || event?.location_type === 'hybrid') && (
              <View style={[styles.onlineAccessCard, { backgroundColor: isDark ? colors.infoBg || '#10182D' : '#EFF6FF', borderColor: isDark ? colors.infoBorder || '#1C3A5C' : '#DBEAFE' }]}>
                <View style={styles.onlineAccessHeader}>
                  <Ionicons name="videocam" size={20} color={colors.info} />
                  <Text style={[styles.onlineAccessTitle, { color: isDark ? colors.info : '#1D4ED8' }]}>Accès à l'événement en ligne</Text>
                </View>
                {event.online_platform && (
                  <Text style={[styles.onlinePlatform, { color: colors.info }]}>Via {event.online_platform}</Text>
                )}
                {event.online_instructions && (
                  <Text style={[styles.onlineInstructions, { color: colors.gray600 }]}>{event.online_instructions}</Text>
                )}
                {!!(event.online_meeting_id || event.online_passcode) && (
                  <View style={[styles.onlineMeetingDetails, { backgroundColor: colors.card }]}>
                    {event.online_meeting_id && (
                      <View style={styles.meetingDetailRow}>
                        <Text style={[styles.meetingDetailLabel, { color: colors.gray500 }]}>ID de réunion :</Text>
                        <Text style={[styles.meetingDetailValue, { color: colors.gray900 }]}>{event.online_meeting_id}</Text>
                      </View>
                    )}
                    {event.online_passcode && (
                      <View style={styles.meetingDetailRow}>
                        <Text style={[styles.meetingDetailLabel, { color: colors.gray500 }]}>Code d'accès :</Text>
                        <Text style={[styles.meetingDetailValue, { color: colors.gray900 }]}>{event.online_passcode}</Text>
                      </View>
                    )}
                  </View>
                )}
                {event.online_url ? (
                  <TouchableOpacity
                    style={[styles.joinOnlineButton, { backgroundColor: colors.info }]}
                    onPress={() => {
                      Linking.openURL(event.online_url!).catch(() => {
                        showError('Erreur', 'Impossible d\'ouvrir le lien de l\'événement');
                      });
                    }}
                  >
                    <Ionicons name="videocam" size={18} color="#FFFFFF" />
                    <Text style={styles.joinOnlineButtonText}>Rejoindre l'événement</Text>
                  </TouchableOpacity>
                ) : event.online_platform?.toLowerCase() === 'eventez_visio' || event.online_platform?.toLowerCase() === 'eventez visio' ? (
                  <View style={[styles.eventezVisioInfo, { backgroundColor: isDark ? colors.infoBg || '#10182D' : '#F0F9FF' }]}>
                    <Ionicons name="information-circle" size={18} color={colors.info} />
                    <Text style={[styles.eventezVisioText, { color: colors.gray600 }]}>
                      La visioconférence EventEz sera disponible le jour de l'événement
                    </Text>
                  </View>
                ) : !event.online_meeting_id && !event.online_passcode ? (
                  <View style={[styles.eventezVisioInfo, { backgroundColor: isDark ? colors.infoBg || '#10182D' : '#F0F9FF' }]}>
                    <Ionicons name="time-outline" size={18} color={colors.gray500} />
                    <Text style={[styles.eventezVisioText, { color: colors.gray600 }]}>
                      Les informations de connexion seront communiquées avant l'événement
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerCircleLeft, { backgroundColor: colors.background }]} />
            <View style={[styles.dividerLine, { borderColor: colors.gray200 }]} />
            <View style={[styles.dividerCircleRight, { backgroundColor: colors.background }]} />
          </View>

          {/* QR Code Section — scanner-style frame (AIDesigner) */}
          <View style={styles.qrSection}>
            <View style={styles.qrFrame}>
              <View style={[styles.qrContainer, { borderColor: colors.gray100, backgroundColor: '#FFFFFF' }]}>
                {registration.qr_code ? (
                  <Image
                    source={registration.qr_code}
                    style={styles.qrImage}
                    contentFit="contain"
                    cachePolicy="disk"
                    transition={200}
                  />
                ) : (
                  <View style={styles.qrPlaceholder}>
                    <View style={[styles.qrPlaceholderInner, { backgroundColor: colors.primaryBg }]}>
                      <Ionicons name="qr-code" size={80} color={colors.primary} />
                    </View>
                  </View>
                )}
              </View>
              {/* Scanner corners (editorial QR frame) */}
              <View style={[styles.qrCorner, styles.qrCornerTL, { borderColor: colors.primary }]} />
              <View style={[styles.qrCorner, styles.qrCornerTR, { borderColor: colors.primary }]} />
              <View style={[styles.qrCorner, styles.qrCornerBL, { borderColor: colors.primary }]} />
              <View style={[styles.qrCorner, styles.qrCornerBR, { borderColor: colors.primary }]} />
            </View>
            <View style={styles.qrHintRow}>
              <Ionicons name="scan-outline" size={14} color={colors.gray500} />
              <Text style={[styles.qrHint, { color: colors.gray500 }]}>
                Présentez ce code à l'entrée
              </Text>
            </View>
          </View>

          {/* Registration Details */}
          <View style={[styles.detailsSection, { backgroundColor: colors.gray50 }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.gray500 }]}>Statut</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.gray500 }]}>Référence</Text>
              <Text style={[styles.detailValue, { color: colors.gray900 }]}>{registration.reference_code}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.gray500 }]}>Date d'inscription</Text>
              <Text style={[styles.detailValue, { color: colors.gray900 }]}>{formatDate(registration.created_at)}</Text>
            </View>
            {registration.confirmed_at && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.gray500 }]}>Confirmée le</Text>
                <Text style={[styles.detailValue, { color: colors.gray900 }]}>{formatDate(registration.confirmed_at)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tickets List - For billetterie type */}
        {registration.tickets && registration.tickets.length > 0 && (
          <View style={[styles.ticketsCard, { backgroundColor: colors.card, borderColor: colors.gray200 }]}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Mes billets</Text>
            {registration.tickets.map((ticket: any, index: number) => {
              const ticketType = typeof ticket.ticket_type === 'object' ? ticket.ticket_type : null;
              const ticketStatus = ticket.status || 'confirmed';
              const ticketStatusConfig = getStatusConfig(ticketStatus);

              return (
                <TouchableOpacity
                  key={ticket.id || index}
                  style={[styles.ticketItem, { borderBottomColor: colors.gray100 }]}
                  onPress={() => {
                    if (ticket.id) {
                      navigation.navigate('QRCode', { ticketId: ticket.id });
                    }
                  }}
                >
                  <View style={styles.ticketItemLeft}>
                    <View style={[styles.ticketIconContainer, { backgroundColor: colors.primaryBg }]}>
                      <Ionicons name="ticket" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.ticketItemInfo}>
                      <Text style={[styles.ticketItemName, { color: colors.gray900 }]}>
                        {ticketType?.name || ticket.ticket_type_name || 'Billet'}
                      </Text>
                      <View style={styles.ticketItemMeta}>
                        <Text style={[styles.ticketItemQuantity, { color: colors.gray500 }]}>
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
                    <Text style={[styles.ticketItemPrice, { color: colors.primary }]}>
                      {ticket.total_price ? `${Number(ticket.total_price).toLocaleString()} ${event?.currency || 'FCFA'}` : 'Gratuit'}
                    </Text>
                    {/* Transfer button */}
                    {ticket.is_paid && !ticket.is_checked_in && (
                      <TouchableOpacity
                        style={[styles.transferButton, { backgroundColor: colors.primaryBg }]}
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
                        <Ionicons name="gift-outline" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                    <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
                  </View>
                </TouchableOpacity>
              );
            })}
            {/* Total des billets */}
            <View style={styles.ticketsTotalRow}>
              <Text style={[styles.ticketsTotalLabel, { color: colors.gray700 }]}>
                Total ({registration.tickets.reduce((sum: number, t: any) => sum + (t.quantity || 1), 0)} billet{registration.tickets.reduce((sum: number, t: any) => sum + (t.quantity || 1), 0) > 1 ? 's' : ''})
              </Text>
              <Text style={[styles.ticketsTotalValue, { color: colors.primary }]}>
                {registration.tickets.reduce((sum: number, t: any) => sum + (Number(t.total_price) || 0), 0).toLocaleString()} {event?.currency || 'FCFA'}
              </Text>
            </View>
          </View>
        )}

        {/* Form Data */}
        {registration.form_data && Object.keys(registration.form_data).length > 0 && (
          <View style={[styles.formDataCard, { backgroundColor: colors.card, borderColor: colors.gray200 }]}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Informations fournies</Text>
            {Object.entries(registration.form_data).map(([key, value]) => (
              <View key={key} style={[styles.formDataRow, { borderBottomColor: colors.gray100 }]}>
                <Text style={[styles.formDataLabel, { color: colors.gray500 }]}>{key}</Text>
                <Text style={[styles.formDataValue, { color: colors.gray900 }]}>{String(value)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <View style={styles.instructionItem}>
            <View style={[styles.instructionIcon, { backgroundColor: colors.primaryBg }]}>
              <Ionicons name="scan-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.instructionText, { color: colors.gray600 }]}>
              Le QR code sera scanné à l'entrée
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={[styles.instructionIcon, { backgroundColor: colors.primaryBg }]}>
              <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.instructionText, { color: colors.gray600 }]}>
              Gardez votre téléphone chargé
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={[styles.instructionIcon, { backgroundColor: colors.primaryBg }]}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.instructionText, { color: colors.gray600 }]}>
              Arrivez à l'heure pour éviter les files
            </Text>
          </View>
        </View>

        {/* Actions */}
        {isActive && (
          <View style={styles.actionsSection}>
            {/* "J'ai déjà payé" button - for pending registrations with payment (skip if already confirmed) */}
            {registration.status === 'pending' && (registration.payment_info?.id || registration.payment) && (
              <TouchableOpacity
                style={[styles.alreadyPaidButton, { backgroundColor: colors.card, borderColor: colors.success }]}
                onPress={handleAlreadyPaid}
                disabled={verifyingPayment}
                activeOpacity={0.7}
              >
                {verifyingPayment ? (
                  <ActivityIndicator size="small" color={colors.success} />
                ) : (
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                )}
                <Text style={[styles.alreadyPaidButtonText, { color: colors.success }]}>
                  {verifyingPayment ? 'Vérification en cours...' : "J'ai déjà payé"}
                </Text>
              </TouchableOpacity>
            )}
            {/* Buy more tickets - for confirmed billetterie registrations */}
            {(registration.status === 'confirmed' || registration.status === 'completed') &&
              registration.tickets && registration.tickets.length > 0 && (
              <TouchableOpacity
                style={[styles.buyMoreButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
                onPress={() => {
                  const eventId = (typeof registration.event === 'string' ? registration.event : event?.id);
                  if (eventId) {
                    navigation.navigate('TicketPurchase', { eventId, additionalTickets: true });
                  }
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.buyMoreButtonText, { color: colors.primary }]}>Acheter plus de billets</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.errorLight, borderColor: colors.error }]}
              onPress={handleCancelRegistration}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.error} />
              <Text style={[styles.cancelButtonText, { color: colors.error }]}>Annuler mon inscription</Text>
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
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.base,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
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
  },

  scrollView: {
    flex: 1,
  },

  // Card
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 6,
  },

  // Event Info
  eventInfo: {
    padding: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  typeBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  dateEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  eventTitle: {
    fontSize: FontSizes['2xl'],
    fontFamily: FontFamily.displayExtraBold,
    marginBottom: Spacing.md,
    letterSpacing: -0.5,
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
  },
  viewEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginLeft: -12,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  dividerCircleRight: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: -12,
  },

  // QR Section
  qrSection: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  qrFrame: {
    position: 'relative',
    padding: 14,
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  // Scanner corners
  qrCorner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#4F46E5',
  },
  qrCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  qrCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  qrCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  qrCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  qrHint: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    fontFamily: FontFamily.medium,
  },

  // Details Section
  detailsSection: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: FontSizes.sm,
  },
  detailValue: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
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
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  ticketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
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
  },
  ticketItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  ticketItemQuantity: {
    fontSize: FontSizes.sm,
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
  },
  transferButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  },
  ticketsTotalValue: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
  },

  // Form Data
  formDataCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    marginBottom: Spacing.md,
  },
  formDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  formDataLabel: {
    fontSize: FontSizes.sm,
    flex: 1,
  },
  formDataValue: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
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
    flex: 1,
  },

  // Actions
  actionsSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  alreadyPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  alreadyPaidButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
  },
  buyMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  buyMoreButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
  },

  // Online Access Card
  onlineAccessCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
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
  },
  onlinePlatform: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.xs,
  },
  onlineInstructions: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  onlineMeetingDetails: {
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
  },
  meetingDetailValue: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
  },
  joinOnlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  joinOnlineButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: '#FFFFFF',
  },
  eventezVisioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  eventezVisioText: {
    flex: 1,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
});
