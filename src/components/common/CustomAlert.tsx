/**
 * CustomAlert — Editorial Bottom Sheet
 *
 * ⚠️ RÉSERVÉ AUX INTERRUPTIONS LÉGITIMES. Une modale bloquante ne se justifie
 * que si l'une de ces conditions est vraie :
 *   1. L'utilisateur doit CHOISIR et l'app ne peut pas continuer sans réponse.
 *   2. L'action est DESTRUCTIVE et irréversible.
 *   3. Le message engage de l'ARGENT ou du JURIDIQUE (paiement, CGU, payout).
 *   4. Une erreur BLOQUE le flux et doit être acquittée.
 *
 * Sinon → `useFeedback().toastSuccess/toastError` (discret, non bloquant) ou un
 * message inline sous le champ. Cf. `src/contexts/FeedbackContext.tsx`.
 *
 * ── Poids visuel (prop `weight`) ────────────────────────────────────────────
 * Le squelette s'adapte à la gravité au lieu d'être identique partout — c'est
 * le retour testeur « ces pop-ups font trop template » :
 *   • `compact`  : info/succès simple — icône inline, titre 17px, pas de
 *                  watermark, backdrop léger.
 *   • `standard` : warning/confirm — icône 44px centrée, titre 22px.
 *   • `critical` : destructif/argent — plein traitement éditorial (ring héro
 *                  76px, watermark, pill gradient), backdrop le plus dense,
 *                  fermeture au tap sur le fond DÉSACTIVÉE.
 *
 * L'opacité du backdrop porte elle-même la gravité : elle se ressent avant
 * même d'avoir lu un mot.
 *
 * Animations (Reanimated) : spring d'entrée, fade du backdrop, cascade des
 * anneaux d'icône — le tout neutralisé sous `prefers-reduced-motion`.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Colors,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
  TOUCH_OPACITY,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { FORM_MAX } from '../../constants/layout';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

/** Poids visuel du sheet. Cf. doc d'en-tête. */
export type AlertWeight = 'compact' | 'standard' | 'critical';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onClose: () => void;
  /** Force le poids visuel. Par défaut déduit du `type` et du nb de boutons. */
  weight?: AlertWeight;
  /**
   * Eyebrow contextuel (« PAIEMENT », « BILLETTERIE »…). Remplace le libellé
   * générique du type. Un eyebrow qui répète le titre (« ERREUR » au-dessus de
   * « Erreur ») n'apporte rien : préférer le domaine d'origine du message.
   */
  domain?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

/**
 * Accent par type, résolu depuis le THÈME (et non plus en dur).
 *
 * Avant : `#10B981` / `#EF4444` / `#F59E0B` en dur — les valeurs Tailwind par
 * défaut, identiques à n'importe quelle app, et surtout inchangées en thème
 * sombre où elles vibrent sur le fond `#1E293B`. `DarkColors` embarque déjà des
 * équivalents désaturés (`#34D399`, `#F87171`, `#FBBF24`) : on les utilise.
 */
function accentFor(type: AlertType, colors: any): string {
  switch (type) {
    case 'success': return colors.success;
    case 'error': return colors.error;
    case 'warning': return colors.warning;
    default: return colors.primary;
  }
}

function accentDarkFor(type: AlertType, colors: any): string {
  switch (type) {
    case 'success': return colors.successDark || colors.success;
    case 'error': return colors.error;
    case 'warning': return colors.warningDark || colors.warning;
    default: return colors.primaryDark || colors.primary;
  }
}

/** Spécification visuelle par poids. */
const WEIGHT_SPEC = {
  compact: {
    backdrop: 0.35,
    radius: 26,
    titleSize: 17,
    titleTracking: -0.2,
    titleLineHeight: 23,
    iconSize: 20,
    showWatermark: false,
    showHeroIcon: false,
    gradientPrimary: false,
    dismissOnBackdrop: true,
  },
  standard: {
    backdrop: 0.5,
    radius: 28,
    titleSize: 22,
    titleTracking: -0.5,
    titleLineHeight: 28,
    iconSize: 44,
    showWatermark: false,
    showHeroIcon: true,
    gradientPrimary: false,
    dismissOnBackdrop: true,
  },
  critical: {
    backdrop: 0.62,
    radius: 32,
    titleSize: 26,
    titleTracking: -0.9,
    titleLineHeight: 32,
    iconSize: 76,
    showWatermark: true,
    showHeroIcon: true,
    gradientPrimary: true,
    // Une action destructive/argent ne se ferme pas par inadvertance.
    dismissOnBackdrop: false,
  },
} as const;

