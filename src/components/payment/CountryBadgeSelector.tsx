import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import { useBottomSheetAnim } from '../../hooks/useBottomSheetAnim';

export interface SupportedCountry {
  code: string;
  name: string;
  currency: string;
  flag: string;
}

export const INTL_CODE = 'INTL';

export const SUPPORTED_COUNTRIES: SupportedCountry[] = [
  { code: 'CM',       name: 'Cameroun',       currency: 'XAF', flag: '🇨🇲' },
  { code: 'CI',       name: "Côte d'Ivoire",  currency: 'XOF', flag: '🇨🇮' },
  { code: 'SN',       name: 'Sénégal',        currency: 'XOF', flag: '🇸🇳' },
  { code: 'KE',       name: 'Kenya',          currency: 'KES', flag: '🇰🇪' },
  { code: 'GH',       name: 'Ghana',          currency: 'GHS', flag: '🇬🇭' },
  { code: 'UG',       name: 'Ouganda',        currency: 'UGX', flag: '🇺🇬' },
  { code: INTL_CODE,  name: 'Autre pays',     currency: '',    flag: '🌍' },
];

export function getCountryByCode(code: string): SupportedCountry | undefined {
  return SUPPORTED_COUNTRIES.find((c) => c.code === code.toUpperCase());
}

/**
 * Résout la devise de l'événement depuis son code pays (pour la liste
 * de méthodes lorsque "Autre pays" est sélectionné). Fallback EUR.
 */
export function getEventCurrency(eventCountryCode: string | undefined): string {
  if (!eventCountryCode) return 'EUR';
  const match = SUPPORTED_COUNTRIES.find((c) => c.code === eventCountryCode.toUpperCase());
  return match?.currency || 'EUR';
}

interface CountryBadgeSelectorProps {
  countryCode: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export default function CountryBadgeSelector({
  countryCode,
  onChange,
  disabled = false,
}: CountryBadgeSelectorProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const { modalOpen, sheetAnim, backdropAnim } = useBottomSheetAnim(visible);

  const current = getCountryByCode(countryCode) || SUPPORTED_COUNTRIES[0];

  const handleSelect = (code: string) => {
    onChange(code);
    setVisible(false);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={styles.hintRow}>
          <Ionicons name="earth-outline" size={14} color={colors.gray500} />
          <Text style={[styles.hint, { color: colors.gray600 }]} numberOfLines={2}>
            Les méthodes de paiement varient selon votre pays
          </Text>
        </View>

        <Pressable
          disabled={disabled}
          onPress={() => setVisible(true)}
          style={({ pressed }) => [
            styles.badge,
            {
              backgroundColor: colors.card,
              borderColor: colors.primary,
              opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Pays: ${current.name}. Appuyez pour changer`}
        >
          <Text style={styles.flag}>{current.flag}</Text>
          <View style={styles.badgeText}>
            <Text style={[styles.badgeName, { color: colors.gray900 }]} numberOfLines={1}>
              {current.name}
            </Text>
            {current.currency ? (
              <Text style={[styles.badgeCurrency, { color: colors.gray500 }]}>
                {current.currency}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-down" size={16} color={colors.gray500} />
        </Pressable>
      </View>

      <Modal
        visible={modalOpen}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <Reanimated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnim]} />
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <Reanimated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: Math.max(insets.bottom + Spacing.md, Spacing.xl),
            },
            sheetAnim,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.gray300 }]} />

          <Text style={[styles.sheetEyebrow, { color: colors.accent }]}>
            Pays du payeur
          </Text>
          <Text style={[styles.sheetTitle, { color: colors.gray900 }]}>
            Choisissez votre pays
          </Text>
          <Text style={[styles.sheetSubtitle, { color: colors.gray600 }]}>
            Les moyens de paiement affichés dépendent du pays sélectionné.
          </Text>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {SUPPORTED_COUNTRIES.map((country) => {
              const selected = country.code === current.code;
              return (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.item,
                    {
                      backgroundColor: selected ? colors.primaryBg : colors.card,
                      borderColor: selected ? colors.primary : colors.gray200,
                    },
                  ]}
                  onPress={() => handleSelect(country.code)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={country.name}
                >
                  <Text style={styles.itemFlag}>{country.flag}</Text>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: colors.gray900 }]}>
                      {country.name}
                    </Text>
                    <Text style={[styles.itemCurrency, { color: colors.gray500 }]}>
                      {country.code === INTL_CODE
                        ? 'Carte bancaire et PayPal'
                        : `Devise ${country.currency}`}
                    </Text>
                  </View>
                  {selected && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Reanimated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    paddingRight: Spacing.sm,
  },
  hint: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    flexShrink: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  flag: {
    fontSize: 20,
  },
  badgeText: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  badgeName: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.semiBold,
  },
  badgeCurrency: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetEyebrow: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.bold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.bold,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  sheetSubtitle: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingBottom: Spacing.md,
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  itemFlag: {
    fontSize: 28,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    marginBottom: 2,
  },
  itemCurrency: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
  },
});
