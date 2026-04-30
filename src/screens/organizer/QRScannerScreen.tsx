import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Modal,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Pressable,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { useCheckinQueue } from '../../hooks/useCheckinQueue';
import { registrationsAPI, eventsAPI, sessionsAPI } from '../../api';
import { RootStackParamList, Registration, Event } from '../../types';

interface ScanSession {
  id: string;
  title: string;
  start_time?: string;
  end_time?: string;
}

type ScanMode =
  | { kind: 'main' }
  | { kind: 'session'; sessionId: string; sessionTitle: string };
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TextStyles,
  Shadows,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'QRScanner'>;

interface ScanResult {
  success: boolean;
  registration?: Registration;
  message: string;
  alreadyCheckedIn?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

export default function QRScannerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { eventId } = route.params;
  const { showError } = useAlert();
  const { colors } = useTheme();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [stats, setStats] = useState({ scanned: 0, success: 0, failed: 0 });
  const [autoCheckIn, setAutoCheckIn] = useState(true);
  const sessionStartedAtRef = useRef<number>(Date.now());
  const [event, setEvent] = useState<Event | null>(null);
  const { play: playSound } = useSoundEffect();
  const { enqueue: enqueueOfflineScan, flush: flushQueue, pendingCount, isFlushing, isOnline } = useCheckinQueue();

