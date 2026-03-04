import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { useCurrencyConversion } from '../../hooks/useCurrencyConversion';
import { FontFamily, FontSizes } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface ConvertedPriceProps {
  amount: number;
  eventCurrency?: string;
  style?: TextStyle;
}

export default function ConvertedPrice({
  amount,
  eventCurrency = 'XAF',
  style,
}: ConvertedPriceProps) {
  const { colors } = useTheme();
  const { convertedPrice } = useCurrencyConversion(eventCurrency);
  const converted = convertedPrice(amount);

  if (!converted) return null;

  return (
    <Text style={[styles.text, { color: colors.gray400 }, style]}>
      ({converted})
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
  },
});
