/**
 * TourOverlay — spotlight + coachmark.
 *
 * Rendu au top de l'arbre. Quand un step est actif :
 * 1. Mesure la position de la target via measureInWindow()
 * 2. Dessine 4 vues sombres autour de la box (top/right/bottom/left) =
 *    "spotlight" qui laisse un trou clair sur la target
 * 3. Affiche une bulle (coachmark) avec eyebrow + title + body + step counter
 *    + CTA "Suivant"/"Compris" + skip
 *
 * Pattern editorial (warm canvas, indigo + coral) :
 *   - Backdrop sombre (rgba(15,15,26,0.78))
 *   - Spotlight border coral 2px avec ombre coral diffuse
 *   - Bulle blanche/dark avec radius 18, ombre douce
 *   - Eyebrow uppercase coral 1.5 letter-spacing
 *   - Title displayBold 18-20px
 *   - Body regular 13-14
 *   - Step counter "01 / 04" en coin top-right de la bulle
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
  AccessibilityInfo,
} from 'react-native';
import Svg, { Defs, Mask, Rect as SvgRect, Circle as SvgCircle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTour, TourStep, TourTargetMeasurement } from './FeatureTourContext';
import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, BorderRadius, Spacing } from '../../constants/theme';

const COACHMARK_GAP = 16; // espace minimal entre le spotlight et la bulle
// Quand placement='top' (dock au bas de l'ecran), on remonte la bulle d'un
// extra vers le centre — plus aere, plus equilibre visuellement.
const COACHMARK_LIFT_TOP = 80;

export default function TourOverlay() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { steps, currentIndex, next, back, skip } = useTour();

  // Dimensions RÉACTIVES (rotation / split-screen / iPad multitasking) —
  // contrairement à Dimensions.get() figé au chargement du module, qui
  // rendait le placement faux après une rotation. Aligné sur la tab bar.
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const COACHMARK_WIDTH = Math.min(SCREEN_WIDTH - 32, 360);

  const step: TourStep | undefined = steps[currentIndex];

  // Measure target on every step change
  const [measurement, setMeasurement] = useState<TourTargetMeasurement | null>(null);
  const [measureError, setMeasureError] = useState(false);
  // True dès qu'une mesure valide a été obtenue pour le step courant.
  const hasMeasuredRef = useRef(false);

  // Reanimated shared values
  const overlayOpacity = useSharedValue(0);
  const coachmarkY = useSharedValue(20);
  const coachmarkOpacity = useSharedValue(0);
  // Pulse via opacity uniquement (PAS de scale) — un scale ferait sortir
  // le border coral du trou (les 4 backdrops sont a taille fixe) → effet
  // "decentre" desagreable.
  const pulseOpacity = useSharedValue(0.6);

  // Get target ref from context
  const tourCtx = useTour();

  const measureTarget = useCallback(() => {
    if (!step) return;
    const ref = tourCtx.__getRef(step.id);
    // Cible pas encore montée (montage tardif, navigation, composant lazy) →
    // le polling ci-dessous réessaiera au prochain tick.
    if (!ref || !ref.current) return;

    // Utiliser `measure` (PAS measureInWindow) car son `pageX/pageY` est
    // relatif au RN root view — meme coordinate system que notre overlay
    // absolute. measureInWindow renvoie des coordonnees window qui peuvent
    // differer du root view sur Android (status bar offset).
    (ref.current as any).measure(
      (
        _x: number,
        _y: number,
        width: number,
        height: number,
        pageX: number,
        pageY: number,
      ) => {
        // Layout pas encore posé (0x0) → on réessaiera au prochain tick.
        if (width === 0 && height === 0) return;
        hasMeasuredRef.current = true;
        setMeasureError(false);
        // Bail-out si rien n'a bougé : évite un re-render inutile à chaque
        // tick de polling quand la cible est statique.
        setMeasurement((prev) =>
          prev &&
          prev.x === pageX &&
          prev.y === pageY &&
          prev.width === width &&
          prev.height === height
            ? prev
            : { x: pageX, y: pageY, width, height },
        );
      },
    );
  }, [step, tourCtx]);

  // Mesure en POLLING tant que le step est affiché. Résout :
  //  (#1) cible pas encore montée au lancement → on attend qu'elle apparaisse ;
  //  (#3) cible qui se déplace (scroll) → le spotlight la suit.
  useEffect(() => {
    setMeasurement(null);
    setMeasureError(false);
    hasMeasuredRef.current = false;
    // Polling de re-mesure. On ARRÊTE dès qu'une position valide est obtenue,
    // SAUF si le step demande `follow` (cible scrollable/mobile) — evite un
    // measure() natif toutes les 150ms pour rien sur les cibles statiques
    // (tabs, boutons, la grande majorite des steps).
    const interval = setInterval(() => {
      measureTarget();
      if (hasMeasuredRef.current && !step?.follow) {
        clearInterval(interval);
      }
    }, 150);
    // Filet de sécurité : si rien n'a pu être mesuré après 6s, on passe en
    // mode dégradé (bulle centrée + hint) au lieu de rester bloqué. Le
    // polling continue : si la cible apparaît plus tard, on récupère.
    const errorTimer = setTimeout(() => {
      if (!hasMeasuredRef.current) setMeasureError(true);
    }, 6000);
    return () => {
      clearInterval(interval);
      clearTimeout(errorTimer);
    };
  }, [currentIndex, measureTarget]);

  // Entrance animation
  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 250 });
    coachmarkOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
    coachmarkY.value = withSpring(0, { damping: 18, stiffness: 220 });
  }, []);

  // Pulse the spotlight border — opacity only, NEVER scale.
  // Scale would shift the border outside the cutout hole → looks off-center.
  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1,
      false,
    );
  }, []);

  // Coachmark bounce on step change
  useEffect(() => {
    coachmarkY.value = 12;
    coachmarkOpacity.value = 0;
    coachmarkY.value = withSpring(0, { damping: 18, stiffness: 220 });
    coachmarkOpacity.value = withTiming(1, { duration: 250 });
    // A11y : annonce le contenu du step aux lecteurs d'écran (VoiceOver /
    // TalkBack), sinon la bulle apparaît en silence.
    const s = steps[currentIndex];
    if (s) {
      AccessibilityInfo.announceForAccessibility(`${s.title}. ${s.body}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const coachmarkStyle = useAnimatedStyle(() => ({
    opacity: coachmarkOpacity.value,
    transform: [{ translateY: coachmarkY.value }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  if (!step) return null;

  const padding = step.padding ?? 8;
  const isLastStep = currentIndex === steps.length - 1;
  const isFirstStep = currentIndex === 0;

  // Spotlight box (with padding)
  let spotX = 0,
    spotY = 0,
    spotW = 0,
    spotH = 0;
  if (measurement) {
    spotX = measurement.x - padding;
    spotY = measurement.y - padding;
    spotW = measurement.width + padding * 2;
    spotH = measurement.height + padding * 2;
  }

  // Coachmark placement: above or below spotlight
  // 'auto' picks whichever side has more space
  const placement: 'top' | 'bottom' = (() => {
    if (step.placement === 'top') return 'top';
    if (step.placement === 'bottom') return 'bottom';
    if (!measurement) return 'bottom';
    const spaceAbove = spotY;
    const spaceBelow = SCREEN_HEIGHT - (spotY + spotH);
    return spaceAbove > spaceBelow ? 'top' : 'bottom';
  })();

  // Coachmark X — centered horizontally on screen
  const coachmarkX = (SCREEN_WIDTH - COACHMARK_WIDTH) / 2;

  // Coachmark Y — anchor cleanly relative to the spotlight regardless of
  // bubble's actual height (which varies per step content).
  // - placement='top': anchor by `bottom` so the bubble's bottom edge sits
  //   exactly GAP pixels above the spotlight.
  // - placement='bottom': anchor by `top` so the bubble's top edge sits
  //   exactly GAP pixels below the spotlight.
  let coachmarkTop: number | undefined;
  let coachmarkBottom: number | undefined;
  if (measurement) {
    if (placement === 'top') {
      // On remonte la bulle vers le centre : COACHMARK_LIFT_TOP en plus du gap
      // = la bulle flotte au milieu de la zone libre au-dessus du spotlight,
      // pas collee juste au-dessus.
      coachmarkBottom = SCREEN_HEIGHT - spotY + COACHMARK_GAP + COACHMARK_LIFT_TOP;
    } else {
      coachmarkTop = spotY + spotH + COACHMARK_GAP;
    }
  } else {
    coachmarkTop = SCREEN_HEIGHT / 2 - 100;
  }

  const isCircle = step.shape === 'circle';
  const spotRadius = isCircle ? Math.min(spotW, spotH) / 2 : 14;

  // ─── Render ─────────────────────────────────────────────────────────────
  // Overlay absolute (PAS de Modal) pour garder le meme coordinate system que
  // le reste de l'app. Sinon measureInWindow vs Modal divergent sur Android
  // (status bar offset notamment).
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        { zIndex: 9999, elevation: 9999 },
        overlayStyle,
      ]}
      pointerEvents="box-none"
      // A11y : empêche VoiceOver/TalkBack de lire le contenu situé DERRIÈRE le
      // voile pendant le tour (le focus reste sur la bulle).
      accessibilityViewIsModal
    >
        {/* Voile sombre avec trou (spotlight) — cutout via masque SVG */}
        {measurement ? (
          <>
            {/* Tap EN DEHORS de la bulle = arrêter le tour. Le Pressable ENGLOBE
                le SVG du voile (au lieu d'être un frère séparé) : sur iOS, un
                Pressable frère sous un SVG en absoluteFill ne recevait pas
                toujours les touches → le tap ne fermait pas le tour. La bulle,
                rendue APRÈS ce bloc, reste au-dessus donc un tap dessus ne skip
                pas. */}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={skip}
              accessibilityRole="button"
              accessibilityLabel={t('componentsTour.skip')}
            >
            {/* Cutout via masque SVG = VRAI trou de la bonne forme. blanc = zone
                sombre, noir = trou. */}
            <Svg
              width={SCREEN_WIDTH}
              height={SCREEN_HEIGHT}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              <Defs>
                <Mask id="tourSpotlight">
                  <SvgRect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="#fff" />
                  {isCircle ? (
                    <SvgCircle
                      cx={spotX + spotW / 2}
                      cy={spotY + spotH / 2}
                      r={Math.min(spotW, spotH) / 2}
                      fill="#000"
                    />
                  ) : (
                    <SvgRect
                      x={spotX}
                      y={spotY}
                      width={spotW}
                      height={spotH}
                      rx={spotRadius}
                      ry={spotRadius}
                      fill="#000"
                    />
                  )}
                </Mask>
              </Defs>
              <SvgRect
                x={0}
                y={0}
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT}
                fill="#0F0F1A"
                fillOpacity={0.78}
                mask="url(#tourSpotlight)"
              />
            </Svg>

            {/* Border coral + glow autour du trou (pulse en opacité) */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.spotlight,
                {
                  top: spotY,
                  left: spotX,
                  width: spotW,
                  height: spotH,
                  borderRadius: spotRadius,
                  borderColor: colors.accent,
                  shadowColor: colors.accent,
                },
                pulseStyle,
              ]}
            />
            </Pressable>
          </>
        ) : (
          /* Fallback pendant la mesure : voile plein — tap hors bulle = arrêt du tour */
          <Pressable style={[styles.backdrop, StyleSheet.absoluteFillObject]} onPress={skip} />
        )}

        {/* Coachmark bubble — ancrage par `top` OU `bottom` selon placement */}
        <Animated.View
          style={[
            styles.coachmark,
            {
              left: coachmarkX,
              ...(coachmarkTop !== undefined ? { top: coachmarkTop } : {}),
              ...(coachmarkBottom !== undefined ? { bottom: coachmarkBottom } : {}),
              width: COACHMARK_WIDTH,
              backgroundColor: isDark ? colors.card : '#FDFBF7',
              borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.04)',
            },
            coachmarkStyle,
          ]}
        >
          {/* Step counter */}
          <View style={styles.coachmarkTopRow}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>{step.eyebrow}</Text>
            <Text style={[styles.stepCounter, { color: colors.gray400 }]}>
              {String(currentIndex + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
            </Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{step.title}</Text>

          {/* Body */}
          <Text style={[styles.body, { color: colors.gray600 }]}>{step.body}</Text>

          {measureError && (
            <Text style={[styles.errorHint, { color: colors.gray400 }]}>
              {t('componentsTour.errorHint')}
            </Text>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            {!isFirstStep && (
              <TouchableOpacity
                onPress={back}
                style={styles.backBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={16} color={colors.gray500} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={skip}
              style={styles.skipBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.skipText, { color: colors.gray500 }]}>{t('componentsTour.skip')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={next}
              style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaText}>{isLastStep ? t('componentsTour.got_it') : t('componentsTour.next')}</Text>
              <Ionicons
                name={isLastStep ? 'checkmark' : 'arrow-forward'}
                size={14}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    backgroundColor: 'rgba(15,15,26,0.78)',
  },
  spotlight: {
    position: 'absolute',
    borderWidth: 2,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  coachmark: {
    position: 'absolute',
    padding: Spacing.md + 2,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  coachmarkTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  stepCounter: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 20,
    letterSpacing: -0.5,
    lineHeight: 24,
    marginBottom: 8,
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },
  errorHint: {
    fontFamily: FontFamily.regular,
    fontStyle: 'italic',
    fontSize: 11,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  skipBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    flex: 1,
  },
  skipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
  },
  ctaText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: '#fff',
    letterSpacing: 0.2,
  },
});
