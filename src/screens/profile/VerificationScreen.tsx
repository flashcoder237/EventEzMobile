import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { verificationAPI } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LoadingSpinner } from '../../components/ui/LoadingOverlay';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';

type VerificationStatus = 'none' | 'pending' | 'under_review' | 'approved' | 'rejected';

interface DocItem {
  key: string;
  label: string;
  description: string;
  icon: string;
  file: { uri: string; name: string; type: string } | null;
}

const INDIVIDUAL_DOCS = [
  { key: 'cni', label: 'Carte Nationale d\'Identite', description: 'Photo recto-verso de votre CNI', icon: 'card-outline' },
  { key: 'selfie_with_cni', label: 'Selfie avec CNI', description: 'Photo de vous tenant votre CNI', icon: 'camera-outline' },
];

const ORGANIZATION_DOCS = [
  { key: 'business_registration', label: 'Registre de Commerce', description: 'Copie de votre RCCM', icon: 'business-outline' },
  { key: 'company_statutes', label: 'Statuts de l\'entreprise', description: 'Copie des statuts enregistres', icon: 'document-text-outline' },
  { key: 'representative_cni', label: 'CNI du Representant', description: 'CNI du representant legal', icon: 'card-outline' },
];

export default function VerificationScreen() {
  const { user } = useAuth();
  const { showAlert, showError } = useAlert();
  const { colors, isDark } = useTheme();
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.card }]}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.card }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.gray900 }]}>Verification du compte</Text>
        <Text style={[styles.subtitle, { color: colors.gray600 }]}>
          Verifiez votre identite pour renforcer la confiance des participants.
        </Text>

        {/* Status Banners */}
        {status === 'approved' && (
          <View style={[styles.banner, styles.bannerSuccess, isDark && { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)' }]}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, { color: colors.success }]}>Compte verifie</Text>
              <Text style={[styles.bannerDesc, { color: colors.gray600 }]}>Votre identite a ete verifiee avec succes.</Text>
            </View>
          </View>
        )}

        {(status === 'pending' || status === 'under_review') && (
          <View style={[styles.banner, styles.bannerWarning, isDark && { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)' }]}>
            <Ionicons name="time" size={24} color="#F59E0B" />
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, { color: '#F59E0B' }]}>
                {status === 'pending' ? 'Demande en attente' : 'En cours de revue'}
              </Text>
              <Text style={[styles.bannerDesc, { color: colors.gray600 }]}>
                Vous recevrez une notification une fois la revue terminee.
              </Text>
            </View>
          </View>
        )}

        {status === 'rejected' && (
          <View style={[styles.banner, styles.bannerError, isDark && { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)' }]}>
            <Ionicons name="close-circle" size={24} color={colors.error} />
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, { color: colors.error }]}>Demande rejetee</Text>
              {rejectionReason ? (
                <Text style={[styles.bannerDesc, { color: colors.gray600 }]}>Raison : {rejectionReason}</Text>
              ) : null}
              <Text style={[styles.bannerDesc, { color: colors.gray600 }]}>Vous pouvez soumettre une nouvelle demande.</Text>
            </View>
          </View>
        )}

        {/* Upload Form */}
        {(status === 'none' || status === 'rejected') && (
          <>
            {documents.map((doc) => (
              <TouchableOpacity
                key={doc.key}
                style={[styles.docCard, { borderColor: colors.gray300, backgroundColor: colors.gray50 }]}
                onPress={() => pickDocument(doc.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.docIcon, isDark ? { backgroundColor: 'rgba(168,85,247,0.2)' } : undefined]}>
                  <Ionicons name={doc.icon as any} size={24} color={colors.primary} />
                </View>
                <View style={styles.docInfo}>
                  <Text style={[styles.docLabel, { color: colors.gray900 }]}>{doc.label}</Text>
                  <Text style={[styles.docDesc, { color: colors.gray600 }]}>{doc.description}</Text>
                  {doc.file ? (
                    <View style={styles.docFileRow}>
                      {doc.file.type.startsWith('image/') ? (
                        <Image source={doc.file.uri} style={styles.docThumb} transition={200} />
                      ) : null}
                      <Text style={[styles.docFileName, { color: colors.gray700 }]} numberOfLines={1}>{doc.file.name}</Text>
                      <TouchableOpacity
                        onPress={() => setDocuments(prev =>
                          prev.map(d => d.key === doc.key ? { ...d, file: null } : d)
                        )}
                      >
                        <Ionicons name="close-circle" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.uploadHint}>
                      <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />
                      <Text style={[styles.uploadHintText, { color: colors.primary }]}>Appuyez pour telecharger</Text>
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
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={[styles.submitButtonText, { color: colors.white }]}>Soumettre la demande</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  title: {
    fontSize: FontSizes['2xl'],
    fontFamily: FontFamily.bold,
    color: Colors.gray900,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
    marginBottom: Spacing.xl,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  bannerSuccess: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  bannerWarning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bannerError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    marginBottom: 2,
  },
  bannerDesc: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
    marginTop: 2,
  },
  docCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.gray300,
    backgroundColor: Colors.gray50,
  },
  docIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  docInfo: {
    flex: 1,
  },
  docLabel: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  docDesc: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
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
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
  },
  uploadHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: 4,
  },
  uploadHintText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.medium,
    color: Colors.primary,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
});
