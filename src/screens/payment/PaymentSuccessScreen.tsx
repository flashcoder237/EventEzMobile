import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
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

import { RootStackParamList } from '../../types';
import {
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import GradientButton from '../../components/ui/GradientButton';
import GradientText from '../../components/ui/GradientText';
import ConfettiEffect from '../../components/ui/ConfettiEffect';

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
  const { colors, isDark } = useTheme();

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 100 });
    opacity.value = withDelay(300, withSpring(1));
  }, []);

  const handleViewTicket = async () => {
    if (!registrationId) {
      navigation.replace('Main', { screen: 'MyTickets' } as any);
      return;
    }
    navigation.replace('RegistrationDetails', { registrationId });
  };

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const content: SuccessContent = useMemo(() => {
    const isInscription = eventType === 'inscription';
    const isPendingApproval = approvalStatus === 'pending';

    if (isInscription) {
      if (isPendingApproval) {
        return {
          icon: 'time-outline',
          iconColor: colors.warning,
          title: 'Inscription soumise !',
          subtitle: `Votre inscription${eventTitle ? ` pour "${eventTitle}"` : ''} a été soumise avec succès.\nElle est en attente de validation par l'organisateur.`,
          infoItems: [
            { icon: 'hourglass-outline', title: 'En attente de validation', description: 'L\'organisateur examinera votre inscription' },
            { icon: 'notifications-outline', title: 'Notification', description: 'Vous serez notifié dès la validation' },
          ],
          primaryButtonText: 'Voir mes inscriptions',
          primaryButtonIcon: 'list',
        };
      } else {
        return {
          icon: 'checkmark-circle',
          iconColor: colors.success,
          title: 'Inscription confirmée !',
          subtitle: `Votre inscription${eventTitle ? ` pour "${eventTitle}"` : ''} a été confirmée.\nVous recevrez un email de confirmation.`,
          infoItems: [
            { icon: 'calendar-outline', title: 'Votre inscription', description: 'Retrouvez les détails dans "Mes Billets"' },
            { icon: 'qr-code-outline', title: 'QR Code', description: 'Présentez votre QR code à l\'entrée' },
          ],
          primaryButtonText: 'Voir mes inscriptions',
          primaryButtonIcon: 'list',
        };
      }
    } else {
      return {
        icon: 'checkmark',
        iconColor: colors.success,
        title: 'Paiement réussi !',
        subtitle: 'Votre paiement a été effectué avec succès.\nVous recevrez un email de confirmation.',
        infoItems: [
          { icon: 'ticket-outline', title: 'Vos billets', description: 'Retrouvez vos billets dans "Mes Billets"' },
          { icon: 'qr-code-outline', title: 'QR Code', description: 'Présentez votre QR code à l\'entrée' },
        ],
        primaryButtonText: 'Voir mes billets',
        primaryButtonIcon: 'ticket',
      };
    }
  }, [eventType, approvalStatus, eventTitle, colors]);

  const showConfetti = content.icon !== 'time-outline';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Confetti for success states */}
      {showConfetti && <ConfettiEffect />}

      <View style={styles.content}>
        {/* Success Icon */}
        <Animated.View style={[styles.iconContainer, iconStyle]}>
          <View style={[styles.iconCircle, { backgroundColor: content.iconColor }]}>
            <Ionicons name={content.icon} size={60} color={colors.white} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.textContainer, contentStyle]}>
          {/* Gradient text for title */}
          <GradientText style={styles.title}>
            {content.title}
          </GradientText>
          <Text style={[styles.subtitle, { color: colors.gray600 }]}>{content.subtitle}</Text>
        </Animated.View>

        {/* Info Card */}
        <Animated.View style={[styles.infoCard, { backgroundColor: colors.card }, contentStyle]}>
          {content.infoItems.map((item, index) => (
            <View key={index} style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name={item.icon} size={24} color={colors.primary} />
              </View>
              <View style={styles.infoText}>
                <Text style={[styles.infoTitle, { color: colors.gray900 }]}>{item.title}</Text>
                <Text style={[styles.infoDescription, { color: colors.gray500 }]}>{item.description}</Text>
              </View>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <GradientButton
          title={content.primaryButtonText}
          onPress={handleViewTicket}
          icon={<Ionicons name={content.primaryButtonIcon} size={20} color={colors.white} />}
          fullWidth
        />
        <View style={{ height: Spacing.md }} />
        <GradientButton
          title="Retour à l'accueil"
          onPress={() => navigation.replace('Main', { screen: 'Discover' } as any)}
          variant="outline"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    lineHeight: FontSizes.md * 1.5,
  },
  infoCard: {
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
  },
  infoDescription: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  bottomButtons: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
});
