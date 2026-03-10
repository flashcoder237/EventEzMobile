import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Modal,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { ticketTransfersAPI, usersAPI, registrationsAPI } from '../../api';
import { RootStackParamList, Registration } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

// ── QR code parsing ──

type QRParseResult =
  | { type: 'transfer'; token: string }
  | { type: 'user'; userId: string }
  | { type: 'ticket'; registrationId: string }
  | { type: 'unknown' };

function parseQRCode(data: string): QRParseResult {
  const transferMatch = data.match(/^EVENTEZ-TRANSFER-(.+)$/);
  if (transferMatch) return { type: 'transfer', token: transferMatch[1] };

  const userMatch = data.match(/^EVENTEZ-USER-(.+)$/);
  if (userMatch) return { type: 'user', userId: userMatch[1] };

  // Format URL de vérification: .../verify/{registrationId}
  const verifyMatch = data.match(/\/verify\/([a-f0-9-]+)/i);
  if (verifyMatch) return { type: 'ticket', registrationId: verifyMatch[1] };

  // UUID direct (probablement un ID de registration)
  const uuidMatch = data.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
  if (uuidMatch) return { type: 'ticket', registrationId: data };

  return { type: 'unknown' };
}

// ── Transfer result types ──

interface TransferData {
  id: string;
  sender_name: string;
  sender_email: string;
  quantity: number;
  status: string;
  expires_at: string;
  can_accept: boolean;
  is_expired: boolean;
  ticket_info: {
    ticket_type_name: string;
    transfer_quantity: number;
  };
  event_info: {
    id: string;
    title: string;
    start_date: string;
    location_city?: string;
    banner_image?: string;
  };
}

interface UserData {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  role?: string;
  profile_picture?: string;
  image?: string;
  is_following?: boolean;
  followers_count?: number;
}

type ScanState = 'scanning' | 'loading' | 'result';
interface TicketData {
  registrationId: string;
  registration: Registration;
  eventTitle: string;
  eventId: string;
  userName: string;
  userEmail: string;
  referenceCode: string;
  status: string;
  registrationType: string;
}

type ResultType = 'transfer' | 'user' | 'ticket' | 'error';

interface ScanResult {
  type: ResultType;
  transfer?: TransferData;
  transferToken?: string;
  user?: UserData;
  isFollowing?: boolean;
  ticket?: TicketData;
  errorMessage?: string;
}

