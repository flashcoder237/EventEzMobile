import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Pressable,
  Linking,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import {
  TourTarget,
  useTour,
  getScannerTourSteps,
  SCANNER_TOUR_STORAGE_KEY,
  SCANNER_TOUR_DELAY_MS,
} from '../../components/tour';
import { useSoundEffect } from '../../hooks/useSoundEffect';
import { useCheckinQueue } from '../../hooks/useCheckinQueue';
import { useCheckinManifest } from '../../hooks/useCheckinManifest';
import { haptics } from '../../utils/haptics';
import {
  ScanFrameFeedback,
  PopOnIncrease,
  RollingText,
  CountUpText,
  DrawCheck,
  SpringSheet,
} from '../../components/ui/motion';
import { crossedHundred, scanCadence } from '../../lib/utils/organizerMoments';
import { Durations } from '../../constants/motion';
import Reanimated, { FadeInDown as ScanFadeInDown, FadeOutUp as ScanFadeOutUp } from 'react-native-reanimated';
import type { ScanFeedbackKind } from '../../components/ui/motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { registrationsAPI, eventsAPI, sessionsAPI, exhibitorsAPI } from '../../api';
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
import { getApiErrorMessage } from '../../lib/utils/errorHandling';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'QRScanner'>;

interface ScanResult {
  success: boolean;
  registration?: Registration;
  message: string;
  alreadyCheckedIn?: boolean;
  /** Validé mais à surveiller (billet d'un autre événement) → retour ambre. */
  warning?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

// Fenetre pendant laquelle un MEME code est ignore. Couvre le temps qu'une
// personne s'ecarte du champ apres validation, sans jamais bloquer un billet
// different (la garde est indexee sur le contenu du QR, pas sur le temps seul).
const RESCAN_GUARD_MS = 3000;

export default function QRScannerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { eventId } = route.params;
  const { showError } = useAlert();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const tour = useTour();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  // G1 — chaque nouveau résultat relance le retour visuel des coins du viseur
  // (vert / ambre / rouge), même si le type est identique au précédent.
  const [scanFeedback, setScanFeedback] = useState<{ kind: ScanFeedbackKind; n: number }>({ kind: 'idle', n: 0 });
  useEffect(() => {
    if (!scanResult) return;
    const kind: ScanFeedbackKind = !scanResult.success
      ? 'error'
      : scanResult.alreadyCheckedIn || scanResult.warning
        ? 'warning'
        : 'success';
    setScanFeedback((prev) => ({ kind, n: prev.n + 1 }));
  }, [scanResult]);
  const [showResult, setShowResult] = useState(false);
  const [stats, setStats] = useState({ scanned: 0, success: 0, failed: 0 });
  const [autoCheckIn, setAutoCheckIn] = useState(true);
  // Dernier code lu + horodatage, pour ignorer le meme QR reste dans le cadre.
  const lastScanRef = useRef<{ code: string | null; at: number }>({ code: null, at: 0 });
  const sessionStartedAtRef = useRef<number>(Date.now());
  // O9 — fin de service : une feuille dédiée au lieu d'une alerte d'erreur.
  const [endOpen, setEndOpen] = useState(false);
  // O9 — puce discrète tous les 100 scans validés (jamais sur le viseur).
  const [hundred, setHundred] = useState<number | null>(null);
  const prevSuccessRef = useRef(0);
  const hundredTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const { play: playSound } = useSoundEffect();
  const { enqueue: enqueueOfflineScan, flush: flushQueue, pendingCount, isFlushing, isOnline, lastRejected, acknowledgeRejected } = useCheckinQueue();
  // Manifeste de check-in offline : validation LOCALE des billets ticket-level.
  const manifest = useCheckinManifest(eventId);

  // Prépare l'offline : télécharge le manifeste tant qu'on est connecté, et
  // pousse d'éventuels check-ins locaux restés en attente (ex: app relancée).
  useEffect(() => {
    if (!isOnline) return;
    manifest.download().catch(() => {});
    manifest.syncNow().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, eventId]);

  // Manual entry modal
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Animations (alignées sur ScanScreen)
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const liveDotAnim = useRef(new Animated.Value(0)).current;


