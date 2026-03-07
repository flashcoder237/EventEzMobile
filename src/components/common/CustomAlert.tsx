/**
 * CustomAlert — Bottom Sheet redesign
 *
 * Design :
 *  - Sheet ancré en bas, coins arrondis en haut (BorderRadius['3xl'])
 *  - Handle bar centrée + icône double ring animée
 *  - Backdrop assombri indépendant du sheet
 *  - Boutons : row si ≤2, colonne si >2 (cancel en dernier)
 *
 * Animations (Reanimated) :
 *  - Entrée  : sheet spring(damping=17) depuis bas + légère rotation initiale
 *              backdrop fade(300ms) + icon rings scale en cascade (delay 130/180ms)
 *  - Sortie  : sheet spring rapide vers bas, backdrop fade, icon scale-out
 *              Modal masquée 300ms après le déclenchement de la sortie
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TOUCH_OPACITY,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

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
}

// ─── Config ───────────────────────────────────────────────────────────────────

// Couleurs sémantiques fixes (lisibles en light & dark)
const ACCENT: Record<AlertType, string> = {
  success: '#10B981',
  error:   '#EF4444',
  warning: '#F59E0B',
  info:    '',        // → colors.primary à l'exécution
  confirm: '',        // → colors.primary à l'exécution
};

const ICON: Record<AlertType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error:   'close-circle',
  warning: 'warning',
  info:    'information-circle',
  confirm: 'help-circle',
};

// ─── Constantes animation ─────────────────────────────────────────────────────

const { height: SCREEN_H } = Dimensions.get('window');
const SPRING_IN  = { damping: 17, stiffness: 190, mass: 0.9 } as const;
const SPRING_OUT = { damping: 24, stiffness: 300, mass: 0.8 } as const;
const EXIT_DELAY = 290; // ms avant de cacher le Modal

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CustomAlert({
  visible,
  type = 'info',
  title,
  message,
  buttons = [{ text: 'OK' }],
  onClose,
}: CustomAlertProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // État interne : le Modal reste ouvert pendant l'animation de sortie
  const [modalOpen, setModalOpen] = useState(false);

  // Valeurs animées
  const sheetY      = useSharedValue(SCREEN_H);
  const sheetRotate = useSharedValue(-0.012);
  const backdropAlp = useSharedValue(0);
  const outerScale  = useSharedValue(0);
  const innerScale  = useSharedValue(0);

  const accent = ACCENT[type] || colors.primary;

  // ── Gestion visible ────────────────────────────────────────────────────────

  useEffect(() => {
    if (visible) {
      // Réinitialiser positions de départ
      sheetY.value      = SCREEN_H;
      sheetRotate.value = -0.012;
      backdropAlp.value = 0;
      outerScale.value  = 0;
      innerScale.value  = 0;

      setModalOpen(true);

      // Un frame de délai pour que le Modal soit rendu avant d'animer
      const id = setTimeout(() => {
        sheetY.value      = withSpring(0, SPRING_IN);
        sheetRotate.value = withSpring(0, { damping: 14, stiffness: 180 });
        backdropAlp.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
        outerScale.value  = withDelay(130, withSpring(1, { damping: 10, stiffness: 210 }));
        innerScale.value  = withDelay(185, withSpring(1, { damping: 8,  stiffness: 230 }));
      }, 10);

      return () => clearTimeout(id);
    } else {
      // Animation de sortie
      sheetY.value      = withSpring(SCREEN_H, SPRING_OUT);
      sheetRotate.value = withTiming(-0.008, { duration: 220 });
      backdropAlp.value = withTiming(0, { duration: 220 });
      outerScale.value  = withTiming(0, { duration: 180 });
      innerScale.value  = withTiming(0, { duration: 140 });

      const id = setTimeout(() => setModalOpen(false), EXIT_DELAY);
      return () => clearTimeout(id);
    }
  }, [visible]);

  // ── Styles animés ──────────────────────────────────────────────────────────

  const sheetAnim    = useAnimatedStyle(() => ({
    transform: [
      { translateY: sheetY.value },
      { rotate: `${sheetRotate.value}rad` },
    ],
  }));

  const backdropAnim = useAnimatedStyle(() => ({ opacity: backdropAlp.value }));
  const outerAnim   = useAnimatedStyle(() => ({ transform: [{ scale: outerScale.value }] }));
  const innerAnim   = useAnimatedStyle(() => ({ transform: [{ scale: innerScale.value }] }));

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handlePress = useCallback((btn: AlertButton) => {
    onClose();
    // Exécuter le callback après la fermeture du Modal pour ne pas bloquer la navigation
    if (btn.onPress) {
      setTimeout(btn.onPress, EXIT_DELAY + 50);
    }
  }, [onClose]);

  // ── Boutons ────────────────────────────────────────────────────────────────

  // Séparer cancel du reste pour le placer en dernier dans la colonne
  const actionButtons = buttons.filter(b => b.style !== 'cancel');
  const cancelButtons = buttons.filter(b => b.style === 'cancel');
  const ordered = [...actionButtons, ...cancelButtons];
  const isColumn = buttons.length > 2;

  const renderButton = (btn: AlertButton, i: number) => {
    const isCancel      = btn.style === 'cancel';
    const isDestructive = btn.style === 'destructive';

    const bgColor   = isCancel ? 'transparent' : isDestructive ? colors.error : accent;
    const txtColor  = isCancel ? colors.gray500 : '#FFFFFF';
    const border    = isCancel ? { borderWidth: 1, borderColor: colors.gray200 } : {};

    return (
      <TouchableOpacity
        key={i}
        style={[
          styles.button,
          { backgroundColor: bgColor },
          border,
          !isColumn && { flex: 1 },
          isColumn && styles.buttonFull,
          isCancel && isColumn && styles.cancelColumnBtn,
        ]}
        onPress={() => handlePress(btn)}
        activeOpacity={TOUCH_OPACITY}
      >
        <Text style={[styles.buttonText, { color: txtColor }]}>
          {btn.text}
        </Text>
      </TouchableOpacity>
    );
  };

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={modalOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Reanimated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnim]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Reanimated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            paddingBottom: Math.max(insets.bottom + Spacing.sm, Spacing.xl),
          },
          sheetAnim,
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.gray300 }]} />

        {/* Icône double ring */}
        <Reanimated.View style={[styles.iconOuter, { backgroundColor: accent + '18' }, outerAnim]}>
          <Reanimated.View style={[styles.iconInner, { backgroundColor: accent + '2E' }, innerAnim]}>
            <Ionicons name={ICON[type]} size={34} color={accent} />
          </Reanimated.View>
        </Reanimated.View>

        {/* Titre */}
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

        {/* Message */}
        {message ? (
          <Text style={[styles.message, { color: colors.gray500 }]}>{message}</Text>
        ) : null}

        {/* Séparateur */}
        <View style={[styles.divider, { backgroundColor: colors.gray100 }]} />

        {/* Boutons */}
        <View style={[styles.buttonsWrap, isColumn && styles.buttonsColumn]}>
          {ordered.map(renderButton)}
        </View>
      </Reanimated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.62)',
  },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    alignItems: 'center',
    // Ombre portée vers le haut
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 24,
  },

  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.xl,
    marginTop: Spacing.xs,
  },

  // Icône
  iconOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  iconInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Textes
  title: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: 28,
  },
  message: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },

  divider: {
    height: 1,
    width: '100%',
    marginBottom: Spacing.lg,
  },

  // Boutons
  buttonsWrap: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.sm,
  },
  buttonsColumn: {
    flexDirection: 'column',
    gap: Spacing.xs,
  },
  button: {
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFull: {
    width: '100%',
  },
  cancelColumnBtn: {
    marginTop: Spacing.xs,
  },
  buttonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    letterSpacing: 0.2,
  },
});

// ─── Hook standalone (usage sans AlertContext) ────────────────────────────────

interface AlertState {
  visible: boolean;
  type: AlertType;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

export function useCustomAlert() {
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
    setAlertState({ visible: true, type, title, message, buttons: buttons || [{ text: 'OK' }] });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
  }, []);

  const showSuccess = useCallback((t: string, m?: string) => showAlert(t, m, 'success'), [showAlert]);
  const showError   = useCallback((t: string, m?: string) => showAlert(t, m, 'error'),   [showAlert]);
  const showWarning = useCallback((t: string, m?: string) => showAlert(t, m, 'warning'), [showAlert]);

  const showConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    showAlert(title, message, 'confirm', [
      { text: 'Annuler',   style: 'cancel',  onPress: onCancel  },
      { text: 'Confirmer', style: 'default', onPress: onConfirm },
    ]);
  }, [showAlert]);

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
