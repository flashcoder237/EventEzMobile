import React from 'react';
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

import { RootStackParamList } from '../../types';
import {
  Colors,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Alert as AlertIllustration, AnimatedIllustration } from '../../components/illustrations';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PaymentFailedRouteProp = RouteProp<RootStackParamList, 'PaymentFailed'>;

export default function PaymentFailedScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaymentFailedRouteProp>();
  const { error } = route.params || {};
  const { colors } = useTheme();

  const reasons = [
    { icon: 'card-outline' as const, eyebrow: 'CAUSE 01', title: 'Carte refusée', description: 'Vérifie ton solde ou les infos de ta carte' },
    { icon: 'wifi-outline' as const, eyebrow: 'CAUSE 02', title: 'Réseau instable', description: 'Vérifie ta connexion et réessaie' },
    { icon: 'shield-outline' as const, eyebrow: 'CAUSE 03', title: 'Sécurité', description: 'Le paiement a été bloqué par ta banque' },
  ];

  return (
    <EditorialCanvas edges={['top', 'bottom']}>
      <WatermarkNumeral>OOPS</WatermarkNumeral>
      <View style={{ flex: 1, zIndex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* === ILLUSTRATION HERO === */}
          <View style={styles.illoWrap}>
            <AnimatedIllustration entry="bounce" idle="breathe">
              <View style={styles.iconContainer}>
                <AlertIllustration color="#EF4444" size={180} />
              </View>
            </AnimatedIllustration>
          </View>

          {/* === EYEBROW + TITLE === */}
          <View style={styles.textContainer} accessibilityRole="alert">
            <Text style={styles.eyebrow}>ERREUR DE PAIEMENT</Text>
            <Text style={[styles.title, { color: colors.text }]}>Oups, ça a coincé</Text>
            <Text style={[styles.subtitle, { color: colors.gray500 }]}>
              {error || 'Une erreur est survenue lors du paiement.\nNe t\'inquiète pas, rien n\'a été débité.'}
            </Text>
          </View>

          {/* === REASON CARDS === */}
          <View style={styles.reasonsCol}>
            <Text style={[styles.reasonsHeader, { color: colors.gray500 }]}>
              CAUSES POSSIBLES
            </Text>
            {reasons.map((r, idx) => (
              <View
                key={idx}
                style={[
                  styles.reasonCard,
                  { backgroundColor: colors.card, borderColor: 'rgba(0,0,0,0.06)' },
                  Shadows.xs,
                ]}
              >
                <View style={[styles.reasonIcon, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name={r.icon} size={18} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reasonEyebrow}>{r.eyebrow}</Text>
                  <Text style={[styles.reasonTitle, { color: colors.text }]}>{r.title}</Text>
                  <Text style={[styles.reasonDescription, { color: colors.gray500 }]}>
                    {r.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* === HELP CALLOUT === */}
          <View style={[styles.helpCallout, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <View style={[styles.helpRail, { backgroundColor: '#EF4444' }]} />
            <View style={[styles.helpIcon, { backgroundColor: '#EF4444' }]}>
              <Ionicons name="help-circle" size={14} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.helpEyebrow}>BESOIN D'AIDE ?</Text>
              <Text style={styles.helpText}>
                Si le problème persiste, contactez notre support ou essayez un autre mode de paiement.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* === BOTTOM BUTTONS === */}
        <View style={[styles.bottomButtons, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.primaryPill, Shadows.buttonPrimary]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.9}
            accessibilityLabel="Réessayer le paiement"
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.primaryPillEyebrow}>NOUVELLE TENTATIVE</Text>
              <Text style={styles.primaryPillLabel}>Réessayer le paiement</Text>
            </View>
            <View style={styles.primaryPillArrow}>
              <Ionicons name="refresh" size={18} color={Colors.white} />
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  illoWrap: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: '#EF4444',
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

  // Reasons
  reasonsCol: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  reasonsHeader: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  reasonIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: '#EF4444',
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  reasonTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 14,
    letterSpacing: -0.3,
    lineHeight: 17,
  },
  reasonDescription: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },

  // Help
  helpCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    paddingLeft: Spacing.lg + 6,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  helpRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  helpIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: '#991B1B',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  helpText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 17,
  },

  // Bottom
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
