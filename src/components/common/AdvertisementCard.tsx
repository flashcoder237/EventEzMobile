/**
 * AdvertisementCard — bannière promotionnelle injectée dans le feed Discover.
 *
 * Données : `AdvertisementPublic` (cf. api/social.ts) — image_url, title,
 * subtitle, cta_label, target_event_id ou link_url.
 *
 * Comportement au tap :
 *   - Si `target_event_id` est défini → navigate('EventDetails', { eventId })
 *   - Sinon si `link_url` est non vide → ouvre dans navigateur via Linking
 *   - Sinon : pas de navigation (pub purement informative)
 *
 * Tracking : on appelle `advertisementsAPI.recordView()` au mount (une fois)
 * et `recordClick()` au tap. Fire-and-forget — ne bloque pas l'UX.
 *
 * Style : eyebrow "SPONSORISÉ" + image bannière + titre + sous-titre + CTA.
 * Cohérent avec le design éditorial (FunnelDisplay, indigo+corail).
 */

import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { advertisementsAPI, AdvertisementPublic } from '../../api';
import { RootStackParamList } from '../../types';
import { FontFamily, BorderRadius, Spacing, Shadows } from '../../constants/theme';

// Largeur de la carte pub, plafonnée à une largeur type iPhone puis centrée →
// ne s'étire pas sur grand écran (iPad en mode compat iPhone).
const CARD_WIDTH = Math.min(Dimensions.get('window').width, 520) - Spacing.lg * 2;

interface Props {
  ad: AdvertisementPublic;
  /** Track la première vue. False désactive (utile pour les rendus dans une
   *  preview admin). Par défaut true. */
  trackView?: boolean;
}

function AdvertisementCard({ ad, trackView = true }: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const viewedRef = useRef(false);

  useEffect(() => {
    // recordView une seule fois par mount. Si la card scroll en/hors d'écran,
    // ça reste UN view (cohérent avec un usage "impressions par session").
    if (!trackView || viewedRef.current) return;
    viewedRef.current = true;
    advertisementsAPI.recordView(ad.id).catch(() => {
      /* fire-and-forget */
    });
  }, [ad.id, trackView]);

  const handlePress = async () => {
    // Track click — best effort
    advertisementsAPI.recordClick(ad.id).catch(() => {});

    if (ad.target_event_id) {
      navigation.navigate('EventDetails', { eventId: ad.target_event_id });
      return;
    }
    if (ad.link_url) {
      try {
        const supported = await Linking.canOpenURL(ad.link_url);
        if (supported) Linking.openURL(ad.link_url);
      } catch {
        /* URL invalide ou bloquée par l'OS — silent. */
      }
    }
  };

  const tappable = !!(ad.target_event_id || ad.link_url);

  return (
    <Pressable
      onPress={handlePress}
      disabled={!tappable}
      accessibilityRole={tappable ? 'button' : 'none'}
      accessibilityLabel={t('componentsCommon.advertA11y', { title: ad.title })}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.06)',
          opacity: pressed ? 0.92 : 1,
        },
        Shadows.sm,
      ]}
    >
      {/* Image bannière + overlay gradient pour lisibilité de l'eyebrow */}
      <View style={styles.imageWrap}>
        {ad.image_url ? (
          <Image
            source={{ uri: ad.image_url }}
            style={styles.image}
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.image, { backgroundColor: colors.gray100 }]} />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.imageOverlay}
          pointerEvents="none"
        />
        <View style={styles.eyebrowPill}>
          <Ionicons name="megaphone" size={9} color="#FFFFFF" />
          <Text style={styles.eyebrowText}>{t('componentsCommon.advertSponsored')}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {ad.title}
        </Text>
        {!!ad.subtitle && (
          <Text style={[styles.subtitle, { color: colors.gray500 }]} numberOfLines={2}>
            {ad.subtitle}
          </Text>
        )}
        {tappable && (
          <View style={[styles.ctaRow, { backgroundColor: colors.primary }]}>
            <Text style={styles.ctaText}>{ad.cta_label || t('componentsCommon.advertCtaDefault')}</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default memo(AdvertisementCard);

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    alignSelf: 'center',
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: Spacing.md,
  },
  imageWrap: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    height: 60,
  },
  eyebrowPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  eyebrowText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.4,
    color: '#FFFFFF',
  },
  body: {
    padding: Spacing.md,
    gap: 6,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: 17,
    letterSpacing: -0.4,
    lineHeight: 22,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  ctaRow: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  ctaText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
});
