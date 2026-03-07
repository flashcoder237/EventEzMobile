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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';

import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { ticketPurchasesAPI, registrationsAPI } from '../../api/client';
import { TicketPurchase, RootStackParamList } from '../../types';
import { getVerificationUrl } from '../../constants/urls';
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
  const { colors, isDark } = useTheme();

  const [ticket, setTicket] = useState<TicketPurchase | null>(null);
  const [loading, setLoading] = useState(true);

  // URL de vérification (format unifié mobile + web)
  const verificationUrl = getVerificationUrl(
    String(ticket?.registration_id || ticket?.registration || '')
  );

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      const response = await ticketPurchasesAPI.getTicketPurchase(ticketId);
      setTicket(response.data);
    } catch (error) {
      if (__DEV__) console.error('Error fetching ticket:', error);
      showError('Erreur', 'Impossible de charger les détails du billet');
    } finally {
      setLoading(false);
    }
  };

  const generateTicketHTML = (): string => {
    const eventTitle = event?.title || (ticket as any)?.event_title || 'Événement';
    // Pour le HTML/PDF export, on utilise une API en ligne car le SVG natif n'est pas disponible en HTML
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(verificationUrl)}&size=200x200&format=png&qzone=1&margin=0&bgcolor=FFFFFF&color=5B21B6`;
    const ticketTypeName = ticketType?.name || (ticket as any)?.ticket_type_name || 'Standard';
    const reference = String(ticketId).slice(0, 8).toUpperCase();
    const statusLabel = getStatusConfig(ticket?.status).label;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; padding: 20px; }
          .ticket { background: white; max-width: 500px; margin: 0 auto; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; }
          .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; text-align: center; color: white; }
          .header h1 { font-size: 22px; margin-bottom: 4px; }
          .header p { font-size: 13px; opacity: 0.9; }
          .event-section { padding: 20px 24px; border-bottom: 1px dashed #e5e7eb; }
          .event-title { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 12px; }
          .meta-item { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; color: #6b7280; font-size: 14px; }
          .meta-icon { width: 18px; text-align: center; }
          .qr-section { padding: 24px; text-align: center; border-bottom: 1px dashed #e5e7eb; }
          .qr-container { display: inline-block; padding: 12px; border: 2px solid #6366f1; border-radius: 12px; }
          .qr-container img { width: 180px; height: 180px; }
          .qr-hint { font-size: 12px; color: #9ca3af; margin-top: 12px; }
          .details-section { padding: 20px 24px; background: #f9fafb; }
          .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
          .detail-label { color: #6b7280; font-size: 14px; }
          .detail-value { font-weight: 600; color: #111827; font-size: 14px; }
          .status-badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #d1fae5; color: #059669; }
          .total { color: #6366f1; font-size: 16px; }
          .attendee-section { padding: 20px 24px; border-top: 1px solid #e5e7eb; }
          .attendee-section h3 { font-size: 15px; font-weight: 600; color: #111827; margin-bottom: 10px; }
          .attendee-row { display: flex; align-items: center; gap: 8px; color: #6b7280; font-size: 14px; padding: 4px 0; }
          .footer { padding: 16px 24px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">
            <h1>EventEz</h1>
            <p>Billet électronique</p>
          </div>
          <div class="event-section">
            <div class="event-title">${eventTitle}</div>
            ${event?.start_date ? `<div class="meta-item"><span class="meta-icon">📅</span> ${formatDate(event.start_date)}</div>` : ''}
            ${event?.start_date ? `<div class="meta-item"><span class="meta-icon">🕐</span> ${formatTime(event.start_date)}</div>` : ''}
            ${event?.location_name || event?.location_city ? `<div class="meta-item"><span class="meta-icon">📍</span> ${event.location_name || event.location_city}</div>` : ''}
          </div>
          <div class="qr-section">
            <div class="qr-container">
              <img src="${qrUrl}" alt="QR Code" />
            </div>
            <p class="qr-hint">Présentez ce QR code à l'entrée de l'événement</p>
          </div>
          <div class="details-section">
            <div class="detail-row">
              <span class="detail-label">Statut</span>
              <span class="status-badge">${statusLabel}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Type de billet</span>
              <span class="detail-value">${ticketTypeName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Quantité</span>
              <span class="detail-value">${ticket?.quantity || 1}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Prix unitaire</span>
              <span class="detail-value">${ticket?.unit_price ? `${ticket.unit_price.toLocaleString()} ${event?.currency || 'FCFA'}` : 'Gratuit'}</span>
            </div>
            ${(ticket?.discount_amount ?? 0) > 0 ? `
            <div class="detail-row">
              <span class="detail-label">Réduction</span>
              <span class="detail-value" style="color: #059669;">-${ticket!.discount_amount!.toLocaleString()} ${event?.currency || 'FCFA'}</span>
            </div>` : ''}
            <div class="detail-row">
              <span class="detail-label">Total payé</span>
              <span class="detail-value total">${ticket?.total_price ? `${ticket.total_price.toLocaleString()} ${event?.currency || 'FCFA'}` : 'Gratuit'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Référence</span>
              <span class="detail-value">${reference}</span>
            </div>
          </div>
          ${ticket?.attendee_name || ticket?.attendee_email ? `
          <div class="attendee-section">
            <h3>Participant</h3>
            ${ticket?.attendee_name ? `<div class="attendee-row">👤 ${ticket.attendee_name}</div>` : ''}
            ${ticket?.attendee_email ? `<div class="attendee-row">✉️ ${ticket.attendee_email}</div>` : ''}
          </div>` : ''}
          <div class="footer">
            Généré par EventEz — ${new Date().toLocaleDateString('fr-FR')}
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handleDownloadPDF = async () => {
    if (!ticket) return;
    try {
      const html = generateTicketHTML();
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Sauvegarder le billet PDF',
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      if (__DEV__) console.error('Error generating PDF:', error);
      showError('Erreur', 'Impossible de générer le PDF');
    }
  };

  const handlePrint = async () => {
    if (!ticket) return;
    try {
      const html = generateTicketHTML();
      await Print.printAsync({ html });
    } catch (error) {
      if (__DEV__) console.error('Error printing:', error);
      showError('Erreur', 'Impossible d\'imprimer le billet');
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
      if (__DEV__) console.error('Error sharing:', error);
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
        return { color: colors.success, bg: colors.successLight, label: 'Confirmé', icon: 'checkmark-circle' };
      case 'pending':
        return { color: colors.warning, bg: colors.warningLight, label: 'En attente', icon: 'time' };
      case 'cancelled':
        return { color: colors.error, bg: colors.errorLight, label: 'Annulé', icon: 'close-circle' };
      case 'checked_in':
        return { color: colors.success, bg: colors.successLight, label: 'Validé', icon: 'checkmark-done-circle' };
      default:
        return { color: colors.success, bg: colors.successLight, label: 'Confirmé', icon: 'checkmark-circle' };
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
      <LoadingSpinner />
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.gray100 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.gray900} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Mon Billet</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.gray400} />
          <Text style={[styles.errorText, { color: colors.gray500 }]}>Billet non trouvé</Text>
        </View>
      </SafeAreaView>
    );
  }

  const event = (ticket as any)?.event;
  const ticketType = typeof ticket.ticket_type === 'object' ? ticket.ticket_type : null;
  const statusConfig = getStatusConfig(ticket.status);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.gray100 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.gray900} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.gray900 }]}>Mon Billet</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton} onPress={handlePrint}>
            <Ionicons name="print-outline" size={22} color={colors.gray900} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton} onPress={handleDownloadPDF}>
            <Ionicons name="download-outline" size={22} color={colors.gray900} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={colors.gray900} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Ticket Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray200 }]}>
          {/* Event Info */}
          <View style={styles.eventInfo}>
            <View style={[styles.typeBadge, { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(99, 102, 241, 0.1)' }]}>
              <Ionicons name="ticket" size={14} color={colors.primary} />
              <Text style={[styles.typeBadgeText, { color: colors.primary }]}>Billet</Text>
            </View>

            <Text style={[styles.eventTitle, { color: colors.gray900 }]} numberOfLines={2}>
              {event?.title || (ticket as any)?.event_title || 'Événement'}
            </Text>

            <View style={styles.eventMeta}>
              {event?.start_date && (
                <View style={styles.eventMetaItem}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={[styles.eventMetaText, { color: colors.gray600 }]}>{formatDate(event.start_date)}</Text>
                </View>
              )}
              {event?.start_date && (
                <View style={styles.eventMetaItem}>
                  <Ionicons name="time-outline" size={16} color={colors.primary} />
                  <Text style={[styles.eventMetaText, { color: colors.gray600 }]}>{formatTime(event.start_date)}</Text>
                </View>
              )}
              {!!(event?.location_name || event?.location_city) && (
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
              style={[styles.viewEventButton, { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(99, 102, 241, 0.1)' }]}
              onPress={() => {
                const eventId = event?.id || (ticket as any)?.event_id;
                if (eventId) {
                  navigation.navigate('EventDetails', { eventId });
                }
              }}
            >
              <Ionicons name="eye-outline" size={18} color={colors.primary} />
              <Text style={[styles.viewEventButtonText, { color: colors.primary }]}>Voir les détails de l'événement</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerCircleLeft, { backgroundColor: colors.background }]} />
            <View style={[styles.dividerLine, { borderColor: colors.gray200 }]} />
            <View style={[styles.dividerCircleRight, { backgroundColor: colors.background }]} />
          </View>

          {/* QR Code Section */}
          <View style={styles.qrSection}>
            <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF', borderColor: colors.primary }]}>
              <QRCode
                value={verificationUrl}
                size={QR_SIZE}
                color={isDark ? '#4C1D95' : '#5B21B6'}
                backgroundColor="#FFFFFF"
              />
            </View>
            <Text style={[styles.qrHint, { color: colors.gray500 }]}>
              Présentez ce QR code à l'entrée de l'événement
            </Text>
          </View>

          {/* Ticket Details */}
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
              <Text style={[styles.detailLabel, { color: colors.gray500 }]}>Type de billet</Text>
              <Text style={[styles.detailValue, { color: colors.gray900 }]}>
                {ticketType?.name || ticket.ticket_type_name || 'Standard'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.gray500 }]}>Quantité</Text>
              <Text style={[styles.detailValue, { color: colors.gray900 }]}>{ticket.quantity || 1}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.gray500 }]}>Prix unitaire</Text>
              <Text style={[styles.detailValue, { color: colors.gray900 }]}>
                {ticket.unit_price ? `${ticket.unit_price.toLocaleString()} ${event?.currency || 'FCFA'}` : 'Gratuit'}
              </Text>
            </View>
            {(ticket.discount_amount ?? 0) > 0 && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.gray500 }]}>Réduction</Text>
                <Text style={[styles.detailValue, { color: colors.success }]}>
                  -{ticket.discount_amount!.toLocaleString()} ${event?.currency || 'FCFA'}
                </Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.gray500 }]}>Total payé</Text>
              <Text style={[styles.detailValue, styles.totalPrice, { color: colors.primary }]}>
                {ticket.total_price ? `${ticket.total_price.toLocaleString()} ${event?.currency || 'FCFA'}` : 'Gratuit'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.gray500 }]}>Référence</Text>
              <Text style={[styles.detailValue, { color: colors.gray900 }]}>{String(ticketId).slice(0, 8).toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Attendee Info if available */}
        {!!(ticket.attendee_name || ticket.attendee_email) && (
          <View style={[styles.attendeeCard, { backgroundColor: colors.card, borderColor: colors.gray200 }]}>
            <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Participant</Text>
            {ticket.attendee_name && (
              <View style={styles.attendeeRow}>
                <Ionicons name="person-outline" size={18} color={colors.gray500} />
                <Text style={[styles.attendeeText, { color: colors.gray700 }]}>{ticket.attendee_name}</Text>
              </View>
            )}
            {ticket.attendee_email && (
              <View style={styles.attendeeRow}>
                <Ionicons name="mail-outline" size={18} color={colors.gray500} />
                <Text style={[styles.attendeeText, { color: colors.gray700 }]}>{ticket.attendee_email}</Text>
              </View>
            )}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <View style={styles.instructionItem}>
            <View style={[styles.instructionIcon, { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(99, 102, 241, 0.1)' }]}>
              <Ionicons name="scan-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.instructionText, { color: colors.gray600 }]}>
              Le QR code sera scanné à l'entrée
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={[styles.instructionIcon, { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(99, 102, 241, 0.1)' }]}>
              <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.instructionText, { color: colors.gray600 }]}>
              Gardez votre téléphone chargé
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={[styles.instructionIcon, { backgroundColor: isDark ? 'rgba(167, 139, 250, 0.15)' : 'rgba(99, 102, 241, 0.1)' }]}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.instructionText, { color: colors.gray600 }]}>
              Arrivez à l'heure pour éviter les files
            </Text>
          </View>
        </View>

        {/* Check-in status */}
        {ticket.is_checked_in && (
          <View style={[styles.checkedInBanner, { backgroundColor: colors.successLight, borderColor: colors.success }]}>
            <Ionicons name="checkmark-done-circle" size={24} color={colors.success} />
            <View style={styles.checkedInText}>
              <Text style={[styles.checkedInTitle, { color: colors.success }]}>Billet validé</Text>
              {ticket.checked_in_at && (
                <Text style={[styles.checkedInDate, { color: colors.gray600 }]}>
                  Entrée le {formatDate(ticket.checked_in_at)} à {formatTime(ticket.checked_in_at)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Payment required banner */}
        {ticket.status === 'pending' && isPaymentRequired(ticket) && (
          <View style={[styles.paymentRequiredBanner, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
            <Ionicons name="warning" size={24} color={colors.warning} />
            <View style={styles.paymentRequiredText}>
              <Text style={[styles.paymentRequiredTitle, { color: colors.warning }]}>Paiement en attente</Text>
              <Text style={[styles.paymentRequiredDesc, { color: colors.gray600 }]}>
                Finalisez votre paiement pour confirmer votre inscription
              </Text>
            </View>
          </View>
        )}

        {/* Complete payment button */}
        {ticket.status === 'pending' && isPaymentRequired(ticket) && (
          <TouchableOpacity
            style={[styles.completePaymentButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              const regId = ticket.registration_id || ticket.registration;
              if (regId) {
                navigation.navigate('Payment', { registrationId: regId });
              }
            }}
          >
            <Ionicons name="card-outline" size={20} color="#FFFFFF" />
            <Text style={styles.completePaymentText}>Finaliser le paiement</Text>
          </TouchableOpacity>
        )}

        {/* Buy more tickets button - for confirmed tickets */}
        {(ticket.status === 'confirmed' || ticket.status === 'completed') && (
          <TouchableOpacity
            style={[styles.buyMoreButton, { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 1 }]}
            onPress={() => {
              const eventId = event?.id || ticket.event_id;
              if (eventId) {
                navigation.navigate('TicketPurchase', { eventId, additionalTickets: true });
              }
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.buyMoreButtonText, { color: colors.primary }]}>Acheter plus de billets</Text>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
