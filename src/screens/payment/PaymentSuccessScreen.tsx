import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';

import { registrationsAPI } from '../../api/client';
import { RootStackParamList } from '../../types';
import {
  Colors,
  FontSizes,
  FontFamily,
  TextStyles,
  BorderRadius,
  Spacing,
} from '../../constants/theme';
import GradientButton from '../../components/ui/GradientButton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PaymentSuccessRouteProp = RouteProp<RootStackParamList, 'PaymentSuccess'>;

interface SuccessContent {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  infoItems: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
  }>;
  primaryButtonText: string;
  primaryButtonIcon: keyof typeof Ionicons.glyphMap;
}

export default function PaymentSuccessScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaymentSuccessRouteProp>();
  const { eventType, approvalStatus, eventTitle, registrationId } = route.params;

  const [loadingTicket, setLoadingTicket] = useState(false);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 100 });
    opacity.value = withDelay(300, withSpring(1));
  }, []);

  // Fonction pour voir le billet directement
  const handleViewTicket = async () => {
    if (!registrationId) {
      // Fallback vers la liste des billets
      navigation.replace('Main', { screen: 'MyTickets' } as any);
      return;
    }

    setLoadingTicket(true);
    try {
      const response = await registrationsAPI.getRegistration(registrationId);
      const registration = response.data;

      // Récupérer le premier ticket de la registration
      const tickets = registration.tickets || [];
      if (tickets.length > 0) {
        const firstTicketId = tickets[0].id;
        navigation.replace('QRCode', { ticketId: firstTicketId });
      } else {
        // Pas de tickets, aller vers MyTickets
        navigation.replace('Main', { screen: 'MyTickets' } as any);
      }
    } catch (error) {
      console.error('Error fetching registration:', error);
      // En cas d'erreur, aller vers MyTickets
      navigation.replace('Main', { screen: 'MyTickets' } as any);
    } finally {
      setLoadingTicket(false);
    }
  };

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Déterminer le contenu à afficher selon le type d'événement et le statut
  const content: SuccessContent = useMemo(() => {
    const isInscription = eventType === 'inscription';
    const isPendingApproval = approvalStatus === 'pending';

    if (isInscription) {
      if (isPendingApproval) {
        // Inscription en attente de validation
        return {
          icon: 'time-outline',
          iconColor: Colors.warning || '#F59E0B',
          title: 'Inscription soumise !',
          subtitle: `Votre inscription${eventTitle ? ` pour "${eventTitle}"` : ''} a été soumise avec succès.\nElle est en attente de validation par l'organisateur.`,
          infoItems: [
            {
              icon: 'hourglass-outline',
              title: 'En attente de validation',
              description: 'L\'organisateur examinera votre inscription',
            },
            {
              icon: 'notifications-outline',
              title: 'Notification',
              description: 'Vous serez notifié dès la validation',
            },
          ],
          primaryButtonText: 'Voir mes inscriptions',
          primaryButtonIcon: 'list',
        };
      } else {
        // Inscription confirmée (auto-validée)
        return {
          icon: 'checkmark-circle',
          iconColor: Colors.success,
          title: 'Inscription confirmée !',
          subtitle: `Votre inscription${eventTitle ? ` pour "${eventTitle}"` : ''} a été confirmée.\nVous recevrez un email de confirmation.`,
          infoItems: [
            {
              icon: 'calendar-outline',
              title: 'Votre inscription',
              description: 'Retrouvez les détails dans "Mes Billets"',
            },
            {
              icon: 'qr-code-outline',
              title: 'QR Code',
              description: 'Présentez votre QR code à l\'entrée',
            },
          ],
          primaryButtonText: 'Voir mes inscriptions',
          primaryButtonIcon: 'list',
        };
      }
    } else {
      // Type billetterie - comportement par défaut
      return {
        icon: 'checkmark',
        iconColor: Colors.success,
        title: 'Paiement réussi !',
        subtitle: 'Votre paiement a été effectué avec succès.\nVous recevrez un email de confirmation.',
        infoItems: [
          {
            icon: 'ticket-outline',
            title: 'Vos billets',
            description: 'Retrouvez vos billets dans "Mes Billets"',
          },
          {
            icon: 'qr-code-outline',
            title: 'QR Code',
            description: 'Présentez votre QR code à l\'entrée',
          },
        ],
        primaryButtonText: 'Voir mes billets',
        primaryButtonIcon: 'ticket',
      };
    }
  }, [eventType, approvalStatus, eventTitle]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <Animated.View style={[styles.iconContainer, iconStyle]}>
          <View style={[
            styles.iconCircle,
            { backgroundColor: content.icon === 'time-outline' ? (Colors.warning || '#F59E0B') : Colors.success }
          ]}>
            <Ionicons name={content.icon} size={60} color={Colors.white} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.textContainer, contentStyle]}>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.subtitle}>{content.subtitle}</Text>
        </Animated.View>

        {/* Info Card */}
        <Animated.View style={[styles.infoCard, contentStyle]}>
          {content.infoItems.map((item, index) => (
            <View key={index} style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name={item.icon} size={24} color={Colors.primary} />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>{item.title}</Text>
                <Text style={styles.infoDescription}>{item.description}</Text>
              </View>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <GradientButton
          title={loadingTicket ? 'Chargement...' : content.primaryButtonText}
          onPress={handleViewTicket}
          icon={loadingTicket
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <Ionicons name={content.primaryButtonIcon} size={20} color={Colors.white} />
          }
          fullWidth
          disabled={loadingTicket}
        />
        <View style={{ height: Spacing.md }} />
        <GradientButton
          title="Retour à l'accueil"
          onPress={() => navigation.replace('Main', { screen: 'Home' } as any)}
          variant="outline"
          fullWidth
          disabled={loadingTicket}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSizes['3xl'],
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: FontSizes.md * 1.5,
  },
  infoCard: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  infoDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
  bottomButtons: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
});
