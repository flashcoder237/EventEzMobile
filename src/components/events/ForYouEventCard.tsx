/**
 * ForYouEventCard — carte « post » du flux infini « Pour vous » (Discover).
 *
 * Extraite de DiscoverScreen pour être rendue par une FlatList virtualisée :
 * mémoïsée (React.memo), elle ne se redessine plus à chaque page ajoutée au
 * flux ni à chaque changement d'état de l'écran parent. Les props sont
 * volontairement primitives / stables (callbacks mémoïsés côté parent).
 *
 * Style Facebook/LinkedIn : header organisateur, hero 16:9 plein-bord, titre
 * éditorial, meta inline, footer « Partager » + CTA « Voir ».
 */
import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';

import EventCoverMedia from './EventCoverMedia';
import { HeroSlot, captureHero, useHeroToken } from '../ui/motion';
import { getMediaUrl } from '../../api';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, BorderRadius, Spacing } from '../../constants/theme';
import { getEventUrl } from '../../constants/urls';
import { getEventPriceRange } from '../../lib/utils/priceFormatters';
import { getEventImageUrl, prefetchEventHero } from '../../utils/imageUtils';
import type { Event } from '../../types';
import { shortMonthLabel } from '../../lib/utils/dateFormatters';

function splitDate(iso: string) {
  const d = new Date(iso);
  return { day: String(d.getDate()).padStart(2, '0'), month: shortMonthLabel(d) };
}

