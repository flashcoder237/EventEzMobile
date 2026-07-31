import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Linking,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';

import { verificationAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { Colors, FontFamily, BorderRadius, Spacing, Shadows } from '../../constants/theme';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { StaggeredItem } from '../../components/ui/Animations';

type VerificationStatus = 'none' | 'pending' | 'under_review' | 'approved' | 'rejected';

interface DocItem {
  key: string;
  label: string;
  description: string;
  icon: string;
  eyebrow: string;
  file: { uri: string; name: string; type: string } | null;
}

const INDIVIDUAL_DOC_KEYS = [
  { key: 'cni', icon: 'card-outline', eyebrow: 'DOC 01', labelKey: 'individualDoc1Label', descKey: 'individualDoc1Description' },
  { key: 'selfie_with_cni', icon: 'camera-outline', eyebrow: 'DOC 02', labelKey: 'individualDoc2Label', descKey: 'individualDoc2Description' },
];

const ORGANIZATION_DOC_KEYS = [
  { key: 'business_registration', icon: 'business-outline', eyebrow: 'DOC 01', labelKey: 'orgDoc1Label', descKey: 'orgDoc1Description' },
  { key: 'company_statutes', icon: 'document-text-outline', eyebrow: 'DOC 02', labelKey: 'orgDoc2Label', descKey: 'orgDoc2Description' },
  { key: 'representative_cni', icon: 'card-outline', eyebrow: 'DOC 03', labelKey: 'orgDoc3Label', descKey: 'orgDoc3Description' },
];

export default function VerificationScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { showAlert, showError } = useAlert();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  // Preview plein écran RÉACTIVE (suit rotation/resize iPad) plutôt qu'une taille
  // figée au chargement du module.
  const { width: winW, height: winH } = useWindowDimensions();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const [status, setStatus] = useState<VerificationStatus>('none');
  const [rejectionReason, setRejectionReason] = useState('');
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // URI de l'image affichee en plein ecran. null = modal ferme.
  const [zoomedImageUri, setZoomedImageUri] = useState<string | null>(null);

  const handlePreviewPress = async (file: { uri: string; type: string; name: string }) => {
    if (file.type.startsWith('image/')) {
      setZoomedImageUri(file.uri);
      return;
    }
    // PDF (ou autre) : ouverture systeme.
    try {
      await Linking.openURL(file.uri);
    } catch {
      showError(
        t('common.error'),
        t('verificationForm.pdfOpenError', { defaultValue: 'Impossible d\'ouvrir le document.' })
      );
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const orgType = user?.organizer_type || 'individual';
      const templates = orgType === 'organization' ? ORGANIZATION_DOC_KEYS : INDIVIDUAL_DOC_KEYS;
      setDocuments(templates.map(d => ({
        key: d.key,
        icon: d.icon,
        eyebrow: d.eyebrow,
        label: t(`verificationForm.${d.labelKey}`),
        description: t(`verificationForm.${d.descKey}`),
        file: null,
      })));

      try {
        const res = await verificationAPI.getMyRequest();
        setStatus(res.data.status);
        if (res.data.rejection_reason) {
          setRejectionReason(res.data.rejection_reason);
        }
      } catch {
        setStatus('none');
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading verification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pickDocument = async (docKey: string) => {
    showAlert(
      t('verificationForm.pickerTitle'),
      t('verificationForm.pickerMessage'),
      [
        {
          text: t('verificationForm.pickerCamera'),
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              const name = asset.uri.split('/').pop() || 'photo.jpg';
              setDocuments(prev =>
                prev.map(d => d.key === docKey ? {
                  ...d,
                  file: { uri: asset.uri, name, type: asset.mimeType || 'image/jpeg' },
                } : d)
              );
            }
          },
        },
        {
          text: t('verificationForm.pickerGallery'),
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              const name = asset.uri.split('/').pop() || 'image.jpg';
              setDocuments(prev =>
                prev.map(d => d.key === docKey ? {
                  ...d,
                  file: { uri: asset.uri, name, type: asset.mimeType || 'image/jpeg' },
                } : d)
              );
            }
          },
        },
        {
          text: t('verificationForm.pickerPdf'),
          onPress: async () => {
            const result = await DocumentPicker.getDocumentAsync({
              type: 'application/pdf',
            });
            if (!result.canceled && result.assets?.[0]) {
              const asset = result.assets[0];
              setDocuments(prev =>
                prev.map(d => d.key === docKey ? {
                  ...d,
                  file: { uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/pdf' },
                } : d)
              );
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    const missing = documents.filter(d => !d.file);
    if (missing.length > 0) {
      showError(t('verificationForm.missingDocsTitle'), t('verificationForm.missingDocsMessage'));
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      documents.forEach(doc => {
        if (doc.file) {
          formData.append(doc.key, {
            uri: doc.file.uri,
            name: doc.file.name,
            type: doc.file.type,
          } as any);
        }
      });

      await verificationAPI.submit(formData);
      setStatus('pending');
      showAlert(t('verificationForm.submitSuccessTitle'), t('verificationForm.submitSuccessMessage'), undefined, 'success');
    } catch (error: any) {
      const message = error.response?.data?.detail
        || error.response?.data?.non_field_errors?.[0]
        || t('verificationForm.submitErrorGeneric');
      showError(t('verificationForm.submitErrorTitle'), message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <EditorialCanvas edges={['top']}>
        <WatermarkNumeral>ID</WatermarkNumeral>
        <LoadingSpinner />
      </EditorialCanvas>
    );
  }

  const renderStatusCallout = (
    iconName: any,
    iconColor: string,
    eyebrow: string,
    title: string,
    desc: string,
    bgColor: string,
    borderColor: string,
  ) => (
    <View style={[styles.statusCallout, { backgroundColor: bgColor, borderColor }]}>
      <View style={[styles.statusRail, { backgroundColor: iconColor }]} />
      <View style={[styles.statusIcon, { backgroundColor: iconColor }]}>
        <Ionicons name={iconName} size={16} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.statusEyebrow, { color: iconColor }]}>{eyebrow}</Text>
        <Text style={[styles.statusTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.statusDesc, { color: colors.gray600 }]}>{desc}</Text>
      </View>
    </View>
  );

  const filledCount = documents.filter(d => d.file).length;
  const progress = documents.length > 0 ? (filledCount / documents.length) * 100 : 0;

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>ID</WatermarkNumeral>
      {/* === HEADER === */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? colors.background : 'rgba(255,255,255,0.6)',
            borderBottomColor: hairline,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.iconDisc, { backgroundColor: colors.gray100 }]}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color={colors.gray600} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('verificationForm.headerEyebrow')}</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('verificationForm.headerTitle')}</Text>
          </View>
          {status === 'approved' && (
            <View style={[styles.verifiedBadge, { backgroundColor: '#10B981' }]}>
              <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" />
              <Text style={styles.verifiedBadgeText}>{t('verificationForm.verifiedBadge')}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* === LEAD === */}
        <Text style={[styles.lead, { color: colors.gray600 }]}>
          {t('verificationForm.lead')}
        </Text>

        {/* === DISAMBIGUATION HINT === */}
        <View style={[styles.hintCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
          <Ionicons name="information-circle" size={18} color={colors.primary} />
          <Text style={[styles.hintText, { color: colors.gray700 }]}>
            {t('verificationForm.hintBefore')}<Text style={{ fontFamily: FontFamily.bold, color: colors.primary }}>{t('verificationForm.hintHighlight1')}</Text>{t('verificationForm.hintMiddle')}<Text style={{ fontFamily: FontFamily.bold, color: colors.primary }}>{t('verificationForm.hintHighlight2')}</Text>{t('verificationForm.hintAfter')}
          </Text>
        </View>

        {/* === STATUS CALLOUTS === */}
        {status === 'approved' &&
          renderStatusCallout(
            'checkmark-circle',
            '#10B981',
            t('verificationForm.statusApprovedEyebrow'),
            t('verificationForm.statusApprovedTitle'),
            t('verificationForm.statusApprovedDesc'),
            '#ECFDF5',
            '#A7F3D0',
          )}

        {(status === 'pending' || status === 'under_review') &&
          renderStatusCallout(
            'time',
            '#F59E0B',
            t('verificationForm.statusReviewEyebrow'),
            status === 'pending' ? t('verificationForm.statusPendingTitle') : t('verificationForm.statusUnderReviewTitle'),
            t('verificationForm.statusReviewDesc'),
            '#FEF3C7',
            '#FDE68A',
          )}

        {status === 'rejected' &&
          renderStatusCallout(
            'close-circle',
            '#EF4444',
            t('verificationForm.statusRejectedEyebrow'),
            t('verificationForm.statusRejectedTitle'),
            rejectionReason
              ? t('verificationForm.statusRejectedDescWithReason', { reason: rejectionReason })
              : t('verificationForm.statusRejectedDesc'),
            '#FEF2F2',
            '#FECACA',
          )}

        {(status === 'none' || status === 'rejected') && (
          <>
            {/* === PROGRESS BAR === */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <View>
                  <Text style={[styles.progressEyebrow, { color: colors.accent }]}>{t('verificationForm.progressEyebrow')}</Text>
                  <Text style={[styles.progressTitle, { color: colors.text }]}>
                    {t('verificationForm.progressDocs', { filled: filledCount, total: documents.length })}
                  </Text>
                </View>
                <Text style={[styles.progressPercent, { color: colors.text }]}>
                  {Math.round(progress)}%
                </Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: colors.gray100 }]}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBarFill, { width: `${progress}%` }]}
                />
              </View>
            </View>

            {/* === DOCUMENTS === */}
            <View style={styles.docSection}>
              <Text style={[styles.docSectionEyebrow, { color: colors.accent }]}>{t('verificationForm.docSectionEyebrow')}</Text>
              <Text style={[styles.docSectionTitle, { color: colors.text }]}>
                {t('verificationForm.docSectionTitle')}
              </Text>
            </View>

            {documents.map((doc, idx) => (
              <StaggeredItem key={doc.key} index={idx}>
                <TouchableOpacity
                  style={[
                    styles.docCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: doc.file ? '#10B981' : hairline,
                    },
                    doc.file ? Shadows.sm : Shadows.xs,
                  ]}
                  onPress={() => pickDocument(doc.key)}
                  activeOpacity={0.85}
                >
                  <View style={styles.docTopRow}>
                    <View
                      style={[
                        styles.docIcon,
                        { backgroundColor: doc.file ? '#10B981' : `${colors.primary}15` },
                      ]}
                    >
                      <Ionicons
                        name={doc.file ? 'checkmark' : (doc.icon as any)}
                        size={18}
                        color={doc.file ? '#FFFFFF' : colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.docEyebrow, { color: colors.accent }]}>{doc.eyebrow}</Text>
                      <Text style={[styles.docLabel, { color: colors.text }]}>{doc.label}</Text>
                      <Text style={[styles.docDesc, { color: colors.gray500 }]}>{doc.description}</Text>
                    </View>
                  </View>

                  {doc.file ? (
                    <View style={[styles.docFileRow, { backgroundColor: colors.gray100 }]}>
                      <TouchableOpacity
                        onPress={() => handlePreviewPress(doc.file!)}
                        activeOpacity={0.85}
                        accessibilityRole="imagebutton"
                        accessibilityLabel={
                          doc.file.type.startsWith('image/')
                            ? t('verificationForm.zoomImageA11y', { defaultValue: 'Agrandir l\'image' })
                            : t('verificationForm.openPdfA11y', { defaultValue: 'Ouvrir le PDF' })
                        }
                        style={{ position: 'relative' }}
                      >
                        {doc.file.type.startsWith('image/') ? (
                          <Image source={doc.file.uri} style={styles.docThumb} transition={200} contentFit="cover" />
                        ) : (
                          <View style={[styles.docThumb, { backgroundColor: `${colors.primary}12`, alignItems: 'center', justifyContent: 'center' }]}>
                            <Ionicons name="document-outline" size={32} color={colors.primary} />
                          </View>
                        )}
                        {/* Petit indicateur "tap to zoom" en overlay */}
                        <View style={styles.docZoomBadge}>
                          <Ionicons
                            name={doc.file.type.startsWith('image/') ? 'expand-outline' : 'open-outline'}
                            size={12}
                            color="#FFFFFF"
                          />
                        </View>
                      </TouchableOpacity>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.docFileName, { color: colors.text }]} numberOfLines={1}>
                          {doc.file.name}
                        </Text>
                        <Text style={[styles.docFileHint, { color: colors.gray500 }]} numberOfLines={1}>
                          {doc.file.type.startsWith('image/')
                            ? t('verificationForm.tapToZoom', { defaultValue: 'Toucher pour agrandir' })
                            : t('verificationForm.tapToOpen', { defaultValue: 'Toucher pour ouvrir' })}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setDocuments(prev =>
                          prev.map(d => d.key === doc.key ? { ...d, file: null } : d)
                        )}
                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        style={[styles.docRemoveBtn, { backgroundColor: '#FEF2F2' }]}
                      >
                        <Ionicons name="close" size={12} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.uploadDropzone, { borderColor: colors.primary, backgroundColor: `${colors.primary}08` }]}>
                      <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
                      <Text style={[styles.uploadDropzoneText, { color: colors.primary }]}>
                        {t('verificationForm.uploadButton')}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </StaggeredItem>
            ))}

            {/* === SUBMIT === */}
            <TouchableOpacity
              style={[
                styles.submitPill,
                (isSubmitting || documents.some(d => !d.file)) && { opacity: 0.5 },
                Shadows.buttonPrimary,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || documents.some(d => !d.file)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.submitEyebrow}>{t('verificationForm.submitEyebrow')}</Text>
                    <Text style={styles.submitLabel}>{t('verificationForm.submitLabel')}</Text>
                  </View>
                  <View style={styles.submitArrow}>
                    <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                  </View>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* === ZOOM MODAL — preview plein ecran d'une image uploadee === */}
      <Modal
        visible={zoomedImageUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomedImageUri(null)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.zoomBackdrop}
          onPress={() => setZoomedImageUri(null)}
          accessibilityLabel={t('common.close', { defaultValue: 'Fermer' })}
        >
          {zoomedImageUri && (
            <Image
              source={zoomedImageUri}
              style={{ width: winW, height: winH * 0.85 }}
              contentFit="contain"
              transition={150}
            />
          )}
          <TouchableOpacity
            style={styles.zoomCloseBtn}
            onPress={() => setZoomedImageUri(null)}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  // === HEADER ===
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 30,
    letterSpacing: -1.2,
    lineHeight: 34,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  verifiedBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },

  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 140,
  },
  lead: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: Spacing.md,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  hintText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },

  // === STATUS CALLOUT ===
  statusCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    paddingLeft: Spacing.lg + 6,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  statusRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  statusTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 17,
    letterSpacing: -0.5,
    lineHeight: 21,
  },
  statusDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },

  // === PROGRESS ===
  progressSection: {
    marginBottom: Spacing.xl,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  progressTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 17,
    letterSpacing: -0.4,
  },
  progressPercent: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },

  // === DOC SECTION ===
  docSection: {
    marginBottom: Spacing.md,
  },
  docSectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  docSectionTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    lineHeight: 26,
  },

  // === DOC CARD ===
  docCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  docTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  docLabel: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 14,
    letterSpacing: -0.3,
    lineHeight: 17,
  },
  docDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  docFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
  },
  docThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  docZoomBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docFileName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    letterSpacing: -0.1,
  },
  docFileHint: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    letterSpacing: -0.05,
    marginTop: 2,
  },
  docRemoveBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadDropzone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  uploadDropzoneText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.2,
  },

  // === SUBMIT ===
  submitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    minHeight: 56,
    marginTop: Spacing.lg,
  },
  submitEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  submitLabel: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  submitArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginLeft: Spacing.sm,
  },
});
