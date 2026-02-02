import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Image,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { registrationsAPI } from '../../api/client';
import { Registration, RootStackParamList } from '../../types';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { useAlert } from '../../contexts/AlertContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RegistrationDetailsRouteProp = RouteProp<RootStackParamList, 'RegistrationDetails'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QR_SIZE = SCREEN_WIDTH - Spacing.xl * 4;

export default function RegistrationDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RegistrationDetailsRouteProp>();
  const { registrationId } = route.params;
  const { showError, showSuccess, showConfirm } = useAlert();

  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRegistration();
  }, [registrationId]);

  const fetchRegistration = async () => {
    try {
      const response = await registrationsAPI.getRegistration(registrationId);
      setRegistration(response.data);
    } catch (error) {
      console.error('Error fetching registration:', error);
      showError('Erreur', 'Impossible de charger les détails de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!registration) return;
    const event = registration.event_detail || registration.event;
    const eventTitle = typeof event === 'object' ? event.title : 'Événement';
    try {
      await Share.share({
        message: `Mon inscription pour ${eventTitle}\n\nRéférence: ${registration.reference_code}`,
        title: 'Mon inscription EventEz',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCancelRegistration = () => {
    showConfirm(
      'Annuler l\'inscription',
      'Voulez-vous vraiment annuler votre inscription à cet événement ?',
      async () => {
        try {
          await registrationsAPI.cancelRegistration(registrationId);
          showSuccess('Succès', 'Votre inscription a été annulée');
          navigation.goBack();
        } catch (error) {
          showError('Erreur', 'Impossible d\'annuler l\'inscription');
        }
      }
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusConfig = (status: string, approvalStatus?: string) => {
    if (approvalStatus === 'pending') {
      return { color: Colors.warning, bg: Colors.warningLight, label: 'En attente de validation', icon: 'hourglass-outline' };
    }
    switch (status) {
      case 'confirmed':
      case 'completed':
        return { color: Colors.success, bg: Colors.successLight, label: 'Confirmée', icon: 'checkmark-circle' };
      case 'pending':
      case 'pending_approval':
        return { color: Colors.warning, bg: Colors.warningLight, label: 'En attente', icon: 'time' };
      case 'cancelled':
        return { color: Colors.error, bg: Colors.errorLight, label: 'Annulée', icon: 'close-circle' };
      case 'rejected':
        return { color: Colors.error, bg: Colors.errorLight, label: 'Refusée', icon: 'close-circle' };
      case 'checked_in':
        return { color: Colors.success, bg: Colors.successLight, label: 'Validée', icon: 'checkmark-done-circle' };
      default:
        return { color: Colors.gray500, bg: Colors.gray100, label: status || 'Inconnu', icon: 'help-circle' };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!registration) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.gray900} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inscription</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.gray400} />
          <Text style={styles.errorText}>Inscription non trouvée</Text>
        </View>
      </SafeAreaView>
    );
  }

  const event = registration.event_detail || (typeof registration.event === 'object' ? registration.event : null);
  const statusConfig = getStatusConfig(registration.status, registration.approval_status);
  const isActive = registration.status !== 'cancelled' && registration.status !== 'rejected';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Inscription</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={Colors.gray900} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Registration Card */}
        <View style={styles.card}>
          {/* Event Info */}
          <View style={styles.eventInfo}>
            <View style={[styles.typeBadge, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Ionicons name="document-text" size={14} color="#8B5CF6" />
              <Text style={[styles.typeBadgeText, { color: '#8B5CF6' }]}>Inscription</Text>
            </View>

            <Text style={styles.eventTitle} numberOfLines={2}>
              {event?.title || 'Événement'}
            </Text>

            <View style={styles.eventMeta}>
              {event?.start_date && (
                <View style={styles.eventMetaItem}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                  <Text style={styles.eventMetaText}>{formatDate(event.start_date)}</Text>
                </View>
              )}
              {event?.start_date && (
                <View style={styles.eventMetaItem}>
                  <Ionicons name="time-outline" size={16} color={Colors.primary} />
                  <Text style={styles.eventMetaText}>{formatTime(event.start_date)}</Text>
                </View>
              )}
              {event?.location_type === 'online' ? (
                <View style={styles.eventMetaItem}>
                  <Ionicons name="videocam-outline" size={16} color={Colors.primary} />
                  <Text style={styles.eventMetaText}>Événement en ligne</Text>
                </View>
              ) : event?.location_type === 'hybrid' ? (
                <>
                  <View style={styles.eventMetaItem}>
                    <Ionicons name="location-outline" size={16} color={Colors.primary} />
                    <Text style={styles.eventMetaText}>
                      {event.location_name || event.location_city}
                    </Text>
                  </View>
                  <View style={styles.eventMetaItem}>
                    <Ionicons name="videocam-outline" size={16} color={Colors.primary} />
                    <Text style={styles.eventMetaText}>+ Option en ligne</Text>
                  </View>
                </>
              ) : (event?.location_name || event?.location_city) && (
                <View style={styles.eventMetaItem}>
                  <Ionicons name="location-outline" size={16} color={Colors.primary} />
                  <Text style={styles.eventMetaText}>
                    {event.location_name || event.location_city}
                  </Text>
                </View>
              )}
            </View>

            {/* Online Event Access Card */}
            {(event?.location_type === 'online' || event?.location_type === 'hybrid') && (
              <View style={styles.onlineAccessCard}>
                <View style={styles.onlineAccessHeader}>
                  <Ionicons name="videocam" size={20} color="#3B82F6" />
                  <Text style={styles.onlineAccessTitle}>Accès à l'événement en ligne</Text>
                </View>
                {event.online_platform && (
                  <Text style={styles.onlinePlatform}>Via {event.online_platform}</Text>
                )}
                {event.online_instructions && (
                  <Text style={styles.onlineInstructions}>{event.online_instructions}</Text>
                )}
                {(event.online_meeting_id || event.online_passcode) && (
                  <View style={styles.onlineMeetingDetails}>
                    {event.online_meeting_id && (
                      <View style={styles.meetingDetailRow}>
                        <Text style={styles.meetingDetailLabel}>ID de réunion :</Text>
                        <Text style={styles.meetingDetailValue}>{event.online_meeting_id}</Text>
                      </View>
                    )}
                    {event.online_passcode && (
                      <View style={styles.meetingDetailRow}>
                        <Text style={styles.meetingDetailLabel}>Code d'accès :</Text>
                        <Text style={styles.meetingDetailValue}>{event.online_passcode}</Text>
                      </View>
                    )}
                  </View>
                )}
                {event.online_url ? (
                  <TouchableOpacity
                    style={styles.joinOnlineButton}
                    onPress={() => {
                      Linking.openURL(event.online_url!).catch(() => {
                        showError('Erreur', 'Impossible d\'ouvrir le lien de l\'événement');
                      });
                    }}
                  >
                    <Ionicons name="videocam" size={18} color={Colors.white} />
                    <Text style={styles.joinOnlineButtonText}>Rejoindre l'événement</Text>
                  </TouchableOpacity>
                ) : event.online_platform?.toLowerCase() === 'eventez_visio' || event.online_platform?.toLowerCase() === 'eventez visio' ? (
                  <View style={styles.eventezVisioInfo}>
                    <Ionicons name="information-circle" size={18} color="#3B82F6" />
                    <Text style={styles.eventezVisioText}>
                      La visioconférence EventEz sera disponible le jour de l'événement
                    </Text>
                  </View>
                ) : !event.online_meeting_id && !event.online_passcode ? (
                  <View style={styles.eventezVisioInfo}>
                    <Ionicons name="time-outline" size={18} color={Colors.gray500} />
                    <Text style={styles.eventezVisioText}>
                      Les informations de connexion seront communiquées avant l'événement
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerCircleLeft} />
            <View style={styles.dividerLine} />
            <View style={styles.dividerCircleRight} />
          </View>

          {/* QR Code Section */}
          <View style={styles.qrSection}>
            <View style={styles.qrContainer}>
              {registration.qr_code ? (
                <Image
                  source={{ uri: registration.qr_code }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <View style={styles.qrPlaceholderInner}>
                    <Ionicons name="qr-code" size={80} color="#8B5CF6" />
                  </View>
                </View>
              )}
            </View>
            <Text style={styles.qrHint}>
              Présentez ce QR code à l'entrée de l'événement
            </Text>
          </View>

          {/* Registration Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Statut</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Référence</Text>
              <Text style={styles.detailValue}>{registration.reference_code}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date d'inscription</Text>
              <Text style={styles.detailValue}>{formatDate(registration.created_at)}</Text>
            </View>
            {registration.confirmed_at && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Confirmée le</Text>
                <Text style={styles.detailValue}>{formatDate(registration.confirmed_at)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Form Data */}
        {registration.form_data && Object.keys(registration.form_data).length > 0 && (
          <View style={styles.formDataCard}>
            <Text style={styles.sectionTitle}>Informations fournies</Text>
            {Object.entries(registration.form_data).map(([key, value]) => (
              <View key={key} style={styles.formDataRow}>
                <Text style={styles.formDataLabel}>{key}</Text>
                <Text style={styles.formDataValue}>{String(value)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <View style={styles.instructionItem}>
            <View style={[styles.instructionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Ionicons name="scan-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.instructionText}>
              Le QR code sera scanné à l'entrée
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={[styles.instructionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Ionicons name="phone-portrait-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.instructionText}>
              Gardez votre téléphone chargé
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={[styles.instructionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Ionicons name="time-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.instructionText}>
              Arrivez à l'heure pour éviter les files
            </Text>
          </View>
        </View>

        {/* Actions */}
        {isActive && (
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelRegistration}
            >
              <Ionicons name="close-circle-outline" size={20} color={Colors.error} />
              <Text style={styles.cancelButtonText}>Annuler mon inscription</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: Spacing.xl * 2 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.base,
    color: Colors.gray500,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollView: {
    flex: 1,
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: Colors.gray200,
    overflow: 'hidden',
  },

  // Event Info
  eventInfo: {
    padding: Spacing.lg,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  typeBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
  },
  eventTitle: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  eventMeta: {
    gap: Spacing.sm,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  eventMetaText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: -Spacing.lg,
  },
  dividerCircleLeft: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    marginLeft: -12,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  dividerCircleRight: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    marginRight: -12,
  },

  // QR Section
  qrSection: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  qrContainer: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  qrImage: {
    width: QR_SIZE,
    height: QR_SIZE,
  },
  qrPlaceholder: {
    width: QR_SIZE,
    height: QR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderInner: {
    width: QR_SIZE - 40,
    height: QR_SIZE - 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrHint: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.md,
    textAlign: 'center',
  },

  // Details Section
  detailsSection: {
    padding: Spacing.lg,
    backgroundColor: Colors.gray50,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  detailValue: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.semiBold,
  },

  // Form Data
  formDataCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  sectionTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    marginBottom: Spacing.md,
  },
  formDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  formDataLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    flex: 1,
  },
  formDataValue: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray900,
    flex: 2,
    textAlign: 'right',
  },

  // Instructions
  instructions: {
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  instructionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    flex: 1,
  },

  // Actions
  actionsSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.errorLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  cancelButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.error,
  },

  // Online Access Card
  onlineAccessCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  onlineAccessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  onlineAccessTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: '#1D4ED8',
  },
  onlinePlatform: {
    fontSize: FontSizes.sm,
    color: '#3B82F6',
    marginBottom: Spacing.xs,
  },
  onlineInstructions: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  onlineMeetingDetails: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  meetingDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  meetingDetailLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  meetingDetailValue: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray900,
  },
  joinOnlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  joinOnlineButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  eventezVisioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  eventezVisioText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: 20,
  },
});
