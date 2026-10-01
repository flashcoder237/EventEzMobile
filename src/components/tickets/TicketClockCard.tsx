/**
 * S1 — L'horloge du billet (mobile).
 *
 * Le billet le plus proche passe en tête de « Mes billets » et change de
 * posture avec le temps : dans une semaine, la veille (checklist), le jour J
 * (carte agrandie, QR à un tap, itinéraire), portes ouvertes (un seul gros
 * bouton), en cours (hub « sur place »). Ce sont des ÉTATS : on passe de l'un
 * à l'autre par un fondu, jamais par un ressort sur la mise en page.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, Spacing } from '../../constants/theme';
import { Durations } from '../../constants/motion';
import { TicketPhase, directionsUrl } from '../../lib/utils/ticketPhase';
import { tintAlpha, tintFor } from '../../lib/utils/themeTint';
import { appDateLocale } from '../../lib/utils/dateFormatters';
import ShareTicketCardButton from './ShareTicketCardButton';
import VenueCompass from './VenueCompass';
import { useMotionGate, moments, usePhonePosture, useFirstSeen, markFirstSeen } from '../ui/motion';
import { useVenueLocation } from '../../hooks/useVenueLocation';
import { venueCoords, VENUE } from '../../lib/utils/venueCompass';
import { eventPushWithin } from '../../lib/notifications/recentEventPush';
import haptics from '../../utils/haptics';

/** H2 : pas de battement si une notification d'événement vient de vibrer. */
const PUSH_GUARD_MS = 5 * 60 * 1000;

/** Horloge à la minute (côté client) : suffisant pour changer de phase. */
export function useMinuteNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export interface TicketClockCardProps {
  phase: TicketPhase;
  event: any;
  tint: any;
  offlineReady?: boolean;
  onOpenTicket: () => void;
  /** Inscription affichée (H2 : battement une fois par inscription). */
  registrationId?: string | number;
}

function timeLabel(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleTimeString(appDateLocale(), { hour: '2-digit', minute: '2-digit' });
  } catch {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}

