/**
 * HeroFlight — « vol » d'une image de carte jusqu'à l'écran de détail (T1),
 * et retour qui rembobine (T2). Catalogue round 2, lot T.
 *
 * Pourquoi fait main : les transitions partagées de Reanimated 4.1 ne sont pas
 * disponibles sur la nouvelle architecture. On mesure donc l'origine et la
 * destination avec `measureInWindow` (même repère des deux côtés : aucune
 * correction de barre d'état à faire) et on anime un FLIP en contre-échelle,
 * UNIQUEMENT en transform + opacité (jamais de width/height).
 *
 * Côté liste :
 *   const token = useHeroToken();
 *   <HeroSlot token={token} heroKey={event.id}> …image… </HeroSlot>
 *   onPressIn → captureHero(token)
 *   navigate('EventDetails', withHeroOrigin({ eventId, … }, event.id, event.slug))
 *
 * Côté détail : `useHeroFlight(route.params.hero)` → styles à poser sur le
 * conteneur externe de la bannière (outer), l'image (inner), et les couches
 * qui apparaissent en fondu (content / overlay). `rewind()` rejoue le vol à
 * l'envers si la carte d'origine est encore montée et visible.
 *
 * Garde-fous : un seul vol à la fois, rien en « Réduire les animations »,
 * rien si la capture est trop ancienne (état de navigation restauré, écran
 * chargé trop tard).
 */
import React, { useCallback, useRef } from 'react';
import { Dimensions, StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Curves, Durations } from '../../../constants/motion';
import { isReducedMotionCached } from '../../../hooks/useReducedMotion';

export interface HeroRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Paramètre de route (primitifs seulement : compatible persistance de navigation). */
export interface HeroParam {
  token: string;
  key: string;
  rect: HeroRect;
  radius: number;
  /** Horodatage de la capture (ms). */
  at: number;
}

interface Slot {
  ref: React.RefObject<View | null>;
  hidden: SharedValue<number>;
  key: string;
  radius: number;
}

const slots = new Map<string, Slot>();
let lastCapture: HeroParam | null = null;
let seq = 0;

/** Capture → navigate : au-delà, le toucher n'est plus celui qui navigue. */
const CAPTURE_MAX_AGE_MS = 1500;
/** Capture → début du vol : au-delà (écran lent, état restauré), pas de vol. */
const FLIGHT_MAX_AGE_MS = 2500;
/** Durée du fondu du reste de l'écran (spec : 180 ms, token `exit`). */
const CONTENT_FADE_MS = Durations.exit;
/** Retour : un peu plus court que l'aller. */
const REWIND_MS = Durations.move + 80;

export function useHeroToken(): string {
  const ref = useRef<string | null>(null);
  if (ref.current === null) {
    seq += 1;
    ref.current = `hero-${seq}`;
  }
  return ref.current;
}

export interface HeroSlotProps {
  token: string;
  /** Identifiant de l'objet (id d'événement, d'inscription…). */
  heroKey: string | number | null | undefined;
  /** Rayon des coins de l'origine (repris au départ du vol). */
  radius?: number;
  /** false : ne s'enregistre pas (ex. couverture vidéo). */
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
}

/** Conteneur de l'image d'origine : mesurable, masquable pendant le vol. */
export function HeroSlot({ token, heroKey, radius = 16, enabled = true, style, children, pointerEvents }: HeroSlotProps) {
  const ref = useRef<View | null>(null);
  const hidden = useSharedValue(0);
  const key = heroKey === null || heroKey === undefined ? '' : String(heroKey);

  React.useEffect(() => {
    if (!enabled || !key) return;
    const slot: Slot = { ref, hidden, key, radius };
    slots.set(token, slot);
    return () => {
      if (slots.get(token) === slot) slots.delete(token);
      hidden.value = 0;
    };
  }, [token, key, radius, enabled, hidden]);

  const hiddenStyle = useAnimatedStyle(() => ({ opacity: hidden.value ? 0 : 1 }));

  return (
    <Animated.View ref={ref as any} collapsable={false} style={[style, hiddenStyle]} pointerEvents={pointerEvents}>
      {children}
    </Animated.View>
  );
}

