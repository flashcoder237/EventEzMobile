/**
 * Tests Jest pour LoginScreen.
 *
 * Couvre : rendu initial (email/password), validation (email format, password
 * min 6 chars), submit OK qui appelle authAPI via useAuth().login, error
 * handling via showError, loading state pendant submit, switch tab phone,
 * lien "Mot de passe oublié".
 *
 * Note : LoginScreen utilise `EditorialPillCTA` qui rend le label "Se connecter"
 * dans un Text dont le parent TouchableOpacity reçoit le `onPress`.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ── Mocks (déclarés avant l'import du composant) ──────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReplace = jest.fn();
const mockReset = jest.fn();
const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    replace: mockReplace,
    reset: mockReset,
    dispatch: mockDispatch,
  }),
  useRoute: () => ({ params: {} }),
}));

const mockLogin = jest.fn();
const mockSetUser = jest.fn();
const mockGuestRegister = jest.fn();
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: false,
    isLoading: false,
    user: null,
    setUser: mockSetUser,
    guestRegister: mockGuestRegister,
  }),
}));

const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

const themeColors = {
  primary: '#4F46E5',
  accent: '#FF6B6B',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  success: '#10B981',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  warningDark: '#92400E',
  surface: '#FFFFFF',
  background: '#F4F3F0',
  card: '#FFFFFF',
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
};
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: themeColors, isDark: false }),
}));

jest.mock('../../../hooks/useSocialAuth', () => ({
  useGoogleAuth: () => ({ signIn: jest.fn(), isLoading: false, isReady: true }),
  useAppleAuth: () => ({ signIn: jest.fn(), isLoading: false, isAvailable: false }),
  usePhoneAuth: () => ({
    sendOTP: jest.fn(() => Promise.resolve({ success: true })),
    verifyOTP: jest.fn(() => Promise.resolve({ success: true })),
    isLoading: false,
  }),
}));

jest.mock('../../../hooks/useFeatureFlags', () => ({
  useFeatureFlags: () => ({ flags: { phone_otp_enabled: true, sms_notifications_enabled: true } }),
}));

jest.mock('../../../lib/eventBus', () => ({
  eventBus: { on: jest.fn(() => () => {}), emit: jest.fn() },
}));

jest.mock('../../../lib/utils/authNavigation', () => ({
  dispatchAfterAuth: jest.fn(),
  isAuthScreen: jest.fn(() => false),
}));

jest.mock('expo-image', () => {
  const RN = require('react-native');
  return { Image: RN.View };
});

// useGoogleAuth hook (loaded inside Login) - no extra mock needed since we mock useSocialAuth above

// ── Import après tous les jest.mock ───────────────────────────────────────
import LoginScreen from '../LoginScreen';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LoginScreen', () => {
  it('renders email + password inputs', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    expect(getByPlaceholderText('votre@email.com')).toBeTruthy();
    expect(getByPlaceholderText('••••••••')).toBeTruthy();
  });

  it('renders the "Se connecter" CTA label', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Se connecter')).toBeTruthy();
  });

  it('rejects invalid email format with field error', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'pas-un-email');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.press(getByText('Se connecter'));

    expect(await findByText(/email invalide/i)).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('rejects password shorter than 6 characters', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'a@b.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), '12345');
    fireEvent.press(getByText('Se connecter'));

    expect(await findByText(/6 caractères minimum/i)).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login() with email + password on valid submit', async () => {
    mockLogin.mockResolvedValueOnce({ id: 1, email: 'a@b.com' });
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'a@b.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.press(getByText('Se connecter'));

    await waitFor(() => {
      // rememberMe coché par défaut (aucune préférence sauvegardée en store)
      expect(mockLogin).toHaveBeenCalledWith('a@b.com', 'password123', true);
    });
  });

  it('lowercases + trims email before calling login()', async () => {
    mockLogin.mockResolvedValueOnce({ id: 1 });
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('votre@email.com'), '  Foo@Bar.COM  ');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.press(getByText('Se connecter'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('foo@bar.com', 'password123', true);
    });
  });

  it('shows an error toast when login() throws', async () => {
    mockLogin.mockRejectedValueOnce({
      response: { data: { detail: 'Identifiants invalides' } },
    });
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'a@b.com');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.press(getByText('Se connecter'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Erreur de connexion',
        'Identifiants invalides',
      );
    });
  });

  it('does not call login() when password is empty (required)', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('votre@email.com'), 'a@b.com');
    fireEvent.press(getByText('Se connecter'));

    expect(await findByText(/mot de passe est requis/i)).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('navigates to ForgotPassword when "Oublié ?" is pressed', () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Oublié ?'));
    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('switches to phone tab and shows the phone input', () => {
    const { getByText, queryByPlaceholderText, getByPlaceholderText } = render(<LoginScreen />);
    expect(queryByPlaceholderText('+237 6 12 34 56 78')).toBeNull();

    fireEvent.press(getByText('Téléphone'));

    expect(getByPlaceholderText('+237 6 12 34 56 78')).toBeTruthy();
  });
});