function dayLabel(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString(appDateLocale(), { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function TicketClockCard({ phase, event, tint, offlineReady, onOpenTicket, registrationId }: TicketClockCardProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const accent = tintFor(tint, isDark);
  const { reduced, focused, appActive } = useMotionGate();
  const visible = focused && appActive;
  const isDoorsPhase = phase === 'PORTES';
  const eventKey = String(event?.id ?? event?.slug ?? '');

  // H2 — portes ouvertes VUES à l'écran : un battement « lub-dub », une seule
  // fois par inscription, sauf si un rappel vient de faire vibrer le téléphone.
  const doorsFirst = useFirstSeen(
    'eventez_doors_heartbeat',
    isDoorsPhase && visible && registrationId != null ? String(registrationId) : null,
  );
  useEffect(() => {
    if (doorsFirst === true && !eventPushWithin(PUSH_GUARD_MS)) haptics.pattern('heartbeat');
  }, [doorsFirst]);

  // G8/G9 — position (jamais demandée : seulement si déjà accordée).
  const venue = venueCoords(event);
  const onDay = phase === 'JOUR_J' || phase === 'PORTES';
  const loc = useVenueLocation(venue, onDay);
  const near = loc.granted === true && loc.distance != null && loc.distance < VENUE.NEAR_M;

  // G8 — portes ouvertes, sur place : lever le téléphone ouvre le billet (une
  // fois par événement). Sinon, le bouton « Afficher mon billet » pulse une fois.
  const pulse = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const onOpenRef = useRef(onOpenTicket);
  onOpenRef.current = onOpenTicket;
  const nearRef = useRef(near);
  nearRef.current = near;
  const onRaise = useCallback(() => {
    if (!eventKey) return;
    if (nearRef.current) {
      markFirstSeen('eventez_raise_open', eventKey)
        .then((first) => {
          if (first) {
            haptics.selection();
            onOpenRef.current();
          }
        })
        .catch(() => {});
      return;
    }
    if (reduced || !moments.once(`doors-pulse:${eventKey}`)) return;
    pulse.value = withSequence(withTiming(1.04, { duration: 160 }), withTiming(1, { duration: 220 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventKey, reduced]);
  const { sensorElement: postureElement } = usePhonePosture({ raise: onRaise }, { enabled: isDoorsPhase });

  const showCompass =
    onDay &&
    visible &&
    !!venue &&
    loc.granted === true &&
    !loc.arrived &&
    loc.position != null &&
    loc.distance != null &&
    loc.distance < VENUE.COMPASS_MAX_M &&
    loc.distance >= VENUE.ARRIVED_M;
  const title = event?.title || '';
  const place = [event?.location_name, event?.location_city].filter(Boolean).join(', ');
  const maps = directionsUrl(event || {});
  const start = timeLabel(event?.start_date);

  const eyebrow = (() => {
    switch (phase) {
      case 'J7': return t('ticketClock.inAWeek', { defaultValue: 'Dans une semaine' });
      case 'VEILLE': return t('ticketClock.tomorrow', { time: start, defaultValue: 'Demain · {{time}}' });
      case 'JOUR_J': return t('ticketClock.tonight', { time: start, defaultValue: "Aujourd'hui · {{time}}" });
      case 'PORTES': return t('ticketClock.doors', { defaultValue: 'Les portes sont ouvertes' });
      case 'EN_COURS': return t('ticketClock.onNow', { defaultValue: 'En ce moment' });
      default: return '';
    }
  })();

  const openMaps = () => {
    if (maps) Linking.openURL(maps).catch(() => {});
  };

  const showBigButton = phase === 'JOUR_J' || phase === 'PORTES' || phase === 'EN_COURS';
  const isDoors = phase === 'PORTES';

  return (
    <Animated.View
      key={phase}
      entering={FadeIn.duration(Durations.respond)}
      exiting={FadeOut.duration(Durations.exit)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gray200 }]}
    >
      {postureElement}
      <View style={[styles.head, { backgroundColor: accent }]}>
        <Text style={styles.eyebrow} numberOfLines={1}>{eyebrow}</Text>
        {!isDoors && <Text style={styles.title} numberOfLines={2}>{title}</Text>}
      </View>

      <View style={styles.body}>
        {phase === 'J7' && (
          <Text style={[styles.meta, { color: colors.gray600 }]} numberOfLines={2}>
            {[dayLabel(event?.start_date), start, place].filter(Boolean).join(' · ')}
          </Text>
        )}

        {phase === 'VEILLE' && (
          <View style={styles.checklist}>
            {!!place && (
              <Pressable style={styles.checkRow} onPress={openMaps} accessibilityRole="link">
                <Ionicons name="location" size={16} color={accent} />
                <Text style={[styles.checkText, { color: colors.gray700 }]} numberOfLines={1}>{place}</Text>
              </Pressable>
            )}
            {!!start && (
              <View style={styles.checkRow}>
                <Ionicons name="time" size={16} color={accent} />
                <Text style={[styles.checkText, { color: colors.gray700 }]}>
                  {t('ticketClock.startsAt', { time: start, defaultValue: 'Début à {{time}}' })}
                </Text>
              </View>
            )}
            <View style={styles.checkRow}>
              <Ionicons
                name={offlineReady ? 'cloud-done' : 'cloud-outline'}
                size={16}
                color={offlineReady ? colors.success : colors.gray400}
              />
              <Text style={[styles.checkText, { color: colors.gray700 }]}>
                {offlineReady
                  ? t('ticketClock.offlineReady', { defaultValue: 'Billet disponible hors ligne' })
                  : t('ticketClock.offlinePending', { defaultValue: "Ouvrez le billet une fois pour l'avoir hors ligne" })}
              </Text>
            </View>
          </View>
        )}

        {(phase === 'J7' || phase === 'VEILLE') && (
          <ShareTicketCardButton
            eventTitle={title}
            dateLabel={[dayLabel(event?.start_date), start].filter(Boolean).join(' · ')}
            imageUrl={event?.banner_image || event?.display_image || null}
            tint={accent}
            label={t('ticketClock.sayImGoing', { defaultValue: "Dire que j'y vais" })}
          />
        )}

        {showBigButton && (
          <>
            <Animated.View style={pulseStyle}>
            <Pressable
              onPress={onOpenTicket}
              accessibilityRole="button"
              style={[styles.bigButton, isDoors && styles.bigButtonDoors, { backgroundColor: accent }]}
            >
              <Ionicons name="qr-code" size={isDoors ? 24 : 20} color="#FFFFFF" />
              <Text style={[styles.bigButtonText, isDoors && styles.bigButtonTextDoors]}>
                {t('ticketClock.showTicket', { defaultValue: 'Afficher mon billet' })}
              </Text>
            </Pressable>
            </Animated.View>
            {showCompass && (
              <VenueCompass
                venue={venue!}
                position={loc.position!}
                distance={loc.distance!}
                accent={accent}
                reduced={reduced}
              />
            )}
            {!isDoors && !!maps && (
              <Pressable
                onPress={openMaps}
                accessibilityRole="link"
                style={[styles.softButton, { borderColor: colors.gray200, backgroundColor: tintAlpha(accent, 0.06) }]}
              >
                <Ionicons name="navigate" size={16} color={accent} />
                <Text style={[styles.softText, { color: colors.gray800 }]}>
                  {t('ticketClock.directions', { defaultValue: 'Itinéraire' })}
                </Text>
              </Pressable>
            )}
          </>
        )}

        {phase === 'J7' && (
          <Pressable onPress={onOpenTicket} accessibilityRole="button" style={styles.linkRow}>
            <Text style={[styles.link, { color: accent }]}>
              {t('ticketClock.viewTicket', { defaultValue: 'Voir le billet' })}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={accent} />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: Spacing.md },
  head: { paddingHorizontal: 16, paddingVertical: 14, gap: 4 },
  eyebrow: { color: 'rgba(255,255,255,0.9)', fontFamily: FontFamily.semiBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { color: '#FFFFFF', fontFamily: FontFamily.displayBold, fontSize: 19 },
  body: { padding: 14, gap: 10 },
  meta: { fontFamily: FontFamily.medium, fontSize: 13 },
  checklist: { gap: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkText: { flex: 1, fontFamily: FontFamily.medium, fontSize: 13 },
  bigButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14 },
  bigButtonDoors: { paddingVertical: 22 },
  bigButtonText: { color: '#FFFFFF', fontFamily: FontFamily.bold, fontSize: 15 },
  bigButtonTextDoors: { fontSize: 17 },
  softButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, borderWidth: 1, paddingVertical: 10 },
  softText: { fontFamily: FontFamily.semiBold, fontSize: 13 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  link: { fontFamily: FontFamily.semiBold, fontSize: 13 },
});