function eventTime(ev: Event) {
  const anyEv = ev as any;
  if (anyEv.start_time) return String(anyEv.start_time).slice(0, 5);
  try {
    const d = new Date(ev.start_date);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

function eventPlaceholder(ev: Event) {
  return (
    (ev as any).banner_placeholder ||
    ev.category?.default_event_image_placeholder ||
    (ev as any).display_placeholder
  );
}

export interface ForYouEventCardProps {
  event: Event;
  /** Carte visible dans le viewport → autoplay de la vidéo de couverture. */
  shouldPlay: boolean;
  /** Devise d'affichage du prix (config plateforme). */
  platformCurrency?: string;
  /** Ouvre la fiche. `imageUrl` = image déjà affichée (transition instantanée). */
  onOpen: (event: Event, imageUrl?: string) => void;
}

function ForYouEventCardImpl({ event: ev, shouldPlay, platformCurrency, onOpen }: ForYouEventCardProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const { day, month } = splitDate(ev.start_date);
  // Carte pleine largeur (~1000px physiques) : variante 960px, pas la 400px
  // qui serait floue une fois étirée.
  const img = getEventImageUrl(ev, 'medium') || undefined;
  const placeholder = eventPlaceholder(ev);
  const orgName = (ev.organizer_name as string)
    || (ev.organizer && typeof ev.organizer === 'object'
      ? `${(ev.organizer as any).first_name || ''} ${(ev.organizer as any).last_name || ''}`.trim() || (ev.organizer as any).email
      : t('events.organizer'));
  const orgInitial = (orgName?.[0] || 'O').toUpperCase();
  const orgAvatar = (ev.organizer && typeof ev.organizer === 'object')
    ? getMediaUrl((ev.organizer as any).profile_picture || (ev.organizer as any).image)
    : null;
  const locationLabel = ev.location_type === 'online'
    ? t('discover.online')
    : (ev.location_city || ev.location_name || '');
  // Label prix formaté : "Gratuit" / "5 000 FCFA" / "dès 5 000 FCFA"
  const priceRange = getEventPriceRange(ev);
  const priceLabel = priceRange === undefined
    ? ''
    : priceRange.max === 0
      ? t('common.free')
      : priceRange.min === priceRange.max
        ? `${priceRange.min.toLocaleString()} ${platformCurrency}`
        : `${t('events.startingFrom')} ${priceRange.min.toLocaleString()} ${platformCurrency}`;
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const open = useCallback(() => onOpen(ev, img), [onOpen, ev, img]);
  // T1 — l'image « vole » jusqu'à la bannière de la fiche (jamais une vidéo).
  const heroToken = useHeroToken();
  const heroEnabled = !ev.cover_video && !ev.cover_video_embed;
  // Précharge le héros de la fiche pendant l'appui (avant la navigation) et
  // mesure l'image pour le vol.
  const warm = useCallback(() => {
    if (heroEnabled) captureHero(heroToken);
    prefetchEventHero(ev);
  }, [ev, heroEnabled, heroToken]);
  const share = useCallback(() => {
    // Toujours inclure le LIEN de l'event (sinon le partage n'envoie que du
    // texte, inexploitable).
    const shareUrl = getEventUrl(ev.slug || ev.id);
    Share.share({
      message: `${ev.title}\n${ev.short_description || ''}\n\n${shareUrl}`,
      url: shareUrl,
      title: ev.title,
    }).catch(() => { /* user cancelled */ });
  }, [ev]);

  return (
    <View
      style={[
        styles.feedCard,
        { backgroundColor: colors.card, borderColor: hairline },
      ]}
    >
      {/* Header : organisateur + meta — tappable comme tout LinkedIn/FB post */}
      <TouchableOpacity onPress={open} onPressIn={warm} activeOpacity={0.95}>
        <View style={styles.feedCardHeader}>
          {orgAvatar ? (
            <Image
              source={{ uri: orgAvatar }}
              style={[styles.feedCardAvatar, { borderColor: hairline }]}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View
              style={[
                styles.feedCardAvatar,
                { backgroundColor: `${colors.primary}12`, borderColor: hairline },
              ]}
            >
              <Text style={[styles.feedCardAvatarInitial, { color: colors.primary }]}>
                {orgInitial}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.feedCardOrgEyebrow, { color: colors.accent }]} numberOfLines={1}>
              POUR VOUS · ORGANISATEUR
            </Text>
            <Text style={[styles.feedCardOrgName, { color: colors.text }]} numberOfLines={1}>
              {orgName}
            </Text>
          </View>
        </View>

        {/* Hero image OU video full-width 16:9 (autoplay si visible dans viewport) */}
        <HeroSlot token={heroToken} heroKey={ev.id} enabled={heroEnabled} radius={0}>
          <EventCoverMedia
            event={ev}
            mode="card"
            shouldPlay={shouldPlay}
            style={styles.feedCardImage}
            fallbackImageUri={img}
            fallbackPlaceholder={placeholder}
          />
        </HeroSlot>

        {/* Body */}
        <View style={styles.feedCardBody}>
          <Text style={[styles.feedCardTitle, { color: colors.text }]} numberOfLines={2}>
            {ev.title}
          </Text>
          {!!ev.short_description && (
            <Text style={[styles.feedCardDesc, { color: colors.gray600 }]} numberOfLines={3}>
              {ev.short_description}
            </Text>
          )}

          {/* Meta row : date · lieu · prix — séparateurs visuels épurés */}
          <View style={styles.feedCardMetaRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.accent} />
            <Text style={[styles.feedCardMetaText, { color: colors.gray700 }]} numberOfLines={1}>
              {day} {month} · {eventTime(ev)}
            </Text>
            {!!locationLabel && (
              <>
                <View style={[styles.feedCardMetaDot, { backgroundColor: colors.gray300 }]} />
                <Text
                  style={[styles.feedCardMetaText, { color: colors.gray700, flexShrink: 1 }]}
                  numberOfLines={1}
                >
                  {locationLabel}
                </Text>
              </>
            )}
            {!!priceLabel && (
              <>
                <View style={[styles.feedCardMetaDot, { backgroundColor: colors.gray300 }]} />
                <Text style={[styles.feedCardMetaText, { color: colors.primary }]} numberOfLines={1}>
                  {priceLabel}
                </Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Footer : Partager (ghost) à gauche · CTA primaire à droite */}
      <View style={[styles.feedCardFooter, { borderTopColor: hairline }]}>
        <TouchableOpacity
          style={styles.feedCardActionGhost}
          onPress={share}
          activeOpacity={0.7}
          accessibilityLabel={t('discover.share')}
          hitSlop={8}
        >
          <Ionicons name="share-outline" size={16} color={colors.gray600} />
          <Text style={[styles.feedCardActionText, { color: colors.gray700 }]}>
            {t('discover.share')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.feedCardActionPrimary, { backgroundColor: colors.primary }]}
          onPress={open}
          onPressIn={warm}
          activeOpacity={0.85}
          accessibilityLabel={t('discover.viewEvent')}
        >
          <Text style={styles.feedCardActionPrimaryText}>{t('discover.viewEvent')}</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ForYouEventCard = memo(ForYouEventCardImpl);
export default ForYouEventCard;

// === FEED-STYLE POST CARD (Facebook/LinkedIn inspired, sans ombre) ===
// Plein-largeur, header eyebrow + nom organisateur, hero 16:9 plein-bord,
// titre éditorial, meta row inline avec dots, footer action ghost + CTA.
const styles = StyleSheet.create({
  feedCard: {
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  feedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  feedCardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedCardAvatarInitial: {
    fontFamily: FontFamily.displayBold,
    fontSize: 17,
    letterSpacing: -0.3,
  },
  feedCardOrgEyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9.5,
    letterSpacing: 1.4,
    marginBottom: 3,
  },
  feedCardOrgName: {
    fontFamily: FontFamily.displayBold,
    fontSize: 15,
    letterSpacing: -0.3,
  },
  feedCardImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  feedCardBody: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: 8,
  },
  feedCardTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 19,
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  feedCardDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    lineHeight: 20,
  },
  feedCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  feedCardMetaText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: -0.1,
  },
  feedCardMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 2,
  },
  feedCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  feedCardActionGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  feedCardActionText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12.5,
    letterSpacing: 0.2,
  },
  feedCardActionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: BorderRadius.full,
  },
  feedCardActionPrimaryText: {
    fontFamily: FontFamily.bold,
    fontSize: 12.5,
    letterSpacing: 0.3,
    color: '#FFFFFF',
  },
});