/**
 * Poids par défaut si l'appelant n'en impose pas.
 * Un choix (plusieurs boutons) pèse au moins `standard`; un simple accusé de
 * réception info/succès reste `compact`.
 */
function inferWeight(type: AlertType, buttonCount: number): AlertWeight {
  if (buttonCount > 1) return type === 'error' ? 'critical' : 'standard';
  if (type === 'success' || type === 'info') return 'compact';
  return 'standard';
}

const ICON: Record<AlertType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark',
  error: 'close',
  warning: 'alert',
  info: 'information',
  confirm: 'help',
};

// EYEBROW labels resolved via i18n at render-time (see component below).
const EYEBROW_KEYS: Record<AlertType, string> = {
  success: 'componentsCommon.alertEyebrowSuccess',
  error: 'componentsCommon.alertEyebrowError',
  warning: 'componentsCommon.alertEyebrowWarning',
  info: 'componentsCommon.alertEyebrowInfo',
  confirm: 'componentsCommon.alertEyebrowConfirm',
};

const WATERMARK: Record<AlertType, string> = {
  success: 'OK!',
  error: 'OOPS',
  warning: '!',
  info: 'i',
  confirm: '?',
};

// ─── Animation constants ─────────────────────────────────────────────────────

// `damping: 22` = quasi critique, sans rebond. Une alerte apparaît sur un tap :
// aucun élan n'a été transmis, donc aucun rebond à restituer. Le rebond est
// réservé à l'icône — une modale qui rebondit pour annoncer un échec de
// paiement envoie un signal de légèreté déplacé.
const SPRING_IN = { damping: 22, stiffness: 220, mass: 0.9 } as const;
const SPRING_OUT = { damping: 26, stiffness: 320, mass: 0.8 } as const;
// Sortie plus rapide que l'entrée.
const EXIT_DELAY = 200;

// ─── Component ──────────────────────────────────────────────────────

