/**
 * ScrollFade — dégradés de débordement PROPORTIONNELS à la marge restante.
 *
 * Pourquoi : un dégradé de débordement statique est affiché en permanence,
 * donc il n'informe de rien — il ne dit pas s'il RESTE du contenu. Ici son
 * opacité suit la marge de défilement : il naît quand on commence à défiler et
 * il DISPARAÎT quand on atteint le bout. On obtient un indicateur de fin de
 * liste gratuit, qui lève l'ambiguïté « la liste est finie » / « le rendu est
 * coupé ». Dans un fil de messages, savoir qu'on est bien au dernier message
 * compte.
 *
 * C'est l'OPACITÉ qui est animée, pas la hauteur : animer une hauteur est une
 * propriété de mise en page (règle projet), et sur une liste qui défile vite
 * ce serait aussi un coût de layout par image. Les deux couches sont en
 * position absolue avec `pointerEvents="none"` : elles ne poussent aucun
 * voisin et n'interceptent aucun geste.
 *
 * Usage :
 *   const fade = useScrollFade();
 *   <View style={{ flex: 1 }}>
 *     <FlatList {...fade.scrollProps} … />
 *     <ScrollFade {...fade.fadeProps} color={colors.background} />
 *   </View>
 */
import { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/** Hauteur d'un dégradé, en points. */
export const SCROLL_FADE_HEIGHT = 48;

/**
 * Marge (en points) au-delà de laquelle le dégradé est pleinement opaque.
 * En dessous, l'opacité est proportionnelle : le dégradé s'efface en douceur
 * à l'approche du bord, au lieu de disparaître d'un coup.
 */
const FULL_AT = 48;

/** Durée du lissage d'opacité. Court : l'indicateur doit suivre le doigt. */
const FADE_MS = 90;

export interface ScrollFadeHandles {
  scrollProps: {
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    onContentSizeChange: (w: number, h: number) => void;
    onLayout: (event: { nativeEvent: { layout: { height: number } } }) => void;
    scrollEventThrottle: number;
  };
  fadeProps: {
    topOpacity: SharedValue<number>;
    bottomOpacity: SharedValue<number>;
  };
}

/**
 * Mesure le défilement et expose deux opacités partagées.
 * Les valeurs vivent dans des SharedValue : aucun rendu React par image.
 */
export function useScrollFade(): ScrollFadeHandles {
  const topOpacity = useSharedValue(0);
  const bottomOpacity = useSharedValue(0);
  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);
  const reduced = useReducedMotion();

  const apply = useCallback(
    (target: SharedValue<number>, value: number) => {
      // En mouvement réduit, l'indicateur RESTE (c'est de l'information, pas
      // de la décoration) : seul le lissage disparaît.
      target.value = reduced
        ? value
        : withTiming(value, { duration: FADE_MS, easing: Easing.linear });
    },
    [reduced],
  );

  const recompute = useCallback(
    (scrollY: number) => {
      const remainingTop = Math.max(0, scrollY);
      const remainingBottom = Math.max(
        0,
        contentHeight.current - viewportHeight.current - scrollY,
      );
      apply(topOpacity, Math.min(1, remainingTop / FULL_AT));
      apply(bottomOpacity, Math.min(1, remainingBottom / FULL_AT));
    },
    [apply, topOpacity, bottomOpacity],
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      // L'événement porte les trois mesures : on les prend au vol plutôt que
      // de dépendre de l'ordre d'arrivée de onLayout / onContentSizeChange.
      contentHeight.current = contentSize.height;
      viewportHeight.current = layoutMeasurement.height;
      recompute(contentOffset.y);
    },
    [recompute],
  );

  // Le contenu change sans qu'on défile (chargement, nouveau message, filtre) :
  // sans ces deux rappels, le dégradé mentirait jusqu'au prochain défilement.
  const onContentSizeChange = useCallback(
    (_w: number, h: number) => {
      contentHeight.current = h;
      recompute(0);
    },
    [recompute],
  );

  const onLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      viewportHeight.current = event.nativeEvent.layout.height;
      recompute(0);
    },
    [recompute],
  );

  return useMemo(
    () => ({
      scrollProps: { onScroll, onContentSizeChange, onLayout, scrollEventThrottle: 16 },
      fadeProps: { topOpacity, bottomOpacity },
    }),
    [onScroll, onContentSizeChange, onLayout, topOpacity, bottomOpacity],
  );
}

export interface ScrollFadeProps {
  topOpacity: SharedValue<number>;
  bottomOpacity: SharedValue<number>;
  /** Couleur de fond de la liste : le dégradé part d'elle vers le transparent. */
  color: string;
  height?: number;
  /** Décalage haut (en-tête collant au-dessus de la liste). */
  topInset?: number;
  /** Décalage bas (barre de saisie, tab bar). */
  bottomInset?: number;
}

export default function ScrollFade({
  topOpacity,
  bottomOpacity,
  color,
  height = SCROLL_FADE_HEIGHT,
  topInset = 0,
  bottomInset = 0,
}: ScrollFadeProps) {
  const topStyle = useAnimatedStyle(() => ({ opacity: topOpacity.value }));
  const bottomStyle = useAnimatedStyle(() => ({ opacity: bottomOpacity.value }));

  // `transparent` plutôt qu'une couleur alpha : sur Android, un dégradé vers
  // `#RRGGBB00` passe par du gris sur certains pilotes.
  const solidToClear = [color, 'transparent'] as const;

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[styles.layer, { top: topInset, height }, topStyle]}
      >
        <LinearGradient colors={solidToClear} style={StyleSheet.absoluteFillObject} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[styles.layer, { bottom: bottomInset, height }, bottomStyle]}
      >
        <LinearGradient
          colors={solidToClear}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});

export { ScrollFade };
