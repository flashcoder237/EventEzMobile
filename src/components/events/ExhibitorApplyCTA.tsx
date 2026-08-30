import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { exhibitorsAPI } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import type { RootStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * CTA « Devenir exposant » sur la page d'un événement.
 *
 * Ne s'affiche QUE si l'événement est un salon acceptant des exposants — détecté
 * par la présence d'au moins une catégorie de stands (grille tarifaire). Sinon
 * ne rend rien (pas de bruit sur un event classique).
 *
 * Ouvre le parcours de candidature (ExhibitApply), jusqu'ici absent du mobile.
 */
export default function ExhibitorApplyCTA({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle?: string;
}) {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [isSalon, setIsSalon] = useState(false);
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  useEffect(() => {
    let active = true;
    exhibitorsAPI
      .getCategories({ event: eventId })
      .then((res: any) => {
        const cats = res?.data?.results || res?.data || [];
        if (active) setIsSalon(Array.isArray(cats) && cats.length > 0);
      })
      .catch(() => active && setIsSalon(false));
    return () => {
      active = false;
    };
  }, [eventId]);

  if (!isSalon) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: hairline }]}>
      <View style={[styles.iconWell, { backgroundColor: `${colors.primary}15` }]}>
        <Ionicons name="storefront" size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('exhibitApply.ctaTitle', { defaultValue: 'Tenir un stand à ce salon ?' })}
        </Text>
        <Text style={[styles.sub, { color: colors.gray500 }]}>
          {t('exhibitApply.ctaSubtitle', { defaultValue: 'Candidate en quelques secondes.' })}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => navigation.navigate('ExhibitApply', { eventId, eventTitle })}
        style={[styles.btn, { backgroundColor: colors.primary }]}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('exhibitApply.ctaButton', { defaultValue: 'Devenir exposant' })}
      >
        <Text style={styles.btnText}>{t('exhibitApply.ctaButton', { defaultValue: 'Devenir exposant' })}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  iconWell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: FontSizes.base, fontFamily: FontFamily.semiBold },
  sub: { fontSize: FontSizes.xs, fontFamily: FontFamily.regular, marginTop: 2 },
  btn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  btnText: { color: '#fff', fontSize: FontSizes.sm, fontFamily: FontFamily.semiBold },
});
