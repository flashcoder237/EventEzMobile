/**
 * VenueCompass — boussole « jour J » de la carte billet (round 3, G9).
 *
 * Une flèche teintée pointe vers le lieu, avec la distance. Un cran
 * « sélection » quand on est aligné (±12° tenus 500 ms, au plus une fois par
 * 10 s). Cap peu fiable → « Étalonnez la boussole ». Le parent ne monte ce
 * composant que si : jour J ou portes, < 3 km, permission DÉJÀ accordée,
 * écran affiché, app au premier plan, pas encore arrivé (< 40 m) — démonté,
 * le capteur de cap s'arrête.
 *
 * Animations réduites : la flèche tourne par paliers de 15°, sans transition.
 * Lecteur d'écran : « Le lieu est à X m, à N heures ».
 */
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily } from '../../constants/theme';
import haptics from '../../utils/haptics';
import {
  bearingDeg,
  clockHour,
  formatDistance,
  headingIsPoor,
  initialAlign,
  LatLng,
  quantize,
  relativeAngle,
  stepAlign,
  VENUE,
} from '../../lib/utils/venueCompass';
import { tintAlpha } from '../../lib/utils/themeTint';

export interface VenueCompassProps {
  venue: LatLng;
  position: LatLng;
  distance: number;
  accent: string;
  reduced: boolean;
}

export default function VenueCompass({ venue, position, distance, accent, reduced }: VenueCompassProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const rotation = useSharedValue(0);
  const [hour, setHour] = useState<number | null>(null);
  const [poor, setPoor] = useState(false);
  const posRef = useRef(position);
  posRef.current = position;
  const align = useRef(initialAlign());
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  useEffect(() => {
    let alive = true;
    let sub: Location.LocationSubscription | null = null;
    Location.watchHeadingAsync((h) => {
      if (!alive) return;
      const heading = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
      if (!Number.isFinite(heading)) return;
      setPoor(headingIsPoor(Platform.OS, h.accuracy));
      const rel = relativeAngle(bearingDeg(posRef.current, venue), heading);
      if (reducedRef.current) {
        rotation.value = quantize(rel, VENUE.REDUCED_STEP_DEG);
      } else {
        // Chemin le plus court depuis l'angle courant (pas de tour complet à ±180°).
        const cur = rotation.value;
        const target = cur + relativeAngle(rel, cur);
        rotation.value = withTiming(target, { duration: 120 });
      }
      setHour((prev) => {
        const next = clockHour(rel);
        return prev === next ? prev : next;
      });
      const r = stepAlign(align.current, rel, Date.now());
      align.current = r.state;
      if (r.fire) haptics.selection();
    })
      .then((s) => {
        if (alive) sub = s;
        else s.remove();
      })
      .catch(() => {});
    return () => {
      alive = false;
      sub?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue.lat, venue.lng]);

  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const dist = formatDistance(distance, i18n.language || 'fr');
  const a11y =
    hour != null
      ? t('ticketClock.compassA11y', { distance: dist, hour, defaultValue: 'Le lieu est à {{distance}}, à {{hour}} heures' })
      : t('ticketClock.compassA11yNoHeading', { distance: dist, defaultValue: 'Le lieu est à {{distance}}' });

  return (
    <View
      style={[styles.row, { backgroundColor: tintAlpha(accent, 0.06), borderColor: colors.gray200 }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={a11y}
    >
      <View style={[styles.dial, { borderColor: tintAlpha(accent, 0.35) }]}>
        <Animated.View style={arrowStyle}>
          <Ionicons name="navigate" size={20} color={accent} style={{ transform: [{ rotate: '-45deg' }] }} />
        </Animated.View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.distance, { color: colors.gray900 }]}>{dist}</Text>
        <Text style={[styles.hint, { color: colors.gray500 }]} numberOfLines={1}>
          {poor
            ? t('ticketClock.compassCalibrate', { defaultValue: 'Étalonnez la boussole : dessinez un 8 avec le téléphone' })
            : t('ticketClock.compassHint', { defaultValue: 'Suivez la flèche jusqu’au lieu' })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, padding: 10 },
  dial: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  distance: { fontFamily: FontFamily.bold, fontSize: 15, fontVariant: ['tabular-nums'] },
  hint: { fontFamily: FontFamily.medium, fontSize: 12 },
});
