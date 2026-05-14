import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';

import { walletAPI } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';

interface StripeOnboardingBannerProps {
  country?: string;
  stripeAccountId?: string;
  onboardingComplete?: boolean;
  payoutsEnabled?: boolean;
  /** Codes ISO des pays servis uniquement par Stripe (pas NotchPay/CinetPay). */
  stripeCountries?: string[];
  /** Callback appele quand l'organisateur revient de Stripe — pour refresh wallet. */
  onComplete?: () => void;
}

/**
 * Phase 2 — Bandeau d'onboarding Stripe Connect Express (mobile).
 *
 * Mirror du composant web : 3 etats (pas commence / en cours / complete),
 * cache si le pays n'est pas Stripe-only. Ouvre l'URL Stripe via
 * WebBrowser pour rester dans l'app.
 */
export default function StripeOnboardingBanner({
  country,
  stripeAccountId,
  onboardingComplete,
  payoutsEnabled,
  stripeCountries,
  onComplete,
}: StripeOnboardingBannerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { showError } = useAlert();
  const [loading, setLoading] = useState(false);

  const upperCountry = (country || '').toUpperCase();
  if (stripeCountries && upperCountry && !stripeCountries.includes(upperCountry)) {
    return null;
  }

  const startOnboarding = async () => {
    setLoading(true);
    try {
      const res = await walletAPI.stripeOnboardingLink();
      const url: string | undefined = res.data?.onboarding_url;
      if (!url) {
        showError(
          t('wallet.stripeOnboardingError', { defaultValue: 'Erreur Stripe' }),
          t('wallet.stripeOnboardingUnexpected', {
            defaultValue: 'Reponse Stripe inattendue, reessayez plus tard.',
          }),
        );
        return;
      }
      const result = await WebBrowser.openBrowserAsync(url);
      if (result.type === 'dismiss' || result.type === 'cancel') {
        onComplete?.();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message
        || err?.response?.data?.error
        || t('wallet.stripeOnboardingFailed', { defaultValue: 'Echec de l\'onboarding Stripe' });
      showError(
        t('wallet.stripeOnboardingError', { defaultValue: 'Erreur Stripe' }),
        msg,
      );
    } finally {
      setLoading(false);
    }
  };

  // Etat 1 : connecte et payouts actifs → badge vert.
  if (stripeAccountId && onboardingComplete && payoutsEnabled) {
    return (
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          padding: 12, marginBottom: 12, borderRadius: 12,
          backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0',
        }}
      >
        <Ionicons name="checkmark-circle" size={20} color="#059669" />
        <Text style={{ flex: 1, fontSize: 13, color: '#065F46' }}>
          <Text style={{ fontWeight: '700' }}>
            {t('wallet.stripeConnectActiveTitle', { defaultValue: 'Stripe Connect actif.' })}
          </Text>
          {' '}
          {t('wallet.stripeConnectActiveBody', {
            defaultValue: 'Vos revenus arrivent directement sur votre compte bancaire (payouts automatiques).',
          })}
        </Text>
      </View>
    );
  }

  // Etat 2 : onboarding en cours.
  if (stripeAccountId && !onboardingComplete) {
    return (
      <View
        style={{
          flexDirection: 'row', alignItems: 'flex-start', gap: 10,
          padding: 14, marginBottom: 12, borderRadius: 14,
          backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FCD34D',
        }}
      >
        <Ionicons name="alert-circle" size={20} color="#D97706" style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#78350F', marginBottom: 4 }}>
            {t('wallet.stripeOnboardingInProgressTitle', {
              defaultValue: 'Verification Stripe en cours',
            })}
          </Text>
          <Text style={{ fontSize: 12, color: '#92400E', lineHeight: 17, marginBottom: 10 }}>
            {t('wallet.stripeOnboardingInProgressBody', {
              defaultValue: "L'onboarding Stripe est commence mais incomplet. Sans cela, EventEz ne peut pas vous transferer vos revenus.",
            })}
          </Text>
          <TouchableOpacity
            onPress={startOnboarding}
            disabled={loading}
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row', alignItems: 'center', gap: 8,
              paddingHorizontal: 14, paddingVertical: 8,
              backgroundColor: '#D97706', borderRadius: 8,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="open-outline" size={16} color="#FFF" />
            )}
            <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>
              {t('wallet.stripeContinueVerification', { defaultValue: 'Continuer la verification' })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Etat 3 : pas encore commence.
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        padding: 14, marginBottom: 12, borderRadius: 16,
        backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE',
      }}
    >
      <View
        style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: '#4F46E5',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Ionicons name="open-outline" size={20} color="#FFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#312E81', marginBottom: 4 }}>
          {t('wallet.stripeOnboardingCTATitle', {
            defaultValue: 'Activez vos paiements via Stripe',
          })}
        </Text>
        <Text style={{ fontSize: 12, color: '#3730A3', lineHeight: 17, marginBottom: 10 }}>
          {t('wallet.stripeOnboardingCTABody', {
            defaultValue: "Pour recevoir vos revenus directement sur votre compte bancaire, completez votre profil Stripe Connect (verification + coordonnees bancaires).",
          })}
        </Text>
        <TouchableOpacity
          onPress={startOnboarding}
          disabled={loading}
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row', alignItems: 'center', gap: 8,
            paddingHorizontal: 14, paddingVertical: 8,
            backgroundColor: '#4F46E5', borderRadius: 8,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          )}
          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>
            {t('wallet.stripeStartOnboarding', { defaultValue: "Commencer l'onboarding" })}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
