import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { useTranslation } from 'react-i18next';
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
import * as Haptics from 'expo-haptics';
import {
  ticketTransfersAPI,
  usersAPI,
  registrationsAPI,
  ticketPurchasesAPI,
  sessionsAPI,
  connectionsAPI,
} from '../../api';
import { RootStackParamList, Registration } from '../../types';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TextStyles,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

// ── QR code parsing ──

type QRParseResult =
  | { type: 'transfer'; token: string }
  | { type: 'user'; userId: string }
  | { type: 'ticket_purchase'; ticketId: string; raw: string }
  | { type: 'ticket'; registrationId: string; raw: string }
  | { type: 'connection'; token: string }
  | { type: 'unknown' };

// Pattern token connection (cf. backend services.generate_qr_token) :
// id.timestamp.hmac16 → "42.1715000000.a1b2c3d4e5f60718"
const CONNECTION_TOKEN_RE = /^\d+\.\d+\.[a-f0-9]{16}$/;

function parseQRCode(data: string): QRParseResult {
  const trimmed = (data || '').trim();

  const transferMatch = trimmed.match(/^EVENTEZ-TRANSFER-(.+)$/);
  if (transferMatch) return { type: 'transfer', token: transferMatch[1] };

  const userMatch = trimmed.match(/^EVENTEZ-USER-(.+)$/);
  if (userMatch) return { type: 'user', userId: userMatch[1] };

  // Token connection (mise en relation user-to-user via QR profil).
  // Teste avant ticket-level pour eviter qu'un token court ressemble a un id.
  if (CONNECTION_TOKEN_RE.test(trimmed)) {
    return { type: 'connection', token: trimmed };
  }

  // Nouveau format ticket-level : .../verify/t/{ticket_purchase_id}
  // Testé AVANT le format registration-level pour matcher le pattern le plus
  // spécifique d'abord (sinon /verify/{...} attraperait aussi les URLs t/...).
  const ticketMatch = trimmed.match(/\/verify\/t\/([a-f0-9-]+)/i);
  if (ticketMatch) return { type: 'ticket_purchase', ticketId: ticketMatch[1], raw: trimmed };

  // Format legacy registration-level : .../verify/{registrationId}
  const verifyMatch = trimmed.match(/\/verify\/([a-f0-9-]+)/i);
  if (verifyMatch) return { type: 'ticket', registrationId: verifyMatch[1], raw: trimmed };

  // UUID brut → considéré comme registration_id (legacy)
  const uuidMatch = trimmed.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
  if (uuidMatch) return { type: 'ticket', registrationId: trimmed, raw: trimmed };

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
  // Si le QR est un ticket-level (/verify/t/{id}), on stocke aussi l'ID
  // du TicketPurchase pour pouvoir appeler verify_and_check_in_ticket
  // (check-in granulaire). Absent → fallback sur verify_and_check_in (legacy).
  ticketPurchaseId?: string;
  ticketPurchase?: any;
  // QR brut tel que scanné — utile pour le ré-envoyer côté serveur en mode
  // scan_attendance (session) sans avoir à reconstruire l'URL.
  scanRaw?: string;
}

type ResultType = 'transfer' | 'user' | 'ticket' | 'connection' | 'error';

interface ConnectionResultData {
  user: UserData;
  // ID de la Connection cree (pour navigation eventuelle vers la conversation
  // directe ou le profil enrichi).
  connectionId?: number | string;
}

interface ScanResult {
  type: ResultType;
  transfer?: TransferData;
  transferToken?: string;
  user?: UserData;
  isFollowing?: boolean;
  ticket?: TicketData;
  connection?: ConnectionResultData;
  errorMessage?: string;
}

