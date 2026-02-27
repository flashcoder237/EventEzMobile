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
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { ticketTransfersAPI, usersAPI } from '../../api/client';
import { RootStackParamList } from '../../types';
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
  | { type: 'unknown' };

function parseQRCode(data: string): QRParseResult {
  const transferMatch = data.match(/^EVENTEZ-TRANSFER-(.+)$/);
  if (transferMatch) return { type: 'transfer', token: transferMatch[1] };

  const userMatch = data.match(/^EVENTEZ-USER-(.+)$/);
  if (userMatch) return { type: 'user', userId: userMatch[1] };

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
type ResultType = 'transfer' | 'user' | 'error';

interface ScanResult {
  type: ResultType;
  transfer?: TransferData;
  transferToken?: string;
  user?: UserData;
  isFollowing?: boolean;
  errorMessage?: string;
}

export default function ScanScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user: currentUser } = useAuth();
  const { showSuccess, showError } = useAlert();

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
      } else {
        setResult({ type: 'error', errorMessage: 'QR code non reconnu' });
      }
    } catch (error: any) {
      console.error('Scan error:', error);
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
      case 'organizer': return { label: 'Organisateur', color: Colors.primary };
      case 'moderator': return { label: 'Modérateur', color: Colors.warning };
      case 'admin': return { label: 'Admin', color: Colors.error };
      default: return null;
    }
  };

  // ── Permission screens ──

  if (!permission) {
    return <LoadingSpinner message="Chargement..." />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color={Colors.gray400} />
        <Text style={styles.permissionTitle}>Accès à la caméra requis</Text>
        <Text style={styles.permissionText}>
          Pour scanner les QR codes, autorisez l'accès à la caméra
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Autoriser l'accès</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>Retour</Text>
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
        {/* Header */}
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
            <Ionicons name="ticket-outline" size={18} color="rgba(255,255,255,0.8)" />
            <Text style={styles.hintText}>Transfert de billet</Text>
          </View>
          <View style={styles.hintRow}>
            <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.8)" />
            <Text style={styles.hintText}>Profil utilisateur</Text>
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
          <View style={styles.modalContent}>
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
                  <View style={styles.errorIcon}>
                    <Ionicons name="help-circle" size={64} color={Colors.gray400} />
                  </View>
                  <Text style={styles.errorTitle}>QR code non reconnu</Text>
                  <Text style={styles.errorMessage}>
                    {result.errorMessage || 'Ce QR code ne correspond pas à un format EventEz.'}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Scan another */}
            <TouchableOpacity style={styles.scanAgainButton} onPress={handleReset}>
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
  return (
    <>
      <View style={styles.resultHeader}>
        <View style={[styles.resultIconBg, { backgroundColor: '#EEF2FF' }]}>
          <Ionicons name="ticket" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.resultTitle}>Transfert de billet</Text>
      </View>

      {/* Event info */}
      <View style={styles.resultCard}>
        <Text style={styles.cardLabel}>Événement</Text>
        <Text style={styles.cardTitle}>{transfer.event_info.title}</Text>
        {transfer.event_info.start_date && (
          <View style={styles.cardRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.gray500} />
            <Text style={styles.cardRowText}>{formatDate(transfer.event_info.start_date)}</Text>
          </View>
        )}
        {transfer.event_info.location_city && (
          <View style={styles.cardRow}>
            <Ionicons name="location-outline" size={16} color={Colors.gray500} />
            <Text style={styles.cardRowText}>{transfer.event_info.location_city}</Text>
          </View>
        )}
      </View>

      {/* Ticket info */}
      <View style={styles.resultCard}>
        <Text style={styles.cardLabel}>Billet</Text>
        <Text style={styles.cardTitle}>
          {transfer.ticket_info.transfer_quantity}x {transfer.ticket_info.ticket_type_name}
        </Text>
        <View style={styles.cardRow}>
          <Ionicons name="person-outline" size={16} color={Colors.gray500} />
          <Text style={styles.cardRowText}>De : {transfer.sender_name}</Text>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="mail-outline" size={16} color={Colors.gray500} />
          <Text style={styles.cardRowText}>{transfer.sender_email}</Text>
        </View>
      </View>

      {/* Expiration */}
      <View style={[styles.expirationBadge, transfer.is_expired && styles.expirationExpired]}>
        <Ionicons
          name="time-outline"
          size={16}
          color={transfer.is_expired ? Colors.error : Colors.warning}
        />
        <Text style={[styles.expirationText, transfer.is_expired && { color: Colors.error }]}>
          {transfer.is_expired ? 'Ce transfert a expiré' : getTimeRemaining(transfer.expires_at)}
        </Text>
      </View>

      {/* Actions */}
      {!transfer.is_expired && transfer.can_accept && (
        <View style={styles.transferActions}>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={() => onDecline(token)}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={Colors.error} />
            ) : (
              <>
                <Ionicons name="close" size={18} color={Colors.error} />
                <Text style={styles.declineBtnText}>Refuser</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptBtn}
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
        <View style={styles.statusInfo}>
          <Text style={styles.statusInfoText}>
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
  const roleBadge = getRoleBadge(userData.role);
  const avatarUri = userData.profile_picture || userData.image;

  return (
    <>
      <View style={styles.userResultHeader}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.userAvatar} />
        ) : (
          <View style={styles.userAvatarPlaceholder}>
            <Text style={styles.userAvatarText}>{getUserInitials(userData)}</Text>
          </View>
        )}
        <Text style={styles.userName}>{getUserDisplayName(userData)}</Text>
        <Text style={styles.userEmail}>{userData.email}</Text>
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
              isFollowing && styles.followBtnActive,
            ]}
            onPress={onToggleFollow}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color={isFollowing ? Colors.gray700 : Colors.white} />
            ) : (
              <>
                <Ionicons
                  name={isFollowing ? 'person-remove-outline' : 'person-add-outline'}
                  size={18}
                  color={isFollowing ? Colors.gray700 : Colors.white}
                />
                <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                  {isFollowing ? 'Ne plus suivre' : 'Suivre'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.messageBtn} onPress={onSendMessage}>
            <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
            <Text style={styles.messageBtnText}>Message</Text>
          </TouchableOpacity>
        </View>
      )}

      {isSelf && (
        <View style={styles.statusInfo}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.gray500} />
          <Text style={styles.statusInfoText}>C'est votre propre profil</Text>
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
