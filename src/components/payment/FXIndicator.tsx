/**
 * Indicateur non-contractuel de conversion pour les payeurs internationaux.
 * Version mobile du composant web FXIndicator.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Localization from 'expo-localization';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import { commissionsAPI } from '../../api';

const LOCALE_TO_CURRENCY: Record<string, string> = {
  FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', PT: 'EUR', NL: 'EUR',
  BE: 'EUR', AT: 'EUR', IE: 'EUR', FI: 'EUR', LU: 'EUR',
  US: 'USD', CA: 'USD',
  GB: 'GBP',
};

function inferPayerCurrency(): string {
  try {
    // expo-localization renvoie une liste; on prend la premiere region disponible.
    const locales = (Localization as any).getLocales?.() ?? [];
    const region = locales[0]?.regionCode?.toUpperCase();
    if (region && LOCALE_TO_CURRENCY[region]) return LOCALE_TO_CURRENCY[region];
    // Fallback : deprecie mais large support
    const legacy = (Localization as any).region?.toUpperCase();
    if (legacy && LOCALE_TO_CURRENCY[legacy]) return LOCALE_TO_CURRENCY[legacy];
  } catch {
    /* ignore */
  }
  return 'EUR';
}

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
  const [targetCurrency] = useState<string>(() => inferPayerCurrency());

  useEffect(() => {
    let cancelled = false;
    if (!amount || !fromCurrency || !targetCurrency) return;
    if (fromCurrency.toUpperCase() === targetCurrency.toUpperCase()) {
      setConverted(null);
      return;
    }
    (async () => {
      try {
        const res: any = await commissionsAPI.convert(amount, fromCurrency, targetCurrency);
        const data = res?.data ?? res;
        const value = typeof data?.converted_amount === 'number' ? data.converted_amount : null;
        if (!cancelled && value !== null) {
          setConverted({ value, currency: targetCurrency });
        }
      } catch {
        if (!cancelled) setConverted(null);
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