export default function ScanScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user: currentUser } = useAuth();
  const { showSuccess, showError } = useAlert();
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? 'en-US' : 'fr-FR';

  const [permission, requestPermission] = useCameraPermissions();
  const [flashOn, setFlashOn] = useState(false);
  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [scanned, setScanned] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const liveDotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(liveDotAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(liveDotAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

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
      } else if (parsed.type === 'ticket_purchase') {
        // Nouveau format ticket-level : on récupère le TicketPurchase puis sa
        // Registration parente pour afficher les mêmes infos qu'un scan legacy.
        // Le check-in passera par verify_and_check_in_ticket (granulaire).
        const ticketRes = await ticketPurchasesAPI.getTicketPurchase(parsed.ticketId);
        const tp = ticketRes.data as any;
        const regId = String(tp.registration_id || tp.registration || '');
        const regRes = await registrationsAPI.getRegistration(regId);
        const reg = regRes.data;
        const eventDetail = reg.event_detail || {};
        setResult({
          type: 'ticket',
          ticket: {
            registrationId: regId,
            registration: reg,
            eventTitle: eventDetail.title || t('scanForm.fallbackEvent'),
            eventId: eventDetail.id || (typeof reg.event === 'string' ? reg.event : reg.event?.id) || '',
            userName: reg.user_name || '',
            userEmail: reg.user_email || '',
            referenceCode: reg.reference_code || regId.slice(0, 8).toUpperCase(),
            status: reg.status || 'pending',
            registrationType: reg.registration_type || 'billetterie',
            ticketPurchaseId: parsed.ticketId,
            ticketPurchase: tp,
            scanRaw: parsed.raw,
          },
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
            eventTitle: eventDetail.title || t('scanForm.fallbackEvent'),
            eventId: eventDetail.id || (typeof reg.event === 'string' ? reg.event : reg.event?.id) || '',
            userName: reg.user_name || '',
            userEmail: reg.user_email || '',
            referenceCode: reg.reference_code || parsed.registrationId.slice(0, 8).toUpperCase(),
            status: reg.status || 'pending',
            registrationType: reg.registration_type || 'billetterie',
            scanRaw: parsed.raw,
          },
        });
      } else if (parsed.type === 'connection') {
        try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch { /* ignore */ }
        const response = await connectionsAPI.fromQr(parsed.token);
        const conn = response.data as any;
        const cu = conn?.user || {};
        setResult({
          type: 'connection',
          connection: {
            connectionId: conn?.id,
            user: {
              id: String(cu.id ?? ''),
              first_name: cu.first_name,
              last_name: cu.last_name,
              email: cu.email,
              profile_picture: cu.profile_picture,
              // ConnectionUser ne contient pas first_name/last_name → on derive
              // depuis full_name si fourni par le backend.
              ...(cu.full_name && !cu.first_name
                ? (() => {
                    const parts = String(cu.full_name).trim().split(/\s+/);
                    return { first_name: parts[0] || '', last_name: parts.slice(1).join(' ') };
                  })()
                : {}),
            },
          },
        });
      } else {
        setResult({ type: 'error', errorMessage: t('scanForm.unknownQR') });
      }
    } catch (error: any) {
      if (__DEV__) console.error('Scan error:', error);
      // Cas connexion : le backend renvoie un code typed (cf. FromQrError)
      const connCode = error?.response?.data?.code;
      const connMessages: Record<string, string> = {
        invalid_format: t('connections.scanErrorInvalidFormat'),
        expired: t('connections.scanErrorExpired'),
        invalid_signature: t('connections.scanErrorInvalidSignature'),
        self_scan: t('connections.scanErrorSelfScan'),
        user_not_found: t('connections.scanErrorUserNotFound'),
      };
      let msg: string;
      if (connCode && connMessages[connCode]) {
        msg = connMessages[connCode];
      } else if (error.response?.status === 404) {
        msg = t('scanForm.notFound');
      } else if (error.response?.data?.detail) {
        msg = error.response.data.detail;
      } else if (error.response?.data?.error) {
        msg = error.response.data.error;
      } else {
        msg = t('scanForm.scanFailed');
      }
      setResult({ type: 'error', errorMessage: msg });
    }

    setScanState('result');
  };

  // ── Actions ──

  const handleAcceptTransfer = async (token: string) => {
    setActionLoading(true);
    try {
      await ticketTransfersAPI.acceptByToken(token);
      showSuccess(t('scanForm.transferAccepted'), t('scanForm.transferAcceptedMessage'));
      navigation.goBack();
    } catch (error: any) {
      showError(t('common.error'), error.response?.data?.detail || t('scanForm.transferAcceptError'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineTransfer = async (token: string) => {
    setActionLoading(true);
    try {
      await ticketTransfersAPI.declineByToken(token);
      showSuccess(t('scanForm.transferDeclined'), t('scanForm.transferDeclinedMessage'));
      navigation.goBack();
    } catch (error: any) {
      showError(t('common.error'), error.response?.data?.detail || t('scanForm.transferDeclineError'));
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
      showError(t('common.error'), error.response?.data?.detail || t('scanForm.followError'));
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
    return date.toLocaleDateString(dateLocale, {
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
    if (diff <= 0) return t('scanForm.expiredFlag');
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return t('scanForm.daysHoursRemaining', { days, hours: hours % 24 });
    }
    return t('scanForm.hoursMinutesRemaining', { hours, minutes });
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
      case 'organizer': return { label: t('scanForm.roleOrganizer'), color: colors.primary };
      case 'moderator': return { label: t('scanForm.roleModerator'), color: colors.warning };
      case 'admin': return { label: t('scanForm.roleAdmin'), color: colors.error };
      default: return null;
    }
  };

  // ── Permission screens ──

  if (!permission) {
    return <LoadingSpinner message={t('scanForm.loading')} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.permissionContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="camera-outline" size={64} color={colors.gray400} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>{t('scanForm.permissionTitle')}</Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            {t('scanForm.permissionDescription')}
          </Text>
          <TouchableOpacity style={[styles.permissionButton, { backgroundColor: colors.primary }]} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>{t('scanForm.permissionAllow')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={[styles.backLinkText, { color: colors.textSecondary }]}>{t('scanForm.back')}</Text>
          </TouchableOpacity>
        </View>
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

      {/* Editorial Overlay */}
      <View style={styles.overlay}>
        {/* Top zone — EN DIRECT tag + editorial header */}
        <SafeAreaView style={styles.topZone}>
          <View style={styles.topRow}>
            <TouchableOpacity style={styles.closeDisc} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.liveTag}>
              <Animated.View style={[styles.liveDot, { opacity: liveDotAnim }]} />
              <Text style={styles.liveTagText}>{t('scanForm.liveTag')}</Text>
            </View>

            <TouchableOpacity style={styles.closeDisc} onPress={() => setFlashOn(!flashOn)}>
              <Ionicons
                name={flashOn ? 'flash' : 'flash-outline'}
                size={18}
                color={flashOn ? '#FCD34D' : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.editorialHeader}>
            <Text style={styles.editorialEyebrow}>{t('scanForm.headerEyebrow')}</Text>
            <Text style={styles.editorialTitle}>{t('scanForm.headerTitle')}</Text>
          </View>
        </SafeAreaView>

        {/* Scan Viewfinder */}
        <View style={styles.scanAreaContainer}>
          {/* Floating MODE CAMÉRA pill */}
          <View style={styles.modePill}>
            <Text style={styles.modePillText}>{t('scanForm.modePill')}</Text>
            <View style={styles.modePillDivider} />
            <Ionicons name="flash" size={12} color="#FCD34D" />
          </View>

          <View style={styles.scanArea}>
            {/* Indigo L-brackets */}
            <View style={[styles.bracket, styles.bracketTL]} />
            <View style={[styles.bracket, styles.bracketTR]} />
            <View style={[styles.bracket, styles.bracketBL]} />
            <View style={[styles.bracket, styles.bracketBR]} />

            {/* Animated lime scan line */}
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [
                    {
                      translateY: scanLineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, SCAN_AREA_SIZE - 12],
                      }),
                    },
                  ],
                },
              ]}
            />

            {scanState === 'loading' && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.processingText}>{t('scanForm.processing')}</Text>
              </View>
            )}
          </View>

          <Text style={styles.scanHint}>{t('scanForm.scanArea')}</Text>
        </View>

        {/* Bottom hint chips */}
        <SafeAreaView style={styles.bottomHints} edges={['bottom']}>
          <View style={styles.hintChip}>
            <Ionicons name="qr-code-outline" size={14} color="#FFFFFF" />
            <Text style={styles.hintChipText}>{t('scanForm.hintTicket')}</Text>
          </View>
          <View style={[styles.hintChip, styles.hintChipAccent]}>
            <Ionicons name="ticket-outline" size={14} color="#FFFFFF" />
            <Text style={styles.hintChipText}>{t('scanForm.hintTransfer')}</Text>
          </View>
          <View style={styles.hintChip}>
            <Ionicons name="people-outline" size={14} color="#FFFFFF" />
            <Text style={styles.hintChipText}>{t('scanForm.hintConnection')}</Text>
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

              {/* Connection result (QR profil → mise en relation acceptee) */}
              {result?.type === 'connection' && result.connection && (
                <ConnectionResult
                  data={result.connection}
                  onSendMessage={() =>
                    handleSendMessage(String(result.connection!.user.id), getUserDisplayName(result.connection!.user))
                  }
                  getUserDisplayName={getUserDisplayName}
                  getUserInitials={getUserInitials}
                />
              )}

              {/* Error result */}
              {result?.type === 'error' && (
                <View style={styles.errorResult}>
                  <View style={[styles.errorIcon, { backgroundColor: colors.gray100 }]}>
                    <Ionicons name="help-circle" size={64} color={colors.gray400} />
                  </View>
                  <Text style={[styles.errorTitle, { color: colors.gray900 }]}>{t('scanForm.unknownQRError')}</Text>
                  <Text style={[styles.errorMessage, { color: colors.gray500 }]}>
                    {result.errorMessage || t('scanForm.unknownQRDescription')}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Scan another - Colors.white on colored button is fine */}
            <TouchableOpacity style={[styles.scanAgainButton, { backgroundColor: colors.primary }]} onPress={handleReset}>
              <Ionicons name="scan-outline" size={20} color={Colors.white} />
              <Text style={styles.scanAgainText}>{t('scanForm.scanAnother')}</Text>
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
  const { t } = useTranslation();

  return (
    <>
      <View style={styles.resultHeader}>
        <View style={[styles.resultIconBg, { backgroundColor: isDark ? 'rgba(238,242,255,0.15)' : '#EEF2FF' }]}>
          <Ionicons name="ticket" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.resultTitle, { color: colors.gray900 }]}>{t('scanForm.transferTitle')}</Text>
      </View>

      {/* Event info */}
      <View style={[styles.resultCard, { backgroundColor: colors.gray50 }]}>
        <Text style={[styles.cardLabel, { color: colors.gray500 }]}>{t('scanForm.cardEvent')}</Text>
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
        <Text style={[styles.cardLabel, { color: colors.gray500 }]}>{t('scanForm.cardTicket')}</Text>
        <Text style={[styles.cardTitle, { color: colors.gray900 }]}>
          {transfer.ticket_info.transfer_quantity}x {transfer.ticket_info.ticket_type_name}
        </Text>
        <View style={styles.cardRow}>
          <Ionicons name="person-outline" size={16} color={colors.gray500} />
          <Text style={[styles.cardRowText, { color: colors.gray600 }]}>{t('scanForm.cardFrom', { name: transfer.sender_name })}</Text>
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
          {transfer.is_expired ? t('scanForm.expired') : getTimeRemaining(transfer.expires_at)}
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
                <Text style={[styles.declineBtnText, { color: colors.error }]}>{t('scanForm.decline')}</Text>
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
                <Text style={styles.acceptBtnText}>{t('scanForm.accept')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {transfer.status !== 'pending' && (
        <View style={[styles.statusInfo, { backgroundColor: colors.gray100 }]}>
          <Text style={[styles.statusInfoText, { color: colors.gray600 }]}>
            {transfer.status === 'accepted' ? t('scanForm.transferAccepted2') :
             transfer.status === 'declined' ? t('scanForm.transferDeclined2') :
             transfer.status === 'cancelled' ? t('scanForm.transferCancelled') :
             t('scanForm.transferStatus', { status: transfer.status })}
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
  const { t } = useTranslation();

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return { label: t('scanForm.statusConfirmed'), color: colors.success, bg: isDark ? 'rgba(209,250,229,0.15)' : '#D1FAE5' };
      case 'completed': return { label: t('scanForm.statusCompleted'), color: colors.success, bg: isDark ? 'rgba(209,250,229,0.15)' : '#D1FAE5' };
      case 'checked_in': return { label: t('scanForm.statusCheckedIn'), color: colors.success, bg: isDark ? 'rgba(209,250,229,0.15)' : '#D1FAE5' };
      case 'pending': return { label: t('scanForm.statusPending'), color: colors.warning, bg: isDark ? 'rgba(254,243,199,0.15)' : '#FEF3C7' };
      case 'pending_approval': return { label: t('scanForm.statusPendingApproval'), color: colors.warning, bg: isDark ? 'rgba(254,243,199,0.15)' : '#FEF3C7' };
      case 'cancelled': return { label: t('scanForm.statusCancelled'), color: colors.error, bg: isDark ? 'rgba(254,226,226,0.15)' : '#FEE2E2' };
      case 'rejected': return { label: t('scanForm.statusRejected'), color: colors.error, bg: isDark ? 'rgba(254,226,226,0.15)' : '#FEE2E2' };
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
        <Text style={[styles.resultTitle, { color: colors.gray900 }]}>{t('scanForm.ticketTitle')}</Text>
      </View>

      {/* Event info */}
      <View style={[styles.resultCard, { backgroundColor: colors.gray50 }]}>
        <Text style={[styles.cardLabel, { color: colors.gray500 }]}>{t('scanForm.cardEvent')}</Text>
        <Text style={[styles.cardTitle, { color: colors.gray900 }]}>{ticket.eventTitle}</Text>
      </View>

      {/* Ticket details */}
      <View style={[styles.resultCard, { backgroundColor: colors.gray50 }]}>
        <Text style={[styles.cardLabel, { color: colors.gray500 }]}>{t('scanForm.cardRegistration')}</Text>
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
          <Text style={[styles.cardRowText, { color: colors.gray600 }]}>{t('scanForm.cardRefPrefix', { code: ticket.referenceCode })}</Text>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="pricetag-outline" size={16} color={colors.gray500} />
          <Text style={[styles.cardRowText, { color: colors.gray600 }]}>
            {ticket.registrationType === 'billetterie' ? t('scanForm.ticketTypeBilletterie') : t('scanForm.ticketTypeRegistration')}
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
          <Text style={[styles.declineBtnText, { color: colors.primary }]}>{t('scanForm.viewEvent')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
          onPress={() => onViewTicket(ticket.registrationId)}
        >
          <Ionicons name="ticket-outline" size={18} color={Colors.white} />
          <Text style={styles.acceptBtnText}>{t('scanForm.viewTicket')}</Text>
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
  const { t } = useTranslation();
  const roleBadge = getRoleBadge(userData.role);
  const avatarUri = userData.profile_picture || userData.image;

  return (
    <>
      <View style={styles.userResultHeader}>
        {avatarUri ? (
          <Image source={avatarUri} style={[styles.userAvatar, { borderColor: colors.gray200 }]} cachePolicy="memory-disk" transition={200} />
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
                  {isFollowing ? t('scanForm.unfollow') : t('scanForm.follow')}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.messageBtn, { borderColor: colors.primary }]} onPress={onSendMessage}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
            <Text style={[styles.messageBtnText, { color: colors.primary }]}>{t('scanForm.message')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {isSelf && (
        <View style={[styles.statusInfo, { backgroundColor: colors.gray100 }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.gray500} />
          <Text style={[styles.statusInfoText, { color: colors.gray600 }]}>{t('scanForm.ownProfile')}</Text>
        </View>
      )}
    </>
  );
}

// ── Connection Result Sub-component ──

function ConnectionResult({
  data,
  onSendMessage,
  getUserDisplayName,
  getUserInitials,
}: {
  data: ConnectionResultData;
  onSendMessage: () => void;
  getUserDisplayName: (u: UserData) => string;
  getUserInitials: (u: UserData) => string;
}) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const avatarUri = data.user.profile_picture || data.user.image;

  return (
    <>
      <View style={styles.resultHeader}>
        <View style={[styles.resultIconBg, { backgroundColor: isDark ? 'rgba(255,107,107,0.15)' : '#FFE4E4' }]}>
          <Ionicons name="people" size={32} color={colors.accent || '#FF6B6B'} />
        </View>
        <Text style={[styles.resultTitle, { color: colors.gray900 }]}>
          {t('connections.scanSuccessTitle')}
        </Text>
      </View>

      <View style={styles.userResultHeader}>
        {avatarUri ? (
          <Image source={avatarUri} style={[styles.userAvatar, { borderColor: colors.gray200 }]} cachePolicy="memory-disk" transition={200} />
        ) : (
          <View style={[styles.userAvatarPlaceholder, { backgroundColor: colors.gray200, borderColor: colors.white }]}>
            <Text style={[styles.userAvatarText, { color: colors.gray600 }]}>{getUserInitials(data.user)}</Text>
          </View>
        )}
        <Text style={[styles.userName, { color: colors.gray900 }]}>{getUserDisplayName(data.user)}</Text>
        {data.user.email ? (
          <Text style={[styles.userEmail, { color: colors.gray500 }]}>{data.user.email}</Text>
        ) : null}
      </View>

      <View style={styles.userActions}>
        <TouchableOpacity
          style={[styles.acceptBtn, { backgroundColor: colors.primary }]}
          onPress={onSendMessage}
        >
          <Ionicons name="chatbubble-outline" size={18} color={Colors.white} />
          <Text style={styles.acceptBtnText}>{t('scanForm.message')}</Text>
        </TouchableOpacity>
      </View>
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

  // Editorial camera overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topZone: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingBottom: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  closeDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveTagText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#FFFFFF',
  },
  editorialHeader: {
    alignItems: 'flex-start',
  },
  editorialEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
  },
  editorialTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 32,
    letterSpacing: -1.1,
    color: '#FFFFFF',
    lineHeight: 36,
  },

  // Scan area
  scanAreaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    marginBottom: -12,
    zIndex: 2,
  },
  modePillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#FFFFFF',
  },
  modePillDivider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    borderRadius: 28,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  bracket: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: '#FFFFFF',
  },
  bracketTL: {
    top: 10,
    left: 10,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 16,
  },
  bracketTR: {
    top: 10,
    right: 10,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 16,
  },
  bracketBL: {
    bottom: 10,
    left: 10,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 16,
  },
  bracketBR: {
    bottom: 10,
    right: 10,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 16,
  },
  scanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: '#FFFFFF',
    marginTop: Spacing.md,
  },
  scanHint: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.xl,
    textAlign: 'center',
  },

  // Bottom hint chips
  bottomHints: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  hintChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  hintChipAccent: {
    backgroundColor: 'rgba(79,70,229,0.8)',
    borderColor: 'rgba(79,70,229,0.9)',
  },
  hintChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#FFFFFF',
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
