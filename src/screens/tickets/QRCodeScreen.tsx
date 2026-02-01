import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ticketPurchasesAPI } from '../../api/client';
import { TicketPurchase, RootStackParamList } from '../../types';
import {
  Colors,
  FontSizes,
  FontWeights,
  BorderRadius,
  Spacing,
  Shadows,
  Gradients,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type QRCodeRouteProp = RouteProp<RootStackParamList, 'QRCode'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QR_SIZE = SCREEN_WIDTH - Spacing.xl * 4;

export default function QRCodeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<QRCodeRouteProp>();
  const { ticketId } = route.params;

  const [ticket, setTicket] = useState<TicketPurchase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  const fetchTicket = async () => {
    try {
      const response = await ticketPurchasesAPI.getTicketPurchase(ticketId);
      setTicket(response.data);
    } catch (error) {
      console.error('Error fetching ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!ticket) return;
    try {
      await Share.share({
        message: `Mon billet pour ${ticket.event?.title}\n\nCode: ${ticketId}`,
        title: 'Mon billet EventEz',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Billet</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color={Colors.gray900} />
        </TouchableOpacity>
      </View>

      {/* Ticket Card */}
      <View style={styles.ticketCard}>
        {/* Event Info */}
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {ticket?.event?.title || 'Événement'}
          </Text>
          <View style={styles.eventMeta}>
            <View style={styles.eventMetaItem}>
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
              <Text style={styles.eventMetaText}>
                {ticket?.event?.start_date ? formatDate(ticket.event.start_date) : 'Date à confirmer'}
              </Text>
            </View>
            <View style={styles.eventMetaItem}>
              <Ionicons name="location-outline" size={16} color={Colors.primary} />
              <Text style={styles.eventMetaText}>
                {ticket?.event?.location_name || ticket?.event?.location_city || 'Lieu à confirmer'}
              </Text>
            </View>
          </View>
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
            {ticket?.qr_code ? (
              <Image
                source={{ uri: ticket.qr_code }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            ) : (
              // Placeholder QR code (in production, generate real QR)
              <View style={styles.qrPlaceholder}>
                <LinearGradient
                  colors={Gradients.primary}
                  style={styles.qrPlaceholderInner}
                >
                  <Ionicons name="qr-code" size={100} color={Colors.white} />
                </LinearGradient>
              </View>
            )}
          </View>

          <Text style={styles.qrHint}>
            Présentez ce QR code à l'entrée de l'événement
          </Text>
        </View>

        {/* Ticket Details */}
        <View style={styles.ticketDetails}>
          <View style={styles.ticketDetailRow}>
            <Text style={styles.ticketDetailLabel}>Type</Text>
            <Text style={styles.ticketDetailValue}>
              {ticket?.ticket_type?.name || 'Standard'}
            </Text>
          </View>
          <View style={styles.ticketDetailRow}>
            <Text style={styles.ticketDetailLabel}>Quantité</Text>
            <Text style={styles.ticketDetailValue}>{ticket?.quantity || 1}</Text>
          </View>
          <View style={styles.ticketDetailRow}>
            <Text style={styles.ticketDetailLabel}>Statut</Text>
            <View style={[
              styles.statusBadge,
              ticket?.status === 'confirmed' && styles.statusConfirmed,
              ticket?.status === 'pending' && styles.statusPending,
            ]}>
              <Text style={[
                styles.statusText,
                ticket?.status === 'confirmed' && styles.statusTextConfirmed,
                ticket?.status === 'pending' && styles.statusTextPending,
              ]}>
                {ticket?.status === 'confirmed' ? 'Confirmé' :
                 ticket?.status === 'pending' ? 'En attente' : ticket?.status}
              </Text>
            </View>
          </View>
          <View style={styles.ticketDetailRow}>
            <Text style={styles.ticketDetailLabel}>Référence</Text>
            <Text style={styles.ticketDetailValue}>{String(ticketId).slice(0, 8).toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <View style={styles.instructionItem}>
          <View style={styles.instructionIcon}>
            <Ionicons name="scan-outline" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.instructionText}>
            Le QR code sera scanné à l'entrée
          </Text>
        </View>
        <View style={styles.instructionItem}>
          <View style={styles.instructionIcon}>
            <Ionicons name="phone-portrait-outline" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.instructionText}>
            Gardez votre téléphone chargé
          </Text>
        </View>
        <View style={styles.instructionItem}>
          <View style={styles.instructionIcon}>
            <Ionicons name="time-outline" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.instructionText}>
            Arrivez à l'heure pour éviter les files
          </Text>
        </View>
      </View>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
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
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Ticket Card
  ticketCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    ...Shadows.lg,
    overflow: 'hidden',
  },

  // Event Info
  eventInfo: {
    padding: Spacing.lg,
  },
  eventTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
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
    borderColor: Colors.gray100,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrHint: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: Spacing.md,
    textAlign: 'center',
  },

  // Ticket Details
  ticketDetails: {
    padding: Spacing.lg,
    backgroundColor: Colors.gray50,
    gap: Spacing.sm,
  },
  ticketDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketDetailLabel: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
  },
  ticketDetailValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gray900,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray200,
  },
  statusConfirmed: {
    backgroundColor: Colors.successLight,
  },
  statusPending: {
    backgroundColor: Colors.warningLight,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.gray600,
  },
  statusTextConfirmed: {
    color: Colors.success,
  },
  statusTextPending: {
    color: Colors.warning,
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
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    flex: 1,
  },
});