  // Scanner tour fires once the camera permission is granted — before that,
  // the screen renders a loading spinner or permission-denied page and the
  // scan-frame target isn't mounted (would error "élément introuvable").
  useFocusEffect(useCallback(() => {
    if (!permission?.granted) return;
    const timer = setTimeout(() => {
      if (tour.isActive) return;
      tour.start(getScannerTourSteps(t), { seenKey: SCANNER_TOUR_STORAGE_KEY });
    }, SCANNER_TOUR_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted]));

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
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Scans acceptés hors-ligne puis REFUSÉS par le serveur. Ces personnes sont
  // déjà entrées : c'est la seule occasion de le signaler à l'organisateur.
  // Vaut pour le flush manuel comme pour l'auto-flush au retour de connexion.
  useEffect(() => {
    if (lastRejected.length === 0) return;
    const alreadyUsed = lastRejected.filter((r) => r.reason === 'already_used').length;
    const notFound = lastRejected.filter((r) => r.reason === 'not_found').length;
    const unresolved = lastRejected.filter((r) => r.reason === 'max_attempts').length;
    const details = [
      alreadyUsed > 0 ? t('organizer.qrScanner.rejectedAlreadyUsed', { count: alreadyUsed }) : null,
      notFound > 0 ? t('organizer.qrScanner.rejectedNotFound', { count: notFound }) : null,
      unresolved > 0 ? t('organizer.qrScanner.rejectedUnresolved', { count: unresolved }) : null,
    ].filter(Boolean).join('\n');
    showError(
      t('organizer.qrScanner.rejectedTitle', { count: lastRejected.length }),
      `${details}\n\n${t('organizer.qrScanner.rejectedHint')}`,
    );
    acknowledgeRejected();
  }, [lastRejected, acknowledgeRejected, t, showError]);

  // Conflits remontés par la synchronisation du manifeste : le scanner a
  // affiché VERT à la porte, le serveur refuse. Presque toujours un billet
  // déjà scanné par un autre agent — c'est LE signal de double-scan.
  useEffect(() => {
    const report = manifest.lastSyncConflicts;
    if (!report) return;
    const conflicts = report.conflicts.length;
    const notFound = report.notFound.length;
    const details = [
      conflicts > 0 ? t('organizer.qrScanner.conflictDuplicate', { count: conflicts }) : null,
      notFound > 0 ? t('organizer.qrScanner.conflictNotFound', { count: notFound }) : null,
    ].filter(Boolean).join('\n');
    showError(
      t('organizer.qrScanner.conflictTitle', { count: conflicts + notFound }),
      `${details}\n\n${t('organizer.qrScanner.conflictHint')}`,
    );
    manifest.acknowledgeSyncConflicts();
  }, [manifest.lastSyncConflicts, manifest.acknowledgeSyncConflicts, t, showError]);

  // Mode économie batterie : abaisse la fréquence d'autofocus + désactive
  // les optimisations gourmandes. À activer pour les events > 1h sans charger.
  const [lowPowerMode, setLowPowerMode] = useState(false);
  // Ligne de scan + point « live » : coupés en mode économie batterie et
  // quand l'utilisateur a réduit les animations (état fixe, lisible).
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (lowPowerMode || reducedMotion) {
      scanLineAnim.setValue(0.5);
      liveDotAnim.setValue(1);
      return;
    }
    const line = Animated.loop(
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
    );
    const dot = Animated.loop(
      Animated.sequence([
        Animated.timing(liveDotAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(liveDotAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ]),
    );
    line.start();
    dot.start();
    return () => {
      line.stop();
      dot.stop();
    };
  }, [lowPowerMode, reducedMotion, scanLineAnim, liveDotAnim]);

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
    | { kind: 'attendee'; attendeeId: string; raw: string }
    | { kind: 'booth_badge'; badgeId: string; raw: string }
    | { kind: 'registration'; registrationId: string; raw: string }
    | null;

  // Format strict UUID (toutes versions) : 8-4-4-4-12 hex. On évite ainsi
  // d'accepter des QR codes étrangers qui matchent une regex trop large
  // (`[a-f0-9-]+` acceptait `a-b`, `123`, etc.) — ces scans pollueraient
  // la queue offline et alourdiraient le batch resync sans valeur ajoutée.
  // Les QR EventEz sont générés par `qrcode.QRCode` côté backend avec un
  // UUID Django, donc le format est garanti côté émetteur.
  const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const isValidUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  const extractScanInfo = (data: string): ScanInfo => {
    // Ticket-level : .../verify/t/{id} — testé EN PREMIER (pattern + précis).
    // L'id est un BigAutoField (ENTIER) côté backend ; on tolère aussi un UUID
    // (rétro-compat). On capture une suite hex/tiret/chiffre puis on valide
    // précisément (UUID strict OU entier) pour ne pas accepter de QR étrangers.
    const ticketMatch = data.match(/\/verify\/t\/([0-9a-f-]{1,40})/i);
    if (ticketMatch) {
      const id = ticketMatch[1];
      if (isValidUUID(id) || /^\d+$/.test(id)) {
        return { kind: 'ticket_purchase', ticketId: id, raw: data };
      }
    }

    // Check-in nominatif : .../verify/a/{uuid} — 1 participant = 1 entrée.
    const attendeeMatch = data.match(/\/verify\/a\/([0-9a-f-]{1,40})/i);
    if (attendeeMatch && isValidUUID(attendeeMatch[1])) {
      return { kind: 'attendee', attendeeId: attendeeMatch[1], raw: data };
    }

    // Badge exposant : .../verify/b/{uuid} — l'id est un UUID côté backend.
    const badgeMatch = data.match(/\/verify\/b\/([0-9a-f-]{1,40})/i);
    if (badgeMatch && isValidUUID(badgeMatch[1])) {
      return { kind: 'booth_badge', badgeId: badgeMatch[1], raw: data };
    }

    // Registration-level : .../verify/{uuid}
    const regMatch = data.match(new RegExp(`\\/verify\\/(${UUID_RE.source})`, 'i'));
    if (regMatch) return { kind: 'registration', registrationId: regMatch[1], raw: data };

    // JSON legacy (ancien format) — validation stricte de l'UUID
    try {
      const jsonData = JSON.parse(data);
      const candidateId = jsonData?.registration_id;
      if (typeof candidateId === 'string' && isValidUUID(candidateId)) {
        return { kind: 'registration', registrationId: candidateId, raw: data };
      }
    } catch {
      /* not JSON */
    }

    // UUID brut → assumé registration_id (legacy)
    if (isValidUUID(data.trim())) {
      return { kind: 'registration', registrationId: data.trim(), raw: data.trim() };
    }

    return null;
  };

  // Compat helper utilisé par la saisie manuelle (ne change pas la signature
  // de l'ancien extractor pour ne pas casser les call sites mineurs).
  const extractRegistrationId = (data: string): string | null => {
    const info = extractScanInfo(data);
    if (!info) return null;
    if (info.kind === 'registration') return info.registrationId;
    if (info.kind === 'ticket_purchase') return info.ticketId;
    if (info.kind === 'booth_badge') return info.badgeId;
    return null;
  };

  // Pattern haptique différencié — succès = 1 vibration courte, échec = 2 saccades
  // Retour haptique premium au portique (bien plus « pro » qu'un buzz brut).
  const vibrateSuccess = () => haptics.success();
  const vibrateFail = () => haptics.error();
  // « Déjà scanné » / « autre événement » : ce n'est PAS un succès à la porte.
  // Vibration d'avertissement et aucun son (pas d'asset dédié : le son de
  // succès induirait l'agent en erreur, celui d'échec aussi).
  const vibrateWarn = () => haptics.warning();

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
      const localId =
        info.kind === 'ticket_purchase'
          ? info.ticketId
          : info.kind === 'attendee'
            ? info.attendeeId
            : info.kind === 'booth_badge'
              ? info.badgeId
              : info.registrationId;

      // ─── Mode SESSION : marquer la présence à la session sélectionnée ────
      if (scanMode.kind === 'session') {
        if (!isOnline) {
          await enqueueOfflineScan(info.raw, autoCheckIn, eventId, {
            kind: 'session_attendance',
            sessionId: scanMode.sessionId,
          });
          setScanResult({
            success: true,
            message: t('organizer.qrScanner.sessionAttendanceQueued'),
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
          message: data?.message || t('organizer.qrScanner.sessionAttendanceRecorded'),
          alreadyCheckedIn: !!data?.already_attended,
        });
        setStats(prev => ({
          ...prev,
          scanned: prev.scanned + 1,
          success: data?.valid ? prev.success + 1 : prev.success,
          failed: data?.valid ? prev.failed : prev.failed + 1,
        }));
        if (data?.valid && data?.already_attended) {
          vibrateWarn();
        } else if (data?.valid) {
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
        // Validation LOCALE via manifeste (ticket-level uniquement). Vrai
        // vert/rouge à la porte sans réseau, au lieu d'un succès optimiste.
        if (info.kind === 'ticket_purchase' && manifest.ready) {
          const local = manifest.verifyTicket(info.ticketId);
          const synthetic = {
            id: info.ticketId,
            user_name: local.holderName,
            reference_code: local.reference,
            registration_type: local.ticketType,
          } as unknown as Registration;

          if (local.status === 'unknown') {
            setScanResult({ success: false, message: t('organizer.qrScanner.offlineUnknownTicket') });
            setStats(prev => ({ ...prev, scanned: prev.scanned + 1, failed: prev.failed + 1 }));
            playSound('scan-fail');
            vibrateFail();
            return;
          }
          if (local.status === 'already') {
            setScanResult({
              success: true,
              registration: synthetic,
              alreadyCheckedIn: true,
              message: t('organizer.qrScanner.offlineAlready'),
            });
            setStats(prev => ({ ...prev, scanned: prev.scanned + 1, success: prev.success + 1 }));
            vibrateWarn();
            return;
          }
          // valid → enregistre localement (persisté + poussé en batch au retour réseau)
          await manifest.recordCheckin(info.ticketId);
          setScanResult({
            success: true,
            registration: synthetic,
            message: t('organizer.qrScanner.offlineValidated'),
          });
          setStats(prev => ({ ...prev, scanned: prev.scanned + 1, success: prev.success + 1 }));
          playSound('scan-success');
          vibrateSuccess();
          return;
        }

        // Fallback : registration-level (legacy), badge exposant, ou manifeste
        // indispo → file optimiste (vérifiée côté serveur au flush).
        const offlinePayload =
          info.kind === 'ticket_purchase'
            ? info.raw
            : info.kind === 'attendee'
              ? info.raw
              : info.kind === 'booth_badge'
                ? info.raw
                : info.registrationId;
        const offlineKind =
          // Un scan nominatif se rejoue via l'endpoint ticket (raw code parsé
          // serveur) → même kind offline que ticket_purchase.
          info.kind === 'ticket_purchase' || info.kind === 'attendee'
            ? 'ticket_purchase'
            : info.kind === 'booth_badge'
              ? 'booth_badge'
              : 'registration';
        await enqueueOfflineScan(offlinePayload, autoCheckIn, eventId, {
          kind: offlineKind,
        });
        setScanResult({
          success: true,
          message: autoCheckIn
            ? t('organizer.qrScanner.queuedCheckin')
            : t('organizer.qrScanner.queuedVerify'),
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

      // Choix endpoint : badge exposant (/verify/b/), ticket-level (/verify/t/),
      // registration-level (legacy) sinon. Le backend gère chaque flux.
      const response = info.kind === 'booth_badge'
        ? await exhibitorsAPI.verifyAndCheckInBadge(info.raw, autoCheckIn)
        : (info.kind === 'ticket_purchase' || info.kind === 'attendee')
          // Le check-in nominatif (/verify/a/) passe par le même endpoint que le
          // ticket-level : le backend parse le format dans le code brut.
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
          ? t('organizer.qrScanner.eventMismatch')
          : data?.message
          ? data.message
          : autoCheckIn
          ? t('organizer.qrScanner.checkInSuccess')
          : t('organizer.qrScanner.verifySuccess'),
        alreadyCheckedIn,
        warning: !!eventMismatch,
      });
      setStats(prev => ({
        ...prev,
        scanned: prev.scanned + 1,
        success: prev.success + 1,
      }));
      if (eventMismatch || alreadyCheckedIn) {
        vibrateWarn();
      } else {
        playSound('scan-success');
        vibrateSuccess();
      }
    } catch (error: any) {
      if (__DEV__) console.error('Scan error:', error);

      let message = source === 'manual'
        ? t('organizer.qrScanner.manualInvalid')
        : t('organizer.qrScanner.qrInvalid');
      if (error.response?.status === 404) {
        message = t('organizer.qrScanner.noTicketFound');
      } else if (error.response?.status === 400) {
        message = getApiErrorMessage(error, t, {
          fallbackKey: 'organizer.qrScanner.ticketUsed',
        }).message;
      } else if (error.response?.data?.detail) {
        message = getApiErrorMessage(error, t, {
          fallbackKey: 'organizer.qrScanner.qrInvalid',
        }).message;
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

    // Garde anti-re-scan : apres `handleContinueScan()` la camera reprend
    // immediatement, et le QR de la personne PRECEDENTE est souvent encore
    // dans le cadre. Sans cette fenetre, il est re-scanne et remonte comme
    // « deja valide » — un faux conflit a chaque passage.
    const now = Date.now();
    if (
      lastScanRef.current.code === data &&
      now - lastScanRef.current.at < RESCAN_GUARD_MS
    ) {
      return;
    }
    lastScanRef.current = { code: data, at: now };

    setScanned(true);

    const info = extractScanInfo(data);
    if (!info) {
      setScanResult({ success: false, message: t('organizer.qrScanner.qrFormatInvalid') });
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
    // O9 — le viseur rend la main en 250 ms (le cadre, le son et la
    // vibration ont déjà tout dit) ; la carte du résultat reste lisible
    // jusqu'à 1,5 s ou jusqu'au scan suivant. Le même QR resté dans le cadre
    // est ignoré par la garde anti-re-scan (RESCAN_GUARD_MS).
    const resume = setTimeout(() => setScanned(false), 250);
    autoDismissRef.current = setTimeout(() => {
      handleContinueScan();
    }, 1500);
    resumeRef.current = resume;
    return () => {
      if (autoDismissRef.current) {
        clearTimeout(autoDismissRef.current);
        autoDismissRef.current = null;
      }
      if (resumeRef.current) {
        clearTimeout(resumeRef.current);
        resumeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResult, autoCheckIn, scanResult?.success, scanResult]);

  useEffect(() => {
    const before = prevSuccessRef.current;
    prevSuccessRef.current = stats.success;
    const crossed = crossedHundred(before, stats.success);
    if (!crossed) return;
    setHundred(crossed);
    if (hundredTimer.current) clearTimeout(hundredTimer.current);
    hundredTimer.current = setTimeout(() => setHundred(null), 2600);
  }, [stats.success]);
  useEffect(() => () => {
    if (hundredTimer.current) clearTimeout(hundredTimer.current);
  }, []);

  const closeScanner = () => {
    if (stats.scanned > 0) {
      setEndOpen(true);
      if (isOnline && pendingCount > 0) flushQueue?.().catch?.(() => {});
      return;
    }
    navigation.goBack();
  };

  // Reference code = 10 caractères [A-Z0-9] générés par secrets.choice
  // côté backend (apps/registrations/models.py:172-183). On accepte aussi
  // 16 caractères (fallback collision) et un peu de marge (8-20).
  const REFERENCE_CODE_RE = /^[A-Z0-9]{8,20}$/;

  const handleManualEntry = async () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) return;
    setManualOpen(false);
    setManualCode('');
    setScanned(true);
    // En saisie manuelle l'utilisateur tape soit un reference_code (10 chars
    // alphanumériques) soit un UUID. On valide avant pour éviter d'enqueuer
    // des saisies invalides en mode offline (alourdiraient la queue resync
    // et seraient rejetées en bloc côté backend).
    const info = extractScanInfo(code);
    if (info) {
      await processCheckIn(info, 'manual');
      return;
    }
    if (REFERENCE_CODE_RE.test(code)) {
      // Reference code : registration-level uniquement (pas de version ticket).
      await processCheckIn({ kind: 'registration', registrationId: code, raw: code }, 'manual');
      return;
    }
    setScanResult({
      success: false,
      message: t('organizer.qrScanner.manualCodeInvalid'),
    });
    setStats(prev => ({ ...prev, scanned: prev.scanned + 1, failed: prev.failed + 1 }));
    playSound('scan-fail');
    vibrateFail();
    setShowResult(true);
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
        message: t('organizer.qrScanner.checkInSuccess'),
        alreadyCheckedIn: false,
      } : null);
    } catch (error: any) {
      showError(t('common.error'), getApiErrorMessage(error, t, {
        fallbackKey: 'organizer.qrScanner.checkInError',
      }).message);
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: colors.background }]}>
<LoadingSpinner message={t('organizer.qrScanner.loading')} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <EditorialCanvas edges={['top', 'bottom']}>
        <WatermarkNumeral>QR</WatermarkNumeral>
        <View style={[styles.permissionContainer, { zIndex: 1 }]}>
          <Ionicons name="camera-outline" size={64} color={colors.gray400} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>{t('organizer.qrScanner.permissionTitle')}</Text>
          <Text style={[styles.permissionText, { color: colors.gray500 }]}>
            {t('organizer.qrScanner.permissionText')}
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
            accessibilityLabel={t('organizer.qrScanner.permissionAllowA11y')}
          >
            <Text style={styles.permissionButtonText}>
              {permission?.canAskAgain ? t('organizer.qrScanner.permissionAllow') : t('organizer.qrScanner.permissionOpenSettings')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => setManualOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('organizer.qrScanner.manualEntryA11y')}
          >
            <Text style={[styles.backLinkText, { color: colors.primary }]}>{t('organizer.qrScanner.manualEntry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Text style={[styles.backLinkText, { color: colors.gray500 }]}>{t('organizer.qrScanner.back')}</Text>
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
        {/* Top zone — EN DIRECT tag + editorial header (style ScanScreen) */}
        <SafeAreaView style={styles.topZone}>
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.closeDisc}
              onPress={closeScanner}
              accessibilityRole="button"
              accessibilityLabel={t('organizer.qrScanner.closeA11y')}
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.liveTag}>
              <Animated.View style={[styles.liveDot, { opacity: liveDotAnim }]} />
              <Text style={styles.liveTagText}>{t('organizer.qrScanner.headerEyebrow')}</Text>
            </View>