export default function ScanScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user: currentUser } = useAuth();
  const { showSuccess, showError } = useAlert();
  const { colors, isDark } = useTheme();

  const [permission, requestPermission] = useCameraPermissions();
  const [flashOn, setFlashOn] = useState(false);
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [scanned, setScanned] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // ── Handle QR scan ──

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned) return;

    setScanned(true);
    Vibration.vibrate(100);
    setScanState('loading');

    const parsed = parseQRCode(data);

    try {
      if (parsed.type === 'transfer') {
        const response = await ticketTransfersAPI.getByToken(parsed.token);
        // Backend returns { transfer: {...}, can_accept, is_expired }
        const transferData = response.data?.transfer || response.data;
        setResult({ type: 'transfer', transfer: transferData, transferToken: parsed.token });
      } else if (parsed.type === 'user') {
        const [userRes, followRes] = await Promise.all([
          usersAPI.getUser(parsed.userId),
          usersAPI.isFollowingUser(Number(parsed.userId)).catch(() => ({ data: { is_following: false } })),
        ]);
        setResult({
          type: 'user',
          user: userRes.data,
          isFollowing: followRes.data?.is_following ?? false,
        });
      } else if (parsed.type === 'ticket') {
        const response = await registrationsAPI.getRegistration(parsed.registrationId);
        const reg = response.data;
        const eventDetail = reg.event_detail || {};
        setResult({
          type: 'ticket',
          ticket: {
            registrationId: parsed.registrationId,
            registration: reg,
            eventTitle: eventDetail.title || 'Événement',
            eventId: eventDetail.id || (typeof reg.event === 'string' ? reg.event : reg.event?.id) || '',
            userName: reg.user_name || '',
            userEmail: reg.user_email || '',
            referenceCode: reg.reference_code || parsed.registrationId.slice(0, 8).toUpperCase(),
            status: reg.status || 'pending',
            registrationType: reg.registration_type || 'billetterie',
          },
        });
      } else {
        setResult({ type: 'error', errorMessage: 'QR code non reconnu' });
      }
    } catch (error: any) {
      if (__DEV__) console.error('Scan error:', error);
      let msg = 'Impossible de traiter ce QR code';
      if (error.response?.status === 404) msg = 'Élément non trouvé';
      else if (error.response?.data?.detail) msg = error.response.data.detail;
      setResult({ type: 'error', errorMessage: msg });
    }

    setScanState('result');
  };

  // ── Actions ──

  const handleAcceptTransfer = async (token: string) => {
    setActionLoading(true);
    try {
      await ticketTransfersAPI.acceptByToken(token);
      showSuccess('Transfert accepté', 'Le billet a été ajouté à votre compte !');
      navigation.goBack();
    } catch (error: any) {
      showError('Erreur', error.response?.data?.detail || "Impossible d'accepter le transfert");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineTransfer = async (token: string) => {
    setActionLoading(true);
    try {
      await ticketTransfersAPI.declineByToken(token);
      showSuccess('Transfert refusé', "L'expéditeur a été notifié.");
      navigation.goBack();
    } catch (error: any) {
      showError('Erreur', error.response?.data?.detail || 'Impossible de refuser le transfert');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleFollow = async (userId: number) => {
    if (!result?.user) return;
    setActionLoading(true);
    try {
      if (result.isFollowing) {
        await usersAPI.unfollowUser(userId);
        setResult(prev => prev ? { ...prev, isFollowing: false } : prev);
      } else {
        await usersAPI.followUser(userId);
        setResult(prev => prev ? { ...prev, isFollowing: true } : prev);
      }
    } catch (error: any) {
      showError('Erreur', error.response?.data?.detail || 'Action impossible');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = (userId: string, userName: string) => {
    navigation.goBack();
    setTimeout(() => {
      navigation.navigate('Conversation', { userId, userName });
    }, 300);
  };

  const handleReset = () => {
    setScanState('scanning');
    setResult(null);
    setScanned(false);
  };

  // ── Helpers ──

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    if (diff <= 0) return 'Expiré';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}j ${hours % 24}h restant`;
    }
    return `${hours}h ${minutes}min restant`;
  };

  const getUserDisplayName = (u: UserData) => {
    const full = `${u.first_name || ''} ${u.last_name || ''}`.trim();
    return full || u.email;
  };

  const getUserInitials = (u: UserData) => {
    const first = u.first_name?.[0] || '';
    const last = u.last_name?.[0] || '';
    if (first || last) return `${first}${last}`.toUpperCase();
    return (u.email?.[0] || '?').toUpperCase();
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'organizer': return { label: 'Organisateur', color: colors.primary };
      case 'moderator': return { label: 'Modérateur', color: colors.warning };
      case 'admin': return { label: 'Admin', color: colors.error };
      default: return null;
    }
  };

  // ── Permission screens ──

  if (!permission) {
    return <LoadingSpinner message="Chargement..." />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.permissionContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="camera-outline" size={64} color={colors.gray400} />
        <Text style={[styles.permissionTitle, { color: colors.gray900 }]}>Accès à la caméra requis</Text>
        <Text style={[styles.permissionText, { color: colors.gray500 }]}>
          Pour scanner les QR codes, autorisez l'accès à la caméra
        </Text>
        <TouchableOpacity style={[styles.permissionButton, { backgroundColor: colors.primary }]} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Autoriser l'accès</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={[styles.backLinkText, { color: colors.gray500 }]}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Render ──

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flashOn}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Header - on camera overlay, Colors.white is fine */}
        <SafeAreaView style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Scanner QR</Text>
            <Text style={styles.headerSubtitle}>Transfert de billet ou profil utilisateur</Text>
          </View>
          <TouchableOpacity style={styles.headerButton} onPress={() => setFlashOn(!flashOn)}>
            <Ionicons
              name={flashOn ? 'flash' : 'flash-outline'}
              size={24}
              color={flashOn ? '#FBBF24' : Colors.white}
            />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Scan Area */}
        <View style={styles.scanAreaContainer}>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {scanState === 'loading' && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color={Colors.white} />
                <Text style={styles.processingText}>Analyse...</Text>
              </View>
            )}
          </View>
          <Text style={styles.scanHint}>
            Placez un QR code EventEz dans le cadre
          </Text>
        </View>

        {/* Bottom hint */}
        <SafeAreaView style={styles.bottomHints}>
          <View style={styles.hintRow}>
            <Ionicons name="qr-code-outline" size={18} color="rgba(255,255,255,0.8)" />
            <Text style={styles.hintText}>Billet</Text>
          </View>
          <View style={styles.hintRow}>
            <Ionicons name="ticket-outline" size={18} color="rgba(255,255,255,0.8)" />
            <Text style={styles.hintText}>Transfert</Text>
          </View>
          <View style={styles.hintRow}>
            <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.8)" />
            <Text style={styles.hintText}>Profil</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* Result Modal */}
      <Modal
        visible={scanState === 'result'}
        animationType="slide"
        transparent
        onRequestClose={handleReset}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* Transfer result */}
              {result?.type === 'transfer' && result.transfer && result.transferToken && (
                <TransferResult
                  transfer={result.transfer}
                  token={result.transferToken}
                  onAccept={(token) => handleAcceptTransfer(token)}
                  onDecline={(token) => handleDeclineTransfer(token)}
                  actionLoading={actionLoading}
                  formatDate={formatDate}
                  getTimeRemaining={getTimeRemaining}
                />
              )}

              {/* Ticket result */}
              {result?.type === 'ticket' && result.ticket && (
                <TicketResult
                  ticket={result.ticket}
                  onViewEvent={(eventId) => {
                    handleReset();
                    navigation.navigate('EventDetails', { eventId });
                  }}
                  onViewTicket={(registrationId) => {
                    handleReset();
                    // Navigate to the ticket's QR code screen if there are ticket purchases
                    const tickets = result.ticket?.registration?.tickets;
                    if (tickets && tickets.length > 0) {
                      navigation.navigate('QRCode', { ticketId: String(tickets[0].id) });
                    } else {
                      navigation.navigate('EventDetails', { eventId: result.ticket!.eventId });
                    }
                  }}
                />
              )}

              {/* User result */}
              {result?.type === 'user' && result.user && (
                <UserResult
                  userData={result.user}
                  isFollowing={result.isFollowing ?? false}
                  isSelf={String(currentUser?.id) === String(result.user.id)}
                  onToggleFollow={() => handleToggleFollow(Number(result.user!.id))}
                  onSendMessage={() =>
                    handleSendMessage(String(result.user!.id), getUserDisplayName(result.user!))
                  }
                  actionLoading={actionLoading}
                  getUserDisplayName={getUserDisplayName}
                  getUserInitials={getUserInitials}
                  getRoleBadge={getRoleBadge}
                />
              )}

              {/* Error result */}
              {result?.type === 'error' && (
                <View style={styles.errorResult}>
                  <View style={[styles.errorIcon, { backgroundColor: colors.gray100 }]}>
                    <Ionicons name="help-circle" size={64} color={colors.gray400} />
                  </View>
                  <Text style={[styles.errorTitle, { color: colors.gray900 }]}>QR code non reconnu</Text>
                  <Text style={[styles.errorMessage, { color: colors.gray500 }]}>
                    {result.errorMessage || 'Ce QR code ne correspond pas à un format EventEz.'}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Scan another - Colors.white on colored button is fine */}
            <TouchableOpacity style={[styles.scanAgainButton, { backgroundColor: colors.primary }]} onPress={handleReset}>
              <Ionicons name="scan-outline" size={20} color={Colors.white} />
              <Text style={styles.scanAgainText}>Scanner un autre</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Transfer Result Sub-component ──

function TransferResult({
  transfer,
  token,
  onAccept,
  onDecline,
  actionLoading,
  formatDate,
  getTimeRemaining,
}: {
  transfer: TransferData;
  token: string;
  onAccept: (token: string) => void;
  onDecline: (token: string) => void;
  actionLoading: boolean;
  formatDate: (d: string) => string;
  getTimeRemaining: (d: string) => string;
}) {
  const { colors, isDark } = useTheme();

  return (
    <>
      <View style={styles.resultHeader}>
        <View style={[styles.resultIconBg, { backgroundColor: isDark ? 'rgba(238,242,255,0.15)' : '#EEF2FF' }]}>
          <Ionicons name="ticket" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.resultTitle, { color: colors.gray900 }]}>Transfert de billet</Text>
      </View>

      {/* Event info */}
      <View style={[styles.resultCard, { backgroundColor: colors.gray50 }]}>
        <Text style={[styles.cardLabel, { color: colors.gray500 }]}>Événement</Text>
        <Text style={[styles.cardTitle, { color: colors.gray900 }]}>{transfer.event_info.title}</Text>
        {transfer.event_info.start_date && (
          <View style={styles.cardRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.gray500} />
            <Text style={[styles.cardRowText, { color: colors.gray600 }]}>{formatDate(transfer.event_info.start_date)}</Text>
          </View>
        )}
        {transfer.event_info.location_city && (
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={16} color={colors.gray500} />
            <Text style={[styles.cardRowText, { color: colors.gray600 }]}>{transfer.event_info.location_city}</Text>
          </View>
        )}
      </View>

      {/* Ticket info */}
      <View style={[styles.resultCard, { backgroundColor: colors.gray50 }]}>
        <Text style={[styles.cardLabel, { color: colors.gray500 }]}>Billet</Text>
        <Text style={[styles.cardTitle, { color: colors.gray900 }]}>
          {transfer.ticket_info.transfer_quantity}x {transfer.ticket_info.ticket_type_name}
        </Text>
        <View style={styles.cardRow}>
          <Ionicons name="person-outline" size={16} color={colors.gray500} />
          <Text style={[styles.cardRowText, { color: colors.gray600 }]}>De : {transfer.sender_name}</Text>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="mail-outline" size={16} color={colors.gray500} />
          <Text style={[styles.cardRowText, { color: colors.gray600 }]}>{transfer.sender_email}</Text>
        </View>
      </View>

      {/* Expiration */}
      <View style={[styles.expirationBadge, transfer.is_expired && styles.expirationExpired]}>
        <Ionicons
          name="time-outline"
          size={16}
          color={transfer.is_expired ? colors.error : colors.warning}
        />
        <Text style={[styles.expirationText, transfer.is_expired && { color: colors.error }]}>
          {transfer.is_expired ? 'Ce transfert a expiré' : getTimeRemaining(transfer.expires_at)}
        </Text>
      </View>

      {/* Actions */}
      {!transfer.is_expired && transfer.can_accept && (
        <View style={styles.transferActions}>
          <TouchableOpacity
            style={[styles.declineBtn, { borderColor: colors.error }]}
            onPress={() => onDecline(token)}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <>
                <Ionicons name="close" size={18} color={colors.error} />
                <Text style={[styles.declineBtnText, { color: colors.error }]}>Refuser</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
            onPress={() => onAccept(token)}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color={Colors.white} />
                <Text style={styles.acceptBtnText}>Accepter</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {transfer.status !== 'pending' && (
        <View style={[styles.statusInfo, { backgroundColor: colors.gray100 }]}>
          <Text style={[styles.statusInfoText, { color: colors.gray600 }]}>
            {transfer.status === 'accepted' ? 'Ce transfert a déjà été accepté.' :
             transfer.status === 'declined' ? 'Ce transfert a été refusé.' :
             transfer.status === 'cancelled' ? 'Ce transfert a été annulé.' :
             `Statut : ${transfer.status}`}
          </Text>
        </View>
      )}
    </>
  );
}

// ── Ticket Result Sub-component ──

function TicketResult({
  ticket,
  onViewEvent,
  onViewTicket,
}: {
  ticket: TicketData;
  onViewEvent: (eventId: string) => void;
  onViewTicket: (registrationId: string) => void;
}) {
  const { colors, isDark } = useTheme();

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return { label: 'Confirmé', color: colors.success, bg: isDark ? 'rgba(209,250,229,0.15)' : '#D1FAE5' };
      case 'completed': return { label: 'Terminé', color: colors.success, bg: isDark ? 'rgba(209,250,229,0.15)' : '#D1FAE5' };
      case 'checked_in': return { label: 'Enregistré', color: colors.success, bg: isDark ? 'rgba(209,250,229,0.15)' : '#D1FAE5' };
      case 'pending': return { label: 'En attente', color: colors.warning, bg: isDark ? 'rgba(254,243,199,0.15)' : '#FEF3C7' };
      case 'pending_approval': return { label: 'En approbation', color: colors.warning, bg: isDark ? 'rgba(254,243,199,0.15)' : '#FEF3C7' };
      case 'cancelled': return { label: 'Annulé', color: colors.error, bg: isDark ? 'rgba(254,226,226,0.15)' : '#FEE2E2' };
      case 'rejected': return { label: 'Rejeté', color: colors.error, bg: isDark ? 'rgba(254,226,226,0.15)' : '#FEE2E2' };
      default: return { label: status, color: colors.gray500, bg: colors.gray100 };
    }
  };

  const statusInfo = getStatusLabel(ticket.status);

  return (
    <>
      <View style={styles.resultHeader}>
        <View style={[styles.resultIconBg, { backgroundColor: isDark ? 'rgba(209,250,229,0.15)' : '#D1FAE5' }]}>
          <Ionicons name="qr-code" size={32} color={colors.success} />
        </View>
        <Text style={[styles.resultTitle, { color: colors.gray900 }]}>Billet vérifié</Text>
      </View>

      {/* Event info */}
      <View style={[styles.resultCard, { backgroundColor: colors.gray50 }]}>
        <Text style={[styles.cardLabel, { color: colors.gray500 }]}>Événement</Text>
        <Text style={[styles.cardTitle, { color: colors.gray900 }]}>{ticket.eventTitle}</Text>
      </View>

      {/* Ticket details */}
      <View style={[styles.resultCard, { backgroundColor: colors.gray50 }]}>
        <Text style={[styles.cardLabel, { color: colors.gray500 }]}>Inscription</Text>
        <View style={styles.cardRow}>
          <Ionicons name="person-outline" size={16} color={colors.gray500} />
          <Text style={[styles.cardRowText, { color: colors.gray600 }]}>{ticket.userName || ticket.userEmail}</Text>
        </View>
        {ticket.userName && ticket.userEmail ? (
          <View style={styles.cardRow}>
            <Ionicons name="mail-outline" size={16} color={colors.gray500} />
            <Text style={[styles.cardRowText, { color: colors.gray600 }]}>{ticket.userEmail}</Text>
          </View>
        ) : null}
        <View style={styles.cardRow}>
          <Ionicons name="document-text-outline" size={16} color={colors.gray500} />
          <Text style={[styles.cardRowText, { color: colors.gray600 }]}>Réf: {ticket.referenceCode}</Text>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="pricetag-outline" size={16} color={colors.gray500} />
          <Text style={[styles.cardRowText, { color: colors.gray600 }]}>
            {ticket.registrationType === 'billetterie' ? 'Billetterie' : 'Inscription'}
          </Text>
        </View>
      </View>

      {/* Status */}
      <View style={[styles.expirationBadge, { backgroundColor: statusInfo.bg }]}>
        <Ionicons name="checkmark-circle" size={16} color={statusInfo.color} />
        <Text style={[styles.expirationText, { color: statusInfo.color }]}>
          {statusInfo.label}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.transferActions}>
        <TouchableOpacity
          style={[styles.declineBtn, { borderColor: colors.primary }]}
          onPress={() => onViewEvent(ticket.eventId)}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={[styles.declineBtnText, { color: colors.primary }]}>Voir l'événement</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
          onPress={() => onViewTicket(ticket.registrationId)}
        >
          <Ionicons name="ticket-outline" size={18} color={Colors.white} />
          <Text style={styles.acceptBtnText}>Voir le billet</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

// ── User Result Sub-component ──

function UserResult({
  userData,
  isFollowing,
  isSelf,
  onToggleFollow,
  onSendMessage,
  actionLoading,
  getUserDisplayName,
  getUserInitials,
  getRoleBadge,
}: {
  userData: UserData;
  isFollowing: boolean;
  isSelf: boolean;
  onToggleFollow: () => void;
  onSendMessage: () => void;
  actionLoading: boolean;
  getUserDisplayName: (u: UserData) => string;
  getUserInitials: (u: UserData) => string;
  getRoleBadge: (role?: string) => { label: string; color: string } | null;
}) {
  const { colors, isDark } = useTheme();
  const roleBadge = getRoleBadge(userData.role);
  const avatarUri = userData.profile_picture || userData.image;

  return (
    <>
      <View style={styles.userResultHeader}>
        {avatarUri ? (
          <Image source={avatarUri} style={[styles.userAvatar, { borderColor: colors.gray200 }]} cachePolicy="disk" transition={200} />
        ) : (
          <View style={[styles.userAvatarPlaceholder, { backgroundColor: colors.gray200, borderColor: colors.white }]}>
            <Text style={[styles.userAvatarText, { color: colors.gray600 }]}>{getUserInitials(userData)}</Text>
          </View>
        )}
        <Text style={[styles.userName, { color: colors.gray900 }]}>{getUserDisplayName(userData)}</Text>
        <Text style={[styles.userEmail, { color: colors.gray500 }]}>{userData.email}</Text>
        {roleBadge && (
          <View style={[styles.roleBadge, { backgroundColor: roleBadge.color + '20' }]}>
            <Text style={[styles.roleBadgeText, { color: roleBadge.color }]}>{roleBadge.label}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {!isSelf && (
        <View style={styles.userActions}>
          <TouchableOpacity
            style={[
              styles.followBtn,
              { backgroundColor: colors.primary },
              isFollowing && [styles.followBtnActive, { backgroundColor: colors.gray100, borderColor: colors.gray300 }],
            ]}
            onPress={onToggleFollow}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={isFollowing ? colors.gray700 : Colors.white} />
            ) : (
              <>
                <Ionicons
                  name={isFollowing ? 'person-remove-outline' : 'person-add-outline'}
                  size={18}
                  color={isFollowing ? colors.gray700 : Colors.white}
                />
                <Text style={[styles.followBtnText, isFollowing && [styles.followBtnTextActive, { color: colors.gray700 }]]}>
                  {isFollowing ? 'Ne plus suivre' : 'Suivre'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.messageBtn, { borderColor: colors.primary }]} onPress={onSendMessage}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
            <Text style={[styles.messageBtnText, { color: colors.primary }]}>Message</Text>
          </TouchableOpacity>
        </View>
      )}

      {isSelf && (
        <View style={[styles.statusInfo, { backgroundColor: colors.gray100 }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.gray500} />
          <Text style={[styles.statusInfoText, { color: colors.gray600 }]}>C'est votre propre profil</Text>
        </View>
      )}
    </>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.xl,
  },
  permissionTitle: {
    ...TextStyles.h3,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  permissionText: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  permissionButtonText: {
    ...TextStyles.button,
  },
  backLink: {
    marginTop: Spacing.lg,
  },
  backLinkText: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
  },

  // Camera overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  // Scan area
  scanAreaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.white,
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: BorderRadius.lg,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: BorderRadius.lg,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: BorderRadius.lg,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    fontSize: FontSizes.base,
    color: Colors.white,
    marginTop: Spacing.md,
  },
  scanHint: {
    fontSize: FontSizes.base,
    color: Colors.white,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },

  // Bottom hints
  bottomHints: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  hintText: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    maxHeight: '85%',
  },

  // Result header
  resultHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  resultIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  resultTitle: {
    ...TextStyles.h3,
    textAlign: 'center',
  },

  // Result card
  resultCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardLabel: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  cardTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  cardRowText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    flex: 1,
  },

  // Expiration
  expirationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warningLight,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  expirationExpired: {
    backgroundColor: Colors.errorLight,
  },
  expirationText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.warning,
  },

  // Transfer actions
  transferActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  declineBtnText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.error,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
  },
  acceptBtnText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },

  // Status info
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.gray100,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  statusInfoText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },

  // User result
  userResultHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.gray200,
    marginBottom: Spacing.md,
  },
  userAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    marginBottom: Spacing.md,
  },
  userAvatarText: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['2xl'],
    color: Colors.gray600,
  },
  userName: {
    ...TextStyles.h3,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.xs,
  },
  roleBadge: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  roleBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
  },

  // User actions
  userActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  followBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
  },
  followBtnActive: {
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.gray300,
  },
  followBtnText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  followBtnTextActive: {
    color: Colors.gray700,
  },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  messageBtnText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },

  // Error result
  errorResult: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  errorIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  errorTitle: {
    ...TextStyles.h3,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
    textAlign: 'center',
  },

  // Scan again
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  scanAgainText: {
    ...TextStyles.button,
  },
});
