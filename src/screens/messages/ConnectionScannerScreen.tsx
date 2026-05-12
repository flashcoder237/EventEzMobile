/**
 * ConnectionScannerScreen — Scanner QR pour se connecter mutuellement.
 *
 * Dedie au flow connection (vs check-in events) — code minimal, evite de
 * complexifier QRScannerScreen existant.
 *
 * Flow :
 *   1. Camera ouverte, viewfinder centre
 *   2. Scan QR → token format "id.ts.hmac"
 *   3. POST /connections/from_qr/ → succes : toast + back ; erreur : message
 *   4. Si self-scan ou expired : message clair, le user peut re-scan
 */

import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { connectionsAPI } from '../../api';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Colors, FontFamily, Spacing, BorderRadius, Shadows,
} from '../../constants/theme';
import { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Pattern : id.ts.hmac16 (cf. backend services.generate_qr_token)
const CONNECTION_TOKEN_RE = /^\d+\.\d+\.[a-f0-9]{16}$/;

export default function ConnectionScannerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { showSuccess, showError } = useAlert();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleScan = useCallback(async ({ data }: { data: string }) => {
    if (scanned || processing) return;
    const trimmed = (data || '').trim();
    if (!CONNECTION_TOKEN_RE.test(trimmed)) {
      // Pas un token de connexion — on ignore silencieusement pour ne pas
      // bloquer si l'user scanne par erreur un QR de check-in event.
      return;
    }
    setScanned(true);
    setProcessing(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { /* ignore */ }

    try {
      const response = await connectionsAPI.fromQr(trimmed);
      const conn = response.data;
      const name = conn.user?.full_name || conn.user?.email || t('connections.scanSuccessGeneric');
      showSuccess(t('connections.scanSuccessTitle'), t('connections.scanSuccessMessage', { name }));
      navigation.goBack();
    } catch (error: any) {
      const code = error?.response?.data?.code;
      const messages: Record<string, string> = {
        invalid_format: t('connections.scanErrorInvalidFormat'),
        expired: t('connections.scanErrorExpired'),
        invalid_signature: t('connections.scanErrorInvalidSignature'),
        self_scan: t('connections.scanErrorSelfScan'),
        user_not_found: t('connections.scanErrorUserNotFound'),
      };
      const msg = messages[code] || error?.response?.data?.error || t('connections.scanErrorGeneric');
      showError(t('common.error'), msg);
      // Permettre de re-scan apres erreur (2s laisse le temps a l'user de lire)
      setTimeout(() => { setScanned(false); }, 2000);
    } finally {
      setProcessing(false);
    }
  }, [scanned, processing, showSuccess, showError, navigation, t]);

  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionWrap}>
          <Ionicons name="camera-outline" size={56} color={colors.gray400} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>{t('connections.permissionTitle')}</Text>
          <Text style={[styles.permissionSubtitle, { color: colors.gray500 }]}>
            {t('connections.permissionSubtitle')}
          </Text>
          <TouchableOpacity
            style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
            activeOpacity={0.85}
          >
            <Text style={styles.permissionBtnText}>{t('connections.permissionGrant')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleScan}
      />
      {/* Overlay : eyebrow + viewfinder + footer */}
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.overlayHeader}>
          <TouchableOpacity
            style={[styles.closeBtn, Shadows.sm]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={styles.overlayEyebrow}>{t('connections.scannerEyebrow')}</Text>
            <Text style={styles.overlayTitle}>{t('connections.scannerTitle')}</Text>
          </View>
        </View>

        {/* Viewfinder centré */}
        <View style={styles.viewfinderWrap}>
          <View style={styles.viewfinder}>
            {/* 4 corners */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        <View style={styles.overlayFooter}>
          {processing ? (
            <View style={styles.processingPill}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.processingText}>{t('connections.scannerProcessing')}</Text>
            </View>
          ) : (
            <Text style={styles.footerHint}>{t('connections.scannerHint')}</Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cameraContainer: { flex: 1, backgroundColor: '#000000' },
  overlay: { flex: 1, paddingHorizontal: Spacing.md },
  overlayHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  overlayEyebrow: {
    fontFamily: FontFamily.bold, fontSize: 11,
    letterSpacing: 0.5, textTransform: 'uppercase',
    color: '#FF6B6B',
  },
  overlayTitle: {
    fontFamily: FontFamily.displayBold, fontSize: 20,
    letterSpacing: -0.5, marginTop: 2,
    color: '#FFFFFF',
  },
  viewfinderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  viewfinder: { width: 260, height: 260 },
  corner: {
    position: 'absolute', width: 40, height: 40,
    borderColor: '#FFFFFF', borderWidth: 4,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  overlayFooter: {
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
  footerHint: {
    fontFamily: FontFamily.regular, fontSize: 13,
    color: '#FFFFFF', textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  processingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  processingText: {
    fontFamily: FontFamily.bold, fontSize: 13,
    color: '#FFFFFF',
  },
  permissionWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  permissionTitle: {
    fontFamily: FontFamily.displayBold, fontSize: 20,
    marginTop: Spacing.md,
  },
  permissionSubtitle: {
    fontFamily: FontFamily.regular, fontSize: 14,
    textAlign: 'center', marginTop: Spacing.xs,
    lineHeight: 20, marginBottom: Spacing.lg,
  },
  permissionBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  permissionBtnText: {
    fontFamily: FontFamily.bold, fontSize: 14,
    color: Colors.white,
  },
});
