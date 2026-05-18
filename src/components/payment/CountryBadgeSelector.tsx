import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Pressable,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
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
  // ===== Pays NotchPay (Mobile Money africain) =====
  { code: 'CM',       name: 'Cameroun',       currency: 'XAF', flag: '🇨🇲' },
  { code: 'CI',       name: "Côte d'Ivoire",  currency: 'XOF', flag: '🇨🇮' },
  { code: 'SN',       name: 'Sénégal',        currency: 'XOF', flag: '🇸🇳' },
  { code: 'KE',       name: 'Kenya',          currency: 'KES', flag: '🇰🇪' },
  { code: 'GH',       name: 'Ghana',          currency: 'GHS', flag: '🇬🇭' },
  { code: 'UG',       name: 'Ouganda',        currency: 'UGX', flag: '🇺🇬' },
  { code: 'NG',       name: 'Nigeria',        currency: 'NGN', flag: '🇳🇬' },
  // ===== Pays CinetPay uniquement (UEMOA + Congo + Guinée) =====
  { code: 'BF',       name: 'Burkina Faso',   currency: 'XOF', flag: '🇧🇫' },
  { code: 'ML',       name: 'Mali',           currency: 'XOF', flag: '🇲🇱' },
  { code: 'TG',       name: 'Togo',           currency: 'XOF', flag: '🇹🇬' },
  { code: 'BJ',       name: 'Bénin',          currency: 'XOF', flag: '🇧🇯' },
  { code: 'NE',       name: 'Niger',          currency: 'XOF', flag: '🇳🇪' },
  { code: 'CD',       name: 'RD Congo',       currency: 'CDF', flag: '🇨🇩' },
  { code: 'GN',       name: 'Guinée',         currency: 'GNF', flag: '🇬🇳' },
  // ===== Pays Stripe Connect (cartes + PayPal) — zone euro =====
  { code: 'FR',       name: 'France',         currency: 'EUR', flag: '🇫🇷' },
  { code: 'DE',       name: 'Allemagne',      currency: 'EUR', flag: '🇩🇪' },
  { code: 'ES',       name: 'Espagne',        currency: 'EUR', flag: '🇪🇸' },
  { code: 'IT',       name: 'Italie',         currency: 'EUR', flag: '🇮🇹' },
  { code: 'PT',       name: 'Portugal',       currency: 'EUR', flag: '🇵🇹' },
  { code: 'NL',       name: 'Pays-Bas',       currency: 'EUR', flag: '🇳🇱' },
  { code: 'BE',       name: 'Belgique',       currency: 'EUR', flag: '🇧🇪' },
  { code: 'AT',       name: 'Autriche',       currency: 'EUR', flag: '🇦🇹' },
  { code: 'IE',       name: 'Irlande',        currency: 'EUR', flag: '🇮🇪' },
  { code: 'FI',       name: 'Finlande',       currency: 'EUR', flag: '🇫🇮' },
  { code: 'LU',       name: 'Luxembourg',     currency: 'EUR', flag: '🇱🇺' },
  { code: 'GR',       name: 'Grèce',          currency: 'EUR', flag: '🇬🇷' },
  { code: 'SK',       name: 'Slovaquie',      currency: 'EUR', flag: '🇸🇰' },
  { code: 'SI',       name: 'Slovénie',       currency: 'EUR', flag: '🇸🇮' },
  { code: 'EE',       name: 'Estonie',        currency: 'EUR', flag: '🇪🇪' },
  { code: 'LT',       name: 'Lituanie',       currency: 'EUR', flag: '🇱🇹' },
  { code: 'LV',       name: 'Lettonie',       currency: 'EUR', flag: '🇱🇻' },
  { code: 'CY',       name: 'Chypre',         currency: 'EUR', flag: '🇨🇾' },
  { code: 'MT',       name: 'Malte',          currency: 'EUR', flag: '🇲🇹' },
  { code: 'HR',       name: 'Croatie',        currency: 'EUR', flag: '🇭🇷' },
  // ===== Stripe Connect — reste Europe =====
  { code: 'GB',       name: 'Royaume-Uni',    currency: 'GBP', flag: '🇬🇧' },
  { code: 'CH',       name: 'Suisse',         currency: 'CHF', flag: '🇨🇭' },
  { code: 'SE',       name: 'Suède',          currency: 'SEK', flag: '🇸🇪' },
  { code: 'NO',       name: 'Norvège',        currency: 'NOK', flag: '🇳🇴' },
  { code: 'DK',       name: 'Danemark',       currency: 'DKK', flag: '🇩🇰' },
  { code: 'PL',       name: 'Pologne',        currency: 'PLN', flag: '🇵🇱' },
  { code: 'CZ',       name: 'Rép. tchèque',   currency: 'CZK', flag: '🇨🇿' },
  { code: 'HU',       name: 'Hongrie',        currency: 'HUF', flag: '🇭🇺' },
  { code: 'RO',       name: 'Roumanie',       currency: 'RON', flag: '🇷🇴' },
  { code: 'BG',       name: 'Bulgarie',       currency: 'BGN', flag: '🇧🇬' },
  // ===== Stripe Connect — Amérique du Nord =====
  { code: 'US',       name: 'États-Unis',     currency: 'USD', flag: '🇺🇸' },
  { code: 'CA',       name: 'Canada',         currency: 'CAD', flag: '🇨🇦' },
  { code: 'MX',       name: 'Mexique',        currency: 'MXN', flag: '🇲🇽' },
  // ===== Stripe Connect — Asie / Pacifique =====
  { code: 'JP',       name: 'Japon',          currency: 'JPY', flag: '🇯🇵' },
  { code: 'AU',       name: 'Australie',      currency: 'AUD', flag: '🇦🇺' },
  { code: 'NZ',       name: 'Nouvelle-Zélande', currency: 'NZD', flag: '🇳🇿' },
  { code: 'SG',       name: 'Singapour',      currency: 'SGD', flag: '🇸🇬' },
  { code: 'HK',       name: 'Hong Kong',      currency: 'HKD', flag: '🇭🇰' },
  { code: 'MY',       name: 'Malaisie',       currency: 'MYR', flag: '🇲🇾' },
  { code: 'TH',       name: 'Thaïlande',      currency: 'THB', flag: '🇹🇭' },
  { code: 'ID',       name: 'Indonésie',      currency: 'IDR', flag: '🇮🇩' },
  { code: 'IN',       name: 'Inde',           currency: 'INR', flag: '🇮🇳' },
  // ===== Stripe Connect — Moyen-Orient + Amérique latine =====
  { code: 'AE',       name: 'Émirats AU',     currency: 'AED', flag: '🇦🇪' },
  { code: 'BR',       name: 'Brésil',         currency: 'BRL', flag: '🇧🇷' },
  // ===== Payeur international (cartes + PayPal via Stripe) =====
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