export default function CustomAlert({
  visible,
  type = 'info',
  title,
  message,
  buttons = [{ text: 'OK' }],
  onClose,
  weight,
  domain,
}: CustomAlertProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  // `useWindowDimensions` et NON `Dimensions.get()` figé au chargement du
  // module : sinon la hauteur est périmée après rotation / Split View iPad et
  // le sheet sort de l'écran de travers (cf. audit iPad).
  const { height: SCREEN_H } = useWindowDimensions();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [modalOpen, setModalOpen] = useState(false);

  const resolvedWeight: AlertWeight = weight ?? inferWeight(type, buttons.length);
  const spec = WEIGHT_SPEC[resolvedWeight];

  const sheetY = useSharedValue(SCREEN_H);
  const backdropAlp = useSharedValue(0);
  // Les anneaux démarrent à 0.9 et non 0 : rien dans le monde réel n'apparaît
  // à partir de rien. Un pop depuis scale(0) est une signature de composant
  // générique.
  const outerScale = useSharedValue(0.9);
  const innerScale = useSharedValue(0.9);

  const accent = accentFor(type, colors);
  const accentDark = accentDarkFor(type, colors);

  // Opacité du sheet : sert de feedback d'apparition en reduced-motion, où l'on
  // n'anime aucune translation.
  const sheetAlp = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropAlp.value = 0;
      outerScale.value = 0.9;
      innerScale.value = 0.9;

      if (reducedMotion) {
        // Aucune translation : un spring sur toute la hauteur d'écran est
        // précisément le déclencheur vestibulaire que `prefers-reduced-motion`
        // existe pour éviter. Seule l'opacité fait le travail.
        sheetY.value = 0;
        sheetAlp.value = 0;
      } else {
        sheetY.value = SCREEN_H;
        sheetAlp.value = 1;
      }

      setModalOpen(true);
      return;
    }

    if (reducedMotion) {
      sheetAlp.value = withTiming(0, { duration: 120 });
      backdropAlp.value = withTiming(0, { duration: 120 });
    } else {
      sheetY.value = withSpring(SCREEN_H, SPRING_OUT);
      backdropAlp.value = withTiming(0, { duration: 180 });
      outerScale.value = withTiming(0.9, { duration: 140 });
      innerScale.value = withTiming(0.9, { duration: 120 });
    }

    const id = setTimeout(() => setModalOpen(false), EXIT_DELAY);
    return () => clearTimeout(id);
  }, [visible, reducedMotion, SCREEN_H]);

  /**
   * Entrée pilotée par `onShow` du Modal, et non par un `setTimeout(…, 10)`.
   * Ce délai artificiel contournait la course au montage du Modal au prix d'une
   * latence sur le chemin d'entrée — `onShow` garantit que la vue native est
   * prête, sans attente arbitraire.
   */
  const handleShown = useCallback(() => {
    if (reducedMotion) {
      sheetAlp.value = withTiming(1, { duration: 140 });
      backdropAlp.value = withTiming(1, { duration: 140 });
      outerScale.value = 1;
      innerScale.value = 1;
      return;
    }
    sheetY.value = withSpring(0, SPRING_IN);
    backdropAlp.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.ease) });
    outerScale.value = withDelay(120, withSpring(1, { damping: 14, stiffness: 210 }));
    innerScale.value = withDelay(170, withSpring(1, { damping: 14, stiffness: 230 }));
  }, [reducedMotion]);

  const sheetAnim = useAnimatedStyle(() => ({
    opacity: sheetAlp.value,
    transform: [{ translateY: sheetY.value }],
  }));

  const backdropAnim = useAnimatedStyle(() => ({ opacity: backdropAlp.value }));
  const outerAnim = useAnimatedStyle(() => ({ transform: [{ scale: outerScale.value }] }));
  const innerAnim = useAnimatedStyle(() => ({ transform: [{ scale: innerScale.value }] }));

  /**
   * Le callback est invoqué SYNCHRONEMENT, le sheet s'anime par-dessus.
   *
   * Avant : `setTimeout(btn.onPress, EXIT_DELAY + 50)` — 340 ms de vide après
   * chaque tap sur « Confirmer » (aucune navigation, aucun spinner), au seul
   * bénéfice d'une animation de sortie non perturbée. Sur un flux de paiement
   * c'est une latence perçue comme un bug. Si le callback navigue, le sheet est
   * démonté en pleine sortie : c'est le comportement correct — une transition
   * doit rester interruptible.
   */
  const handlePress = useCallback((btn: AlertButton) => {
    onClose();
    btn.onPress?.();
  }, [onClose]);

  /**
   * Tap sur le fond. Passe par le bouton d'annulation quand il existe, sinon
   * ferme simplement. Avant, on appelait `onClose()` nu : tout nettoyage porté
   * par `onCancel` était silencieusement sauté.
   */
  const handleBackdrop = useCallback(() => {
    if (!spec.dismissOnBackdrop) return;
    const cancel = buttons.find(b => b.style === 'cancel');
    onClose();
    cancel?.onPress?.();
  }, [buttons, onClose, spec.dismissOnBackdrop]);

  // Reorder buttons : actions first, cancel last
  const actionButtons = buttons.filter(b => b.style !== 'cancel');
  const cancelButtons = buttons.filter(b => b.style === 'cancel');
  const ordered = [...actionButtons, ...cancelButtons];
  const isColumn = buttons.length > 2;

  /**
   * Eyebrow effectif.
   *  - `domain` fourni → on l'affiche (« PAIEMENT »), il apporte le contexte
   *    que l'utilisateur ne peut pas deviner.
   *  - sinon, libellé générique du type, MAIS supprimé s'il ne fait que répéter
   *    le titre (cas « Erreur » / « Succès », soit ~217 appels).
   */
  const eyebrowLabel = useMemo(() => {
    if (domain) return domain.toUpperCase();
    const generic = t(EYEBROW_KEYS[type]);
    const norm = (v: string) =>
      v.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (norm(generic) === norm(title)) return null;
    return generic;
  }, [domain, type, title, t]);

  const renderButton = (btn: AlertButton, i: number) => {
    const isCancel = btn.style === 'cancel';
    const isDestructive = btn.style === 'destructive';
    const isPrimary = !isCancel && !isDestructive;

    if (isCancel) {
      return (
        <TouchableOpacity
          key={i}
          style={[
            styles.cancelBtn,
            {
              // En sombre `gray100` vaut `#1E293B`, exactement la couleur de la
              // carte : le bouton devenait un rectangle invisible. On monte
              // d'un cran et on ajoute un filet.
              backgroundColor: isDark ? colors.gray200 : colors.gray100,
              borderWidth: isDark ? 1 : 0,
              borderColor: hairline,
            },
            !isColumn && { flex: 1 },
            isColumn && styles.btnFull,
          ]}
          onPress={() => handlePress(btn)}
          activeOpacity={TOUCH_OPACITY}
        >
          <Text style={[styles.cancelBtnText, { color: colors.gray700 }]}>
            {btn.text}
          </Text>
        </TouchableOpacity>
      );
    }

    if (isDestructive) {
      return (
        <TouchableOpacity
          key={i}
          style={[
            styles.actionPill,
            !isColumn && { flex: 1 },
            isColumn && styles.btnFull,
            Shadows.buttonPrimary,
          ]}
          onPress={() => handlePress(btn)}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.actionPillText} numberOfLines={1}>{btn.text}</Text>
          <View style={styles.actionPillArrow}>
            <Ionicons name="trash" size={13} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      );
    }

    // Primary action
    return (
      <TouchableOpacity
        key={i}
        style={[
          styles.actionPill,
          !isColumn && { flex: 1 },
          isColumn && styles.btnFull,
          Shadows.buttonPrimary,
        ]}
        onPress={() => handlePress(btn)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[accent, accentDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.actionPillText} numberOfLines={1}>{btn.text}</Text>
        <View style={styles.actionPillArrow}>
          <Ionicons name="checkmark" size={13} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={modalOpen}
      transparent
      animationType="none"
      onRequestClose={handleBackdrop}
      onShow={handleShown}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback
        onPress={handleBackdrop}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Reanimated.View
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            // L'opacité du fond EST le signal de gravité : elle se ressent
            // avant même d'avoir lu un mot.
            { backgroundColor: `rgba(0,0,0,${spec.backdrop})` },
            backdropAnim,
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Sheet wrapper — plein écran, ancre le sheet en bas + centré (iPad) */}
      <View style={styles.sheetWrap} pointerEvents="box-none">
      <Reanimated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderTopColor: hairline,
            borderTopLeftRadius: spec.radius,
            borderTopRightRadius: spec.radius,
            paddingBottom: Math.max(insets.bottom + Spacing.sm, Spacing.xl),
            // Sans plafond, un titre long + message + 3 boutons empilés passe
            // sous la status bar et devient inatteignable (grandes tailles de
            // police notamment).
            maxHeight: SCREEN_H - insets.top - 24,
          },
          sheetAnim,
        ]}
        accessibilityViewIsModal
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        accessibilityLabel={[eyebrowLabel, title, message].filter(Boolean).join('. ')}
      >
        {/* Watermark — masqué hors `critical`. En sombre, un accent saturé à 3%
            d'alpha est invisible : on passe par un blanc translucide. */}
        {spec.showWatermark && (
          <Text
            style={[
              styles.watermark,
              { color: isDark ? 'rgba(255,255,255,0.05)' : accent + '0D' },
            ]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {WATERMARK[type]}
          </Text>
        )}

        {/* Handle — uniquement quand le sheet est réellement « lourd ». Sans
            geste de drag attaché, c'est une fausse affordance : on le réserve
            au format qui ressemble le plus à une vraie bottom sheet. */}
        {resolvedWeight === 'critical' && (
          <View style={[styles.handle, { backgroundColor: colors.gray300 }]} />
        )}

        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollInner}
        >
          {spec.showHeroIcon ? (
            <Reanimated.View
              style={[
                styles.iconOuter,
                {
                  borderColor: accent + '30',
                  width: spec.iconSize,
                  height: spec.iconSize,
                  borderRadius: spec.iconSize / 2,
                  // L'anneau extérieur n'existe qu'en `critical`.
                  borderWidth: resolvedWeight === 'critical' ? 2 : 0,
                },
                outerAnim,
              ]}
            >
              <Reanimated.View
                style={[
                  styles.iconInner,
                  {
                    width: spec.iconSize - (resolvedWeight === 'critical' ? 20 : 0),
                    height: spec.iconSize - (resolvedWeight === 'critical' ? 20 : 0),
                    borderRadius: spec.iconSize / 2,
                  },
                  innerAnim,
                ]}
              >
                <LinearGradient
                  colors={[accent, accentDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons
                  name={ICON[type]}
                  size={resolvedWeight === 'critical' ? 32 : 20}
                  color="#FFFFFF"
                />
              </Reanimated.View>
            </Reanimated.View>
          ) : (
            // `compact` : la marque de gravité reste un simple glyphe teinté,
            // aligné avec le titre — pas un héros centré.
            <View style={[styles.compactIcon, { backgroundColor: accent + '1A' }]}>
              <Ionicons name={ICON[type]} size={spec.iconSize} color={accent} />
            </View>
          )}

          {/* Eyebrow — affiché seulement s'il APPORTE quelque chose. Un
              « ERREUR » au-dessus d'un titre « Erreur » encode la gravité une
              troisième fois sans rien ajouter. */}
          {!!eyebrowLabel && (
            <Text style={[styles.eyebrow, { color: accent }]}>{eyebrowLabel}</Text>
          )}

          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontSize: spec.titleSize,
                letterSpacing: spec.titleTracking,
                lineHeight: spec.titleLineHeight,
              },
            ]}
          >
            {title}
          </Text>

          {message ? (
            <Text style={[styles.message, { color: colors.gray500 }]}>{message}</Text>
          ) : null}
        </ScrollView>

        {/* Buttons */}
        <View style={[styles.buttonsWrap, isColumn && styles.buttonsColumn]}>
          {ordered.map(renderButton)}
        </View>
      </Reanimated.View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // La couleur est injectée au render depuis WEIGHT_SPEC.backdrop.
  backdrop: {},

  // Wrapper plein écran : ancre le sheet en bas et le centre horizontalement.
  // Le fond (backdrop) reste bord-à-bord ; seul le sheet est plafonné (iPad).
  sheetWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  sheet: {
    width: '100%',
    maxWidth: FORM_MAX,
    paddingHorizontal: Spacing.xl,
    paddingTop: 10,
    alignItems: 'center',
    overflow: 'hidden',
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 24,
  },

  watermark: {
    position: 'absolute',
    top: -8,
    right: -8,
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 140,
    letterSpacing: -8,
    lineHeight: 130,
  },

  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.lg,
    opacity: 0.5,
  },

  // Icon — editorial style with gradient
  // Dimensions pilotées par WEIGHT_SPEC au render (width/height/radius/border).
  iconOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  // `compact` : pastille discrète, pas de héros centré.
  compactIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  scrollInner: {
    alignItems: 'center',
  },
  iconInner: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  // Eyebrow
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  // Title display
  // fontSize / letterSpacing / lineHeight injectés depuis WEIGHT_SPEC.
  title: {
    fontFamily: FontFamily.displayExtraBold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },

  // Message
  message: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    maxWidth: 320,
  },

  // Buttons wrap
  buttonsWrap: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
  },
  buttonsColumn: {
    flexDirection: 'column',
    gap: 8,
  },

  // Cancel button (ghost pill)
  cancelBtn: {
    height: 50,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    letterSpacing: 0.2,
  },

  // Action pill (gradient with arrow)
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: Spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
    height: 50,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    gap: 8,
  },
  actionPillText: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 0.2,
    textAlign: 'left',
  },
  actionPillArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  btnFull: {
    width: '100%',
  },
});

