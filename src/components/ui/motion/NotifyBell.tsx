/**
 * NotifyBell — la cloche de notifications, en une seule primitive (M6).
 *
 * Avant : balancement + pulsation du badge + vibration s'empilaient, en
 * double (l'en-tête compact, invisible, jouait aussi), et le badge sautait
 * même quand on LISAIT une notification. Désormais :
 *   - uniquement à la HAUSSE, et après la fenêtre de chargement (le passage
 *     0 → valeur serveur au lancement ne compte pas) ;
 *   - 3 demi-oscillations sur 500 ms autour du sommet de la cloche ;
 *   - le chiffre du badge roule (RollingText), sans « pop » d'échelle ;
 *   - `paused` : rien ne joue (en-tête masqué, écran caché) ;
 *   - vibration légère plafonnée à une toutes les 10 s pour toute l'app.
 * Réduire les animations : pas de balancement, le chiffre change sec.
 */
import React, { memo, useEffect, useRef } from 'react';
import { StyleProp, TextStyle, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { haptics } from '../../../utils/haptics';
import { Curves, Frequency } from '../../../constants/motion';
import { RollingText } from './RollingText';
import { useMotionGate, useSettled } from './useMotionGate';

export interface NotifyBellProps {
  count: number;
  paused?: boolean;
  iconSize?: number;
  iconColor: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  /** Conteneur du badge (position absolue autour de l'icône). */
  badgeWrapStyle?: StyleProp<ViewStyle>;
  /** Pastille du badge (couleur, bordure, taille). */
  badgeStyle?: StyleProp<ViewStyle>;
  badgeTextStyle?: StyleProp<TextStyle>;
  max?: number;
  haptic?: boolean;
}

const SWING_DEG = 12;

function NotifyBellComponent({
  count,
  paused = false,
  iconSize = 18,
  iconColor,
  iconName = 'notifications-outline',
  badgeWrapStyle,
  badgeStyle,
  badgeTextStyle,
  max = 99,
  haptic = true,
}: NotifyBellProps) {
  const { canAnimate, appActive, focused } = useMotionGate();
  const settled = useSettled();
  const rot = useSharedValue(0);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    const before = prev.current;
    prev.current = count;
    if (before === null || count <= before || !settled()) return;
    if (paused || !appActive || !focused) return;
    if (haptic) haptics.throttled('light', Frequency.informHapticThrottleMs, 'notify-bell');
    if (!canAnimate) return;
    // 3 demi-oscillations, 500 ms au total, amorties.
    rot.value = withSequence(
      withTiming(SWING_DEG, { duration: 110, easing: Curves.out }),
      withTiming(-SWING_DEG * 0.6, { duration: 150, easing: Curves.inOut }),
      withTiming(SWING_DEG * 0.3, { duration: 130, easing: Curves.inOut }),
      withTiming(0, { duration: 110, easing: Curves.out }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const swing = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const label = count > max ? `${max}+` : String(count);

  return (
    <>
      <Animated.View style={[{ transformOrigin: '50% 8%' } as ViewStyle, swing]}>
        <Ionicons name={iconName} size={iconSize} color={iconColor} />
      </Animated.View>
      {count > 0 && (
        <View style={badgeWrapStyle} pointerEvents="none">
          <View style={badgeStyle}>
            <RollingText value={label} style={badgeTextStyle} />
          </View>
        </View>
      )}
    </>
  );
}

export const NotifyBell = memo(NotifyBellComponent);
export default NotifyBell;