/** À appeler au `onPressIn` de la carte : mesure l'image dans la fenêtre. */
export function captureHero(token: string): void {
  const slot = slots.get(token);
  const node = slot?.ref.current;
  if (!slot || !node || typeof node.measureInWindow !== 'function') return;
  node.measureInWindow((x, y, width, height) => {
    if (!width || !height) return;
    lastCapture = { token, key: slot.key, rect: { x, y, width, height }, radius: slot.radius, at: Date.now() };
  });
}

/**
 * Consomme la dernière capture si elle correspond à l'un des identifiants
 * (id ou slug) et qu'elle est récente. `undefined` sinon : navigation normale.
 */
export function takeHeroOrigin(...keys: Array<string | number | null | undefined>): HeroParam | undefined {
  const c = lastCapture;
  lastCapture = null;
  if (!c || Date.now() - c.at > CAPTURE_MAX_AGE_MS) return undefined;
  if (!keys.some((k) => k !== null && k !== undefined && String(k) === c.key)) return undefined;
  if (isReducedMotionCached()) return undefined;
  return c;
}

/** Ajoute `hero` aux paramètres de route quand une capture correspond. */
export function withHeroOrigin<P extends object>(
  params: P,
  ...keys: Array<string | number | null | undefined>
): P & { hero?: HeroParam } {
  const hero = takeHeroOrigin(...keys);
  return hero ? { ...params, hero } : params;
}

export function isHeroFresh(hero: HeroParam | null | undefined): hero is HeroParam {
  return !!hero && Date.now() - hero.at < FLIGHT_MAX_AGE_MS && !isReducedMotionCached();
}

/** Options d'écran natif : fondu court quand un vol va jouer. */
export function heroScreenOptions(params: unknown): { animation?: 'fade'; animationDuration?: number } {
  const hero = (params as { hero?: HeroParam } | undefined)?.hero;
  return isHeroFresh(hero) ? { animation: 'fade', animationDuration: 200 } : {};
}

export function setHeroHidden(token: string, hidden: boolean): void {
  const slot = slots.get(token);
  if (slot) slot.hidden.value = hidden ? 1 : 0;
}

/** Délai max d'une mesure : sur Android (Fabric), `measureInWindow` d'une
 *  vue pas encore attachée peut ne JAMAIS rappeler. */
const MEASURE_TIMEOUT_MS = 400;

function measure(node: View | null | undefined): Promise<HeroRect | null> {
  return new Promise((resolve) => {
    if (!node || typeof node.measureInWindow !== 'function') return resolve(null);
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, MEASURE_TIMEOUT_MS);
    node.measureInWindow((x, y, width, height) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(width && height ? { x, y, width, height } : null);
    });
  });
}

/** Au-delà, l'écran d'arrivée se dévoile même si le vol n'a pas pu démarrer. */
const REVEAL_FAILSAFE_MS = 900;

/** Re-mesure l'origine si la carte est encore montée (retour). */
export function measureHeroToken(token: string): Promise<HeroRect | null> {
  return measure(slots.get(token)?.ref.current);
}

export interface HeroFlightOptions {
  /** Échelle identique sur les deux axes (billet : pas de contre-échelle d'image). */
  uniform?: boolean;
  /** Défilement de l'écran de destination : compense le rebond pendant le retour. */
  scrollY?: SharedValue<number>;
  /** Distance du glissement du contenu à l'arrivée (px). */
  contentShift?: number;
  /** Rayon des coins de la destination au repos (le style animé le pilote). */
  restRadius?: number;
}

