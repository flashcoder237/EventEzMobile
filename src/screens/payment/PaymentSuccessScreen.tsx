import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { RootStackParamList } from '../../types';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import ConfettiEffect from '../../components/ui/ConfettiEffect';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PaymentSuccessRouteProp = RouteProp<RootStackParamList, 'PaymentSuccess'>;

interface SuccessContent {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconColorDark: string;
  eyebrow: string;
  title: string;
  watermark: string;
  subtitle: string;
  infoItems: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    eyebrow: string;
    title: string;
    description: string;
  }>;
  primaryButtonText: string;
  primaryButtonIcon: keyof typeof Ionicons.glyphMap;
  isSuccess: boolean;
}

export default function PaymentSuccessScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaymentSuccessRouteProp>();
  const { eventType, approvalStatus, eventTitle, registrationId } = route.params;
  const { colors } = useTheme();

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const ringScale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 100 });
    opacity.value = withDelay(300, withSpring(1));
    ringScale.value = withRepeat(
      withTiming(1.4, { duration: 1800, easing: Easing.bezier(0.4, 0, 0.6, 1) }),
      -1,
      false,
    );
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

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: 1 - (ringScale.value - 1) / 0.4,
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
          icon: 'time',
          iconColor: '#F59E0B',
          iconColorDark: '#D97706',
          eyebrow: 'EN ATTENTE',
          watermark: 'WAIT',
          title: 'Inscription soumise',
          subtitle: `Votre inscription${eventTitle ? ` pour "${eventTitle}"` : ''} a été soumise.\nElle est en attente de validation par l'organisateur.`,
          infoItems: [
            { icon: 'hourglass-outline', eyebrow: 'ÉTAPE 01', title: 'En attente de validation', description: 'L\'organisateur examinera votre inscription' },
            { icon: 'notifications-outline', eyebrow: 'ÉTAPE 02', title: 'Notification', description: 'Vous serez notifié dès la validation' },
          ],
          primaryButtonText: 'Voir mes inscriptions',
          primaryButtonIcon: 'list',
          isSuccess: false,
        };
      } else {
        return {
          icon: 'checkmark',
          iconColor: '#10B981',
          iconColorDark: '#059669',
          eyebrow: 'CONFIRMÉ',
          watermark: 'OK!',
          title: 'Tu es inscrit.e !',
          subtitle: `Votre inscription${eventTitle ? ` pour "${eventTitle}"` : ''} a été confirmée.\nVous recevrez un email de confirmation.`,
          infoItems: [
            { icon: 'calendar', eyebrow: 'DÉTAILS', title: 'Votre inscription', description: 'Retrouvez les détails dans "Mes Billets"' },
            { icon: 'qr-code', eyebrow: 'ENTRÉE', title: 'QR Code', description: 'Présentez votre QR code à l\'entrée' },
          ],
          primaryButtonText: 'Voir mes inscriptions',
          primaryButtonIcon: 'list',
          isSuccess: true,
        };
      }
    } else {
      return {
        icon: 'checkmark',
        iconColor: '#10B981',
        iconColorDark: '#059669',
        eyebrow: 'PAIEMENT VALIDÉ',
        watermark: 'OK!',
        title: 'Paiement réussi !',
        subtitle: 'Votre paiement a été effectué avec succès.\nVous recevrez un email de confirmation.',
        infoItems: [
          { icon: 'ticket', eyebrow: 'BILLETS', title: 'Vos billets', description: 'Retrouvez vos billets dans "Mes Billets"' },
          { icon: 'qr-code', eyebrow: 'ENTRÉE', title: 'QR Code', description: 'Présentez votre QR code à l\'entrée' },
        ],
        primaryButtonText: 'Voir mes billets',
        primaryButtonIcon: 'ticket',
        isSuccess: true,
      };
    }
  }, [eventType, approvalStatus, eventTitle]);

  const showConfetti = content.isSuccess;

  return (
    <EditorialCanvas edges={['top', 'bottom']}>
      <WatermarkNumeral>{content.watermark}</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>
        {showConfetti && <ConfettiEffect />}

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* === ANIMATED ICON HERO === */}
          <View style={styles.iconWrap}>
            <Animated.View
              style={[
                styles.iconRing,
                { borderColor: content.iconColor },
                ringStyle,
              ]}
            />
            <Animated.View style={[styles.iconContainer, iconStyle]}>
              <View style={[styles.iconCircle, Shadows.lg]}>
                <LinearGradient
                  colors={[content.iconColor, content.iconColorDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name={content.icon} size={56} color={Colors.white} />
              </View>
            </Animated.View>
          </View>

          {/* === EYEBROW + TITLE === */}
          <Animated.View style={[styles.textContainer, contentStyle]} accessibilityRole="alert">
            <Text style={[styles.eyebrow, { color: content.iconColor }]}>{content.eyebrow}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{content.title}</Text>
            <Text style={[styles.subtitle, { color: colors.gray500 }]}>{content.subtitle}</Text>
          </Animated.View>

          {/* === INFO CARDS === */}
          <Animated.View style={[styles.infoCardsCol, contentStyle]}>
            {content.infoItems.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.infoCard,
                  { backgroundColor: colors.card, borderColor: 'rgba(0,0,0,0.06)' },
                  Shadows.sm,
                ]}
              >
                <View style={[styles.infoIconBox, { backgroundColor: `${content.iconColor}15` }]}>
                  <Ionicons name={item.icon} size={20} color={content.iconColor} />
                </View>
                <View style={styles.infoText}>
                  <Text style={[styles.infoEyebrow, { color: content.iconColor }]}>{item.eyebrow}</Text>
                  <Text style={[styles.infoTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.infoDescription, { color: colors.gray500 }]}>{item.description}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        </ScrollView>

        {/* === BOTTOM BUTTONS === */}
        <View style={[styles.bottomButtons, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.primaryPill, Shadows.buttonPrimary]}
            onPress={handleViewTicket}
            activeOpacity={0.9}
            accessibilityLabel="Voir mon billet"
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.primaryPillEyebrow}>PROCHAINE ÉTAPE</Text>
              <Text style={styles.primaryPillLabel}>{content.primaryButtonText}</Text>
            </View>
            <View style={styles.primaryPillArrow}>
              <Ionicons name={content.primaryButtonIcon} size={18} color={Colors.white} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryPill, { backgroundColor: colors.gray100 }]}
            onPress={() => navigation.replace('Main', { screen: 'Discover' } as any)}
            activeOpacity={0.85}
            accessibilityLabel="Retour à l'accueil"
          >
            <Ionicons name="home-outline" size={14} color={colors.gray700} />
            <Text style={[styles.secondaryPillText, { color: colors.gray700 }]}>
              Retour à l'accueil
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </EditorialCanvas>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    width: 160,
    height: 160,
  },
  iconRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  iconContainer: {},
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 34,
    letterSpacing: -1.3,
    lineHeight: 38,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
  },
  infoCardsCol: {
    width: '100%',
    gap: Spacing.sm,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
  },
  infoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
  },
  infoEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  infoTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 15,
    letterSpacing: -0.4,
    lineHeight: 18,
  },
  infoDescription: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },

  // Bottom buttons
  bottomButtons: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  primaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    minHeight: 56,
  },
  primaryPillEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
  },
  primaryPillLabel: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  primaryPillArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginLeft: Spacing.sm,
  },
  secondaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
  },
  secondaryPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
