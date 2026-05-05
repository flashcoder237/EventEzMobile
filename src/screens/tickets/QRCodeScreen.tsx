import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Dimensions,
  Linking,
} from 'react-native';
import {
  EditorialCanvas,
  WatermarkNumeral,
  EditorialHeader,
  EditorialPillCTA,
  editorial,
} from '../../components/ui/editorial';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';

import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm';
import { useTicketLockPref } from '../../hooks/useTicketLockPref';
import { ticketPurchasesAPI } from '../../api';
import { TicketPurchase, RootStackParamList } from '../../types';
import { getTicketVerificationUrl } from '../../constants/urls';
import {
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type QRCodeRouteProp = RouteProp<RootStackParamList, 'QRCode'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Cf. RegistrationDetailsScreen — laisse ~12px de respiration de chaque côté
const QR_SIZE = Math.min(SCREEN_WIDTH - Spacing['2xl'] * 5, 260);

export default function QRCodeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const route = useRoute<QRCodeRouteProp>();
  const { ticketId } = route.params;
  const { showError } = useAlert();
  const { colors, isDark } = useTheme();

  const [ticket, setTicket] = useState<TicketPurchase | null>(null);
  const [loading, setLoading] = useState(true);

  // Gate biométrique opt-in : si la pref `eventez_ticket_lock_enabled` est
  // active, on cache le QR derrière un placeholder "Tap to reveal" jusqu'à
  // confirmation FaceID/empreinte. Pratique anti-vol à la queue d'entrée.
  const biometric = useBiometricConfirm();
  const { isEnabled: ticketLockEnabled, loading: lockPrefLoading } = useTicketLockPref();
  const [revealed, setRevealed] = useState(false);
  const isLocked = ticketLockEnabled && biometric.isSupported && !revealed;

  const handleReveal = useCallback(async () => {
    const confirmed = await biometric.confirm({
      promptMessage: 'Authentification requise pour afficher le QR code',
    });
    if (confirmed) setRevealed(true);
  }, [biometric]);

  // Ref vers le composant QRCode SVG affiché : permet de récupérer son contenu
  // en base64 PNG (toDataURL) pour l'embed dans le PDF — évite de dépendre d'une
  // API externe (api.qrserver.com) qui peut être indisponible / bloquée.
  const qrSvgRef = useRef<any>(null);

  // QR ticket-level : encode l'ID du TicketPurchase pour permettre un
  // check-in granulaire par billet (cf. AUDIT_QR_CODE_INSCRIPTION.md)
  const verificationUrl = getTicketVerificationUrl(String(ticketId));

  const getQrDataUrl = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const ref = qrSvgRef.current;
      if (!ref || typeof ref.toDataURL !== 'function') {
        resolve(null);
        return;
      }
      try {
        ref.toDataURL((data: string) => {
          resolve(data ? `data:image/png;base64,${data}` : null);
        });
      } catch {
        resolve(null);
      }
    });
  }, []);

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

  const generateTicketHTML = (qrImageUrl: string): string => {
    const eventTitle = event?.title || (ticket as any)?.event_title || 'Événement';
    const qrUrl = qrImageUrl
      || `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(verificationUrl)}&size=200x200&format=png&qzone=1&margin=0&bgcolor=FFFFFF&color=5B21B6`;
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
      const qrDataUrl = await getQrDataUrl();
      const html = generateTicketHTML(qrDataUrl || '');
      const { uri } = await Print.printToFileAsync({ html });
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (sharingAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Sauvegarder le billet PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        showError('Partage indisponible', 'Le partage de fichier n\'est pas disponible sur cet appareil.');
      }
    } catch (error) {
      if (__DEV__) console.error('Error generating PDF:', error);
      showError('Erreur', 'Impossible de générer le PDF');
    }
  };

  const handlePrint = async () => {
    if (!ticket) return;
    try {
      const qrDataUrl = await getQrDataUrl();
      const html = generateTicketHTML(qrDataUrl || '');
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

  const isPaymentRequired = (t: TicketPurchase | null): boolean => {
    if (!t) return false;
    if (t.payment_required === true) return true;
    if (t.total_price && t.total_price > 0 && t.status === 'pending') return true;
    return false;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!ticket) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>QR</WatermarkNumeral>
        <View style={{ flex: 1, zIndex: 1 }}>
          <EditorialHeader
            eyebrow="BILLET"
            title="Mon billet"
            back
            onBack={() => navigation.goBack()}
          />
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.gray400} />
            <Text style={[styles.errorText, { color: colors.gray500 }]}>Billet non trouvé</Text>
          </View>
        </View>
      </EditorialCanvas>
    );
  }

  const event = (ticket as any)?.event;
  const ticketType = typeof ticket.ticket_type === 'object' ? ticket.ticket_type : null;
  const statusConfig = getStatusConfig(ticket.status);
  const reference = String(ticketId).slice(0, 8).toUpperCase();
  const ticketName = ticketType?.name || ticket.ticket_type_name || 'Standard';
  const ticketQty = ticket.quantity || 1;
  const ticketPrice = Number(ticket.total_price) || 0;

  // Détection du contexte d'événement
  const locationType = event?.location_type;
  const isOnlineEvent = locationType === 'online';
  const isHybridEvent = locationType === 'hybrid';

  // Instructions dynamiques selon le contexte du billet
  const instructions: { icon: string; color: string; text: string }[] = isOnlineEvent
    ? [
        { icon: 'wifi-outline', color: colors.primary, text: 'Teste ta connexion internet à l\'avance' },
        { icon: 'volume-high-outline', color: colors.accent, text: 'Vérifie ton micro et tes haut-parleurs' },
        { icon: 'log-in-outline', color: '#A855F7', text: 'Connecte-toi 5 min avant le début' },
      ]
    : isHybridEvent
    ? [
        { icon: 'scan-outline', color: colors.primary, text: 'QR code à scanner si tu viens sur place' },
        { icon: 'wifi-outline', color: colors.accent, text: 'Sinon teste ta connexion pour le live' },
        { icon: 'phone-portrait-outline', color: '#A855F7', text: 'Garde ton téléphone chargé' },
      ]
    : [
        { icon: 'scan-outline', color: colors.primary, text: 'Le QR code sera scanné à l\'entrée' },
        { icon: 'phone-portrait-outline', color: colors.accent, text: 'Garde ton téléphone chargé' },
        { icon: 'time-outline', color: '#A855F7', text: 'Arrive à l\'heure pour éviter les files' },
      ];

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>QR</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>
        {/* Header éditorial : eyebrow contexte + actions discrètes (print, dl, share) */}
        <EditorialHeader
          eyebrow={`BILLET · ${reference}`}
          title="Mon billet"
          back
          onBack={() => navigation.goBack()}
          right={
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={handlePrint}
                accessibilityLabel="Imprimer le billet"
              >
                <Ionicons name="print-outline" size={20} color={colors.gray700} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={handleDownloadPDF}
                accessibilityLabel="Télécharger le billet"
              >
                <Ionicons name="download-outline" size={20} color={colors.gray700} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={handleShare}
                accessibilityLabel="Partager le billet"
              >
                <Ionicons name="share-outline" size={20} color={colors.gray700} />
              </TouchableOpacity>
            </View>
          }
        />

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Card principale : event info + QR + détails */}
          <View
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray200, shadowColor: colors.primary }]}
          >
            {/* Event Info */}
            <View style={styles.eventInfo}>
              {/* Type pill : BILLET */}
              <View style={styles.typePillRow}>
                <View style={[styles.typePill, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name="ticket" size={10} color={colors.primary} />
                  <Text style={[styles.typePillText, { color: colors.primary }]}>BILLET INDIVIDUEL</Text>
                </View>
                {event?.category?.name && (
                  <Text style={[styles.categoryEyebrow, { color: colors.gray500 }]} numberOfLines={1}>
                    · {event.category.name.toUpperCase()}
                  </Text>
                )}
              </View>

              {/* Hero row : titre + date tile orange */}
              <View style={styles.heroRow}>
                <View style={{ flex: 1, paddingRight: Spacing.md }}>
                  <Text style={[styles.heroTitle, { color: colors.gray900 }]} numberOfLines={3}>
                    {event?.title || (ticket as any)?.event_title || 'Événement'}
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

              {/* Meta chips : date, heure, lieu */}
              <View style={styles.metaChipsRow}>
                {event?.start_date && (
                  <View style={[styles.metaChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                    <Ionicons name="calendar-outline" size={12} color={colors.accent} />
                    <Text style={[styles.metaChipText, { color: colors.gray700 }]}>{formatDate(event.start_date)}</Text>
                  </View>
                )}
                {event?.start_date && (
                  <View style={[styles.metaChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                    <Ionicons name="time-outline" size={12} color={colors.primary} />
                    <Text style={[styles.metaChipText, { color: colors.gray700 }]}>{formatTime(event.start_date)}</Text>
                  </View>
                )}
                {isOnlineEvent && (
                  <View style={[styles.metaChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                    <Ionicons name="videocam-outline" size={12} color={colors.primary} />
                    <Text style={[styles.metaChipText, { color: colors.gray700 }]}>En ligne</Text>
                  </View>
                )}
                {!isOnlineEvent && !!(event?.location_name || event?.location_city) && (
                  <View style={[styles.metaChip, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                    <Ionicons name="location-outline" size={12} color={colors.primary} />
                    <Text style={[styles.metaChipText, { color: colors.gray700 }]} numberOfLines={1}>
                      {event.location_name || event.location_city}
                    </Text>
                  </View>
                )}
              </View>

              {/* CTA discret : voir l'événement */}
              <TouchableOpacity
                style={[styles.editorialChipCTA, { backgroundColor: colors.gray100 }]}
                onPress={() => {
                  const eventId = event?.id || (ticket as any)?.event_id;
                  if (eventId) navigation.navigate('EventDetails', { eventId });
                }}
                accessibilityRole="button"
                accessibilityLabel="Voir les détails de l'événement"
              >
                <Ionicons name="eye-outline" size={14} color={colors.gray700} />
                <Text style={[styles.editorialChipCTAText, { color: colors.gray800 }]}>Voir l'événement</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.gray700} />
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerCircleLeft, { backgroundColor: colors.background }]} />
              <View style={[styles.dividerLine, { borderColor: colors.gray200 }]} />
              <View style={[styles.dividerCircleRight, { backgroundColor: colors.background }]} />
            </View>

            {/* QR Section éditoriale */}
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
                    accessibilityLabel="QR code du billet"
                    accessibilityRole="image"
                  >
                    {isLocked ? (
                      // Placeholder verrouillé : carré de la même taille que le QR pour
                      // ne pas faire bouger la mise en page au reveal. Le QR est aussi
                      // RENDU mais en off-screen (zéro IO) — on évite juste l'affichage.
                      <TouchableOpacity
                        style={[styles.qrLockPlaceholder, { width: QR_SIZE, height: QR_SIZE }]}
                        onPress={handleReveal}
                        accessibilityRole="button"
                        accessibilityLabel="Authentifier pour afficher le QR code"
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name={biometric.type === 'face' ? 'scan-circle-outline' : 'finger-print'}
                          size={64}
                          color={colors.primary}
                        />
                        <Text style={[styles.qrLockTitle, { color: colors.gray900 }]}>
                          QR verrouillé
                        </Text>
                        <Text style={[styles.qrLockHint, { color: colors.gray500 }]}>
                          {biometric.type === 'face'
                            ? 'Touche pour déverrouiller avec Face ID'
                            : 'Touche pour déverrouiller avec ton empreinte'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <QRCode
                        value={verificationUrl}
                        size={QR_SIZE}
                        color={isDark ? '#4C1D95' : '#5B21B6'}
                        backgroundColor="#FFFFFF"
                        getRef={(c: any) => {
                          qrSvgRef.current = c;
                        }}
                      />
                    )}
                  </View>
                  {/* Scanner corners éditoriaux */}
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
                      : isHybridEvent
                      ? 'Présente ce code si tu viens sur place'
                      : 'Présente ce code à l\'entrée'}
                  </Text>
                </View>
                {/* Explication contenu QR */}
                <View style={[styles.qrExplain, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                  <Ionicons name="link-outline" size={12} color={colors.primary} />
                  <Text style={[styles.qrExplainText, { color: colors.gray600 }]}>
                    Lien unique vers ta page de validation — aucune donnée sensible n'est encodée
                  </Text>
                </View>
              </View>
            </View>

            {/* Détails billet — pattern éditorial vertical (eyebrow / valeur) */}
            <View style={styles.detailsSection}>
              <View style={styles.editorialSectionHead}>
                <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>RÉCAP · TON BILLET</Text>
                <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>Détails</Text>
              </View>

              {/* Status badge éditorial */}
              <View style={[styles.statusBadgeEditorial, { backgroundColor: statusConfig.bg }]}>
                <Ionicons name={statusConfig.icon as any} size={16} color={statusConfig.color} />
                <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
              </View>

              {/* Grille verticale : eyebrow + valeur */}
              <View style={styles.detailGrid}>
                <View style={styles.detailCell}>
                  <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>TYPE</Text>
                  <Text style={[styles.detailValueEditorial, { color: colors.gray900 }]}>{ticketName}</Text>
                </View>
                <View style={styles.detailCell}>
                  <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>QUANTITÉ</Text>
                  <Text style={[styles.detailValueEditorial, { color: colors.gray900 }]}>×{ticketQty}</Text>
                </View>
                {ticket.unit_price ? (
                  <View style={styles.detailCell}>
                    <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>PRIX UNITAIRE</Text>
                    <Text style={[styles.detailValueEditorial, { color: colors.gray900 }]}>
                      {ticket.unit_price.toLocaleString()} {event?.currency || 'FCFA'}
                    </Text>
                  </View>
                ) : null}
                {(ticket.discount_amount ?? 0) > 0 && (
                  <View style={styles.detailCell}>
                    <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>RÉDUCTION</Text>
                    <Text style={[styles.detailValueEditorial, { color: colors.success }]}>
                      −{ticket.discount_amount!.toLocaleString()} {event?.currency || 'FCFA'}
                    </Text>
                  </View>
                )}
                <View style={styles.detailCell}>
                  <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>RÉFÉRENCE</Text>
                  <Text style={[styles.detailValueEditorial, { color: colors.gray900 }]}>{reference}</Text>
                </View>
              </View>

              {/* Total payé en grand display */}
              <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                <View>
                  <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>TOTAL PAYÉ</Text>
                  <Text style={[styles.totalSub, { color: colors.gray600 }]}>Tout compris</Text>
                </View>
                <Text style={[styles.totalAmount, { color: colors.gray900 }]}>
                  {ticketPrice > 0 ? `${ticketPrice.toLocaleString()} ${event?.currency || 'FCFA'}` : 'Gratuit'}
                </Text>
              </View>
            </View>
          </View>

          {/* Online access (si applicable) */}
          {(isOnlineEvent || isHybridEvent) && (
            <View style={[styles.onlineCard, { backgroundColor: colors.card, borderColor: colors.gray200 }]}>
              <View style={styles.editorialSectionHead}>
                <Text style={[editorial.eyebrowAccent]}>EN DIRECT · ACCÈS LIVE</Text>
                <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>Comment rejoindre</Text>
              </View>
              {event?.online_platform && (
                <Text style={[styles.onlinePlatform, { color: colors.info }]}>Via {event.online_platform}</Text>
              )}
              {event?.online_instructions && (
                <Text style={[styles.onlineInstructions, { color: colors.gray600 }]}>{event.online_instructions}</Text>
              )}
              {!!(event?.online_meeting_id || event?.online_passcode) && (
                <View style={[styles.meetingBox, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
                  {event.online_meeting_id && (
                    <View style={styles.meetingRow}>
                      <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>ID DE RÉUNION</Text>
                      <Text style={[styles.meetingValue, { color: colors.gray900 }]}>{event.online_meeting_id}</Text>
                    </View>
                  )}
                  {event.online_passcode && (
                    <View style={styles.meetingRow}>
                      <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>CODE D'ACCÈS</Text>
                      <Text style={[styles.meetingValue, { color: colors.gray900 }]}>{event.online_passcode}</Text>
                    </View>
                  )}
                </View>
              )}
              {event?.online_url && (
                <View style={{ marginTop: Spacing.md }}>
                  <EditorialPillCTA
                    eyebrow="OUVRIR"
                    label="Rejoindre maintenant"
                    onPress={() => {
                      Linking.openURL(event.online_url!).catch(() => {
                        showError('Erreur', 'Impossible d\'ouvrir le lien');
                      });
                    }}
                    tone="primary"
                    icon="videocam"
                  />
                </View>
              )}
            </View>
          )}

          {/* Participant info */}
          {!!(ticket.attendee_name || ticket.attendee_email) && (
            <View style={[styles.attendeeCard, { backgroundColor: colors.card, borderColor: colors.gray200 }]}>
              <View style={styles.editorialSectionHead}>
                <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>NOMINATIF</Text>
                <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>Participant</Text>
              </View>
              {ticket.attendee_name && (
                <View style={styles.attendeeCell}>
                  <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>NOM</Text>
                  <Text style={[styles.attendeeValue, { color: colors.gray900 }]}>{ticket.attendee_name}</Text>
                </View>
              )}
              {ticket.attendee_email && (
                <View style={styles.attendeeCell}>
                  <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>EMAIL</Text>
                  <Text style={[styles.attendeeValue, { color: colors.gray900 }]}>{ticket.attendee_email}</Text>
                </View>
              )}
            </View>
          )}

          {/* Bon à savoir dynamique */}
          <View style={styles.instructions}>
            <View style={styles.editorialSectionHead}>
              <Text style={[editorial.eyebrow, { color: colors.gray500 }]}>BON À SAVOIR</Text>
              <Text style={[editorial.sectionTitleSm, { color: colors.gray900 }]}>
                {isOnlineEvent ? 'Préparer le live' : isHybridEvent ? 'Sur place ou en ligne' : 'Le jour J'}
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
                <Text style={[styles.instructionText, { color: colors.gray700 }]}>{inst.text}</Text>
              </View>
            ))}
          </View>

          {/* Banner check-in */}
          {ticket.is_checked_in && (
            <View style={[styles.banner, { backgroundColor: colors.successLight, borderColor: colors.success }]}>
              <Ionicons name="checkmark-done-circle" size={24} color={colors.success} />
              <View style={styles.bannerText}>
                <Text style={[styles.bannerTitle, { color: colors.success }]}>Billet validé</Text>
                {ticket.checked_in_at && (
                  <Text style={[styles.bannerDesc, { color: colors.gray600 }]}>
                    Entrée le {formatDate(ticket.checked_in_at)} à {formatTime(ticket.checked_in_at)}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Banner paiement requis */}
          {ticket.status === 'pending' && isPaymentRequired(ticket) && (
            <View style={[styles.banner, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
              <Ionicons name="warning" size={24} color={colors.warning} />
              <View style={styles.bannerText}>
                <Text style={[styles.bannerTitle, { color: colors.warning }]}>Paiement en attente</Text>
                <Text style={[styles.bannerDesc, { color: colors.gray600 }]}>
                  Finalise ton paiement pour confirmer
                </Text>
              </View>
            </View>
          )}

          {/* Actions principales — pill CTAs éditoriaux */}
          <View style={styles.actionsSection}>
            {ticket.status === 'pending' && isPaymentRequired(ticket) && (
              <EditorialPillCTA
                eyebrow="FINALISER"
                label="Finaliser le paiement"
                onPress={() => {
                  const regId = ticket.registration_id || ticket.registration;
                  if (regId) navigation.navigate('Payment', { registrationId: regId });
                }}
                tone="primary"
                icon="card"
              />
            )}

            {(ticket.status === 'confirmed' || ticket.status === 'completed') && (
              <EditorialPillCTA
                eyebrow="AJOUTER"
                label="Acheter plus de billets"
                onPress={() => {
                  const eventId = event?.id || ticket.event_id;
                  if (eventId) navigation.navigate('TicketPurchase', { eventId, additionalTickets: true });
                }}
                tone="lime"
                icon="add-circle"
              />
            )}
          </View>

          {/* Spacer dynamique : insets.bottom + breathing room pour clear la nav bar */}
          <View style={{ height: insets.bottom + Spacing.xl }} />
        </ScrollView>
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.base,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollView: {
    flex: 1,
  },

  // Card éditoriale principale
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
  eventInfo: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },

  // Bloc eyebrow + titre
  editorialSectionHead: {
    gap: 4,
    marginBottom: Spacing.md,
  },

  // Type pill + catégorie
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

  // Hero row + date tile
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

  // Meta chips
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

  // Chip CTA
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
  qrCorner: {
    position: 'absolute',
    width: 22,
    height: 22,
  },
  qrLockPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  qrLockTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.md,
    letterSpacing: -0.3,
    marginTop: 4,
  },
  qrLockHint: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
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

  // Détails section
  detailsSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
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
  totalRow: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalSub: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    marginTop: 2,
  },
  totalAmount: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    letterSpacing: -0.5,
  },

  // Online card
  onlineCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
  },
  onlinePlatform: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    marginBottom: Spacing.xs,
  },
  onlineInstructions: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },
  meetingBox: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  meetingRow: {
    gap: 2,
  },
  meetingValue: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
  },

  // Attendee card
  attendeeCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
  },
  attendeeCell: {
    gap: 2,
    marginBottom: Spacing.md,
  },
  attendeeValue: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    letterSpacing: -0.2,
  },

  // Instructions
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
  iconDisc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  instructionText: {
    fontSize: 13,
    flex: 1,
    fontFamily: FontFamily.medium,
    letterSpacing: -0.1,
  },

  // Banners
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
  },
  bannerDesc: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },

  // Actions
  actionsSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
});