export interface HeroFlightResult {
  /** Un vol a lieu (décidé une fois au montage). */
  flying: boolean;
  outerRef: React.RefObject<View | null>;
  onOuterLayout: () => void;
  /** Conteneur externe : translate + scale + coins. */
  outerStyle: ReturnType<typeof useAnimatedStyle>;
  /** Image : contre-échelle (jamais déformée). */
  innerStyle: ReturnType<typeof useAnimatedStyle>;
  /** Reste de l'écran : fondu + glissement. */
  contentStyle: ReturnType<typeof useAnimatedStyle>;
  /** Couches posées sur l'image (dégradé, boutons) : fondu. */
  overlayStyle: ReturnType<typeof useAnimatedStyle>;
  /** Rejoue le vol à l'envers. true si l'animation a eu lieu. */
  rewind: () => Promise<boolean>;
  /** Démasque la carte d'origine (à l'appel de goBack). */
  release: () => void;
}

export function useHeroFlight(hero: HeroParam | null | undefined, options: HeroFlightOptions = {}): HeroFlightResult {
  const { uniform = false, scrollY, contentShift = 12, restRadius = 0 } = options;
  // Décidé UNE fois au montage : un re-render ne relance jamais de vol.
  const flyingRef = useRef<boolean | null>(null);
  if (flyingRef.current === null) flyingRef.current = isHeroFresh(hero);
  const flying = flyingRef.current;

  const p = useSharedValue(flying ? 0 : 1);
  const ready = useSharedValue(flying ? 0 : 1);
  const content = useSharedValue(flying ? 0 : 1);
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);
  const radius = useSharedValue(0);
  const scroll0 = useSharedValue(0);
  const outerRef = useRef<View | null>(null);
  const started = useRef(false);
  const unmounted = useRef(false);
  const rewinding = useRef(false);

  // Filet de sécurité : quelle que soit la sortie (retour système, geste,
  // navigation interrompue en plein vol, mesure tardive), la carte d'origine
  // ne doit jamais rester masquée une fois cet écran démonté.
  // Filet anti-« écran figé » : en vol, TOUT le contenu de l'écran d'arrivée
  // part à opacité 0 et n'apparaît qu'une fois la destination mesurée. Si la
  // bannière n'est jamais posée (données en erreur, rendu conditionnel) ou si
  // la mesure ne rappelle jamais, l'écran restait vide et semblait bloqué.
  React.useEffect(() => {
    if (!flying) return;
    const timer = setTimeout(() => {
      if (unmounted.current || ready.value === 1) return;
      started.current = true;
      ready.value = 1;
      p.value = 1;
      content.value = 1;
      if (hero) setHeroHidden(hero.token, false);
    }, REVEAL_FAILSAFE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    unmounted.current = false;
    return () => {
      unmounted.current = true;
      if (hero) setHeroHidden(hero.token, false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setup = useCallback(
    (origin: HeroRect, dest: HeroRect, r: number) => {
      const ox = origin.x + origin.width / 2;
      const oy = origin.y + origin.height / 2;
      const tx = dest.x + dest.width / 2;
      const ty = dest.y + dest.height / 2;
      dx.value = ox - tx;
      dy.value = oy - ty;
      const scx = origin.width / dest.width;
      const scy = origin.height / dest.height;
      sx.value = scx;
      sy.value = uniform ? scx : scy;
      radius.value = r;
      scroll0.value = scrollY ? scrollY.value : 0;
    },
    [dx, dy, sx, sy, radius, scroll0, scrollY, uniform],
  );

  const onOuterLayout = useCallback(() => {
    if (!flying || started.current || !hero) return;
    started.current = true;
    measure(outerRef.current).then((dest) => {
      if (unmounted.current) return;
      // Destination montée trop tard (données lentes) : un vol depuis une
      // carte touchée il y a plusieurs secondes serait incompréhensible.
      if (!dest || Date.now() - hero.at > FLIGHT_MAX_AGE_MS) {
        ready.value = 1;
        p.value = 1;
        content.value = 1;
        return;
      }
      setup(hero.rect, dest, hero.radius);
      setHeroHidden(hero.token, true);
      ready.value = 1;
      p.value = withTiming(1, { duration: Durations.inform, easing: Curves.settle }, (finished) => {
        // La carte d'origine redevient visible derrière l'écran : un retour
        // par geste natif (sans rembobinage) la retrouve à sa place.
        if (finished) runOnJS(setHeroHidden)(hero.token, false);
      });
      content.value = withDelay(40, withTiming(1, { duration: CONTENT_FADE_MS, easing: Curves.out }));
    });
  }, [flying, hero, setup, ready, p, content]);

  const outerStyle = useAnimatedStyle(() => {
    const q = 1 - p.value;
    const cx = 1 + (sx.value - 1) * q;
    const cy = 1 + (sy.value - 1) * q;
    const comp = scrollY ? (scrollY.value - scroll0.value) * q : 0;
    return {
      opacity: ready.value,
      // Coins : ceux de la carte au départ (compensés de l'échelle), ceux de
      // la destination à l'arrivée.
      borderRadius: restRadius + (radius.value / Math.max(0.05, (cx + cy) / 2) - restRadius) * q,
      transform: [
        { translateX: dx.value * q },
        { translateY: dy.value * q + comp },
        { scaleX: cx },
        { scaleY: cy },
      ],
    };
  });

  const innerStyle = useAnimatedStyle(() => {
    if (uniform) return { transform: [{ scaleX: 1 }, { scaleY: 1 }] };
    const q = 1 - p.value;
    const cx = 1 + (sx.value - 1) * q;
    const cy = 1 + (sy.value - 1) * q;
    const s = Math.max(cx, cy);
    return { transform: [{ scaleX: s / Math.max(0.05, cx) }, { scaleY: s / Math.max(0.05, cy) }] };
  });

  const contentStyle = useAnimatedStyle(() => ({
    opacity: content.value,
    transform: [{ translateY: contentShift * (1 - content.value) }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({ opacity: content.value }));

  const rewind = useCallback(async (): Promise<boolean> => {
    // Pas d'aller → pas de retour rembobiné (écran ouvert sans vol).
    if (!hero || !flying || isReducedMotionCached()) return false;
    const [origin, dest] = await Promise.all([measureHeroToken(hero.token), measure(outerRef.current)]);
    // Mesure arrivée après le démontage : ne JAMAIS re-masquer la carte.
    if (unmounted.current || !origin || !dest) return false;
    const { height } = Dimensions.get('window');
    // Carte d'origine hors écran (liste défilée entre-temps) ou bannière déjà
    // sortie par le haut : retour par défaut.
    if (origin.y + origin.height < 0 || origin.y > height || dest.y + dest.height < 0) return false;
    setup(origin, dest, hero.radius);
    rewinding.current = true;
    setHeroHidden(hero.token, true);
    content.value = withTiming(0, { duration: 120, easing: Curves.out });
    const token = hero.token;
    return new Promise<boolean>((resolve) => {
      const done = () => {
        rewinding.current = false;
        // L'image volante est posée sur la carte : on la rend visible.
        setHeroHidden(token, false);
        resolve(true);
      };
      p.value = withTiming(0, { duration: REWIND_MS, easing: Curves.inOut }, () => {
        runOnJS(done)();
      });
    });
  }, [hero, flying, setup, content, p]);

  const release = useCallback(() => {
    // Pendant le rembobinage, c'est sa fin (ou le démontage) qui démasque :
    // démasquer tout de suite doublerait l'image le temps du vol.
    if (hero && !rewinding.current) setHeroHidden(hero.token, false);
  }, [hero]);

  return { flying, outerRef, onOuterLayout, outerStyle, innerStyle, contentStyle, overlayStyle, rewind, release };
}
