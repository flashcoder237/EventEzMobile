import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, Spacing, BorderRadius } from '../../constants/theme';
import GradientButton from '../ui/GradientButton';
import { RootStackParamList } from '../../types';
import {
  SaveToBookmarks,
  OnlinePayments,
  Authentication,
  AnimatedIllustration,
} from '../illustrations';

type IllustrationKey = 'bookmark' | 'ticket' | 'profile';

const illustrationMap: Record<IllustrationKey, React.FC<{ color: string; size: number }>> = {
  bookmark: SaveToBookmarks,
  ticket: OnlinePayments,
  profile: Authentication,
};

interface AuthGuardScreenProps {
  illustration?: IllustrationKey;
  title: string;
  subtitle: string;
}

export default function AuthGuardScreen({ illustration = 'profile', title, subtitle }: AuthGuardScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const Illustration = illustrationMap[illustration];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <AnimatedIllustration entry="scaleIn" idle="float">
          <View style={[styles.illustrationContainer, { backgroundColor: colors.primaryBg }]}>
            <Illustration color={colors.primary} size={140} />
          </View>
        </AnimatedIllustration>

        <Text style={[styles.eyebrow, { color: colors.accent }]}>Accès réservé</Text>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.gray500 }]}>{subtitle}</Text>

        <View style={styles.actions}>
          <GradientButton
            title="Se connecter"
            onPress={() => navigation.navigate('Login')}
            fullWidth
            size="lg"
          />
          <GradientButton
            title="Creer un compte"
            onPress={() => navigation.navigate('Register')}
            variant="outline"
            fullWidth
            size="lg"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    width: '100%',
    maxWidth: 360,
  },
  illustrationContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing['2xl'],
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
  },
});
