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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

import { registrationsAPI, ticketTransfersAPI, paymentsAPI } from '../../api';
import { getVerificationUrl } from '../../constants/urls';
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
import {
  EditorialCanvas,
  WatermarkNumeral,
  EditorialHeader,
  EditorialPillCTA,
  editorial,
  EditorialColors,
} from '../../components/ui/editorial';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RegistrationDetailsRouteProp = RouteProp<RootStackParamList, 'RegistrationDetails'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// QR size : prend en compte card margin (lg×2) + section padding (lg×2) +
// qrFrame padding (14×2) + qrContainer padding (md×2) + border + ~12px de
// respiration sur chaque côté pour que les coins du scanner ne touchent pas
// le bord de la carte.
const QR_SIZE = Math.min(SCREEN_WIDTH - Spacing['2xl'] * 5, 260);

export default function RegistrationDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
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

  // Sessions auxquelles ce billet donne effectivement accès, calculées
  // côté backend à partir des `included_sessions` du ticket_type acheté
  // (union, ou toutes les sessions si l'un des billets est all-access).
  // Vide → pas d'agenda configuré ou inscription pas confirmée, on cache.
  const [sessions, setSessions] = useState<any[]>([]);

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

  // Charge les sessions accessibles avec ce billet, en respectant la
  // restriction par included_sessions du ticket_type (cf. backend
  // RegistrationViewSet.accessible_sessions).
  useEffect(() => {
    if (!registration) return;
    // On ne charge que pour les inscriptions actives — sinon l'agenda
    // n'a pas de sens à afficher (et l'endpoint refuserait de toute façon
    // pour un cancelled / rejected via l'UX).
    const status = registration.status;
    if (status === 'cancelled' || status === 'rejected') {
      setSessions([]);
      return;
    }

    let active = true;
    registrationsAPI.getAccessibleSessions(String(registration.id))
      .then((res: any) => {
        if (!active) return;
        const data = res?.data?.results || res?.data || [];
        setSessions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setSessions([]);
      });
    return () => {
      active = false;
    };
  }, [registration]);

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
          <EditorialHeader
            eyebrow="BILLETTERIE"
            title="Inscription"
            back
            onBack={() => navigation.goBack()}
          />
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

  // Détection du contexte d'événement pour adapter "Bon à savoir"
  const locationType = event?.location_type;
  const isOnlineEvent = locationType === 'online';
  const isHybridEvent = locationType === 'hybrid';

  // Instructions dynamiques selon le type de billet/événement
  // Inscription → conseils d'organisation ; Online → connexion ;
  // Hybride → mix QR + connexion ; Présentiel → QR + arrivée
  const instructions: { icon: string; color: string; text: string }[] = !isBilletterie
    ? [
        { icon: 'mail-outline', color: colors.primary, text: 'Vérifie ta boîte mail — la confirmation contient ton récap' },
        { icon: 'id-card-outline', color: colors.accent, text: 'Garde une pièce d\'identité à portée de main' },
        { icon: 'time-outline', color: '#A855F7', text: 'Arrive à l\'heure pour ne rien manquer' },
      ]
    : isOnlineEvent
    ? [
        { icon: 'wifi-outline', color: colors.primary, text: 'Teste ta connexion internet quelques minutes avant' },
        { icon: 'volume-high-outline', color: colors.accent, text: 'Vérifie ton micro et tes haut-parleurs' },
        { icon: 'log-in-outline', color: '#A855F7', text: 'Rejoins le live 5 min avant le début' },
      ]
    : isHybridEvent
    ? [
        { icon: 'scan-outline', color: colors.primary, text: 'QR code à scanner si tu viens sur place' },
        { icon: 'wifi-outline', color: colors.accent, text: 'Sinon teste ta connexion pour le live' },
        { icon: 'phone-portrait-outline', color: '#A855F7', text: 'Garde ton téléphone chargé dans tous les cas' },
      ]
    : [
        { icon: 'scan-outline', color: colors.primary, text: 'Le QR code sera scanné à l\'entrée' },
        { icon: 'phone-portrait-outline', color: colors.accent, text: 'Garde ton téléphone chargé' },
        { icon: 'time-outline', color: '#A855F7', text: 'Arrive à l\'heure pour éviter les files' },
      ];

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>INS</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>
      {/* Header éditorial : eyebrow contextuel + actions discrètes à droite */}
      <EditorialHeader
        eyebrow={isBilletterie ? `${totalTicketQuantity} BILLET${totalTicketQuantity > 1 ? 'S' : ''} · ${registration.reference_code}` : `INSCRIPTION · ${registration.reference_code}`}
        title={isBilletterie ? 'Mes billets' : 'Mon inscription'}
        back
        onBack={() => navigation.goBack()}
        right={
          <View style={styles.headerActions}>
            {isActive && permissionGranted && (
              <TouchableOpacity
                style={[styles.headerIconBtn, reminderEnabled && { backgroundColor: colors.primaryBg }]}
                onPress={handleToggleReminder}
                accessibilityLabel="Activer le rappel d'événement"
              >
                <Ionicons
                  name={reminderEnabled ? 'notifications' : 'notifications-outline'}
                  size={20}
                  color={reminderEnabled ? colors.primary : colors.gray700}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={handleShare}
              accessibilityLabel="Partager"
            >
              <Ionicons name="share-outline" size={20} color={colors.gray700} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Registration Card — editorial ticket (AIDesigner) */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray200, shadowColor: colors.primary }]}>
          {/* Event Info — header éditorial avec date tile orange + type pill */}
          <View style={styles.eventInfo}>
            {/* Top row : type pill (BILLETTERIE / INSCRIPTION) + eyebrow catégorie */}
            <View style={styles.typePillRow}>
              <View style={[
                styles.typePill,
                { backgroundColor: isBilletterie ? `${colors.primary}15` : '#A855F715' },
              ]}>
                <Ionicons
                  name={isBilletterie ? 'ticket' : 'document-text'}
                  size={10}
                  color={isBilletterie ? colors.primary : '#A855F7'}
                />
                <Text style={[
                  styles.typePillText,
                  { color: isBilletterie ? colors.primary : '#A855F7' },
                ]}>
                  {isBilletterie ? 'BILLETTERIE' : 'INSCRIPTION'}
                </Text>
              </View>
              {event?.category?.name && (
                <Text style={[styles.categoryEyebrow, { color: colors.gray500 }]} numberOfLines={1}>
                  · {event.category.name.toUpperCase()}
                </Text>
              )}
            </View>

            {/* Hero row : titre extra-bold + date tile orange à droite */}
            <View style={styles.heroRow}>
              <View style={{ flex: 1, paddingRight: Spacing.md }}>
                <Text style={[styles.heroTitle, { color: colors.gray900 }]} numberOfLines={3}>
                  {event?.title || 'Événement'}
                </Text>
              </View>
              {event?.start_date && (
                <View style={[styles.dateTile, { backgroundColor: `${colors.accent}1A` }]}>
                  <Text style={[styles.dateTileDay, { color: colors.accent }]}>
                    {new Date(event.start_date).getDate().toString().padStart(2, '0')}
                  </Text>
                  <Text style={[styles.dateTileMonth, { color: colors.accent }]}>
                    {new Date(event.start_date).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase().replace('.', '')}
                  </Text>
                </View>
              )}
            </View>

            {/* Meta chips horizontaux : date complète, heure, lieu */}
            <View style={styles.metaChipsRow}>
              {event?.start_date && (
                <View style={[styles.metaChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                  <Ionicons name="calendar-outline" size={12} color={colors.accent} />
                  <Text style={[styles.metaChipText, { color: colors.gray700 }]}>
                    {formatDate(event.start_date)}
                  </Text>
                </View>
              )}
              {event?.start_date && (
                <View style={[styles.metaChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                  <Ionicons name="time-outline" size={12} color={colors.primary} />
                  <Text style={[styles.metaChipText, { color: colors.gray700 }]}>
                    {formatTime(event.start_date)}
                  </Text>
                </View>
              )}
              {event?.location_type === 'online' && (
                <View style={[styles.metaChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                  <Ionicons name="videocam-outline" size={12} color={colors.primary} />
                  <Text style={[styles.metaChipText, { color: colors.gray700 }]}>En ligne</Text>
                </View>
              )}
              {event?.location_type === 'hybrid' && (
                <>
                  {!!(event?.location_name || event?.location_city) && (
                    <View style={[styles.metaChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                      <Ionicons name="location-outline" size={12} color={colors.primary} />
                      <Text style={[styles.metaChipText, { color: colors.gray700 }]} numberOfLines={1}>
                        {event.location_name || event.location_city}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.metaChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                    <Ionicons name="videocam-outline" size={12} color={colors.primary} />
                    <Text style={[styles.metaChipText, { color: colors.gray700 }]}>+ en ligne</Text>
                  </View>
                </>
              )}
              {event?.location_type !== 'online' && event?.location_type !== 'hybrid' && !!(event?.location_name || event?.location_city) && (
                <View style={[styles.metaChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                  <Ionicons name="location-outline" size={12} color={colors.primary} />
                  <Text style={[styles.metaChipText, { color: colors.gray700 }]} numberOfLines={1}>
                    {event.location_name || event.location_city}
                  </Text>
                </View>
              )}
            </View>

            {/* CTA discret "Voir l'événement" — chip avec flèche */}
            <TouchableOpacity
              style={[styles.editorialChipCTA, { backgroundColor: colors.gray100 }]}
              onPress={() => {
                const eventId = (typeof registration.event === 'string' ? registration.event : event?.id);
                if (eventId) navigation.navigate('EventDetails', { eventId });
              }}
              accessibilityRole="button"
              accessibilityLabel="Voir les détails de l'événement"
            >
              <Ionicons name="eye-outline" size={14} color={colors.gray700} />
              <Text style={[styles.editorialChipCTAText, { color: colors.gray800 }]}>
                Voir l'événement
              </Text>
              <Ionicons name="arrow-forward" size={14} color={colors.gray700} />
            </TouchableOpacity>

            {/* Online Event Access — section éditoriale dédiée */}
            {(event?.location_type === 'online' || event?.location_type === 'hybrid') && (
              <View style={styles.onlineSection}>
                <View style={styles.editorialSectionHead}>
                  <Text style={[editorial.eyebrowAccent]}>EN DIRECT · ACCÈS LIVE</Text>
                  <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>
                    Comment rejoindre
                  </Text>
                </View>
                {event.online_platform && (
                  <Text style={[styles.onlinePlatformChip, { color: colors.info }]}>
                    Via {event.online_platform}
                  </Text>
                )}
                {event.online_instructions && (
                  <Text style={[styles.onlineInstructions, { color: colors.gray600 }]}>
                    {event.online_instructions}
                  </Text>
                )}
                {!!(event.online_meeting_id || event.online_passcode) && (
                  <View style={[styles.onlineMeetingDetails, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {event.online_meeting_id && (
                      <View style={styles.meetingDetailRow}>
                        <Text style={[styles.meetingDetailLabel, { color: colors.gray500 }]}>ID DE RÉUNION</Text>
                        <Text style={[styles.meetingDetailValue, { color: colors.gray900 }]}>{event.online_meeting_id}</Text>
                      </View>
                    )}
                    {event.online_passcode && (
                      <View style={styles.meetingDetailRow}>
                        <Text style={[styles.meetingDetailLabel, { color: colors.gray500 }]}>CODE D'ACCÈS</Text>
                        <Text style={[styles.meetingDetailValue, { color: colors.gray900 }]}>{event.online_passcode}</Text>
                      </View>
                    )}
                  </View>
                )}
                {event.online_url ? (
                  <View style={{ marginTop: Spacing.md }}>
                    <EditorialPillCTA
                      eyebrow="OUVRIR"
                      label="Rejoindre maintenant"
                      onPress={() => {
                        Linking.openURL(event.online_url!).catch(() => {
                          showError('Erreur', 'Impossible d\'ouvrir le lien de l\'événement');
                        });
                      }}
                      tone="primary"
                      icon="videocam"
                    />
                  </View>
                ) : event.online_platform?.toLowerCase() === 'eventez_visio' || event.online_platform?.toLowerCase() === 'eventez visio' ? (
                  <View style={[styles.editorialNote, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                    <Ionicons name="time-outline" size={14} color="#92400E" />
                    <Text style={[styles.editorialNoteText, { color: '#78350F' }]}>
                      EventEz Visio indisponible pour le moment. L'organisateur communiquera le lien de connexion.
                    </Text>
                  </View>
                ) : !event.online_meeting_id && !event.online_passcode ? (
                  <View style={[styles.editorialNote, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                    <Ionicons name="time-outline" size={14} color={colors.gray500} />
                    <Text style={[styles.editorialNoteText, { color: colors.gray600 }]}>
                      Les infos de connexion arrivent avant l'événement.
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

          {/* Section QR
              - Inscription pure (sans billet) : génère un QR registration-level
                (`/verify/{registration.id}`) — c'est le sésame d'entrée.
              - Billetterie (avec billets) : pas de QR ici, chaque billet a son
                propre QR ticket-level accessible en tapant dessus. On affiche
                à la place une note pédagogique. */}
          {!isBilletterie ? (
            <View style={styles.qrSection}>
              <View style={styles.editorialSectionHead}>
                <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>
                  {isOnlineEvent ? 'RÉFÉRENCE · CODE UNIQUE' : 'SCANNER · ENTRÉE'}
                </Text>
                <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>
                  {isOnlineEvent ? 'Ton code de réservation' : 'Ton sésame'}
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <View style={styles.qrFrame}>
                  <View
                    style={[styles.qrContainer, { borderColor: colors.gray100, backgroundColor: '#FFFFFF' }]}
                    accessibilityLabel="QR code de l'inscription"
                    accessibilityRole="image"
                  >
                    <QRCode
                      value={getVerificationUrl(String(registration.id))}
                      size={QR_SIZE}
                      color={isDark ? '#4C1D95' : '#5B21B6'}
                      backgroundColor="#FFFFFF"
                    />
                  </View>
                  <View style={[styles.qrCorner, styles.qrCornerTL, { borderColor: colors.primary }]} />
                  <View style={[styles.qrCorner, styles.qrCornerTR, { borderColor: colors.primary }]} />
                  <View style={[styles.qrCorner, styles.qrCornerBL, { borderColor: colors.primary }]} />
                  <View style={[styles.qrCorner, styles.qrCornerBR, { borderColor: colors.primary }]} />
                </View>
                <View style={styles.qrHintRow}>
                  <Ionicons
                    name={isOnlineEvent ? 'shield-checkmark-outline' : 'scan-outline'}
                    size={12}
                    color={colors.gray500}
                  />
                  <Text style={[styles.qrHint, { color: colors.gray500 }]}>
                    {isOnlineEvent
                      ? 'À conserver — preuve de ta réservation'
                      : 'Présente ce code à l\'entrée'}
                  </Text>
                </View>
                <View style={[styles.qrExplain, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                  <Ionicons name="link-outline" size={12} color={colors.primary} />
                  <Text style={[styles.qrExplainText, { color: colors.gray600 }]}>
                    Lien unique vers ta page de validation — aucune donnée sensible n'est encodée
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.qrSection}>
              <View style={styles.editorialSectionHead}>
                <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>UN BILLET · UN QR</Text>
                <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>
                  Chaque billet a son propre code
                </Text>
              </View>
              <View style={[styles.qrTicketHint, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                <View style={[styles.qrTicketHintIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name="qr-code-outline" size={28} color={colors.primary} />
                </View>
                <View style={styles.qrTicketHintBody}>
                  <Text style={[styles.qrTicketHintTitle, { color: colors.gray900 }]}>
                    Tape sur un billet ci-dessous
                  </Text>
                  <Text style={[styles.qrTicketHintText, { color: colors.gray600 }]}>
                    Tu verras le QR à présenter à l'entrée. Chaque billet est scanné indépendamment.
                  </Text>
                </View>
                <Ionicons name="arrow-down" size={18} color={colors.gray400} />
              </View>
            </View>
          )}

          {/* Détails inscription — pattern éditorial (eyebrow / value verticales) */}
          <View style={styles.detailsSection}>
            <View style={styles.editorialSectionHead}>
              <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>RÉCAP · TES DONNÉES</Text>
              <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>Détails</Text>
            </View>

            {/* Statut en grand badge éditorial */}
            <View style={[styles.statusBadgeEditorial, { backgroundColor: statusConfig.bg }]}>
              <Ionicons name={statusConfig.icon as any} size={16} color={statusConfig.color} />
              <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>

            {/* Grille de paires verticales (eyebrow + valeur) */}
            <View style={styles.detailGrid}>
              <View style={styles.detailCell}>
                <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>RÉFÉRENCE</Text>
                <Text style={[styles.detailValueEditorial, { color: colors.gray900 }]}>
                  {registration.reference_code}
                </Text>
              </View>
              <View style={styles.detailCell}>
                <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>INSCRIT LE</Text>
                <Text style={[styles.detailValueEditorial, { color: colors.gray900 }]}>
                  {formatDate(registration.created_at)}
                </Text>
              </View>
              {registration.confirmed_at && (
                <View style={styles.detailCell}>
                  <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>CONFIRMÉE</Text>
                  <Text style={[styles.detailValueEditorial, { color: colors.gray900 }]}>
                    {formatDate(registration.confirmed_at)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Tickets List - For billetterie type */}
        {registration.tickets && registration.tickets.length > 0 && (
          <View style={[styles.ticketsCard, { backgroundColor: colors.card, borderColor: colors.gray200 }]}>
            <View style={styles.editorialSectionHead}>
              <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>BILLETTERIE</Text>
              <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>Mes billets</Text>
            </View>
            {registration.tickets.map((ticket: any, index: number) => {
              const ticketType = typeof ticket.ticket_type === 'object' ? ticket.ticket_type : null;
              const ticketStatus = ticket.status || 'confirmed';
              const ticketStatusConfig = getStatusConfig(ticketStatus);
              const ticketName = ticketType?.name || ticket.ticket_type_name || 'Billet';
              const ticketQty = ticket.quantity || 1;
              const ticketPrice = Number(ticket.total_price) || 0;

              return (
                <TouchableOpacity
                  key={ticket.id || index}
                  style={[styles.ticketStub, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (ticket.id) navigation.navigate('QRCode', { ticketId: ticket.id });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Billet ${ticketName}, quantité ${ticketQty}`}
                >
                  {/* Bloc gauche : tile indigo avec quantité (display bold) */}
                  <View style={[styles.ticketStubTile, { backgroundColor: colors.primary }]}>
                    <Text style={styles.ticketStubTileQty}>×{ticketQty}</Text>
                    <Text style={styles.ticketStubTileLabel}>
                      {ticketQty > 1 ? 'BILLETS' : 'BILLET'}
                    </Text>
                  </View>

                  {/* Corps central : nom (top) + status + prix inline (bottom) */}
                  <View style={styles.ticketStubBody}>
                    <Text style={[styles.ticketStubName, { color: colors.gray900 }]} numberOfLines={2}>
                      {ticketName}
                    </Text>
                    <View style={styles.ticketStubMetaRow}>
                      <View style={[styles.ticketStubStatus, { backgroundColor: ticketStatusConfig.bg }]}>
                        <Ionicons
                          name={ticketStatusConfig.icon as any}
                          size={10}
                          color={ticketStatusConfig.color}
                        />
                        <Text style={[styles.ticketStubStatusText, { color: ticketStatusConfig.color }]}>
                          {ticketStatusConfig.label.toUpperCase()}
                        </Text>
                      </View>
                      <Text
                        style={[styles.ticketStubPrice, { color: colors.gray900 }]}
                        numberOfLines={1}
                      >
                        {ticketPrice > 0
                          ? `${ticketPrice.toLocaleString()} ${event?.currency || 'FCFA'}`
                          : 'Gratuit'}
                      </Text>
                    </View>
                  </View>

                  {/* Bloc droit : actions compactes (chevron + gift) */}
                  <View style={styles.ticketStubRight}>
                    {ticket.is_paid && !ticket.is_checked_in && (
                      <TouchableOpacity
                        style={[styles.ticketStubGift, { borderColor: colors.primary }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedTicketForTransfer({
                            id: ticket.id,
                            ticket_type_name: ticketName,
                            quantity: ticketQty,
                          });
                          setTransferModalVisible(true);
                        }}
                        accessibilityLabel="Transférer ce billet"
                      >
                        <Ionicons name="gift-outline" size={12} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                    <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Total — barre en pied de section, eyebrow + chiffre display */}
            <View style={[styles.ticketsTotalEditorial, { borderTopColor: colors.border }]}>
              <View>
                <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>TOTAL</Text>
                <Text style={[styles.ticketsTotalSub, { color: colors.gray600 }]}>
                  {registration.tickets.reduce((sum: number, t: any) => sum + (t.quantity || 1), 0)} billet{registration.tickets.reduce((sum: number, t: any) => sum + (t.quantity || 1), 0) > 1 ? 's' : ''}
                </Text>
              </View>
              <Text style={[styles.ticketsTotalAmount, { color: colors.gray900 }]}>
                {registration.tickets.reduce((sum: number, t: any) => sum + (Number(t.total_price) || 0), 0).toLocaleString()} {event?.currency || 'FCFA'}
              </Text>
            </View>
          </View>
        )}

        {/* Form Data */}
        {registration.form_data && Object.keys(registration.form_data).length > 0 && (
          <View style={[styles.formDataCard, { backgroundColor: colors.card, borderColor: colors.gray200 }]}>
            <View style={styles.editorialSectionHead}>
              <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>RÉPONSES</Text>
              <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>Informations fournies</Text>
            </View>
            {Object.entries(registration.form_data).map(([key, value]) => (
              <View key={key} style={styles.formDataCellEditorial}>
                <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>{key.toUpperCase()}</Text>
                <Text style={[styles.formDataValueEditorial, { color: colors.gray900 }]}>
                  {String(value)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Sessions accessibles avec ce billet — visible si l'event a un agenda */}
        {sessions.length > 0 && (
          <View style={[styles.sessionsCard, { backgroundColor: colors.card, borderColor: colors.gray200 }]}>
            <View style={styles.editorialSectionHead}>
              <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>
                AGENDA · {sessions.length} SESSION{sessions.length > 1 ? 'S' : ''}
              </Text>
              <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>
                Tes sessions
              </Text>
            </View>
            {sessions.map((session: any) => {
              const startTime = session.start_time ? new Date(session.start_time) : null;
              const endTime = session.end_time ? new Date(session.end_time) : null;
              const requiresReg = !!session.requires_registration;
              const isRegistered = !!session.is_registered;
              const isFull = !!session.is_full;
              const isInWaitlist = !!session.is_in_waitlist;

              // Statut affiché selon le contexte
              let statusLabel: string;
              let statusColor: string;
              let statusBg: string;
              if (!requiresReg) {
                statusLabel = 'Accès libre';
                statusColor = colors.success;
                statusBg = colors.successLight;
              } else if (isRegistered) {
                statusLabel = 'Inscrit';
                statusColor = colors.primary;
                statusBg = `${colors.primary}15`;
              } else if (isInWaitlist) {
                statusLabel = `Attente${session.waitlist_position ? ` · #${session.waitlist_position}` : ''}`;
                statusColor = colors.warning;
                statusBg = colors.warningLight;
              } else if (isFull) {
                statusLabel = 'Complet';
                statusColor = colors.error;
                statusBg = colors.errorLight;
              } else {
                statusLabel = 'À inscrire';
                statusColor = colors.accent;
                statusBg = `${colors.accent}15`;
              }

              return (
                <TouchableOpacity
                  key={session.id}
                  style={[styles.sessionItem, { backgroundColor: colors.gray50, borderColor: colors.border }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    const eventId = (typeof registration.event === 'string' ? registration.event : event?.id);
                    if (eventId) navigation.navigate('EventDetails', { eventId });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Session ${session.title}, ${statusLabel}`}
                >
                  {/* Tile heure : HH:MM display */}
                  {startTime && (
                    <View style={[styles.sessionTimeTile, { backgroundColor: `${colors.primary}10` }]}>
                      <Text style={[styles.sessionTimeText, { color: colors.primary }]}>
                        {startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {endTime && (
                        <Text style={[styles.sessionTimeRange, { color: colors.primary }]}>
                          {`${Math.round((endTime.getTime() - startTime.getTime()) / 60000)} min`}
                        </Text>
                      )}
                    </View>
                  )}
                  {/* Corps : titre + lieu + status */}
                  <View style={styles.sessionBody}>
                    <Text style={[styles.sessionTitle, { color: colors.gray900 }]} numberOfLines={2}>
                      {session.title}
                    </Text>
                    <View style={styles.sessionMetaRow}>
                      {(session.location || session.room) && (
                        <View style={styles.sessionMetaItem}>
                          <Ionicons
                            name={session.is_virtual ? 'videocam-outline' : 'location-outline'}
                            size={11}
                            color={colors.gray500}
                          />
                          <Text style={[styles.sessionMetaText, { color: colors.gray600 }]} numberOfLines={1}>
                            {session.room || session.location}
                          </Text>
                        </View>
                      )}
                      <View style={[styles.sessionStatusPill, { backgroundColor: statusBg }]}>
                        <Text style={[styles.sessionStatusText, { color: statusColor }]}>
                          {statusLabel.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.gray400} />
                </TouchableOpacity>
              );
            })}
            <Text style={[styles.sessionsHint, { color: colors.gray500 }]}>
              Tape sur une session pour voir le détail dans l'agenda de l'événement
            </Text>
          </View>
        )}

        {/* Instructions — adaptées au type de billet/événement */}
        <View style={styles.instructions}>
          <View style={styles.editorialSectionHead}>
            <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>BON À SAVOIR</Text>
            <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>
              {!isBilletterie ? 'Avant l\'événement' : isOnlineEvent ? 'Préparer le live' : isHybridEvent ? 'Sur place ou en ligne' : 'Le jour J'}
            </Text>
          </View>
          {instructions.map((inst, idx) => (
            <View
              key={idx}
              style={[styles.instructionItem, { backgroundColor: colors.gray50, borderColor: colors.border }]}
            >
              <View style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: inst.color }]}>
                <Ionicons name={inst.icon as any} size={16} color={inst.color} />
              </View>
              <Text style={[styles.instructionText, { color: colors.gray700 }]}>
                {inst.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Actions principales — pill CTAs éditoriaux */}
        {isActive && (
          <View style={styles.actionsSection}>
            <View style={styles.editorialSectionHead}>
              <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>ACTIONS</Text>
              <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>
                {registration.status === 'pending' ? 'En attente' : 'Que veux-tu faire ?'}
              </Text>
            </View>

            {/* "J'ai déjà payé" — disponible pour les inscriptions pending avec paiement */}
            {registration.status === 'pending' && (registration.payment_info?.id || registration.payment) && (
              <EditorialPillCTA
                eyebrow="VÉRIFIER"
                label={verifyingPayment ? 'Vérification en cours…' : "J'ai déjà payé"}
                onPress={handleAlreadyPaid}
                loading={verifyingPayment}
                tone="lime"
                icon="checkmark-circle"
                accessibilityLabel="Confirmer que le paiement est effectué"
              />
            )}

            {/* Acheter plus — pour les inscriptions confirmées de type billetterie */}
            {(registration.status === 'confirmed' || registration.status === 'completed') &&
              registration.tickets && registration.tickets.length > 0 && (
              <EditorialPillCTA
                eyebrow="AJOUTER"
                label="Acheter plus de billets"
                onPress={() => {
                  const eventId = (typeof registration.event === 'string' ? registration.event : event?.id);
                  if (eventId) {
                    navigation.navigate('TicketPurchase', { eventId, additionalTickets: true });
                  }
                }}
                tone="primary"
                icon="add-circle"
              />
            )}

            <EditorialPillCTA
              eyebrow="RENONCER"
              label="Annuler mon inscription"
              onPress={handleCancelRegistration}
              tone="accent"
              icon="close-circle"
            />
          </View>
        )}

        {/* Spacer dynamique : insets.bottom + breathing room pour clear la
            nav bar Android (gesture / 3-button) ou home indicator iOS */}
        <View style={{ height: insets.bottom + Spacing.xl }} />
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
  // Petits boutons icônes du header éditorial (rappel + partage)
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Bloc eyebrow + titre des sections (pattern canonique éditorial)
  editorialSectionHead: {
    gap: 4,
    marginBottom: Spacing.md,
  },

  // ── Style éditorial : type pill + catégorie eyebrow ────────────────────────
  typePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  typePillText: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  categoryEyebrow: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // Hero row : titre extra-bold + date tile
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  // Date tile (orange accent) — pattern canonique des écrans tickets
  dateTile: {
    width: 64,
    height: 72,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  dateTileDay: {
    fontFamily: FontFamily.displayBold,
    fontSize: 26,
    letterSpacing: -1,
    lineHeight: 28,
  },
  dateTileMonth: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // Meta chips : pilule grise avec icône + texte
  metaChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.md,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    maxWidth: 200,
  },
  metaChipText: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
  },

  // CTA en chip discret (alternative à pill primaire pour actions secondaires)
  editorialChipCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  editorialChipCTAText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    letterSpacing: -0.2,
  },

  // Section Online Event — eyebrow + détails meeting
  onlineSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
  },
  onlinePlatformChip: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    marginBottom: Spacing.xs,
  },
  // Note éditoriale (icône + texte sur fond pâle)
  editorialNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  editorialNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: FontFamily.medium,
  },

  // Status badge éditorial (gros, marqué)
  statusBadgeEditorial: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.3,
  },
  // Grille verticale de paires (eyebrow + valeur)
  detailGrid: {
    gap: Spacing.md,
  },
  detailCell: {
    gap: 2,
  },
  detailValueEditorial: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    letterSpacing: -0.2,
  },

  // Ticket stub éditorial : tile indigo + corps + prix
  ticketStub: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  ticketStubTile: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  ticketStubTileQty: {
    color: '#FFFFFF',
    fontFamily: FontFamily.displayBold,
    fontSize: 20,
    letterSpacing: -0.5,
    lineHeight: 22,
  },
  ticketStubTileLabel: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
    fontSize: 7,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  ticketStubBody: {
    flex: 1,
    gap: 6,
  },
  ticketStubName: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    letterSpacing: -0.2,
    lineHeight: 17,
  },
  // Ligne meta : status badge à gauche, prix à droite — inline pas en colonne
  ticketStubMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  ticketStubStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  ticketStubStatusText: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.8,
  },
  // Prix inline : taille modérée pour rester sur une ligne avec le status
  ticketStubPrice: {
    fontFamily: FontFamily.displayBold,
    fontSize: 13,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  // Colonne droite compacte : juste actions (gift + chevron empilés)
  ticketStubRight: {
    alignItems: 'center',
    gap: 4,
  },
  ticketStubGift: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Total éditorial
  ticketsTotalEditorial: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketsTotalSub: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    marginTop: 2,
  },
  ticketsTotalAmount: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    letterSpacing: -0.5,
  },

  // Form Data éditorial
  formDataCellEditorial: {
    gap: 4,
    marginBottom: Spacing.md,
  },
  formDataValueEditorial: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    letterSpacing: -0.2,
  },

  // Icon disc (pattern canonique)
  iconDisc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
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

  // Card éditoriale principale : warm white + radius généreux + shadow indigo soft
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },

  // Event Info : padding éditorial généreux
  eventInfo: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
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

  // QR Section : eyebrow gauche + frame centrée
  qrSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
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
  // Explication du contenu du QR (info discrète sous le hint)
  qrExplain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
    maxWidth: QR_SIZE + 40,
  },
  qrExplainText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: FontFamily.medium,
    letterSpacing: -0.1,
  },

  // Section "tap a ticket" qui remplace le QR pour la billetterie
  qrTicketHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  qrTicketHintIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrTicketHintBody: {
    flex: 1,
    gap: 2,
  },
  qrTicketHintTitle: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    letterSpacing: -0.2,
  },
  qrTicketHintText: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FontFamily.medium,
  },

  // Section "Tes sessions" — listing des sessions de l'event
  sessionsCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  sessionTimeTile: {
    width: 56,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTimeText: {
    fontFamily: FontFamily.displayBold,
    fontSize: 14,
    letterSpacing: -0.3,
    lineHeight: 16,
  },
  sessionTimeRange: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  sessionBody: {
    flex: 1,
    gap: 4,
  },
  sessionTitle: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    letterSpacing: -0.2,
    lineHeight: 16,
  },
  sessionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  sessionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 1,
  },
  sessionMetaText: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    flexShrink: 1,
  },
  sessionStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  sessionStatusText: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    letterSpacing: 0.8,
  },
  sessionsHint: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },

  // Details Section éditoriale (sans fond gris, padding aéré)
  detailsSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
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

  // Tickets List card éditoriale
  ticketsCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 24,
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

  // Form Data card éditoriale
  formDataCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 24,
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

  // Instructions — rows éditoriales (pilule plate avec icon disc + texte)
  instructions: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  instructionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    fontSize: 13,
    flex: 1,
    fontFamily: FontFamily.medium,
    letterSpacing: -0.1,
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