  // Manual entry modal
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Mode de scan : entrée principale (registration check-in) ou session (présence)
  // Géré par un sélecteur en haut de l'écran. Les sessions sont chargées au mount.
  const [scanMode, setScanMode] = useState<ScanMode>({ kind: 'main' });
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false);

  useEffect(() => {
    let active = true;
    sessionsAPI.getSessions({ event: eventId })
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
  }, [eventId]);

  // Auto-dismiss timer (en mode auto, ferme le modal après 1.5s)
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // Hydrate la pref autoCheckIn depuis AsyncStorage au mount + persiste à chaque toggle
  useEffect(() => {
    AsyncStorage.getItem('eventez:scanner_auto_checkin')
      .then((v) => {
        if (v !== null) setAutoCheckIn(v === 'true');
      })
      .catch(() => { /* ignore */ });
    AsyncStorage.getItem('eventez:scanner_low_power')
      .then((v) => {
        if (v !== null) setLowPowerMode(v === 'true');
      })
      .catch(() => { /* ignore */ });
  }, []);

  // Mode économie batterie : abaisse la fréquence d'autofocus + désactive
  // les optimisations gourmandes. À activer pour les events > 1h sans charger.
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const toggleLowPower = useCallback(() => {
    setLowPowerMode((prev) => {
      const next = !prev;
      AsyncStorage.setItem('eventez:scanner_low_power', String(next)).catch(() => {});
      return next;
    });
  }, []);
  const toggleAutoCheckIn = useCallback(() => {
    setAutoCheckIn((prev) => {
      const next = !prev;
      AsyncStorage.setItem('eventez:scanner_auto_checkin', String(next)).catch(() => {});
      return next;
    });
  }, []);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await eventsAPI.getEvent(eventId);
        setEvent(response.data);
      } catch (error) {
        if (__DEV__) console.error('Error fetching event:', error);
      }
    };
    fetchEvent();
  }, [eventId]);

  // Parse le QR scanné. Retourne le `kind` (ticket-level vs registration-level)
  // et un `id` interne (utile pour la queue offline). Le code brut `raw` est
  // ré-envoyé tel quel au backend qui parse aussi de son côté.
  type ScanInfo =
    | { kind: 'ticket_purchase'; ticketId: string; raw: string }
    | { kind: 'registration'; registrationId: string; raw: string }
    | null;

  const extractScanInfo = (data: string): ScanInfo => {
    // Ticket-level : .../verify/t/{ticket_id} — testé EN PREMIER (pattern + précis)
    const ticketMatch = data.match(/\/verify\/t\/([a-f0-9-]+)/i);
    if (ticketMatch) return { kind: 'ticket_purchase', ticketId: ticketMatch[1], raw: data };

    // Registration-level : .../verify/{registration_id}
    const regMatch = data.match(/\/verify\/([a-f0-9-]+)/i);
    if (regMatch) return { kind: 'registration', registrationId: regMatch[1], raw: data };

    // JSON legacy (ancien format)
    try {
      const jsonData = JSON.parse(data);
      if (jsonData.registration_id) {
        return { kind: 'registration', registrationId: jsonData.registration_id, raw: data };
      }
    } catch {
      /* not JSON */
    }

    // UUID brut → assumé registration_id (legacy)
    const uuidMatch = data.match(/^[a-f0-9-]{36}$/i);
    if (uuidMatch) return { kind: 'registration', registrationId: data, raw: data };

    return null;
  };

  // Compat helper utilisé par la saisie manuelle (ne change pas la signature
  // de l'ancien extractor pour ne pas casser les call sites mineurs).
  const extractRegistrationId = (data: string): string | null => {
    const info = extractScanInfo(data);
    if (!info) return null;
    return info.kind === 'registration' ? info.registrationId : info.ticketId;
  };

  // Pattern haptique différencié — succès = 1 vibration courte, échec = 2 saccades
  const vibrateSuccess = () => Vibration.vibrate([0, 80]);
  const vibrateFail = () => Vibration.vibrate([0, 120, 80, 120]);

  /**
   * Traite un scan en routant vers la bonne API selon :
   *   - le `scanMode` (entrée principale vs session)
   *   - le format du QR (ticket-level vs registration-level)
   *
   * Le code brut est ré-envoyé tel quel au backend qui parse de son côté ;
   * `info` sert seulement à choisir l'endpoint et à enqueue offline.
   */
  const processCheckIn = async (info: NonNullable<ScanInfo>, source: 'qr' | 'manual') => {
    setProcessing(true);
    try {
      const localId = info.kind === 'ticket_purchase' ? info.ticketId : info.registrationId;

      // ─── Mode SESSION : marquer la présence à la session sélectionnée ────
      if (scanMode.kind === 'session') {
        if (!isOnline) {
          await enqueueOfflineScan(info.raw, autoCheckIn, eventId, {
            kind: 'session_attendance',
            sessionId: scanMode.sessionId,
          });
          setScanResult({
            success: true,
            message: 'En attente de connexion — présence en queue',
          });
          setStats(prev => ({
            ...prev,
            scanned: prev.scanned + 1,
            success: prev.success + 1,
          }));
          playSound('scan-success');
          vibrateSuccess();
          return;
        }

        const response = await sessionsAPI.scanAttendance(scanMode.sessionId, info.raw);
        const data: any = response.data;
        setScanResult({
          success: !!data?.valid,
          message: data?.message || 'Présence enregistrée à la session.',
          alreadyCheckedIn: !!data?.already_attended,
        });
        setStats(prev => ({
          ...prev,
          scanned: prev.scanned + 1,
          success: data?.valid ? prev.success + 1 : prev.success,
          failed: data?.valid ? prev.failed : prev.failed + 1,
        }));
        if (data?.valid) {
          playSound('scan-success');
          vibrateSuccess();
        } else {
          playSound('scan-fail');
          vibrateFail();
        }
        return;
      }

      // ─── Mode ENTRÉE PRINCIPALE : check-in registration / billet ────────
      if (!isOnline) {
        await enqueueOfflineScan(
          info.kind === 'ticket_purchase' ? info.raw : info.registrationId,
          autoCheckIn,
          eventId,
          { kind: info.kind === 'ticket_purchase' ? 'ticket_purchase' : 'registration' },
        );
        setScanResult({
          success: true,
          message: autoCheckIn
            ? 'En attente de connexion — check-in en queue'
            : 'En attente de connexion — vérification en queue',
        });
        setStats(prev => ({
          ...prev,
          scanned: prev.scanned + 1,
          success: prev.success + 1,
        }));
        playSound('scan-success');
        vibrateSuccess();
        return;
      }

      // Choix endpoint : ticket-level si le QR contient /verify/t/{...},
      // registration-level (legacy) sinon. Le backend gère les deux flux.
      const response = info.kind === 'ticket_purchase'
        ? await registrationsAPI.verifyAndCheckInTicket(info.raw, autoCheckIn)
        : await registrationsAPI.verifyAndCheckIn(info.registrationId, autoCheckIn);

      const data: any = response.data;
      const registration = (data?.registration as Registration) || (data as Registration);

      const regEventId =
        (registration as any)?.event_detail?.id ||
        (registration as any)?.event_id ||
        (registration as any)?.event;
      const eventMismatch = regEventId && String(regEventId) !== String(eventId);

      const alreadyCheckedIn = !!data?.already_checked_in
        || (!!(registration as any)?.is_checked_in && !autoCheckIn);

      setScanResult({
        success: true,
        registration,
        message: eventMismatch
          ? '⚠ Billet d\'un autre événement — valide quand même ?'
          : data?.message
          ? data.message
          : autoCheckIn
          ? 'Check-in effectué avec succès!'
          : 'Billet vérifié avec succès!',
        alreadyCheckedIn,
      });
      setStats(prev => ({
        ...prev,
        scanned: prev.scanned + 1,
        success: prev.success + 1,
      }));
      playSound('scan-success');
      vibrateSuccess();
    } catch (error: any) {
      if (__DEV__) console.error('Scan error:', error);

      let message = source === 'manual'
        ? 'Code de référence invalide'
        : 'Code QR invalide ou non reconnu';
      if (error.response?.status === 404) {
        message = 'Aucun billet trouvé pour ce code';
      } else if (error.response?.status === 400) {
        message = error.response.data?.detail || error.response.data?.message || 'Billet déjà utilisé ou invalide';
      } else if (error.response?.data?.detail) {
        message = error.response.data.detail;
      }

      setScanResult({ success: false, message });
      setStats(prev => ({
        ...prev,
        scanned: prev.scanned + 1,
        failed: prev.failed + 1,
      }));
      playSound('scan-fail');
      vibrateFail();
    } finally {
      setProcessing(false);
      setShowResult(true);
    }
  };

  const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
    if (scanned || processing) return;
    setScanned(true);

    const info = extractScanInfo(data);
    if (!info) {
      setScanResult({ success: false, message: 'Format de QR code non reconnu' });
      setStats(prev => ({ ...prev, scanned: prev.scanned + 1, failed: prev.failed + 1 }));
      playSound('scan-fail');
      vibrateFail();
      setShowResult(true);
      return;
    }

    await processCheckIn(info, 'qr');
  };

  // Auto-dismiss du modal en mode auto-checkin (rend la main au scanner après 1.5s)
  useEffect(() => {
    if (!showResult) return;
    if (!autoCheckIn) return; // mode manuel = on attend une action explicite
    if (!scanResult?.success) return; // les erreurs restent affichées
    // Annuler tout timer précédent
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    autoDismissRef.current = setTimeout(() => {
      handleContinueScan();
    }, 1500);
    return () => {
      if (autoDismissRef.current) {
        clearTimeout(autoDismissRef.current);
        autoDismissRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResult, autoCheckIn, scanResult?.success]);

  const handleManualEntry = async () => {
    const code = manualCode.trim();
    if (!code) return;
    setManualOpen(false);
    setManualCode('');
    setScanned(true);
    // En saisie manuelle l'utilisateur tape généralement un reference_code
    // court (10 chars) ou un UUID. On reconstruit un ScanInfo registration-level
    // pour le router via le même processCheckIn que le scan QR.
    const info = extractScanInfo(code);
    if (info) {
      await processCheckIn(info, 'manual');
    } else {
      await processCheckIn({ kind: 'registration', registrationId: code, raw: code }, 'manual');
    }
  };

  const handleContinueScan = () => {
    setShowResult(false);
    setScanResult(null);
    setScanned(false);
  };

  const handleManualCheckIn = async () => {
    if (!scanResult?.registration) return;

    setProcessing(true);
    try {
      await registrationsAPI.checkIn(scanResult.registration.id);
      setScanResult(prev => prev ? {
        ...prev,
        success: true,
        message: 'Check-in effectué avec succès!',
        alreadyCheckedIn: false,
      } : null);
    } catch (error: any) {
      showError('Erreur', error.response?.data?.detail || 'Impossible d\'effectuer le check-in');
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: colors.background }]}>
<LoadingSpinner message="Chargement..." />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <EditorialCanvas edges={['top', 'bottom']}>
        <WatermarkNumeral>QR</WatermarkNumeral>
        <View style={[styles.permissionContainer, { zIndex: 1 }]}>
          <Ionicons name="camera-outline" size={64} color={colors.gray400} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>Accès à la caméra requis</Text>
          <Text style={[styles.permissionText, { color: colors.gray500 }]}>
            Pour scanner les QR codes, autorisez l'accès à la caméra
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (permission?.canAskAgain) {
                requestPermission();
              } else {
                // L'utilisateur a "Refuser pour toujours" → seul Settings peut le débloquer
                Linking.openSettings().catch(() => {});
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Autoriser l'acces a la camera"
          >
            <Text style={styles.permissionButtonText}>
              {permission?.canAskAgain ? "Autoriser l'accès" : 'Ouvrir les paramètres'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => setManualOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Saisie manuelle"
          >
            <Text style={[styles.backLinkText, { color: colors.primary }]}>Saisie manuelle de la référence</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Text style={[styles.backLinkText, { color: colors.gray500 }]}>Retour</Text>
          </TouchableOpacity>
        </View>
      </EditorialCanvas>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flashOn}
        // Mode économie batterie : désactive autofocus continu + utilise la
        // résolution la plus basse capable de lire un QR. Sur un event 4h
        // sans prise, ça étend la batterie de 30-40%.
        autofocus={lowPowerMode ? 'off' : 'on'}
        videoQuality="480p"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Header */}
        <SafeAreaView style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              // Récap de session si l'utilisateur a fait au moins un scan
              if (stats.scanned > 0) {
                const elapsedMs = Date.now() - sessionStartedAtRef.current;
                const elapsedMin = Math.max(1, Math.floor(elapsedMs / 60000));
                showError(
                  'Bilan de la session',
                  `${stats.scanned} scan${stats.scanned > 1 ? 's' : ''} en ${elapsedMin} min\n` +
                    `✓ ${stats.success} validé${stats.success > 1 ? 's' : ''}\n` +
                    `✗ ${stats.failed} échoué${stats.failed > 1 ? 's' : ''}` +
                    (pendingCount > 0 ? `\n⏳ ${pendingCount} en queue offline` : ''),
                );
              }
              navigation.goBack();
            }}
            accessibilityRole="button"
            accessibilityLabel="Fermer le scanner"
          >
            <Ionicons name="close" size={24} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEyebrow}>Check-in</Text>
            <Text style={styles.headerTitle}>Scanner QR</Text>
            {event && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {event.title}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setFlashOn(!flashOn)}
            accessibilityRole="button"
            accessibilityLabel={flashOn ? 'Desactiver le flash' : 'Activer le flash'}
          >
            <Ionicons
              name={flashOn ? 'flash' : 'flash-outline'}
              size={24}
              color={flashOn ? colors.warning : '#FFFFFF'}
            />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Sélecteur de mode : entrée principale OU session précise.
            Visible uniquement si l'event a au moins une session. */}
        {sessions.length > 0 && (
          <View style={styles.modeSelectorRow}>
            <TouchableOpacity
              style={[
                styles.modePill,
                scanMode.kind === 'main' && styles.modePillActive,
              ]}
              onPress={() => setScanMode({ kind: 'main' })}
              accessibilityRole="button"
              accessibilityLabel="Scanner pour l'entrée principale"
            >
              <Ionicons
                name="enter-outline"
                size={14}
                color={scanMode.kind === 'main' ? colors.primary : '#FFFFFF'}
              />
              <Text
                style={[
                  styles.modePillText,
                  scanMode.kind === 'main' && { color: colors.primary },
                ]}
              >
                Entrée principale
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modePill,
                scanMode.kind === 'session' && styles.modePillActive,
              ]}
              onPress={() => setSessionPickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Scanner pour une session"
            >
              <Ionicons
                name="layers-outline"
                size={14}
                color={scanMode.kind === 'session' ? colors.primary : '#FFFFFF'}
              />
              <Text
                style={[
                  styles.modePillText,
                  scanMode.kind === 'session' && { color: colors.primary },
                ]}
                numberOfLines={1}
              >
                {scanMode.kind === 'session' ? scanMode.sessionTitle : 'Session…'}
              </Text>
              <Ionicons
                name="chevron-down"
                size={12}
                color={scanMode.kind === 'session' ? colors.primary : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Scan Area */}
        <View style={styles.scanAreaContainer}>
          <View style={styles.scanArea}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {processing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color={colors.white} />
                <Text style={styles.processingText}>Vérification...</Text>
              </View>
            )}
          </View>
          <Text style={styles.scanHint}>
            Place le QR code du billet dans le cadre
          </Text>

          {/* Offline badge — visible quand pas de réseau ou queue non vide */}
          {(!isOnline || pendingCount > 0) && (
            <TouchableOpacity
              style={styles.offlineBadge}
              onPress={() => isOnline && pendingCount > 0 && flushQueue()}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={
                !isOnline
                  ? `Hors-ligne, ${pendingCount} scan${pendingCount > 1 ? 's' : ''} en queue`
                  : `Synchroniser ${pendingCount} scan${pendingCount > 1 ? 's' : ''}`
              }
            >
              <Ionicons
                name={!isOnline ? 'cloud-offline' : isFlushing ? 'sync' : 'cloud-upload'}
                size={14}
                color="#fff"
              />
              <Text style={styles.offlineBadgeText}>
                {!isOnline
                  ? `Hors-ligne · ${pendingCount} en queue`
                  : isFlushing
                  ? `Sync...`
                  : `${pendingCount} scan${pendingCount > 1 ? 's' : ''} à syncer`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Bouton saisie manuelle — visible toujours, pour les billets sans QR */}
          <TouchableOpacity
            style={styles.manualEntryBtn}
            onPress={() => setManualOpen(true)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Saisir une référence manuellement"
          >
            <Ionicons name="keypad-outline" size={14} color="#fff" />
            <Text style={styles.manualEntryBtnText}>Saisie manuelle</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Controls */}
        <SafeAreaView style={styles.bottomControls}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.scanned}</Text>
              <Text style={styles.statLabel}>Scannés</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.success }]}>{stats.success}</Text>
              <Text style={styles.statLabel}>Validés</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.error }]}>{stats.failed}</Text>
              <Text style={styles.statLabel}>Échoués</Text>
            </View>
          </View>

          {/* Auto check-in toggle */}
          <TouchableOpacity
            style={[styles.autoCheckInToggle, { marginBottom: 6 }]}
            onPress={toggleLowPower}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: lowPowerMode }}
            accessibilityLabel="Mode économie de batterie"
          >
            <View style={[styles.checkbox, lowPowerMode && [styles.checkboxActive, { backgroundColor: colors.warning, borderColor: colors.warning }]]}>
              {lowPowerMode && <Ionicons name="leaf" size={12} color={colors.white} />}
            </View>
            <Text style={styles.autoCheckInText}>Mode économie de batterie</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.autoCheckInToggle}
            onPress={toggleAutoCheckIn}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: autoCheckIn }}
            accessibilityLabel="Check-in automatique apres scan"
          >
            <View style={[styles.checkbox, autoCheckIn && [styles.checkboxActive, { backgroundColor: colors.primary, borderColor: colors.primary }]]}>
              {autoCheckIn && <Ionicons name="checkmark" size={14} color={colors.white} />}
            </View>
            <Text style={styles.autoCheckInText}>Check-in automatique après scan</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      {/* Result Modal */}
      <Modal
        visible={showResult}
        animationType="slide"
        transparent
        onRequestClose={handleContinueScan}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            {scanResult?.success ? (
              <>
                <View style={[styles.resultIcon, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="checkmark-circle" size={64} color={colors.success} />
                </View>
                <Text style={[styles.resultTitle, { color: colors.text }]}>
                  {scanResult.alreadyCheckedIn ? 'Déjà enregistré' : 'Succès!'}
                </Text>
                <Text style={[styles.resultMessage, { color: colors.gray500 }]}>{scanResult.message}</Text>

                {scanResult.registration && (
                  <View style={[styles.ticketDetails, { backgroundColor: colors.gray50 }]}>
                    <View style={[styles.ticketDetailRow, { borderBottomColor: colors.gray200 }]}>
                      <Text style={[styles.ticketDetailLabel, { color: colors.gray500 }]}>Participant</Text>
                      <Text style={[styles.ticketDetailValue, { color: colors.gray900 }]}>
                        {scanResult.registration.user_name ||
                          `${scanResult.registration.user?.first_name || ''} ${scanResult.registration.user?.last_name || ''}`.trim() ||
                          scanResult.registration.user_email ||
                          'N/A'}
                      </Text>
                    </View>
                    <View style={[styles.ticketDetailRow, { borderBottomColor: colors.gray200 }]}>
                      <Text style={[styles.ticketDetailLabel, { color: colors.gray500 }]}>Email</Text>
                      <Text style={[styles.ticketDetailValue, { color: colors.gray900 }]}>
                        {scanResult.registration.user_email || scanResult.registration.user?.email || 'N/A'}
                      </Text>
                    </View>
                    <View style={[styles.ticketDetailRow, { borderBottomColor: colors.gray200 }]}>
                      <Text style={[styles.ticketDetailLabel, { color: colors.gray500 }]}>Type</Text>
                      <Text style={[styles.ticketDetailValue, { color: colors.gray900 }]}>
                        {scanResult.registration.registration_type || 'Standard'}
                      </Text>
                    </View>
                    <View style={[styles.ticketDetailRow, { borderBottomColor: colors.gray200 }]}>
                      <Text style={[styles.ticketDetailLabel, { color: colors.gray500 }]}>Référence</Text>
                      <Text style={[styles.ticketDetailValue, { color: colors.gray900 }]}>
                        {scanResult.registration.reference_code || scanResult.registration.id?.slice(0, 8).toUpperCase()}
                      </Text>
                    </View>
                  </View>
                )}

                {scanResult.alreadyCheckedIn && !autoCheckIn && (
                  <TouchableOpacity
                    style={styles.manualCheckInButton}
                    onPress={handleManualCheckIn}
                    disabled={processing}
                    accessibilityRole="button"
                    accessibilityLabel="Effectuer le check-in"
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-done" size={20} color={colors.white} />
                        <Text style={styles.manualCheckInText}>Effectuer le check-in</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <View style={[styles.resultIcon, { backgroundColor: colors.errorLight }]}>
                  <Ionicons name="close-circle" size={64} color={colors.error} />
                </View>
                <Text style={[styles.resultTitle, { color: colors.text }]}>Échec</Text>
                <Text style={[styles.resultMessage, { color: colors.gray500 }]}>{scanResult?.message}</Text>
              </>
            )}

            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: colors.primary }]}
              onPress={handleContinueScan}
              accessibilityRole="button"
              accessibilityLabel="Scanner un autre QR code"
            >
              <Ionicons name="scan-outline" size={20} color={colors.white} />
              <Text style={styles.continueButtonText}>Scanner un autre</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manual Entry Modal — saisie de la reference_code à 10 caractères */}
      <Modal
        visible={manualOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setManualOpen(false)}
      >
        <Pressable style={styles.manualBackdrop} onPress={() => setManualOpen(false)}>
          <Pressable style={[styles.manualCard, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.manualEyebrow, { color: colors.accent }]}>SAISIE MANUELLE</Text>
            <Text style={[styles.manualTitle, { color: colors.text }]}>Référence du billet</Text>
            <Text style={[styles.manualHint, { color: colors.gray500 }]}>
              Entre les 10 caractères du code de référence (ex. A8K9X3M2QR).
            </Text>
            <TextInput
              style={[styles.manualInput, { backgroundColor: colors.gray50, borderColor: colors.gray200, color: colors.text }]}
              value={manualCode}
              onChangeText={(t) => setManualCode(t.toUpperCase())}
              placeholder="A8K9X3M2QR"
              placeholderTextColor={colors.gray400}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              maxLength={40}
            />
            <View style={styles.manualActions}>
              <TouchableOpacity
                style={[styles.manualBtn, { backgroundColor: colors.gray100 }]}
                onPress={() => setManualOpen(false)}
                activeOpacity={0.85}
              >
                <Text style={[styles.manualBtnText, { color: colors.gray700 }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.manualBtn, { backgroundColor: colors.primary }, !manualCode.trim() && { opacity: 0.5 }]}
                onPress={handleManualEntry}
                disabled={!manualCode.trim()}
                activeOpacity={0.85}
              >
                <Text style={[styles.manualBtnText, { color: '#fff' }]}>Vérifier</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Picker de session : choisir laquelle scanner */}
      <Modal
        visible={sessionPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSessionPickerOpen(false)}
      >
        <Pressable style={styles.manualBackdrop} onPress={() => setSessionPickerOpen(false)}>
          <Pressable
            style={[styles.manualCard, { backgroundColor: colors.card, maxHeight: '70%' }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.manualEyebrow, { color: colors.accent }]}>SCANNER POUR</Text>
            <Text style={[styles.manualTitle, { color: colors.text }]}>Choisir une session</Text>
            <Text style={[styles.manualHint, { color: colors.gray500 }]}>
              Le QR scanné marquera la présence à la session sélectionnée (et non un check-in d'entrée).
            </Text>
            <View style={{ marginTop: Spacing.md, gap: Spacing.xs }}>
              {sessions.map((session) => {
                const isActive = scanMode.kind === 'session' && scanMode.sessionId === session.id;
                return (
                  <TouchableOpacity
                    key={session.id}
                    style={[
                      styles.sessionPickerItem,
                      { backgroundColor: isActive ? colors.primary : colors.gray50, borderColor: colors.border },
                    ]}
                    onPress={() => {
                      setScanMode({
                        kind: 'session',
                        sessionId: session.id,
                        sessionTitle: session.title,
                      });
                      setSessionPickerOpen(false);
                    }}
                  >
                    <Ionicons
                      name="layers-outline"
                      size={16}
                      color={isActive ? '#FFFFFF' : colors.primary}
                    />
                    <Text
                      style={[
                        styles.sessionPickerText,
                        { color: isActive ? '#FFFFFF' : colors.gray900 },
                      ]}
                      numberOfLines={2}
                    >
                      {session.title}
                    </Text>
                    {isActive && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={[styles.manualActions, { marginTop: Spacing.md }]}>
              <TouchableOpacity
                style={[styles.manualBtn, { backgroundColor: colors.gray100 }]}
                onPress={() => setSessionPickerOpen(false)}
                activeOpacity={0.85}
              >
                <Text style={[styles.manualBtnText, { color: colors.gray800 }]}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

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
  headerEyebrow: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
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
  bottomControls: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['2xl'],
    color: Colors.white,
  },
  statLabel: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  autoCheckInToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  autoCheckInText: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
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
    alignItems: 'center',
  },
  resultIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  resultIconSuccess: {
    backgroundColor: Colors.successLight,
  },
  resultIconError: {
    backgroundColor: Colors.errorLight,
  },
  resultTitle: {
    ...TextStyles.h3,
    marginBottom: Spacing.sm,
  },
  resultMessage: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  ticketDetails: {
    width: '100%',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  ticketDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
  },
  ticketDetailLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  ticketDetailValue: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: Colors.gray900,
    maxWidth: '60%',
    textAlign: 'right',
  },
  manualCheckInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  manualCheckInText: {
    ...TextStyles.button,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  continueButtonText: {
    ...TextStyles.button,
  },
  // Offline / queue badge en bas du scan area
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    marginTop: Spacing.sm,
  },
  offlineBadgeText: {
    color: '#fff',
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  // Manual entry button
  manualEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginTop: Spacing.sm,
  },
  manualEntryBtnText: {
    color: '#fff',
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  // Manual entry modal
  manualBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  manualCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
  },
  manualEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  manualTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    marginBottom: 6,
  },
  manualHint: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: Spacing.md,
  },
  manualInput: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    fontSize: 18,
    fontFamily: FontFamily.bold,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  manualActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  manualBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  manualBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    letterSpacing: 0.2,
  },

  // Sélecteur de mode de scan (entrée principale / session) au-dessus du cadre
  modeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    maxWidth: 200,
  },
  modePillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  modePillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },

  // Picker de session — réutilise manualHint et manualActions du modal saisie
  sessionPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  sessionPickerText: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
  },
});
