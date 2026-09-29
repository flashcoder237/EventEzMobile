/**
 * GradientIcon — icône Ionicons remplie d'un dégradé, avec fondu enchaîné
 * vers la version unie quand `active` passe à false.
 *
 * ⚠️ Coût : MaskedView est rendu en bitmap sur Android. Garder ~10 instances
 * au plus à l'écran et JAMAIS dans les lignes d'une FlatList / FlashList.
 * Le dégradé veut dire « actif » ou « réussi » : pas de dégradé au repos.
 */
import React, { memo, useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../../contexts/ThemeContext';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

export type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface GradientIconProps {
  name: IoniconName;
  size?: number;
  /** Défaut : gradients.aurora (indigo → violet → corail). */
  colors?: readonly string[];
  /** Dégradé visible (true) ou icône unie `color` (false). */
  active?: boolean;
  /** Couleur de l'icône unie (état inactif). Défaut : colors.textSecondary. */
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function GradientIconComponent({
  name,
  size = 22,
  colors: colorsProp,
  active = true,
  color,
  style,
  testID,
}: GradientIconProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const palette = (colorsProp ?? theme.gradients?.aurora ?? ['#4F46E5', '#A855F7', '#FF6B6B']) as readonly string[];
  const base = color ?? theme.colors.textSecondary;
  const on = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    on.value = reduced ? (active ? 1 : 0) : withTiming(active ? 1 : 0, { duration: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduced]);

  const gradStyle = useAnimatedStyle(() => ({ opacity: on.value }));
  const baseStyle = useAnimatedStyle(() => ({ opacity: 1 - on.value }));

  return (
    <View testID={testID} style={[{ width: size, height: size }, style]} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0 }, baseStyle]}>
        <Ionicons name={name} size={size} color={base} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0 }, gradStyle]}>
        <MaskedView
          style={{ width: size, height: size }}
          maskElement={<Ionicons name={name} size={size} color="#000" />}
        >
          <LinearGradient
            colors={palette as unknown as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: size, height: size }}
          />
        </MaskedView>
      </Animated.View>
    </View>
  );
}

export const GradientIcon = memo(GradientIconComponent);
export default GradientIcon;