// ─── Standalone hook ────────────────────────────────

interface AlertState {
  visible: boolean;
  type: AlertType;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

export function useCustomAlert() {
  // NOTE: paramètre `t` du callback renommé en `title` pour éviter le shadow
  // avec la fonction `t` de `useTranslation`.
  const { t: translate } = useTranslation();
  const okLabel = translate('common.ok');
  const cancelLabel = translate('common.cancel');
  const confirmLabel = translate('common.confirm');

  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    type: 'info',
    title: '',
    message: undefined,
    buttons: [{ text: 'OK' }],
  });

  const showAlert = useCallback((
    title: string,
    message?: string,
    type: AlertType = 'info',
    buttons?: AlertButton[]
  ) => {
    setAlertState({ visible: true, type, title, message, buttons: buttons || [{ text: okLabel }] });
  }, [okLabel]);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
  }, []);

  const showSuccess = useCallback((title: string, m?: string) => showAlert(title, m, 'success'), [showAlert]);
  const showError = useCallback((title: string, m?: string) => showAlert(title, m, 'error'), [showAlert]);
  const showWarning = useCallback((title: string, m?: string) => showAlert(title, m, 'warning'), [showAlert]);

  const showConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    showAlert(title, message, 'confirm', [
      { text: cancelLabel, style: 'cancel', onPress: onCancel },
      { text: confirmLabel, style: 'default', onPress: onConfirm },
    ]);
  }, [showAlert, cancelLabel, confirmLabel]);

  return {
    alertState,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showConfirm,
    CustomAlertComponent: () => (
      <CustomAlert
        visible={alertState.visible}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    ),
  };
}
