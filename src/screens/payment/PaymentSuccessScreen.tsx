import React, { useEffect } from 'react';
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
  Colors,
  FontSizes,
  FontWeights,
  BorderRadius,
  Spacing,
} from '../../constants/theme';
import GradientButton from '../../components/ui/GradientButton';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PaymentSuccessRouteProp = RouteProp<RootStackParamList, 'PaymentSuccess'>;

export default function PaymentSuccessScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaymentSuccessRouteProp>();

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 100 });
    opacity.value = withDelay(300, withSpring(1));
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <Animated.View style={[styles.iconContainer, iconStyle]}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark" size={60} color={Colors.white} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.textContainer, contentStyle]}>
          <Text style={styles.title}>Paiement réussi !</Text>
          <Text style={styles.subtitle}>
            Votre paiement a été effectué avec succès.{'\n'}
            Vous recevrez un email de confirmation.
          </Text>
        </Animated.View>

        {/* Info Card */}
        <Animated.View style={[styles.infoCard, contentStyle]}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="ticket-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Vos billets</Text>
              <Text style={styles.infoDescription}>
                Retrouvez vos billets dans "Mes Billets"
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="qr-code-outline" size={24} color={Colors.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>QR Code</Text>
              <Text style={styles.infoDescription}>
                Présentez votre QR code à l'entrée
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <GradientButton
          title="Voir mes billets"
          onPress={() => navigation.replace('Main', { screen: 'MyTickets' } as any)}
          icon={<Ionicons name="ticket" size={20} color={Colors.white} />}
          fullWidth
        />
        <View style={{ height: Spacing.md }} />
        <GradientButton
          title="Retour à l'accueil"
          onPress={() => navigation.replace('Main', { screen: 'Home' } as any)}
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
    fontWeight: FontWeights.bold,
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
    fontWeight: FontWeights.semibold,
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
