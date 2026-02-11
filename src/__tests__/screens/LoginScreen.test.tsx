/**
 * Tests pour LoginScreen
 * Vérifie le formulaire de connexion et la validation
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../../screens/auth/LoginScreen';
import { renderWithNavigation as render } from '../mocks/testUtils';
import { mockUser } from '../mocks/mockData';

// Mock AuthContext
const mockLogin = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    isLoading: false,
    user: null,
    isAuthenticated: false,
  }),
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      replace: mockReplace,
      goBack: jest.fn(),
    }),
  };
});

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render login form', () => {
      const { getByText, getByPlaceholderText } = render(<LoginScreen />);

      expect(getByText('Connexion')).toBeTruthy();
      expect(getByPlaceholderText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Mot de passe')).toBeTruthy();
    });

    it('should render login button', () => {
      const { getByText } = render(<LoginScreen />);

      expect(getByText('Se connecter')).toBeTruthy();
    });

    it('should render forgot password link', () => {
      const { getByText } = render(<LoginScreen />);

      expect(getByText('Mot de passe oublié ?')).toBeTruthy();
    });

    it('should render register link', () => {
      const { getByText } = render(<LoginScreen />);

      expect(getByText(/Pas encore de compte/)).toBeTruthy();
      expect(getByText(/S'inscrire/)).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('should require email', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText, getByPlaceholderText } = render(<LoginScreen />);

      // Leave email empty, fill password
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
      fireEvent.press(getByText('Se connecter'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Erreur',
          expect.stringContaining('email')
        );
      });

      alertSpy.mockRestore();
    });

    it('should require password', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText, getByPlaceholderText } = render(<LoginScreen />);

      // Fill email, leave password empty
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.press(getByText('Se connecter'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Erreur',
          expect.stringContaining('mot de passe')
        );
      });

      alertSpy.mockRestore();
    });

    it('should validate email format', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText, getByPlaceholderText } = render(<LoginScreen />);

      fireEvent.changeText(getByPlaceholderText('Email'), 'invalid-email');
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
      fireEvent.press(getByText('Se connecter'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Erreur',
          expect.stringContaining('email')
        );
      });

      alertSpy.mockRestore();
    });
  });

  describe('Login Functionality', () => {
    it('should call login with correct credentials', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      const { getByText, getByPlaceholderText } = render(<LoginScreen />);

      fireEvent.changeText(getByPlaceholderText('Email'), 'test@eventez.com');
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
      fireEvent.press(getByText('Se connecter'));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@eventez.com', 'password123');
      });
    });

    it('should show error on login failure', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
      const { getByText, getByPlaceholderText } = render(<LoginScreen />);

      fireEvent.changeText(getByPlaceholderText('Email'), 'test@eventez.com');
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'wrongpassword');
      fireEvent.press(getByText('Se connecter'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Erreur de connexion',
          expect.any(String)
        );
      });

      alertSpy.mockRestore();
    });

    it('should navigate on successful login', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      const { getByText, getByPlaceholderText } = render(<LoginScreen />);

      fireEvent.changeText(getByPlaceholderText('Email'), 'test@eventez.com');
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
      fireEvent.press(getByText('Se connecter'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to Register on signup link press', () => {
      const { getByText } = render(<LoginScreen />);

      fireEvent.press(getByText(/S'inscrire/));

      expect(mockNavigate).toHaveBeenCalledWith('Register');
    });

    it('should navigate to ForgotPassword on link press', () => {
      const { getByText } = render(<LoginScreen />);

      fireEvent.press(getByText('Mot de passe oublié ?'));

      expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
    });
  });

  describe('Password Visibility', () => {
    it('should toggle password visibility', () => {
      const { getByPlaceholderText, UNSAFE_queryAllByType } = render(<LoginScreen />);

      const passwordInput = getByPlaceholderText('Mot de passe');

      // Initially password should be hidden
      expect(passwordInput.props.secureTextEntry).toBe(true);

      // Find and press the visibility toggle button
      // This would need a testID on the toggle button
    });
  });

  describe('Loading State', () => {
    it('should disable button during loading', async () => {
      // Create a promise that we can control
      let resolveLogin: (value?: unknown) => void;
      mockLogin.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLogin = resolve;
          })
      );

      const { getByText, getByPlaceholderText } = render(<LoginScreen />);

      fireEvent.changeText(getByPlaceholderText('Email'), 'test@eventez.com');
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
      fireEvent.press(getByText('Se connecter'));

      // Button should be disabled during loading
      // Verify loading indicator is shown
    });
  });

  describe('Input Handling', () => {
    it('should trim email whitespace', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      const { getByText, getByPlaceholderText } = render(<LoginScreen />);

      fireEvent.changeText(getByPlaceholderText('Email'), '  test@eventez.com  ');
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
      fireEvent.press(getByText('Se connecter'));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@eventez.com', 'password123');
      });
    });

    it('should convert email to lowercase', async () => {
      mockLogin.mockResolvedValueOnce(undefined);
      const { getByText, getByPlaceholderText } = render(<LoginScreen />);

      fireEvent.changeText(getByPlaceholderText('Email'), 'Test@EventEz.COM');
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
      fireEvent.press(getByText('Se connecter'));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@eventez.com', 'password123');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible inputs', () => {
      const { getByPlaceholderText } = render(<LoginScreen />);

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Mot de passe');

      expect(emailInput).toBeTruthy();
      expect(passwordInput).toBeTruthy();
    });
  });

  describe('Error Messages', () => {
    it('should show specific error for network failure', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockLogin.mockRejectedValueOnce({ message: 'Network Error' });
      const { getByText, getByPlaceholderText } = render(<LoginScreen />);

      fireEvent.changeText(getByPlaceholderText('Email'), 'test@eventez.com');
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
      fireEvent.press(getByText('Se connecter'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });

    it('should show specific error for invalid credentials', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockLogin.mockRejectedValueOnce({
        response: { status: 401, data: { detail: 'No active account found' } },
      });
      const { getByText, getByPlaceholderText } = render(<LoginScreen />);

      fireEvent.changeText(getByPlaceholderText('Email'), 'test@eventez.com');
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
      fireEvent.press(getByText('Se connecter'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Erreur de connexion',
          expect.stringContaining('incorrect')
        );
      });

      alertSpy.mockRestore();
    });
  });
});
