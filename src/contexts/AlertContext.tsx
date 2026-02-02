import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
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
      buttons: buttons || [{ text: 'OK' }],
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
  }, []);

  const showSuccess = useCallback((title: string, message?: string) => {
    showAlert(title, message, [{ text: 'OK' }], 'success');
  }, [showAlert]);

  const showError = useCallback((title: string, message?: string) => {
    showAlert(title, message, [{ text: 'OK' }], 'error');
  }, [showAlert]);

  const showWarning = useCallback((title: string, message?: string) => {
    showAlert(title, message, [{ text: 'OK' }], 'warning');
  }, [showAlert]);

  const showConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    showAlert(title, message, [
      { text: 'Annuler', style: 'cancel', onPress: onCancel },
      { text: 'Confirmer', onPress: onConfirm },
    ], 'confirm');
  }, [showAlert]);

  return (
    <AlertContext.Provider
      value={{
        showAlert,
        showSuccess,
        showError,
        showWarning,
        showConfirm,
        hideAlert,
      }}
    >
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