// Activer LayoutAnimation sur Android (no-op iOS)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CountryBadgeSelectorProps {
  countryCode: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  /** Pays "home" du payeur (detecte depuis la locale device ou le profil
      utilisateur). Affiche en premier dans la bottom sheet pour minimiser
      le scroll dans 95% des cas. Si non fourni, fallback sur countryCode. */
  homeCountry?: string;
}

export default function CountryBadgeSelector({
  countryCode,
  onChange,
  disabled = false,
  homeCountry,
}: CountryBadgeSelectorProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  // Mode liste complete : false par defaut, l'user voit 2 cards rapides
  // (son pays + Autre pays). Au tap sur Autre pays → expand vers la liste.
  const [showFullList, setShowFullList] = useState(false);
  const { modalOpen, sheetAnim, backdropAnim } = useBottomSheetAnim(visible);

  const current = getCountryByCode(countryCode) || SUPPORTED_COUNTRIES[0];
  // Pays "home" : prop fournie, sinon fallback sur le code actuel. Si ce
  // dernier est INTL (donc l'user a deja choisi "Autre pays"), on retombe
  // sur CM par defaut pour ne pas afficher une card INTL en premiere place.
  const homeCode = (homeCountry || (current.code !== INTL_CODE ? current.code : 'CM')).toUpperCase();
  const homeCountryObj = getCountryByCode(homeCode) || SUPPORTED_COUNTRIES[0];

  // Reset le mode liste quand la bottom sheet se ferme.
  useEffect(() => {
    if (!visible) {
      // Petit delai pour ne pas voir le toggle pendant l'animation de fermeture.
      const t = setTimeout(() => setShowFullList(false), 250);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const handleSelect = (code: string) => {
    onChange(code);
    setVisible(false);
  };

  const handleExpandFullList = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowFullList(true);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={styles.hintRow}>
          <Ionicons name="earth-outline" size={14} color={colors.gray500} />
          <Text style={[styles.hint, { color: colors.gray600 }]} numberOfLines={2}>
            {t('componentsPayment.countryHint')}
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
          accessibilityLabel={t('componentsPayment.countryA11y', { name: current.name })}
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
            {t('componentsPayment.sheetEyebrow')}
          </Text>
          <Text style={[styles.sheetTitle, { color: colors.gray900 }]}>
            {t('componentsPayment.sheetTitle')}
          </Text>
          <Text style={[styles.sheetSubtitle, { color: colors.gray600 }]}>
            {t('componentsPayment.sheetSubtitle')}
          </Text>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Mode rapide : 2 grosses cards (pays detecte + Autre pays).
                Quand l'user tape Autre pays, la liste complete se deroule
                en dessous via LayoutAnimation. */}
            {!showFullList && (
              <>
                {/* Card 1 : pays "home" (detecte) */}
                <TouchableOpacity
                  style={[
                    styles.quickCard,
                    {
                      backgroundColor: homeCode === current.code ? colors.primaryBg : colors.card,
                      borderColor: homeCode === current.code ? colors.primary : colors.gray200,
                    },
                  ]}
                  onPress={() => handleSelect(homeCode)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: homeCode === current.code }}
                  accessibilityLabel={homeCountryObj.name}
                >
                  <Text style={styles.quickFlag}>{homeCountryObj.flag}</Text>
                  <View style={styles.quickInfo}>
                    <Text style={[styles.quickName, { color: colors.gray900 }]}>
                      {homeCountryObj.name}
                    </Text>
                    <Text style={[styles.quickHint, { color: colors.gray500 }]}>
                      {t('componentsPayment.currencyLabel', { currency: homeCountryObj.currency })}
                    </Text>
                  </View>
                  {homeCode === current.code && (
                    <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
                  )}
                </TouchableOpacity>

                {/* Card 2 : Autre pays — expand la liste complete au tap */}
                <TouchableOpacity
                  style={[
                    styles.quickCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.gray200,
                    },
                  ]}
                  onPress={handleExpandFullList}
                  accessibilityRole="button"
                  accessibilityLabel={t('componentsPayment.otherCountryCta')}
                >
                  <Text style={styles.quickFlag}>🌍</Text>
                  <View style={styles.quickInfo}>
                    <Text style={[styles.quickName, { color: colors.gray900 }]}>
                      {t('componentsPayment.otherCountryCta')}
                    </Text>
                    <Text style={[styles.quickHint, { color: colors.gray500 }]}>
                      {t('componentsPayment.otherCountryHint')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={colors.gray400} />
                </TouchableOpacity>
              </>
            )}

            {/* Liste complete triee : pays par ordre alphabetique (locale-aware
                via Intl.Collator pour gerer correctement les accents : Bénin,
                Côte d'Ivoire, Émirats, etc.), INTL "Autre pays" toujours en
                fin. On trie a chaque render — le coût est negligeable (~50
                items) et evite de figer l'ordre dans un useMemo qui devrait
                etre invalidé sur changement de locale. */}
            {showFullList && [...SUPPORTED_COUNTRIES]
              .sort((a, b) => {
                if (a.code === INTL_CODE) return 1;
                if (b.code === INTL_CODE) return -1;
                return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
              })
              .map((country) => {
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
                        ? t('componentsPayment.intlMethods')
                        : t('componentsPayment.currencyLabel', { currency: country.currency })}
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
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    gap: Spacing.md,
  },
  quickFlag: {
    fontSize: 36,
  },
  quickInfo: {
    flex: 1,
  },
  quickName: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.bold,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  quickHint: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
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
