import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

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
type PaymentFailedRouteProp = RouteProp<RootStackParamList, 'PaymentFailed'>;

export default function PaymentFailedScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaymentFailedRouteProp>();
  const { error } = route.params || {};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="close" size={60} color={Colors.white} />
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Paiement échoué</Text>
          <Text style={styles.subtitle}>
            {error || 'Une erreur est survenue lors du paiement.\nVeuillez réessayer.'}
          </Text>
        </View>

        {/* Help Card */}
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>Besoin d'aide ?</Text>
          <Text style={styles.helpText}>
            Si le problème persiste, veuillez contacter notre support ou essayer un autre mode de paiement.
          </Text>
        </View>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <GradientButton
          title="Réessayer"
          onPress={() => navigation.goBack()}
          icon={<Ionicons name="refresh" size={20} color={Colors.white} />}
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
    backgroundColor: Colors.error,
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
  helpCard: {
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    width: '100%',
  },
  helpTitle: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.semiBold,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  helpText: {
    fontSize: FontSizes.sm,
    color: Colors.gray600,
    lineHeight: FontSizes.sm * 1.5,
  },
  bottomButtons: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
});
