/**
 * VerificationRequestsAdminScreen — back-office des demandes de vérification
 * organisateur (admin/modérateur). Liste les demandes pending/under_review,
 * affiche l'utilisateur + ses documents, et permet d'approuver ou de rejeter
 * (motif obligatoire au rejet).
 *
 * L'API cliente (verificationAPI.getPending/approve/reject) et le backend
 * (VerificationRequestViewSet) existaient déjà ; il ne manquait que cet écran.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import { useFeedback } from '../../contexts/FeedbackContext';
import { useBiometricConfirm } from '../../hooks/useBiometricConfirm';
import { verificationAPI } from '../../api';
import { getMediaUrl } from '../../api';
import RoleGuard from '../../components/auth/RoleGuard';
import Badge from '../../components/ui/Badge';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { FontFamily, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';
import { centeredContent, CARD_MAX } from '../../constants/layout';
import { getApiErrorMessage } from '../../lib/utils/errorHandling';

interface VerificationDocument {
  id: number;
  document_type: string;
  document_type_display: string;
  file: string;
  uploaded_at: string;
}
interface VerificationRequest {
  id: number;
  user: number;
  user_email: string;
  user_name: string;
  organizer_type: string;
  status: string;
  status_display: string;
  submitted_at: string;
  documents: VerificationDocument[];
}

export default function VerificationRequestsAdminScreen() {
  const { t } = useTranslation();
  return (
    <RoleGuard
      allow={['admin', 'moderator']}
      watermark={t('admin.verifications.watermark')}
      title={t('admin.verifications.guardTitle')}
    >
      <VerificationRequestsContent />
    </RoleGuard>
  );
}

function VerificationRequestsContent() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { showError, showConfirm } = useAlert();
  const { toastSuccess } = useFeedback();
  const biometric = useBiometricConfirm();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);
  // Modale de rejet : le motif est OBLIGATOIRE (exigé par le backend).
  const [rejectTarget, setRejectTarget] = useState<VerificationRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchRequests = useCallback(async () => {
    try {
      const res = await verificationAPI.getPending();
      setRequests(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch (error: any) {
      showError(t('common.error'), getApiErrorMessage(error, t, { fallbackKey: 'admin.verifications.loadError' }).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError, t]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const onRefresh = () => { setRefreshing(true); fetchRequests(); };

  const handleApprove = (item: VerificationRequest) => {
    showConfirm(
      t('admin.verifications.approveTitle'),
      t('admin.verifications.approveMessage', { name: item.user_name }),
      async () => {
        const okBio = await biometric.confirm({
          promptMessage: t('admin.verifications.approveBio'),
          category: 'admin',
        });
        if (!okBio) return;
        setActingId(item.id);
        try {
          await verificationAPI.approve(item.id);
          setRequests((prev) => prev.filter((r) => r.id !== item.id));
          toastSuccess(t('admin.verifications.approveSuccess'));
        } catch (error: any) {
          showError(t('common.error'), getApiErrorMessage(error, t, { fallbackKey: 'admin.verifications.actionError' }).message);
        } finally {
          setActingId(null);
        }
      },
    );
  };

  const openReject = (item: VerificationRequest) => {
    setRejectReason('');
    setRejectTarget(item);
  };

  const confirmReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      showError(t('common.error'), t('admin.verifications.rejectReasonRequired'));
      return;
    }
    const target = rejectTarget;
    setActingId(target.id);
    try {
      await verificationAPI.reject(target.id, rejectReason.trim());
      setRequests((prev) => prev.filter((r) => r.id !== target.id));
      setRejectTarget(null);
      setRejectReason('');
      toastSuccess(t('admin.verifications.rejectSuccess'));
    } catch (error: any) {
      showError(t('common.error'), getApiErrorMessage(error, t, { fallbackKey: 'admin.verifications.actionError' }).message);
    } finally {
      setActingId(null);
    }
  };

  const renderItem = ({ item }: { item: VerificationRequest }) => {
    const busy = actingId === item.id;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.gray900 }]} numberOfLines={1}>{item.user_name}</Text>
            <Text style={[styles.email, { color: colors.gray500 }]} numberOfLines={1}>{item.user_email}</Text>
          </View>
          <Badge label={item.organizer_type === 'organization' ? t('admin.verifications.typeOrg') : t('admin.verifications.typeIndividual')} variant="default" />
        </View>

        {/* Documents fournis */}
        {item.documents?.length > 0 ? (
          <View style={styles.docsRow}>
            {item.documents.map((doc) => (
              <View key={doc.id} style={[styles.docChip, { backgroundColor: colors.gray50, borderColor: hairline }]}>
                {getMediaUrl(doc.file) ? (
                  <Image source={getMediaUrl(doc.file)} style={styles.docThumb} contentFit="cover" cachePolicy="memory-disk" />
                ) : (
                  <Ionicons name="document-text-outline" size={20} color={colors.gray400} />
                )}
                <Text style={[styles.docLabel, { color: colors.gray600 }]} numberOfLines={1}>{doc.document_type_display}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.noDocs, { color: colors.gray400 }]}>{t('admin.verifications.noDocuments')}</Text>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.rejectBtn, { borderColor: colors.error }]}
            onPress={() => openReject(item)}
            disabled={busy}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={16} color={colors.error} />
            <Text style={[styles.rejectText, { color: colors.error }]}>{t('admin.verifications.reject')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.approveBtn, { backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }]}
            onPress={() => handleApprove(item)}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.approveText}>{t('admin.verifications.approve')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <EditorialCanvas edges={['top']}>
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </EditorialCanvas>
    );
  }

  return (
    <EditorialCanvas edges={['top']}>
      <WatermarkNumeral>{t('admin.verifications.watermark')}</WatermarkNumeral>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('admin.verifications.eyebrow')}</Text>
          <Text style={[styles.title, { color: colors.gray900 }]}>{t('admin.verifications.title')}</Text>
        </View>
        <FlatList
          data={requests}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[centeredContent(CARD_MAX), { padding: Spacing.lg, paddingBottom: Spacing['3xl'] }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}10` }]}>
                <Ionicons name="shield-checkmark-outline" size={38} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.gray900 }]}>{t('admin.verifications.emptyTitle')}</Text>
              <Text style={[styles.emptySubtitle, { color: colors.gray500 }]}>{t('admin.verifications.emptySubtitle')}</Text>
            </View>
          }
        />
      </SafeAreaView>

      {/* Modale de rejet — motif obligatoire */}
      <Modal visible={!!rejectTarget} transparent animationType="fade" onRequestClose={() => setRejectTarget(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.gray900 }]}>{t('admin.verifications.rejectTitle')}</Text>
            <Text style={[styles.modalMsg, { color: colors.gray500 }]}>
              {t('admin.verifications.rejectMessage', { name: rejectTarget?.user_name || '' })}
            </Text>
            <TextInput
              style={[styles.modalInput, { borderColor: hairline, color: colors.gray900, backgroundColor: colors.gray50 }]}
              placeholder={t('admin.verifications.rejectReasonPlaceholder')}
              placeholderTextColor={colors.gray400}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRejectTarget(null)} disabled={actingId != null}>
                <Text style={[styles.modalCancelText, { color: colors.gray500 }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: colors.error, opacity: actingId != null ? 0.6 : 1 }]}
                onPress={confirmReject}
                disabled={actingId != null}
              >
                {actingId != null ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>{t('admin.verifications.reject')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  eyebrow: { fontFamily: FontFamily.semiBold, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { fontFamily: FontFamily.displayBold, fontSize: 26, marginTop: 2 },
  card: { borderRadius: BorderRadius.xl, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name: { fontFamily: FontFamily.semiBold, fontSize: FontSizes.base },
  email: { fontFamily: FontFamily.regular, fontSize: 13, marginTop: 1 },
  docsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  docChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: BorderRadius.lg, borderWidth: 1, maxWidth: 180 },
  docThumb: { width: 24, height: 24, borderRadius: 4 },
  docLabel: { fontFamily: FontFamily.medium, fontSize: 12 },
  noDocs: { fontFamily: FontFamily.regular, fontSize: 13, marginTop: Spacing.md, fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md, borderRadius: BorderRadius.xl, borderWidth: 1.5 },
  rejectText: { fontFamily: FontFamily.semiBold, fontSize: 14 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md, borderRadius: BorderRadius.xl },
  approveText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: '#fff' },
  emptyState: { alignItems: 'center', paddingTop: Spacing['3xl'] * 1.5, paddingHorizontal: Spacing.xl },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  emptyTitle: { fontFamily: FontFamily.displayBold, fontSize: 18, textAlign: 'center' },
  emptySubtitle: { fontFamily: FontFamily.regular, fontSize: 13, textAlign: 'center', lineHeight: 19, marginTop: 6, maxWidth: 260 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { borderRadius: BorderRadius['2xl'], padding: Spacing.xl, alignSelf: 'center', width: '100%', maxWidth: CARD_MAX },
  modalTitle: { fontFamily: FontFamily.displayBold, fontSize: 19 },
  modalMsg: { fontFamily: FontFamily.regular, fontSize: 14, marginTop: 6, lineHeight: 20 },
  modalInput: { borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.md, marginTop: Spacing.md, minHeight: 90, fontFamily: FontFamily.regular, fontSize: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.lg },
  modalCancel: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  modalCancelText: { fontFamily: FontFamily.semiBold, fontSize: 14 },
  modalConfirm: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.xl, minWidth: 100, alignItems: 'center' },
  modalConfirmText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: '#fff' },
});
