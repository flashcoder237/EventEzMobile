import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { exhibitorsAPI } from '../../api';
import { FontFamily, FontSizes, BorderRadius, Spacing, TextStyles } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface DirectoryExhibitor {
  exhibitor_id: string;
  company_name: string;
  category?: string;
  logo?: string | null;
  website?: string;
  booth_code: string;
}

/**
 * Annuaire des exposants d'un événement (côté visiteur mobile).
 * Affiche les exposants confirmés (stand payé) avec leur n° de stand.
 * Ne rend rien s'il n'y a aucun exposant (pas de section vide bruyante).
 */
export default function ExhibitorsSection({ eventId }: { eventId: string }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [exhibitors, setExhibitors] = useState<DirectoryExhibitor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    exhibitorsAPI
      .getPublicDirectory(eventId)
      .then((res: any) => {
        if (active) setExhibitors(res.data?.exhibitors || []);
      })
      .catch(() => active && setExhibitors([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [eventId]);

  if (loading || exhibitors.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.gray900 }]}>
        {t('componentsEvents.exhibitorsTitle')}
      </Text>
      {exhibitors.map((ex) => {
        const Row = ex.website ? TouchableOpacity : View;
        return (
          <Row
            key={ex.exhibitor_id}
            style={[styles.card, { backgroundColor: colors.gray50 }]}
            {...(ex.website
              ? {
                  onPress: () => Linking.openURL(ex.website as string),
                  activeOpacity: 0.7,
                  accessibilityRole: 'link' as const,
                  accessibilityLabel: ex.company_name,
                }
              : {})}
          >
            <View style={[styles.logo, { backgroundColor: colors.surface }]}>
              {ex.logo ? (
                <Image
                  source={ex.logo}
                  style={styles.logoImg}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              ) : (
                <Ionicons name="storefront-outline" size={20} color={colors.gray400} />
              )}
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.gray900 }]} numberOfLines={1}>
                {ex.company_name}
              </Text>
              <Text style={[styles.meta, { color: colors.gray500 }]} numberOfLines={1}>
                {ex.category ? `${ex.category} · ` : ''}
                {t('componentsEvents.exhibitorBooth', { code: ex.booth_code })}
              </Text>
            </View>
            {ex.website && (
              <Ionicons name="open-outline" size={18} color={colors.primary} />
            )}
          </Row>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...TextStyles.h3,
    letterSpacing: -0.3,
    marginBottom: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
  },
  meta: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
});
