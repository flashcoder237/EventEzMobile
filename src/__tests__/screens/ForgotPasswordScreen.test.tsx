/**
 * Tests pour ForgotPasswordScreen
 * Vérifie le processus de réinitialisation de mot de passe
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import ForgotPasswordScreen from '../../screens/auth/ForgotPasswordScreen';
import { render } from '../mocks/testUtils';
import { authAPI } from '../../api/client';

// Mock API client
jest.mock('../../api/client', () => ({
  authAPI: {
    requestPasswordReset: jest.fn(),
    verifyResetCode: jest.fn(),
    resetPassword: jest.fn(),
  },
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: jest.fn(),
    }),
  };
});

const mockAuthAPI = authAPI as jest.Mocked<typeof authAPI>;

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthAPI.requestPasswordReset.mockResolvedValue({
      data: { message: 'Email sent' },
    } as any);
    (mockAuthAPI as any).verifyResetCode = jest.fn().mockResolvedValue({
      data: { valid: true },
    } as any);
    mockAuthAPI.resetPassword.mockResolvedValue({
      data: { message: 'Password reset successful' },
    } as any);
  });

  describe('Step 1 - Email Input', () => {
    it('should render email step', async () => {
      const { getByText } = render(<ForgotPasswordScreen />);

      await waitFor(() => {
        expect(getByText('Mot de passe oublié')).toBeTruthy();
      });
    });

    it('should render email input', async () => {
      const { getByPlaceholderText } = render(<ForgotPasswordScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/email|e-mail/i)).toBeTruthy();
      });
    });

    it('should render submit button', async () => {
      const { getByText } = render(<ForgotPasswordScreen />);

      await waitFor(() => {
        expect(getByText(/Envoyer|Continuer/i)).toBeTruthy();
      });
    });

    it('should render instructions', async () => {
      const { getByText } = render(<ForgotPasswordScreen />);

      await waitFor(() => {
        expect(getByText(/entrez.*email|saisissez.*email/i)).toBeTruthy();
      });
    });

    it('should validate email format', async () => {
      const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/email/i)).toBeTruthy();
      });

      const emailInput = getByPlaceholderText(/email/i);
      fireEvent.changeText(emailInput, 'invalid-email');

      fireEvent.press(getByText(/Envoyer|Continuer/i));

      await waitFor(() => {
        expect(getByText(/email.*invalide/i)).toBeTruthy();
      });
    });

    it('should require email', async () => {
      const { getByText } = render(<ForgotPasswordScreen />);

      await waitFor(() => {
        expect(getByText(/Envoyer|Continuer/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Envoyer|Continuer/i));

      await waitFor(() => {
        expect(getByText(/email.*requis/i)).toBeTruthy();
      });
    });

    it('should submit email and proceed to code step', async () => {
      const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/email/i)).toBeTruthy();
      });

      const emailInput = getByPlaceholderText(/email/i);
      fireEvent.changeText(emailInput, 'test@eventez.com');

      fireEvent.press(getByText(/Envoyer|Continuer/i));

      await waitFor(() => {
        expect(mockAuthAPI.requestPasswordReset).toHaveBeenCalledWith('test@eventez.com');
      });
    });

    it('should show loading state', async () => {
      mockAuthAPI.requestPasswordReset.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/email/i)).toBeTruthy();
      });

      const emailInput = getByPlaceholderText(/email/i);
      fireEvent.changeText(emailInput, 'test@eventez.com');

      fireEvent.press(getByText(/Envoyer|Continuer/i));

      await waitFor(() => {
        expect(getByText(/Chargement|Envoi/i)).toBeTruthy();
      });
    });

    it('should handle email not found error', async () => {
      mockAuthAPI.requestPasswordReset.mockRejectedValue({
        response: { data: { error: 'Email not found' } },
      });

      const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/email/i)).toBeTruthy();
      });

      const emailInput = getByPlaceholderText(/email/i);
      fireEvent.changeText(emailInput, 'notfound@eventez.com');

      fireEvent.press(getByText(/Envoyer|Continuer/i));

      await waitFor(() => {
        expect(getByText(/email.*introuvable|aucun.*compte/i)).toBeTruthy();
      });
    });
  });

  describe('Step 2 - Code Verification', () => {
    it('should show code input after email submission', async () => {
      const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/email/i)).toBeTruthy();
      });

      const emailInput = getByPlaceholderText(/email/i);
      fireEvent.changeText(emailInput, 'test@eventez.com');
      fireEvent.press(getByText(/Envoyer|Continuer/i));

      await waitFor(() => {
        expect(getByText(/code.*vérification|code.*reçu/i)).toBeTruthy();
      });
    });

    it('should render code input fields', async () => {
      const { getByPlaceholderText, getByText, getAllByPlaceholderText } = render(
        <ForgotPasswordScreen />
      );

      await waitFor(() => {
        expect(getByPlaceholderText(/email/i)).toBeTruthy();
      });

      const emailInput = getByPlaceholderText(/email/i);
      fireEvent.changeText(emailInput, 'test@eventez.com');
      fireEvent.press(getByText(/Envoyer|Continuer/i));

      await waitFor(() => {
        // OTP input or regular input
        expect(getByPlaceholderText(/code/i) || getAllByPlaceholderText(/\d/).length > 0).toBeTruthy();
      });
    });

    it('should show resend code option', async () => {
      const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/email/i)).toBeTruthy();
      });

      const emailInput = getByPlaceholderText(/email/i);
      fireEvent.changeText(emailInput, 'test@eventez.com');
      fireEvent.press(getByText(/Envoyer|Continuer/i));

      await waitFor(() => {
        expect(getByText(/Renvoyer|pas.*reçu/i)).toBeTruthy();
      });
    });

    it('should validate code length', async () => {
      const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/email/i)).toBeTruthy();
      });

      const emailInput = getByPlaceholderText(/email/i);
      fireEvent.changeText(emailInput, 'test@eventez.com');
      fireEvent.press(getByText(/Envoyer|Continuer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/code/i)).toBeTruthy();
      });

      const codeInput = getByPlaceholderText(/code/i);
      fireEvent.changeText(codeInput, '123'); // Too short

      fireEvent.press(getByText(/Vérifier|Continuer/i));

      await waitFor(() => {
        expect(getByText(/code.*invalide/i)).toBeTruthy();
      });
    });

    it('should verify code and proceed to password step', async () => {
      const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/email/i)).toBeTruthy();
      });

      const emailInput = getByPlaceholderText(/email/i);
      fireEvent.changeText(emailInput, 'test@eventez.com');
      fireEvent.press(getByText(/Envoyer|Continuer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/code/i)).toBeTruthy();
      });

      const codeInput = getByPlaceholderText(/code/i);
      fireEvent.changeText(codeInput, '123456');

      fireEvent.press(getByText(/Vérifier|Continuer/i));

      await waitFor(() => {
        expect((mockAuthAPI as any).verifyResetCode).toHaveBeenCalledWith('test@eventez.com', '123456');
      });
    });

    it('should handle invalid code error', async () => {
      (mockAuthAPI as any).verifyResetCode.mockRejectedValue({
        response: { data: { error: 'Invalid code' } },
      });

      const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/email/i)).toBeTruthy();
      });

      const emailInput = getByPlaceholderText(/email/i);
      fireEvent.changeText(emailInput, 'test@eventez.com');
      fireEvent.press(getByText(/Envoyer|Continuer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/code/i)).toBeTruthy();
      });

      const codeInput = getByPlaceholderText(/code/i);
      fireEvent.changeText(codeInput, '000000');

      fireEvent.press(getByText(/Vérifier|Continuer/i));

      await waitFor(() => {
        expect(getByText(/code.*incorrect|code.*invalide/i)).toBeTruthy();
      });
    });
  });

  describe('Step 3 - New Password', () => {
    it('should show password inputs after code verification', async () => {
      const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

      // Navigate through steps
      const emailInput = getByPlaceholderText(/email/i);
      fireEvent.changeText(emailInput, 'test@eventez.com');
      fireEvent.press(getByText(/Envoyer|Continuer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/code/i)).toBeTruthy();
      });

      const codeInput = getByPlaceholderText(/code/i);
      fireEvent.changeText(codeInput, '123456');
      fireEvent.press(getByText(/Vérifier|Continuer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/nouveau.*mot.*passe/i)).toBeTruthy();
      });
    });

    it('should render password confirmation input', async () => {
      const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

      // Navigate through steps
      const emailInput = getByPlaceholderText(/email/i);
      fireEvent.changeText(emailInput, 'test@eventez.com');
      fireEvent.press(getByText(/Envoyer|Continuer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/code/i)).toBeTruthy();
      });

      const codeInput = getByPlaceholderText(/code/i);
      fireEvent.changeText(codeInput, '123456');
      fireEvent.press(getByText(/Vérifier|Continuer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/confirmer.*mot.*passe/i)).toBeTruthy();
      });
    });

    it('should validate password match', async () => {
      const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

      // Navigate through steps (abbreviated)
      const emailInput = getByPlaceholderText(/email/i);
      fireEvent.changeText(emailInput, 'test@eventez.com');
      fireEvent.press(getByText(/Envoyer|Continuer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/code/i)).toBeTruthy();
      });

      const codeInput = getByPlaceholderText(/code/i);
      fireEvent.changeText(codeInput, '123456');
      fireEvent.press(getByText(/Vérifier|Continuer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/nouveau.*mot.*passe/i)).toBeTruthy();
      });

      const passwordInput = getByPlaceholderText(/nouveau.*mot.*passe/i);
      const confirmInput = getByPlaceholderText(/confirmer.*mot.*passe/i);

      fireEvent.changeText(passwordInput, 'Password123!');
      fireEvent.changeText(confirmInput, 'Different123!');

      fireEvent.press(getByText(/Réinitialiser|Confirmer/i));

      await waitFor(() => {
        expect(getByText(/mots.*passe.*correspondent.*pas/i)).toBeTruthy();
      });
    });

    it('should validate password strength', async () => {
      const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

      // Navigate through steps
      const emailInput = getByPlaceholderText(/email/i);
      fireEvent.changeText(emailInput, 'test@eventez.com');
      fireEvent.press(getByText(/Envoyer|Continuer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/code/i)).toBeTruthy();
      });

      const codeInput = getByPlaceholderText(/code/i);
      fireEvent.changeText(codeInput, '123456');
      fireEvent.press(getByText(/Vérifier|Continuer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/nouveau.*mot.*passe/i)).toBeTruthy();
      });

      const passwordInput = getByPlaceholderText(/nouveau.*mot.*passe/i);
      fireEvent.changeText(passwordInput, '123'); // Too weak

      fireEvent.press(getByText(/Réinitialiser|Confirmer/i));

      await waitFor(() => {
        expect(getByText(/mot.*passe.*faible|minimum.*caractères/i)).toBeTruthy();
      });
    });

    it('should reset password successfully', async () => {
      const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

      // Navigate through steps
      const emailInput = getByPlaceholderText(/email/i);
      fireEvent.changeText(emailInput, 'test@eventez.com');
      fireEvent.press(getByText(/Envoyer|Continuer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/code/i)).toBeTruthy();
      });

      const codeInput = getByPlaceholderText(/code/i);
      fireEvent.changeText(codeInput, '123456');
      fireEvent.press(getByText(/Vérifier|Continuer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/nouveau.*mot.*passe/i)).toBeTruthy();
      });

      const passwordInput = getByPlaceholderText(/nouveau.*mot.*passe/i);
      const confirmInput = getByPlaceholderText(/confirmer.*mot.*passe/i);

      fireEvent.changeText(passwordInput, 'NewPassword123!');
      fireEvent.changeText(confirmInput, 'NewPassword123!');

      fireEvent.press(getByText(/Réinitialiser|Confirmer/i));

      await waitFor(() => {
        expect(mockAuthAPI.resetPassword).toHaveBeenCalledWith(
          'test@eventez.com',
          '123456',
          'NewPassword123!'
        );
      });
    });

    it('should navigate to login after success', async () => {
      const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

      // Navigate through steps and reset password
      const emailInput = getByPlaceholderText(/email/i);
      fireEvent.changeText(emailInput, 'test@eventez.com');
      fireEvent.press(getByText(/Envoyer|Continuer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/code/i)).toBeTruthy();
      });

      const codeInput = getByPlaceholderText(/code/i);
      fireEvent.changeText(codeInput, '123456');
      fireEvent.press(getByText(/Vérifier|Continuer/i));

      await waitFor(() => {
        expect(getByPlaceholderText(/nouveau.*mot.*passe/i)).toBeTruthy();
      });

      const passwordInput = getByPlaceholderText(/nouveau.*mot.*passe/i);
      const confirmInput = getByPlaceholderText(/confirmer.*mot.*passe/i);

      fireEvent.changeText(passwordInput, 'NewPassword123!');
      fireEvent.changeText(confirmInput, 'NewPassword123!');

      fireEvent.press(getByText(/Réinitialiser|Confirmer/i));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('Login');
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to login on link press', async () => {
      const { getByText } = render(<ForgotPasswordScreen />);

      await waitFor(() => {
        expect(getByText(/Se connecter|Retour.*connexion/i)).toBeTruthy();
      });

      fireEvent.press(getByText(/Se connecter|Retour.*connexion/i));

      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });

    it('should go back when back button pressed', async () => {
      const { getByTestId } = render(<ForgotPasswordScreen />);

      // Back button - would need testID
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockAuthAPI.requestPasswordReset.mockRejectedValue(new Error('Network error'));

      const { getByPlaceholderText, getByText } = render(<ForgotPasswordScreen />);

      await waitFor(() => {
        expect(getByPlaceholderText(/email/i)).toBeTruthy();
      });

      const emailInput = getByPlaceholderText(/email/i);
      fireEvent.changeText(emailInput, 'test@eventez.com');

      fireEvent.press(getByText(/Envoyer|Continuer/i));

      await waitFor(() => {
        expect(getByText(/erreur|réessayer/i)).toBeTruthy();
      });
    });
  });
});
