/**
 * CustomAlert — Editorial Bottom Sheet
 *
 * Direction visuelle : éditorial neo-brutalist (style guide EventEz)
 *  - Eyebrow uppercase tracking 1.8 + display title large
 *  - Icon hero gradient + ring animée
 *  - Watermark numéral discret (signature du type)
 *  - Boutons : pill gradient pour primary, ghost pour cancel
 *
 * Animations (Reanimated) — préservées :
 *  - sheet spring entrée + rotation initiale
 *  - backdrop fade
 *  - icon rings cascade
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

const ACCENT: Record<AlertType, string> = {
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '',
  confirm: '',
};

const ACCENT_DARK: Record<AlertType, string> = {
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  info: '',
  confirm: '',
};

const ICON: Record<AlertType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark',
  error: 'close',
  warning: 'alert',
  info: 'information',
  confirm: 'help',
};

const EYEBROW: Record<AlertType, string> = {
  success: 'SUCCÈS',
  error: 'ERREUR',
  warning: 'ATTENTION',
  info: 'INFO',
  confirm: 'CONFIRMATION',
};

const WATERMARK: Record<AlertType, string> = {
  success: 'OK!',
  error: 'OOPS',
  warning: '!',
  info: 'i',
  confirm: '?',
};

// ─── Animation constants ─────────────────────────────────────────────────────

const { height: SCREEN_H } = Dimensions.get('window');
const SPRING_IN = { damping: 17, stiffness: 190, mass: 0.9 } as const;
const SPRING_OUT = { damping: 24, stiffness: 300, mass: 0.8 } as const;
const EXIT_DELAY = 290;

// ─── Component ──────────────────────────────────────────────────────

export default function CustomAlert({
  visible,
  type = 'info',
  title,
  message,
  buttons = [{ text: 'OK' }],
  onClose,
}: CustomAlertProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const hairline = isDark ? colors.gray200 : 'rgba(0,0,0,0.06)';

  const [modalOpen, setModalOpen] = useState(false);

  const sheetY = useSharedValue(SCREEN_H);
  const sheetRotate = useSharedValue(-0.012);
  const backdropAlp = useSharedValue(0);
  const outerScale = useSharedValue(0);
  const innerScale = useSharedValue(0);

  const accent = ACCENT[type] || colors.primary;
  const accentDark = ACCENT_DARK[type] || colors.primaryDark;

  useEffect(() => {
    if (visible) {
      sheetY.value = SCREEN_H;
      sheetRotate.value = -0.012;
      backdropAlp.value = 0;
      outerScale.value = 0;
      innerScale.value = 0;

      setModalOpen(true);

      const id = setTimeout(() => {
        sheetY.value = withSpring(0, SPRING_IN);
        sheetRotate.value = withSpring(0, { damping: 14, stiffness: 180 });
        backdropAlp.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
        outerScale.value = withDelay(130, withSpring(1, { damping: 10, stiffness: 210 }));
        innerScale.value = withDelay(185, withSpring(1, { damping: 8, stiffness: 230 }));
      }, 10);

      return () => clearTimeout(id);
    } else {
      sheetY.value = withSpring(SCREEN_H, SPRING_OUT);
      sheetRotate.value = withTiming(-0.008, { duration: 220 });
      backdropAlp.value = withTiming(0, { duration: 220 });
      outerScale.value = withTiming(0, { duration: 180 });
      innerScale.value = withTiming(0, { duration: 140 });

      const id = setTimeout(() => setModalOpen(false), EXIT_DELAY);
      return () => clearTimeout(id);
    }
  }, [visible]);

  const sheetAnim = useAnimatedStyle(() => ({
    transform: [
      { translateY: sheetY.value },
      { rotate: `${sheetRotate.value}rad` },
    ],
  }));

  const backdropAnim = useAnimatedStyle(() => ({ opacity: backdropAlp.value }));
  const outerAnim = useAnimatedStyle(() => ({ transform: [{ scale: outerScale.value }] }));
  const innerAnim = useAnimatedStyle(() => ({ transform: [{ scale: innerScale.value }] }));

  const handlePress = useCallback((btn: AlertButton) => {
    onClose();
    if (btn.onPress) {
      setTimeout(btn.onPress, EXIT_DELAY + 50);
    }
  }, [onClose]);

  // Reorder buttons : actions first, cancel last
  const actionButtons = buttons.filter(b => b.style !== 'cancel');
  const cancelButtons = buttons.filter(b => b.style === 'cancel');
  const ordered = [...actionButtons, ...cancelButtons];
  const isColumn = buttons.length > 2;

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
            { backgroundColor: colors.gray100 },
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
            borderTopColor: hairline,
            paddingBottom: Math.max(insets.bottom + Spacing.sm, Spacing.xl),
          },
          sheetAnim,
        ]}
      >
        {/* Watermark numeral */}
        <Text style={[styles.watermark, { color: accent + '08' }]}>
          {WATERMARK[type]}
        </Text>

        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.gray300 }]} />

        {/* Editorial Icon — gradient hero */}
        <Reanimated.View style={[styles.iconOuter, { borderColor: accent + '30' }, outerAnim]}>
          <Reanimated.View style={[styles.iconInner, innerAnim]}>
            <LinearGradient
              colors={[accent, accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name={ICON[type]} size={32} color="#FFFFFF" />
          </Reanimated.View>
        </Reanimated.View>

        {/* Eyebrow */}
        <Text style={[styles.eyebrow, { color: accent }]}>{EYEBROW[type]}</Text>

        {/* Title display */}
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

        {/* Message */}
        {message ? (
          <Text style={[styles.message, { color: colors.gray500 }]}>{message}</Text>
        ) : null}

        {/* Buttons */}
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
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
  iconOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  iconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
  title: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 26,
    letterSpacing: -0.9,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: 30,
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
  const showError = useCallback((t: string, m?: string) => showAlert(t, m, 'error'), [showAlert]);
  const showWarning = useCallback((t: string, m?: string) => showAlert(t, m, 'warning'), [showAlert]);

  const showConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    showAlert(title, message, 'confirm', [
      { text: 'Annuler', style: 'cancel', onPress: onCancel },
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