            <TouchableOpacity
              style={styles.closeDisc}
              onPress={() => setFlashOn(!flashOn)}
              accessibilityRole="button"
              accessibilityLabel={flashOn ? t('organizer.qrScanner.flashOffA11y') : t('organizer.qrScanner.flashOnA11y')}
            >
              <Ionicons
                name={flashOn ? 'flash' : 'flash-outline'}
                size={18}
                color={flashOn ? '#FCD34D' : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.editorialHeader}>
            <Text style={styles.editorialEyebrow}>{t('organizer.qrScanner.headerEyebrow')}</Text>
            <Text style={styles.editorialTitle}>{t('organizer.qrScanner.headerTitle')}</Text>
            {event && (
              <Text style={styles.editorialSubtitle} numberOfLines={1}>
                {event.title}
              </Text>
            )}
          </View>
        </SafeAreaView>

        {/* Scan Area — viewfinder + brackets + ligne animée (style ScanScreen) */}
        <View style={styles.scanAreaContainer}>
          {/* Mode pill flottant : entrée principale / session (si dispo) */}
          {sessions.length > 0 ? (
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modePill, scanMode.kind === 'main' && styles.modePillActive]}
                onPress={() => setScanMode({ kind: 'main' })}
                accessibilityRole="button"
                accessibilityLabel={t('organizer.qrScanner.scanMainA11y')}
              >
                <Ionicons
                  name="enter-outline"
                  size={12}
                  color={scanMode.kind === 'main' ? '#111110' : '#FFFFFF'}
                />
                <Text
                  style={[
                    styles.modePillText,
                    scanMode.kind === 'main' && { color: '#111110' },
                  ]}
                >
                  {t('organizer.qrScanner.scanMain')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modePill, scanMode.kind === 'session' && styles.modePillActive]}
                onPress={() => setSessionPickerOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={t('organizer.qrScanner.scanSessionA11y')}
              >
                <Ionicons
                  name="layers-outline"
                  size={12}
                  color={scanMode.kind === 'session' ? '#111110' : '#FFFFFF'}
                />
                <Text
                  style={[
                    styles.modePillText,
                    scanMode.kind === 'session' && { color: '#111110' },
                  ]}
                  numberOfLines={1}
                >
                  {scanMode.kind === 'session' ? scanMode.sessionTitle : t('organizer.qrScanner.scanSession')}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={10}
                  color={scanMode.kind === 'session' ? '#111110' : '#FFFFFF'}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.modePillSingle}>
              <Text style={styles.modePillText}>{t('organizer.qrScanner.scanMain')}</Text>
              <View style={styles.modePillDivider} />
              <Ionicons name="flash" size={12} color="#FCD34D" />
            </View>
          )}

          <TourTarget id="scanner-frame">
            <View style={styles.scanArea}>
              {/* Coins du viseur : blancs au repos, vert / ambre / rouge au
                  résultat (G1 — trois états distincts, lisibles d'un coup d'œil). */}
              <ScanFrameFeedback
                kind={scanFeedback.kind}
                trigger={scanFeedback.n}
                colors={{ success: colors.success, warning: colors.warning, error: colors.error }}
              />

              {/* Ligne de scan animée */}
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

              {processing && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.processingText}>{t('organizer.qrScanner.verifying')}</Text>
                </View>
              )}
            </View>
          </TourTarget>

          <Text style={styles.scanHint}>{t('organizer.qrScanner.scanHint')}</Text>

          {/* Hint chips bas du viewfinder : offline + saisie manuelle */}
          <View style={styles.chipRow}>
            {/* Préparation offline : manifeste téléchargé → scan validé localement */}
            {manifest.ready && (
              <View style={[styles.hintChip, styles.hintChipReady]}>
                <Ionicons
                  name={manifest.isDownloading ? 'sync' : 'cloud-done'}
                  size={14}
                  color="#34D399"
                />
                <Text style={styles.hintChipText}>
                  {manifest.pendingSyncCount > 0
                    ? t('organizer.qrScanner.offlineReadyPending', {
                        count: manifest.count,
                        pending: manifest.pendingSyncCount,
                      })
                    : t('organizer.qrScanner.offlineReady', { count: manifest.count })}
                </Text>
              </View>
            )}
            {/* Mode manuel = 1 tap par personne. La preference est persistee
                (AsyncStorage) et survit au redemarrage : sans ce rappel, un
                effleurement du toggle degrade le debit de scan pour toutes
                les sessions suivantes, sans que rien ne l'indique. */}
            {!autoCheckIn && (
              <TouchableOpacity
                style={[styles.hintChip, styles.hintChipWarning]}
                onPress={toggleAutoCheckIn}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={t('organizer.qrScanner.manualModeA11y')}
              >
                <Ionicons name="hand-left" size={14} color="#fff" />
                <Text style={styles.hintChipText}>
                  {t('organizer.qrScanner.manualModeBanner')}
                </Text>
              </TouchableOpacity>
            )}
            {(!isOnline || pendingCount > 0) && (
              <TouchableOpacity
                style={[styles.hintChip, styles.hintChipDanger]}
                onPress={() => isOnline && pendingCount > 0 && flushQueue()}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={
                  !isOnline
                    ? t('organizer.qrScanner.offlineA11y', { count: pendingCount })
                    : t('organizer.qrScanner.syncCountA11y', { count: pendingCount })
                }
              >
                <Ionicons
                  name={!isOnline ? 'cloud-offline' : isFlushing ? 'sync' : 'cloud-upload'}
                  size={14}
                  color="#fff"
                />
                <Text style={styles.hintChipText}>
                  {!isOnline
                    ? t('organizer.qrScanner.offlineTitle', { count: pendingCount })
                    : isFlushing
                    ? t('organizer.qrScanner.syncingTitle')
                    : t('organizer.qrScanner.syncCount', { count: pendingCount })}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.hintChip}
              onPress={() => setManualOpen(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('organizer.qrScanner.manualBtnA11y')}
            >
              <Ionicons name="keypad-outline" size={14} color="#FFFFFF" />
              <Text style={styles.hintChipText}>{t('organizer.qrScanner.manualBtn')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* O9 — tous les 100 scans validés : une puce discrète, au-dessus des
            statistiques, jamais sur le viseur. */}
        {hundred != null && (
          <Reanimated.View
            entering={ScanFadeInDown.duration(Durations.enter)}
            exiting={ScanFadeOutUp.duration(Durations.exit)}
            style={styles.hundredChip}
            pointerEvents="none"
          >
            <Text style={styles.hundredChipText}>
              {t('organizerMoments.scan.hundred', { count: hundred })}
            </Text>
          </Reanimated.View>
        )}

        {/* Bottom Controls */}
        <SafeAreaView style={styles.bottomControls}>
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <PopOnIncrease value={stats.scanned}>
                <Text style={styles.statValue}>{stats.scanned}</Text>
              </PopOnIncrease>
              <Text style={styles.statLabel}>{t('organizer.qrScanner.statScanned')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <PopOnIncrease value={stats.success}>
                <RollingText value={stats.success} style={[styles.statValue, { color: colors.success }]} />
              </PopOnIncrease>
              <Text style={styles.statLabel}>{t('organizer.qrScanner.statValidated')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <PopOnIncrease value={stats.failed}>
                <Text style={[styles.statValue, { color: colors.error }]}>{stats.failed}</Text>
              </PopOnIncrease>
              <Text style={styles.statLabel}>{t('organizer.qrScanner.statFailed')}</Text>
            </View>
          </View>

          {/* Auto check-in toggle */}
          <TouchableOpacity
            style={[styles.autoCheckInToggle, { marginBottom: 6 }]}
            onPress={toggleLowPower}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: lowPowerMode }}
            accessibilityLabel={t('organizer.qrScanner.lowPowerA11y')}
          >
            <View style={[styles.checkbox, lowPowerMode && [styles.checkboxActive, { backgroundColor: colors.warning, borderColor: colors.warning }]]}>
              {lowPowerMode && <Ionicons name="leaf" size={12} color={colors.white} />}
            </View>
            <Text style={styles.autoCheckInText}>{t('organizer.qrScanner.lowPower')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.autoCheckInToggle}
            onPress={toggleAutoCheckIn}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: autoCheckIn }}
            accessibilityLabel={t('organizer.qrScanner.autoCheckInA11y')}
          >
            <View style={[styles.checkbox, autoCheckIn && [styles.checkboxActive, { backgroundColor: colors.primary, borderColor: colors.primary }]]}>
              {autoCheckIn && <Ionicons name="checkmark" size={14} color={colors.white} />}
            </View>
            <Text style={styles.autoCheckInText}>{t('organizer.qrScanner.autoCheckIn')}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      {/* Result Modal — pattern ScanScreen : header circle + cards gray50 */}
      <Modal
        visible={showResult}
        animationType="slide"
        transparent
        onRequestClose={handleContinueScan}
      >
        <View style={styles.modalOverlay}>
          {/* Feuille ancree en bas : le bouton « Scanner un autre »
              est fixe hors du ScrollView, donc toujours colle au bas.
              Sans `insets.bottom` il passait sous la barre de
              navigation Android. */}
          <View style={[styles.modalContent, { backgroundColor: colors.card, paddingBottom: insets.bottom + Spacing.md }]}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {scanResult?.success ? (
                <>
                  <View style={styles.resultHeader}>
                    <View
                      style={[
                        styles.resultIconBg,
                        { backgroundColor: scanResult.alreadyCheckedIn ? colors.warningLight : colors.successLight },
                      ]}
                    >
                      <Ionicons
                        name={scanResult.alreadyCheckedIn ? 'time' : 'checkmark-circle'}
                        size={32}
                        color={scanResult.alreadyCheckedIn ? colors.warning : colors.success}
                      />
                    </View>
                    <Text style={[styles.resultTitle, { color: colors.gray900 }]}>
                      {scanResult.alreadyCheckedIn
                        ? t('organizer.qrScanner.alreadyCheckedIn')
                        : t('organizer.qrScanner.success')}
                    </Text>
                  </View>

                  {scanResult.registration && (
                    <View style={[styles.resultCard, { backgroundColor: colors.gray50 }]}>
                      <Text style={[styles.cardLabel, { color: colors.gray500 }]}>
                        {t('organizer.qrScanner.fieldParticipant')}
                      </Text>
                      <Text style={[styles.cardTitle, { color: colors.gray900 }]}>
                        {scanResult.registration.user_name ||
                          `${scanResult.registration.user?.first_name || ''} ${scanResult.registration.user?.last_name || ''}`.trim() ||
                          scanResult.registration.user_email ||
                          'N/A'}
                      </Text>
                      <View style={styles.cardRow}>
                        <Ionicons name="mail-outline" size={16} color={colors.gray500} />
                        <Text style={[styles.cardRowText, { color: colors.gray600 }]}>
                          {scanResult.registration.user_email || scanResult.registration.user?.email || 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.cardRow}>
                        <Ionicons name="pricetag-outline" size={16} color={colors.gray500} />
                        <Text style={[styles.cardRowText, { color: colors.gray600 }]}>
                          {scanResult.registration.registration_type || 'Standard'}
                        </Text>
                      </View>
                      <View style={styles.cardRow}>
                        <Ionicons name="document-text-outline" size={16} color={colors.gray500} />
                        <Text style={[styles.cardRowText, { color: colors.gray600 }]}>
                          {scanResult.registration.reference_code || scanResult.registration.id?.slice(0, 8).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={[styles.statusBadge, { backgroundColor: colors.successLight }]}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={[styles.statusBadgeText, { color: colors.success }]} numberOfLines={2}>
                      {scanResult.message}
                    </Text>
                  </View>

                  {scanResult.alreadyCheckedIn && !autoCheckIn && (
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, { backgroundColor: colors.success }]}
                      onPress={handleManualCheckIn}
                      disabled={processing}
                      accessibilityRole="button"
                      accessibilityLabel={t('organizer.qrScanner.manualCheckInA11y')}
                    >
                      {processing ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <>
                          <Ionicons name="checkmark-done" size={20} color={Colors.white} />
                          <Text style={styles.primaryActionText}>{t('organizer.qrScanner.manualCheckIn')}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <View style={styles.resultHeader}>
                  <View style={[styles.resultIconBg, { backgroundColor: colors.errorLight }]}>
                    <Ionicons name="close-circle" size={32} color={colors.error} />
                  </View>
                  <Text style={[styles.resultTitle, { color: colors.gray900 }]}>
                    {t('organizer.qrScanner.failure')}
                  </Text>
                  <Text style={[styles.resultMessage, { color: colors.gray500 }]}>
                    {scanResult?.message}
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: colors.primary }]}
              onPress={handleContinueScan}
              accessibilityRole="button"
              accessibilityLabel={t('organizer.qrScanner.scanAnotherA11y')}
            >
              <Ionicons name="scan-outline" size={20} color={Colors.white} />
              <Text style={styles.continueButtonText}>{t('organizer.qrScanner.scanAnother')}</Text>
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
            <Text style={[styles.manualEyebrow, { color: colors.accent }]}>{t('organizer.qrScanner.manualEyebrow')}</Text>
            <Text style={[styles.manualTitle, { color: colors.text }]}>{t('organizer.qrScanner.manualTitle')}</Text>
            <Text style={[styles.manualHint, { color: colors.gray500 }]}>
              {t('organizer.qrScanner.manualHint')}
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
                <Text style={[styles.manualBtnText, { color: colors.gray700 }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.manualBtn, { backgroundColor: colors.primary }, !manualCode.trim() && { opacity: 0.5 }]}
                onPress={handleManualEntry}
                disabled={!manualCode.trim()}
                activeOpacity={0.85}
              >
                <Text style={[styles.manualBtnText, { color: '#fff' }]}>{t('organizer.qrScanner.verify')}</Text>
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
            <Text style={[styles.manualEyebrow, { color: colors.accent }]}>{t('organizer.qrScanner.sessionPickerEyebrow')}</Text>
            <Text style={[styles.manualTitle, { color: colors.text }]}>{t('organizer.qrScanner.sessionPickerTitle')}</Text>
            <Text style={[styles.manualHint, { color: colors.gray500 }]}>
              {t('organizer.qrScanner.sessionPickerHint')}
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
                <Text style={[styles.manualBtnText, { color: colors.gray800 }]}>{t('organizer.qrScanner.close')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* O9 — Fin de service : un bilan, pas une alerte d'erreur. */}
      <SpringSheet
        visible={endOpen}
        onClose={() => setEndOpen(false)}
        backgroundColor={colors.card}
        accessibilityLabel={t('organizerMoments.scan.endTitle')}
      >
        <View style={styles.endSheet}>
          <Text style={[styles.endTitle, { color: colors.text }]}>{t('organizerMoments.scan.endTitle')}</Text>
          <View style={styles.endGrid}>
            <View style={styles.endCell}>
              <CountUpText
                value={stats.success}
                countKey={`scan-end:${sessionStartedAtRef.current}`}
                group
                style={[styles.endValue, { color: colors.success }]}
              />
              <Text style={[styles.endLabel, { color: colors.gray500 }]}>{t('organizerMoments.scan.validated')}</Text>
            </View>
            <View style={styles.endCell}>
              <Text style={[styles.endValue, { color: colors.text }]}>
                {t('organizerMoments.scan.cadence', {
                  value: String(scanCadence(stats.success, sessionStartedAtRef.current, Date.now())).replace('.', ','),
                })}
              </Text>
              <Text style={[styles.endLabel, { color: colors.gray500 }]}>{t('organizerMoments.scan.cadenceLabel')}</Text>
            </View>
            <View style={styles.endCell}>
              <Text style={[styles.endValue, { color: colors.gray600 }]}>{stats.failed}</Text>
              <Text style={[styles.endLabel, { color: colors.gray500 }]}>{t('organizerMoments.scan.refused')}</Text>
            </View>
          </View>

          {/* File hors ligne : jamais masquée tant qu'il reste des scans. */}
          {isFlushing ? (
            <View style={styles.endSync}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.endSyncText, { color: colors.gray600 }]}>{t('organizerMoments.scan.syncing')}</Text>
            </View>
          ) : pendingCount > 0 ? (
            <View style={[styles.endSync, styles.endSyncWarn]}>
              <Ionicons name="cloud-offline-outline" size={16} color="#D97706" />
              <Text style={[styles.endSyncText, { color: '#D97706' }]}>
                {t('organizerMoments.scan.pending', { count: pendingCount })}
              </Text>
            </View>
          ) : (
            <View style={styles.endSync}>
              <DrawCheck size={16} color={colors.success} strokeWidth={3} play={endOpen} />
              <Text style={[styles.endSyncText, { color: colors.success }]}>{t('organizerMoments.scan.synced')}</Text>
            </View>
          )}

          <View style={styles.endActions}>
            <TouchableOpacity
              style={[styles.endBtn, { borderColor: colors.gray200 }]}
              onPress={() => setEndOpen(false)}
              accessibilityRole="button"
            >
              <Text style={[styles.endBtnText, { color: colors.text }]}>{t('organizerMoments.scan.resume')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.endBtn, { borderColor: colors.gray200 }]}
              onPress={() => {
                setEndOpen(false);
                navigation.replace('LiveOps', { eventId });
              }}
              accessibilityRole="button"
            >
              <Text style={[styles.endBtnText, { color: colors.text }]}>{t('organizerMoments.scan.viewLiveOps')}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.endPrimary, { backgroundColor: colors.text }]}
            onPress={() => {
              setEndOpen(false);
              navigation.goBack();
            }}
            accessibilityRole="button"
          >
            <Text style={[styles.endBtnText, { color: colors.background }]}>{t('organizerMoments.scan.close')}</Text>
          </TouchableOpacity>
        </View>
      </SpringSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  hundredChip: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 210,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.9)',
  },
  hundredChipText: { color: '#FFFFFF', fontFamily: FontFamily.bold, fontSize: 12.5 },
  endSheet: { padding: Spacing.lg, gap: Spacing.md },
  endTitle: { fontFamily: FontFamily.displayExtraBold, fontSize: 22, letterSpacing: -0.5 },
  endGrid: { flexDirection: 'row', gap: Spacing.sm },
  endCell: { flex: 1, gap: 2 },
  endValue: { fontFamily: FontFamily.displayExtraBold, fontSize: 24 },
  endLabel: { fontFamily: FontFamily.medium, fontSize: 11.5 },
  endSync: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  endSyncWarn: {},
  endSyncText: { fontFamily: FontFamily.semiBold, fontSize: 13 },
  endActions: { flexDirection: 'row', gap: Spacing.sm },
  endBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 999, borderWidth: 1 },
  endPrimary: { alignItems: 'center', paddingVertical: 14, borderRadius: 999 },
  endBtnText: { fontFamily: FontFamily.bold, fontSize: 14 },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Permission screen (inchangé)
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

  // Editorial camera overlay (aligné sur ScanScreen)
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
  editorialSubtitle: {
    marginTop: 4,
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.85)',
  },

  // Scan area + brackets indigo
  scanAreaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: -12,
    zIndex: 2,
    maxWidth: '100%',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    maxWidth: 200,
  },
  modePillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  modePillSingle: {
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
    marginTop: Spacing.lg,
    textAlign: 'center',
  },

  // Hint chips (offline / saisie manuelle)
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
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
  hintChipDanger: {
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    borderColor: 'rgba(220, 38, 38, 0.9)',
  },
  hintChipWarning: {
    backgroundColor: 'rgba(217, 119, 6, 0.9)',
    borderColor: 'rgba(217, 119, 6, 0.95)',
  },
  hintChipReady: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderColor: 'rgba(52, 211, 153, 0.45)',
  },
  hintChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },

  // Bottom controls (stats + toggles) — fond éditorial
  bottomControls: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: FontSizes['2xl'],
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
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
    color: 'rgba(255,255,255,0.85)',
  },

  // Result modal (pattern ScanScreen)
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
  resultMessage: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  statusBadgeText: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    flex: 1,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  primaryActionText: {
    ...TextStyles.button,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  continueButtonText: {
    ...TextStyles.button,
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
