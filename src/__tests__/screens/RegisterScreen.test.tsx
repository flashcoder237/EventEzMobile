/**
 * Tests pour RegisterScreen
 * Vérifie le formulaire d'inscription et la validation
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import RegisterScreen from '../../screens/auth/RegisterScreen';
import { renderWithNavigation as render } from '../mocks/testUtils';

// Mock AuthContext
const mockRegister = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
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

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render registration form', () => {
      const { getByText, getByPlaceholderText } = render(<RegisterScreen />);

      expect(getByText('Inscription')).toBeTruthy();
      expect(getByPlaceholderText('Prénom')).toBeTruthy();
      expect(getByPlaceholderText('Nom')).toBeTruthy();
      expect(getByPlaceholderText('Nom d\'utilisateur')).toBeTruthy();
      expect(getByPlaceholderText('Email')).toBeTruthy();
      expect(getByPlaceholderText('Téléphone (optionnel)')).toBeTruthy();
      expect(getByPlaceholderText('Mot de passe')).toBeTruthy();
      expect(getByPlaceholderText('Confirmer le mot de passe')).toBeTruthy();
    });

    it('should render register button', () => {
      const { getByText } = render(<RegisterScreen />);

      expect(getByText('S\'inscrire')).toBeTruthy();
    });

    it('should render login link', () => {
      const { getByText } = render(<RegisterScreen />);

      expect(getByText(/Déjà un compte/)).toBeTruthy();
      expect(getByText(/Se connecter/)).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('should require first name', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText, getByPlaceholderText } = render(<RegisterScreen />);

      // Fill all except first name
      fireEvent.changeText(getByPlaceholderText('Nom'), 'Dupont');
      fireEvent.changeText(getByPlaceholderText('Nom d\'utilisateur'), 'testuser');
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
      fireEvent.changeText(getByPlaceholderText('Confirmer le mot de passe'), 'password123');

      fireEvent.press(getByText('S\'inscrire'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Erreur',
          expect.stringContaining('prénom')
        );
      });

      alertSpy.mockRestore();
    });

    it('should require email', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText, getByPlaceholderText } = render(<RegisterScreen />);

      fireEvent.changeText(getByPlaceholderText('Prénom'), 'Jean');
      fireEvent.changeText(getByPlaceholderText('Nom'), 'Dupont');
      fireEvent.changeText(getByPlaceholderText('Nom d\'utilisateur'), 'testuser');
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
      fireEvent.changeText(getByPlaceholderText('Confirmer le mot de passe'), 'password123');

      fireEvent.press(getByText('S\'inscrire'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Erreur',
          expect.stringContaining('email')
        );
      });

      alertSpy.mockRestore();
    });

    it('should validate email format', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText, getByPlaceholderText } = render(<RegisterScreen />);

      fireEvent.changeText(getByPlaceholderText('Prénom'), 'Jean');
      fireEvent.changeText(getByPlaceholderText('Nom'), 'Dupont');
      fireEvent.changeText(getByPlaceholderText('Nom d\'utilisateur'), 'testuser');
      fireEvent.changeText(getByPlaceholderText('Email'), 'invalid-email');
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
      fireEvent.changeText(getByPlaceholderText('Confirmer le mot de passe'), 'password123');

      fireEvent.press(getByText('S\'inscrire'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Erreur',
          expect.stringContaining('email')
        );
      });

      alertSpy.mockRestore();
    });

    it('should require passwords to match', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText, getByPlaceholderText } = render(<RegisterScreen />);

      fireEvent.changeText(getByPlaceholderText('Prénom'), 'Jean');
      fireEvent.changeText(getByPlaceholderText('Nom'), 'Dupont');
      fireEvent.changeText(getByPlaceholderText('Nom d\'utilisateur'), 'testuser');
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
      fireEvent.changeText(getByPlaceholderText('Confirmer le mot de passe'), 'differentpassword');

      fireEvent.press(getByText('S\'inscrire'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Erreur',
          expect.stringContaining('correspondent pas')
        );
      });

      alertSpy.mockRestore();
    });

    it('should validate password minimum length', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText, getByPlaceholderText } = render(<RegisterScreen />);

      fireEvent.changeText(getByPlaceholderText('Prénom'), 'Jean');
      fireEvent.changeText(getByPlaceholderText('Nom'), 'Dupont');
      fireEvent.changeText(getByPlaceholderText('Nom d\'utilisateur'), 'testuser');
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), '123');
      fireEvent.changeText(getByPlaceholderText('Confirmer le mot de passe'), '123');

      fireEvent.press(getByText('S\'inscrire'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Erreur',
          expect.stringContaining('caractères')
        );
      });

      alertSpy.mockRestore();
    });

    it('should validate phone number format when provided', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText, getByPlaceholderText } = render(<RegisterScreen />);

      fireEvent.changeText(getByPlaceholderText('Prénom'), 'Jean');
      fireEvent.changeText(getByPlaceholderText('Nom'), 'Dupont');
      fireEvent.changeText(getByPlaceholderText('Nom d\'utilisateur'), 'testuser');
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
      fireEvent.changeText(getByPlaceholderText('Téléphone (optionnel)'), 'invalid');
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
      fireEvent.changeText(getByPlaceholderText('Confirmer le mot de passe'), 'password123');

      fireEvent.press(getByText('S\'inscrire'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Erreur',
          expect.stringContaining('téléphone')
        );
      });

      alertSpy.mockRestore();
    });
  });

  describe('Registration Functionality', () => {
    const validFormData = {
      first_name: 'Jean',
      last_name: 'Dupont',
      username: 'testuser',
      email: 'test@eventez.com',
      phone_number: '+237699999999',
      password: 'password123',
      confirm_password: 'password123',
    };

    it('should call register with correct data', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      const { getByText, getByPlaceholderText } = render(<RegisterScreen />);

      fireEvent.changeText(getByPlaceholderText('Prénom'), validFormData.first_name);
      fireEvent.changeText(getByPlaceholderText('Nom'), validFormData.last_name);
      fireEvent.changeText(getByPlaceholderText('Nom d\'utilisateur'), validFormData.username);
      fireEvent.changeText(getByPlaceholderText('Email'), validFormData.email);
      fireEvent.changeText(getByPlaceholderText('Téléphone (optionnel)'), validFormData.phone_number);
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), validFormData.password);
      fireEvent.changeText(getByPlaceholderText('Confirmer le mot de passe'), validFormData.confirm_password);

      fireEvent.press(getByText('S\'inscrire'));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({
          first_name: validFormData.first_name,
          last_name: validFormData.last_name,
          username: validFormData.username,
          email: validFormData.email,
          password: validFormData.password,
          confirm_password: validFormData.confirm_password,
        }));
      });
    });

    it('should show error on registration failure', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockRegister.mockRejectedValueOnce({
        response: { data: { email: ['Email already exists'] } },
      });
      const { getByText, getByPlaceholderText } = render(<RegisterScreen />);

      fireEvent.changeText(getByPlaceholderText('Prénom'), validFormData.first_name);
      fireEvent.changeText(getByPlaceholderText('Nom'), validFormData.last_name);
      fireEvent.changeText(getByPlaceholderText('Nom d\'utilisateur'), validFormData.username);
      fireEvent.changeText(getByPlaceholderText('Email'), validFormData.email);
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), validFormData.password);
      fireEvent.changeText(getByPlaceholderText('Confirmer le mot de passe'), validFormData.confirm_password);

      fireEvent.press(getByText('S\'inscrire'));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });

    it('should navigate on successful registration', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      const { getByText, getByPlaceholderText } = render(<RegisterScreen />);

      fireEvent.changeText(getByPlaceholderText('Prénom'), validFormData.first_name);
      fireEvent.changeText(getByPlaceholderText('Nom'), validFormData.last_name);
      fireEvent.changeText(getByPlaceholderText('Nom d\'utilisateur'), validFormData.username);
      fireEvent.changeText(getByPlaceholderText('Email'), validFormData.email);
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), validFormData.password);
      fireEvent.changeText(getByPlaceholderText('Confirmer le mot de passe'), validFormData.confirm_password);

      fireEvent.press(getByText('S\'inscrire'));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to Login on link press', () => {
      const { getByText } = render(<RegisterScreen />);

      fireEvent.press(getByText(/Se connecter/));

      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });
  });

  describe('Input Handling', () => {
    it('should trim whitespace from inputs', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      const { getByText, getByPlaceholderText } = render(<RegisterScreen />);

      fireEvent.changeText(getByPlaceholderText('Prénom'), '  Jean  ');
      fireEvent.changeText(getByPlaceholderText('Nom'), '  Dupont  ');
      fireEvent.changeText(getByPlaceholderText('Nom d\'utilisateur'), '  testuser  ');
      fireEvent.changeText(getByPlaceholderText('Email'), '  test@eventez.com  ');
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
      fireEvent.changeText(getByPlaceholderText('Confirmer le mot de passe'), 'password123');

      fireEvent.press(getByText('S\'inscrire'));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({
          first_name: 'Jean',
          last_name: 'Dupont',
          username: 'testuser',
          email: 'test@eventez.com',
        }));
      });
    });
  });

  describe('Phone Number', () => {
    it('should allow registration without phone number', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      const { getByText, getByPlaceholderText } = render(<RegisterScreen />);

      fireEvent.changeText(getByPlaceholderText('Prénom'), 'Jean');
      fireEvent.changeText(getByPlaceholderText('Nom'), 'Dupont');
      fireEvent.changeText(getByPlaceholderText('Nom d\'utilisateur'), 'testuser');
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@eventez.com');
      // Don't fill phone number
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
      fireEvent.changeText(getByPlaceholderText('Confirmer le mot de passe'), 'password123');

      fireEvent.press(getByText('S\'inscrire'));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalled();
      });
    });

    it('should accept valid Cameroon phone number', async () => {
      mockRegister.mockResolvedValueOnce(undefined);
      const { getByText, getByPlaceholderText } = render(<RegisterScreen />);

      fireEvent.changeText(getByPlaceholderText('Prénom'), 'Jean');
      fireEvent.changeText(getByPlaceholderText('Nom'), 'Dupont');
      fireEvent.changeText(getByPlaceholderText('Nom d\'utilisateur'), 'testuser');
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@eventez.com');
      fireEvent.changeText(getByPlaceholderText('Téléphone (optionnel)'), '+237699999999');
      fireEvent.changeText(getByPlaceholderText('Mot de passe'), 'password123');
      fireEvent.changeText(getByPlaceholderText('Confirmer le mot de passe'), 'password123');

      fireEvent.press(getByText('S\'inscrire'));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({
          phone_number: '+237699999999',
        }));
      });
    });
  });
});
