import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { newslettersAPI } from '../../api';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing, TextStyles } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

function NewsletterIcon({ size = 28, color = Colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Envelope body */}
      <Path
        d="M2 7C2 5.89543 2.89543 5 4 5H20C21.1046 5 22 5.89543 22 7V17C22 18.1046 21.1046 19 20 19H4C2.89543 19 2 18.1046 2 17V7Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Envelope flap */}
      <Path
        d="M2 7L10.8 12.6C11.5111 13.0741 12.4889 13.0741 13.2 12.6L22 7"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Notification dot */}
      <Circle cx="19" cy="5" r="3.5" fill={Colors.accent || '#FF6B6B'} />
    </Svg>
  );
}

interface NewsletterTabProps {
  eventId: string;
  categoryName?: string;
}

export default function NewsletterTab({ eventId, categoryName }: NewsletterTabProps) {
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async () => {
    if (!email.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre email');
      return;
    }
    setSubmitting(true);
    try {
      await newslettersAPI.subscribe({
        email: email.trim(),
        name: name.trim() || undefined,
      });
      setSubscribed(true);
      Alert.alert('Succes', 'Vous etes inscrit a la newsletter !');
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.response?.data?.message || "Erreur lors de l'inscription";
      Alert.alert('Erreur', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (subscribed) {
    return (
      <View style={styles.section}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          </View>
          <Text style={[styles.successTitle, { color: colors.gray900 }]}>Merci pour votre inscription !</Text>
          <Text style={[styles.successDescription, { color: colors.gray500 }]}>
            Vous recevrez nos prochaines newsletters
            {categoryName ? ` sur "${categoryName}"` : ''} directement dans votre boite mail.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>Newsletter</Text>

      <View style={[styles.newsletterCard, { backgroundColor: colors.primaryBg, borderColor: colors.primary + '30' }]}>
        <View style={styles.iconRow}>
          <View style={[styles.iconContainer, { backgroundColor: colors.card }]}>
            <NewsletterIcon size={30} color={colors.primary} />
          </View>
        </View>

        <Text style={[styles.cardTitle, { color: colors.gray900 }]}>Restez informe !</Text>
        <Text style={[styles.cardDescription, { color: colors.gray600 }]}>
          Inscrivez-vous a notre newsletter pour recevoir les dernieres actualites
          {categoryName ? ` sur les evenements "${categoryName}"` : ''}, les nouveaux evenements et des offres exclusives.
        </Text>

        <View style={styles.formContainer}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.gray200, color: colors.gray900 }]}
            placeholder="Votre nom (optionnel)"
            placeholderTextColor={colors.gray400}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.gray200, color: colors.gray900 }]}
            placeholder="Votre email *"
            placeholderTextColor={colors.gray400}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.subscribeButton, !email.trim() && styles.subscribeButtonDisabled]}
            onPress={handleSubscribe}
            disabled={submitting || !email.trim()}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="send" size={16} color={Colors.white} />
                <Text style={styles.subscribeButtonText}>S'inscrire a la newsletter</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.privacyText, { color: colors.gray400 }]}>
          Vous pouvez vous desabonner a tout moment. Nous respectons votre vie privee.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...TextStyles.h3,
    letterSpacing: -0.3,
    marginBottom: Spacing.md,
  },
  newsletterCard: {
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    letterSpacing: -0.3,
    color: Colors.gray900,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  cardDescription: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    color: Colors.gray600,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  formContainer: {
    gap: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  subscribeButtonDisabled: {
    opacity: 0.5,
  },
  subscribeButtonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  privacyText: {
    fontSize: FontSizes.xs,
    color: Colors.gray400,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 16,
  },
  // Success State
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  successIcon: {
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    marginBottom: Spacing.sm,
  },
  successDescription: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.xl,
  },
});
