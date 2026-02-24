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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';

import { useAlert } from '../../contexts/AlertContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { registrationsAPI, eventsAPI } from '../../api/client';
import { RootStackParamList, Registration, Event } from '../../types';
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

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [stats, setStats] = useState({ scanned: 0, success: 0, failed: 0 });
  const [autoCheckIn, setAutoCheckIn] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await eventsAPI.getEvent(eventId);
        setEvent(response.data);
      } catch (error) {
        console.error('Error fetching event:', error);
      }
    };
    fetchEvent();
  }, [eventId]);

  // Extraire l'ID de registration depuis l'URL ou les données JSON
  const extractRegistrationId = (data: string): string | null => {
    // Format URL: http://localhost:3000/verify/{registrationId}
    // ou https://eventez.com/verify/{registrationId}
    const urlMatch = data.match(/\/verify\/([a-f0-9-]+)/i);
    if (urlMatch) {
      return urlMatch[1];
    }

    // Format JSON legacy (ancien format)
    try {
      const jsonData = JSON.parse(data);
      return jsonData.registration_id || null;
    } catch {
      // Ce n'est ni une URL ni du JSON valide
    }

    // Si c'est un UUID direct
    const uuidMatch = data.match(/^[a-f0-9-]{36}$/i);
    if (uuidMatch) {
      return data;
    }

    return null;
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || processing) return;

    setScanned(true);
    setProcessing(true);
    Vibration.vibrate(100);

    try {
      // Extraire l'ID de registration depuis le QR code
      const registrationId = extractRegistrationId(data);

      if (!registrationId) {
        throw new Error('Format de QR code non reconnu');
      }

      // Vérifier et faire le check-in via l'ID
      const response = await registrationsAPI.verifyAndCheckIn(registrationId, autoCheckIn);
      const registration = response.data;

      setScanResult({
        success: true,
        registration,
        message: autoCheckIn ? 'Check-in effectué avec succès!' : 'Billet vérifié avec succès!',
        alreadyCheckedIn: registration.is_checked_in && !autoCheckIn,
      });
      setStats(prev => ({
        ...prev,
        scanned: prev.scanned + 1,
        success: prev.success + 1,
      }));
    } catch (error: any) {
      console.error('Scan error:', error);

      let message = 'Code QR invalide ou non reconnu';
      if (error.message === 'Format de QR code non reconnu') {
        message = error.message;
      } else if (error.response?.status === 404) {
        message = 'Aucun billet trouvé pour ce code';
      } else if (error.response?.status === 400) {
        message = error.response.data?.detail || error.response.data?.message || 'Billet déjà utilisé ou invalide';
      } else if (error.response?.data?.detail) {
        message = error.response.data.detail;
      }

      setScanResult({
        success: false,
        message,
      });
      setStats(prev => ({
        ...prev,
        scanned: prev.scanned + 1,
        failed: prev.failed + 1,
      }));
    } finally {
      setProcessing(false);
      setShowResult(true);
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
      <View style={styles.permissionContainer}>
<LoadingSpinner message="Chargement..." />
      </View>
    );
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
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backLinkText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flashOn}
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
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
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
          >
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
            {/* Corner markers */}
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />

            {processing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color={Colors.white} />
                <Text style={styles.processingText}>Vérification...</Text>
              </View>
            )}
          </View>
          <Text style={styles.scanHint}>
            Placez le QR code du billet dans le cadre
          </Text>
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
              <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.success}</Text>
              <Text style={styles.statLabel}>Validés</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.failed}</Text>
              <Text style={styles.statLabel}>Échoués</Text>
            </View>
          </View>

          {/* Auto check-in toggle */}
          <TouchableOpacity
            style={styles.autoCheckInToggle}
            onPress={() => setAutoCheckIn(!autoCheckIn)}
          >
            <View style={[styles.checkbox, autoCheckIn && styles.checkboxActive]}>
              {autoCheckIn && <Ionicons name="checkmark" size={14} color={Colors.white} />}
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
          <View style={styles.modalContent}>
            {scanResult?.success ? (
              <>
                <View style={[styles.resultIcon, styles.resultIconSuccess]}>
                  <Ionicons name="checkmark-circle" size={64} color="#10B981" />
                </View>
                <Text style={styles.resultTitle}>
                  {scanResult.alreadyCheckedIn ? 'Déjà enregistré' : 'Succès!'}
                </Text>
                <Text style={styles.resultMessage}>{scanResult.message}</Text>

                {scanResult.registration && (
                  <View style={styles.ticketDetails}>
                    <View style={styles.ticketDetailRow}>
                      <Text style={styles.ticketDetailLabel}>Participant</Text>
                      <Text style={styles.ticketDetailValue}>
                        {scanResult.registration.user_name ||
                          `${scanResult.registration.user?.first_name || ''} ${scanResult.registration.user?.last_name || ''}`.trim() ||
                          scanResult.registration.user_email ||
                          'N/A'}
                      </Text>
                    </View>
                    <View style={styles.ticketDetailRow}>
                      <Text style={styles.ticketDetailLabel}>Email</Text>
                      <Text style={styles.ticketDetailValue}>
                        {scanResult.registration.user_email || scanResult.registration.user?.email || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.ticketDetailRow}>
                      <Text style={styles.ticketDetailLabel}>Type</Text>
                      <Text style={styles.ticketDetailValue}>
                        {scanResult.registration.registration_type || 'Standard'}
                      </Text>
                    </View>
                    <View style={styles.ticketDetailRow}>
                      <Text style={styles.ticketDetailLabel}>Référence</Text>
                      <Text style={styles.ticketDetailValue}>
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
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-done" size={20} color={Colors.white} />
                        <Text style={styles.manualCheckInText}>Effectuer le check-in</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <View style={[styles.resultIcon, styles.resultIconError]}>
                  <Ionicons name="close-circle" size={64} color="#EF4444" />
                </View>
                <Text style={styles.resultTitle}>Échec</Text>
                <Text style={styles.resultMessage}>{scanResult?.message}</Text>
              </>
            )}

            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinueScan}
            >
              <Ionicons name="scan-outline" size={20} color={Colors.white} />
              <Text style={styles.continueButtonText}>Scanner un autre</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    backgroundColor: '#D1FAE5',
  },
  resultIconError: {
    backgroundColor: '#FEE2E2',
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
    backgroundColor: '#10B981',
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
});
