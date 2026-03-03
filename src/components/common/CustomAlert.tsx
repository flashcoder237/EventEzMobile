import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TOUCH_OPACITY,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

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

const alertConfig: Record<AlertType, { icon: keyof typeof Ionicons.glyphMap; colorKey: 'success' | 'error' | 'warning' | 'primary' }> = {
  success: { icon: 'checkmark-circle', colorKey: 'success' },
  error: { icon: 'close-circle', colorKey: 'error' },
  warning: { icon: 'warning', colorKey: 'warning' },
  info: { icon: 'information-circle', colorKey: 'primary' },
  confirm: { icon: 'help-circle', colorKey: 'primary' },
};

export default function CustomAlert({
  visible,
  type = 'info',
  title,
  message,
  buttons = [{ text: 'OK' }],
  onClose,
}: CustomAlertProps) {
  const { colors, isDark } = useTheme();
  const config = alertConfig[type];
  const iconColor = colors[config.colorKey];

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    onClose();
  };

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case 'cancel':
        return { backgroundColor: colors.gray100 };
      case 'destructive':
        return { backgroundColor: colors.error };
      default:
        return { backgroundColor: colors.primary };
    }
  };

  const getButtonTextColor = (style?: string) => {
    switch (style) {
      case 'cancel':
        return colors.gray700;
      case 'destructive':
        return colors.white;
      default:
        return colors.white;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          {Platform.OS === 'ios' && (
            <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          )}
          <TouchableWithoutFeedback>
            <View style={[styles.alertContainer, { backgroundColor: colors.surface }, Shadows.lg]}>
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
                <Ionicons name={config.icon} size={40} color={iconColor} />
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: colors.gray900 }]}>{title}</Text>

              {/* Message */}
              {message && <Text style={[styles.message, { color: colors.gray600 }]}>{message}</Text>}

              {/* Buttons */}
              <View style={[styles.buttonsContainer, buttons.length > 2 && styles.buttonsVertical]}>
                {buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      getButtonStyle(button.style),
                      buttons.length === 1 && styles.singleButton,
                      buttons.length === 2 && styles.doubleButton,
                    ]}
                    onPress={() => handleButtonPress(button)}
                    activeOpacity={TOUCH_OPACITY}
                  >
                    <Text style={[styles.buttonText, { color: getButtonTextColor(button.style) }]}>
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// Hook pour utiliser l'alerte facilement
import { useState, useCallback } from 'react';

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
    setAlertState({
      visible: true,
      type,
      title,
      message,
      buttons: buttons || [{ text: 'OK' }],
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => {
    showAlert(title, message, 'success');
  }, [showAlert]);

  const showError = useCallback((title: string, message?: string) => {
    showAlert(title, message, 'error');
  }, [showAlert]);

  const showWarning = useCallback((title: string, message?: string) => {
    showAlert(title, message, 'warning');
  }, [showAlert]);

  const showConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    showAlert(title, message, 'confirm', [
      { text: 'Annuler', style: 'cancel', onPress: onCancel },
      { text: 'Confirmer', onPress: onConfirm },
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  alertContainer: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  buttonsVertical: {
    flexDirection: 'column',
  },
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleButton: {
    flex: 1,
  },
  doubleButton: {
    flex: 1,
  },
  buttonText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
  },
});
