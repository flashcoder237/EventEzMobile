import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import CustomAlert, { AlertType } from '../components/common/CustomAlert';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
  visible: boolean;
  type: AlertType;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

interface AlertContextType {
  showAlert: (title: string, message?: string, buttons?: AlertButton[], type?: AlertType) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  // Labels par défaut résolus au moment du render — si l'utilisateur change
  // de langue dans Settings, les boutons se mettent à jour à la prochaine
  // ouverture de l'alert. Pas besoin de re-render des callers.
  const okLabel = t('common.ok');
  const cancelLabel = t('common.cancel');
  const confirmLabel = t('common.confirm');

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
    buttons?: AlertButton[],
    type: AlertType = 'info'
  ) => {
    setAlertState({
      visible: true,
      type,
      title,
      message,
      buttons: buttons || [{ text: okLabel }],
    });
  }, [okLabel]);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => {
    showAlert(title, message, [{ text: okLabel }], 'success');
  }, [showAlert, okLabel]);

  const showError = useCallback((title: string, message?: string) => {
    showAlert(title, message, [{ text: okLabel }], 'error');
  }, [showAlert, okLabel]);

  const showWarning = useCallback((title: string, message?: string) => {
    showAlert(title, message, [{ text: okLabel }], 'warning');
  }, [showAlert, okLabel]);

  const showConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    showAlert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: onCancel },
      { text: confirmLabel, onPress: onConfirm },
    ], 'confirm');
  }, [showAlert, cancelLabel, confirmLabel]);

  const value = useMemo(() => ({
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showConfirm,
    hideAlert,
  }), [showAlert, showSuccess, showError, showWarning, showConfirm, hideAlert]);

  return (
    <AlertContext.Provider value={value}>
      {children}
      <CustomAlert
        visible={alertState.visible}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
