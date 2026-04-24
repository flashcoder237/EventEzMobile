import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { verificationAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { FontFamily, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';

type VerificationStatus = 'none' | 'pending' | 'under_review' | 'approved' | 'rejected';

interface DocItem {
  key: string;
  label: string;
  description: string;
  icon: string;
  file: { uri: string; name: string; type: string } | null;
}

const INDIVIDUAL_DOCS = [
  { key: 'cni', label: "Carte Nationale d'Identite", description: 'Photo recto-verso de votre CNI', icon: 'card-outline' },
  { key: 'selfie_with_cni', label: 'Selfie avec CNI', description: 'Photo de vous tenant votre CNI', icon: 'camera-outline' },
];

const ORGANIZATION_DOCS = [
  { key: 'business_registration', label: 'Registre de Commerce', description: 'Copie de votre RCCM', icon: 'business-outline' },
  { key: 'company_statutes', label: "Statuts de l'entreprise", description: 'Copie des statuts enregistres', icon: 'document-text-outline' },
  { key: 'representative_cni', label: 'CNI du Representant', description: 'CNI du representant legal', icon: 'card-outline' },
];

export default function VerificationScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { showAlert, showError } = useAlert();
  const { colors, isDark } = useTheme();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';
  const [status, setStatus] = useState<VerificationStatus>('none');
  const [rejectionReason, setRejectionReason] = useState('');
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const orgType = user?.organizer_type || 'individual';
      const templates = orgType === 'organization' ? ORGANIZATION_DOCS : INDIVIDUAL_DOCS;
      setDocuments(templates.map(d => ({ ...d, file: null })));

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
      'Choisir un fichier',
      'Comment souhaitez-vous ajouter le document ?',
      [
        {
          text: 'Prendre une photo',
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
          text: 'Galerie',
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
          text: 'Document PDF',
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
      showError('Documents manquants', 'Veuillez telecharger tous les documents requis.');
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
      showAlert('Succes', 'Votre demande de verification a ete soumise.', undefined, 'success');
    } catch (error: any) {
      const message = error.response?.data?.detail
        || error.response?.data?.non_field_errors?.[0]
        || 'Erreur lors de la soumission';
      showError('Erreur', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  const renderBanner = (iconName: any, iconColor: string, title: string, desc: string, bgTint: string) => (
    <View
      style={[
        styles.banner,
        { backgroundColor: bgTint, borderColor: hairline },
      ]}
    >
      <View style={[styles.bannerIcon, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={iconName} size={22} color={iconColor} />
      </View>
      <View style={styles.bannerText}>
        <Text style={[styles.bannerTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.bannerDesc, { color: colors.gray500 }]}>{desc}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: hairline }]}>
        <TouchableOpacity
          style={[styles.iconDisc, { backgroundColor: colors.card, borderColor: hairline }, Shadows.sm]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>CONFIANCE</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Vérification</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lead, { color: colors.gray500 }]}>
          Vérifiez votre identité pour renforcer la confiance des participants.
        </Text>

        {status === 'approved' &&
          renderBanner(
            'checkmark-circle',
            colors.success,
            'Compte vérifié',
            'Votre identité a été vérifiée avec succès.',
            'rgba(34,197,94,0.08)',
          )}

        {(status === 'pending' || status === 'under_review') &&
          renderBanner(
            'time',
            '#E0A800',
            status === 'pending' ? 'Demande en attente' : 'En cours de revue',
            'Vous recevrez une notification une fois la revue terminée.',
            'rgba(255,215,0,0.08)',
          )}

        {status === 'rejected' &&
          renderBanner(
            'close-circle',
            colors.error,
            'Demande rejetée',
            rejectionReason
              ? `Raison : ${rejectionReason}`
              : 'Vous pouvez soumettre une nouvelle demande.',
            'rgba(239,68,68,0.08)',
          )}

        {(status === 'none' || status === 'rejected') && (
          <>
            <Text style={[styles.sectionEyebrow, { color: colors.gray500 }]}>DOCUMENTS REQUIS</Text>
            {documents.map((doc) => (
              <TouchableOpacity
                key={doc.key}
                style={[
                  styles.docCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: doc.file ? colors.primary : hairline,
                  },
                  Shadows.sm,
                ]}
                onPress={() => pickDocument(doc.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.docIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name={doc.icon as any} size={22} color={colors.primary} />
                </View>
                <View style={styles.docInfo}>
                  <Text style={[styles.docLabel, { color: colors.text }]}>{doc.label}</Text>
                  <Text style={[styles.docDesc, { color: colors.gray500 }]}>{doc.description}</Text>
                  {doc.file ? (
                    <View style={styles.docFileRow}>
                      {doc.file.type.startsWith('image/') ? (
                        <Image source={doc.file.uri} style={styles.docThumb} transition={200} />
                      ) : (
                        <View style={[styles.docThumb, { backgroundColor: `${colors.primary}12`, alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="document-outline" size={18} color={colors.primary} />
                        </View>
                      )}
                      <Text style={[styles.docFileName, { color: colors.text }]} numberOfLines={1}>
                        {doc.file.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setDocuments(prev =>
                          prev.map(d => d.key === doc.key ? { ...d, file: null } : d)
                        )}
                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                      >
                        <Ionicons name="close-circle" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.uploadHint}>
                      <Ionicons name="cloud-upload-outline" size={14} color={colors.primary} />
                      <Text style={[styles.uploadHintText, { color: colors.primary }]}>
                        Appuyez pour téléverser
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                (isSubmitting || documents.some(d => !d.file)) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || documents.some(d => !d.file)}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Soumettre la demande</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  iconDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.4,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  lead: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: { flex: 1 },
  bannerTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.md,
    marginBottom: 2,
  },
  bannerDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
  },
  sectionEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  docCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.md,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfo: { flex: 1 },
  docLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
  },
  docDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  docFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  docThumb: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
  },
  docFileName: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
  },
  uploadHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: 4,
  },
  uploadHintText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
  },
  submitButton: {
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.md,
    color: '#FFFFFF',
  },
});
