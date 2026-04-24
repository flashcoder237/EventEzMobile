import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { EditorialCanvas, WatermarkNumeral } from '../../components/ui/editorial';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList } from '../../types';
import {
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import GradientButton from '../../components/ui/GradientButton';
import { Alert as AlertIllustration, AnimatedIllustration } from '../../components/illustrations';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PaymentFailedRouteProp = RouteProp<RootStackParamList, 'PaymentFailed'>;

export default function PaymentFailedScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaymentFailedRouteProp>();
  const { error } = route.params || {};
  const { colors } = useTheme();

  return (
    <EditorialCanvas edges={['top', 'bottom']}>
      <WatermarkNumeral>NO</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>
      <View style={styles.content}>
        {/* Error Illustration */}
        <AnimatedIllustration entry="bounce" idle="breathe">
          <View style={styles.iconContainer}>
            <AlertIllustration color={colors.error} size={180} />
          </View>
        </AnimatedIllustration>

        <View style={styles.textContainer} accessibilityRole="alert">
          <Text style={[styles.title, { color: colors.gray900 }]}>Paiement échoué</Text>
          <Text style={[styles.subtitle, { color: colors.gray600 }]}>
            {error || 'Une erreur est survenue lors du paiement.\nVeuillez réessayer.'}
          </Text>
        </View>

        {/* Help Card */}
        <View style={[styles.helpCard, { backgroundColor: colors.errorBg }]}>
          <Text style={[styles.helpTitle, { color: colors.error }]}>Besoin d'aide ?</Text>
          <Text style={[styles.helpText, { color: colors.gray600 }]}>
            Si le problème persiste, veuillez contacter notre support ou essayer un autre mode de paiement.
          </Text>
        </View>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <GradientButton
          title="Réessayer"
          onPress={() => navigation.goBack()}
          icon={<Ionicons name="refresh" size={20} color={colors.white} />}
          fullWidth
          accessibilityLabel="Reessayer le paiement"
        />
        <View style={{ height: Spacing.md }} />
        <GradientButton
          title="Retour à l'accueil"
          onPress={() => navigation.replace('Main', { screen: 'Discover' } as any)}
          variant="outline"
          fullWidth
          accessibilityLabel="Retour a l'accueil"
        />
      </View>
      </View>
    </EditorialCanvas>
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
  helpCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '100%',
  },
  helpTitle: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    marginBottom: Spacing.sm,
  },
  helpText: {
    fontSize: FontSizes.sm,
    lineHeight: FontSizes.sm * 1.5,
  },
  bottomButtons: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
});
