/**
 * PhoneNumberInput — saisie de numéro de téléphone internationale.
 *
 * Affiche un sélecteur d'indicatif pays (drapeau + indicatif) collé au champ
 * numéro. Émet une valeur **E.164** (`+<indicatif><numéro>`) via `onChangeValue`,
 * ou `''` tant qu'aucun numéro n'est saisi (le champ téléphone est optionnel).
 *
 * Le pays est pré-sélectionné depuis la locale de l'appareil (`getLocales()`),
 * avec repli sur le Cameroun. Si une valeur E.164 initiale est fournie, elle est
 * décomposée en (pays, numéro national) au montage.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getLocales } from 'expo-localization';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, Spacing, BorderRadius } from '../../constants/theme';
import {
  COUNTRIES,
  Country,
  countryName,
  flagEmoji,
  findCountryByCode,
  normalizeForSearch,
  parseE164,
} from '../../constants/countries';

interface Props {
  /** Valeur E.164 (`+237…`) ou `''`. Utilisée seulement au montage. */
  value: string;
  /** Émet la valeur E.164 (`''` si aucun numéro saisi). */
  onChangeValue: (e164: string) => void;
  /** Libellé affiché au-dessus du champ (optionnel). */
  label?: string;
  /** Message d'erreur affiché sous le champ (optionnel). */
  error?: string;
  /** Placeholder du champ numéro. */
  placeholder?: string;
}

const DEFAULT_COUNTRY_CODE = 'CM';

/** Code pays de l'appareil, validé contre la liste — repli sur CM. */
function deviceCountryCode(): string {
  try {
    const region = getLocales()?.[0]?.regionCode;
    if (region && findCountryByCode(region)) return region.toUpperCase();
  } catch {
    /* expo-localization indisponible — repli */
  }
  return DEFAULT_COUNTRY_CODE;
}

export default function PhoneNumberInput({
  value,
  onChangeValue,
  label,
  error,
  placeholder,
}: Props) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  // État initial dérivé une seule fois (au montage) : on parse une éventuelle
  // valeur E.164, sinon pays = locale appareil, numéro vide.
  const initial = useMemo(() => {
    const parsed = parseE164(value);
    if (parsed) return parsed;
    return {
      country: findCountryByCode(deviceCountryCode()) ?? COUNTRIES[0],
      national: '',
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [country, setCountry] = useState<Country>(initial.country);
  const [national, setNational] = useState(initial.national);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');

  const emit = (c: Country, nat: string) => {
    const digits = nat.replace(/\D/g, '');
    onChangeValue(digits ? `+${c.dial}${digits}` : '');
  };

  const handleNational = (text: string) => {
    const digits = text.replace(/\D/g, '');
    setNational(digits);
    emit(country, digits);
  };

  const handlePickCountry = (c: Country) => {
    setCountry(c);
    setPickerOpen(false);
    setSearch('');
    emit(c, national);
  };

  const closePicker = () => {
    setPickerOpen(false);
    setSearch('');
  };

  const filtered = useMemo(() => {
    const lang = i18n.language;
    const sorted = [...COUNTRIES].sort((a, b) =>
      countryName(a, lang).localeCompare(countryName(b, lang)),
    );
    const raw = search.trim();
    if (!raw) return sorted;
    const q = normalizeForSearch(raw);
    // L'indicatif n'est pris en compte QUE si la requête contient des chiffres.
    // Sinon `c.dial.includes('')` matcherait tous les pays et écraserait la
    // recherche par nom.
    const qDigits = raw.replace(/\D/g, '');
    return sorted.filter(
      (c) =>
        normalizeForSearch(c.name).includes(q) ||
        normalizeForSearch(c.nameEn).includes(q) ||
        normalizeForSearch(c.code).includes(q) ||
        (qDigits.length > 0 && c.dial.includes(qDigits)),
    );
  }, [search, i18n.language]);

  return (
    <View>
      {label ? <Text style={[styles.label, { color: colors.gray700 }]}>{label}</Text> : null}

      <View
        style={[
          styles.row,
          {
            backgroundColor: colors.gray50,
            borderColor: error ? colors.error : colors.gray200,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.countryBtn, { borderRightColor: colors.gray200 }]}
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('phoneInput.selectCountry')}
        >
          <Text style={styles.flag}>{flagEmoji(country.code)}</Text>
          <Text style={[styles.dial, { color: colors.gray900 }]}>+{country.dial}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.gray400} />
        </TouchableOpacity>

        <TextInput
          style={[styles.input, { color: colors.gray900 }]}
          value={national}
          onChangeText={handleNational}
          placeholder={placeholder ?? t('phoneInput.placeholder')}
          placeholderTextColor={colors.gray400}
          keyboardType="phone-pad"
          autoComplete="tel"
          accessibilityLabel={label ?? t('phoneInput.placeholder')}
        />
      </View>

      {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={closePicker}
      >
        <View style={[styles.modalRoot, { backgroundColor: colors.background, paddingTop: insets.top }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.gray200 }]}>
            <Text style={[styles.modalTitle, { color: colors.gray900 }]}>
              {t('phoneInput.selectCountry')}
            </Text>
            <TouchableOpacity onPress={closePicker} accessibilityRole="button" hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.searchWrap,
              { backgroundColor: colors.gray50, borderColor: colors.gray200 },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.gray400} />
            <TextInput
              style={[styles.searchInput, { color: colors.gray900 }]}
              value={search}
              onChangeText={setSearch}
              placeholder={t('phoneInput.searchPlaceholder')}
              placeholderTextColor={colors.gray400}
              autoFocus
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(c) => c.code}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
            renderItem={({ item }) => {
              const active = item.code === country.code;
              return (
                <TouchableOpacity
                  style={[styles.countryRow, { borderBottomColor: colors.gray100 }]}
                  onPress={() => handlePickCountry(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.flag}>{flagEmoji(item.code)}</Text>
                  <Text style={[styles.countryName, { color: colors.gray900 }]} numberOfLines={1}>
                    {countryName(item, i18n.language)}
                  </Text>
                  <Text style={[styles.countryDial, { color: colors.gray500 }]}>+{item.dial}</Text>
                  {active ? (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.gray500 }]}>
                {t('phoneInput.noResult')}
              </Text>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md + 2,
    borderRightWidth: 1,
  },
  flag: {
    fontSize: 20,
  },
  dial: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    fontFamily: FontFamily.regular,
  },
  error: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    marginTop: 6,
  },

  // Modal
  modalRoot: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    fontSize: 15,
    fontFamily: FontFamily.regular,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  countryName: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 15,
  },
  countryDial: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    fontFamily: FontFamily.regular,
    fontSize: 14,
    marginTop: Spacing.xl,
  },
});
