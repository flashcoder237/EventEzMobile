/**
 * Indicateur non-contractuel de conversion pour les payeurs internationaux.
 * Version mobile du composant web FXIndicator.
 *
 * Utilise le meme module `constants/currency` que `useCurrencyConversion`
 * pour garantir qu'on n'a JAMAIS deux conversions divergentes sur le meme
 * ecran (bug pre-refactor : FXIndicator connaissait 14 pays,
 * useCurrencyConversion en connaissait 70+).
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import { commissionsAPI } from '../../api';
import {
  detectUserCurrency,
  getCachedRate,
  setCachedRate,
  markUnsupportedPair,
  isPairKnownUnsupported,
  setRuntimeFallback,
  getInternationalFallback,
} from '../../constants/currency';

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

interface Props {
  amount: number;
  fromCurrency: string;
}

export default function FXIndicator({ amount, fromCurrency }: Props) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [converted, setConverted] = useState<{ value: number; currency: string } | null>(null);
  // Devise cible : detectee, ou fallback international (jamais null).
  // Pourra etre switched sur le fallback si la 1ere paire est unsupported.
  const [targetCurrency, setTargetCurrency] = useState<string>(() => detectUserCurrency());

  useEffect(() => {
    let cancelled = false;
    if (!amount || amount <= 0 || !fromCurrency) {
      setConverted(null);
      return;
    }
    if (fromCurrency.toUpperCase() === targetCurrency.toUpperCase()) {
      setConverted(null);
      return;
    }

    // 1. Cache hit
    const cachedRate = getCachedRate(fromCurrency, targetCurrency);
    if (cachedRate !== null) {
      const value = amount * cachedRate;
      if (Number.isFinite(value) && value >= 0.01) {
        setConverted({ value, currency: targetCurrency });
      } else {
        setConverted(null);
      }
      return;
    }

    // 2. Paire connue non-supportee → switch sur fallback international
    if (isPairKnownUnsupported(fromCurrency, targetCurrency)) {
      const fallback = getInternationalFallback();
      if (fromCurrency.toUpperCase() === fallback.toUpperCase()) {
        setConverted(null);
        return;
      }
      // Le useEffect va se relancer avec le fallback
      setTargetCurrency(fallback);
      return;
    }

    (async () => {
      try {
        const res: any = await commissionsAPI.convert(1, fromCurrency, targetCurrency);
        const data = res?.data ?? res;
        const rateValue = Number(data?.rate);
        if (!Number.isFinite(rateValue) || rateValue <= 0) {
          if (!cancelled) setConverted(null);
          return;
        }
        setCachedRate(fromCurrency, targetCurrency, rateValue);
        if (cancelled) return;
        const value = amount * rateValue;
        if (Number.isFinite(value) && value >= 0.01) {
          setConverted({ value, currency: targetCurrency });
        } else {
          setConverted(null);
        }
      } catch (err: any) {
        if (cancelled) return;
        const errorCode = err?.response?.data?.error;
        if (errorCode === 'unsupported_currency') {
          markUnsupportedPair(fromCurrency, targetCurrency);

          // Lit le fallback que le backend nous renvoie
          const backendFallback = err?.response?.data?.fallback_currency;
          if (backendFallback) setRuntimeFallback(backendFallback);

          const fallback = backendFallback || getInternationalFallback();
          if (fallback && fallback !== fromCurrency && fallback !== targetCurrency) {
            setTargetCurrency(fallback);
            return;
          }
        }
        setConverted(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [amount, fromCurrency, targetCurrency]);

  if (!converted) return null;

  const bgColor = isDark ? '#1E3A5F' : '#EFF6FF';
  const borderColor = isDark ? '#2C5282' : '#BFDBFE';
  const mainTextColor = isDark ? '#BEE3F8' : '#1E40AF';
  const subTextColor = isDark ? '#A0C4E8' : '#1D4ED8';

  const formattedConverted = formatMoney(converted.value, converted.currency);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: bgColor, borderColor },
      ]}
      accessible
      accessibilityLabel={t('componentsPayment.fxA11y', { currency: fromCurrency.toUpperCase(), amount: formattedConverted })}
    >
      <Ionicons
        name="information-circle-outline"
        size={18}
        color={mainTextColor}
        style={styles.icon}
      />
      <View style={styles.textBlock}>
        <Text style={[styles.mainText, { color: mainTextColor }]}>
          {t('componentsPayment.fxBilledIn')} <Text style={styles.bold}>{fromCurrency.toUpperCase()}</Text>
          {'  '}{t('componentsPayment.fxEstimation')}{' '}
          <Text style={styles.bold}>{t('componentsPayment.fxApprox', { amount: formattedConverted })}</Text>
        </Text>
        <Text style={[styles.subText, { color: subTextColor }]}>
          {t('componentsPayment.fxBankRateNote')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  icon: {
    marginTop: 1,
    marginRight: Spacing.sm,
  },
  textBlock: {
    flex: 1,
  },
  mainText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    lineHeight: 18,
  },
  subText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginTop: 2,
    opacity: Platform.OS === 'android' ? 0.9 : 1,
  },
  bold: {
    fontFamily: FontFamily.semiBold,
  },
});
