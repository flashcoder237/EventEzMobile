/**
 * Hooks pour l'authentification sociale (Google & Apple) et OTP téléphone.
 */

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { authAPI, setTokens } from '../api';
import { User } from '../types';

interface SocialAuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

// Lazy loader pour Google Sign-In : le module natif n'est pas dans Expo Go,
// l'instanciation crash à l'import statique. On charge en runtime avec require()
// pour pouvoir capter l'erreur et désactiver proprement le bouton.
function loadGoogleSignin(): {
  GoogleSignin: any;
  statusCodes: any;
} | null {
  try {
    return require('@react-native-google-signin/google-signin/lib/commonjs');
  } catch {
    return null;
  }
}

/**
 * Hook pour l'authentification Google via le SDK natif.
 * Utilise @react-native-google-signin (Credential Manager sur Android,
 * native API sur iOS) — pas de flux implicite navigateur.
 */
export function useGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const googleModule = loadGoogleSignin();
  const isReady = googleModule !== null;

  const signIn = async (): Promise<SocialAuthResult> => {
    if (!googleModule) {
      return {
        success: false,
        error: 'Google Sign-In nécessite un dev build (indisponible dans Expo Go).',
      };
    }
    const { GoogleSignin, statusCodes } = googleModule;

    setIsLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // v11 API : signIn() retourne le User directement (lance sur cancel/error).
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo?.idToken;

      if (!idToken) {
        return { success: false, error: 'Aucun token reçu de Google' };
      }

      const apiResponse = await authAPI.googleSignIn(idToken);
      const { access, refresh, user } = apiResponse.data;
      await setTokens(access, refresh);
      return { success: true, user };
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return { success: false, error: 'Connexion annulée' };
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        return { success: false, error: 'Connexion déjà en cours' };
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { success: false, error: 'Google Play Services non disponible' };
      }
      if (__DEV__) console.error('Google Sign-In error:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Erreur lors de la connexion Google',
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signIn,
    isLoading,
    isReady,
  };
}

/**
 * Hook pour l'authentification Apple
 */
export function useAppleAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  // Vérifier si Apple Sign-In est disponible
  useEffect(() => {
    const checkAvailability = async () => {
      if (Platform.OS === 'ios') {
        try {
          const available = await AppleAuthentication.isAvailableAsync();
          setIsAvailable(available);
        } catch {
          setIsAvailable(false);
        }
      }
    };
    checkAvailability();
  }, []);

  const signIn = async (): Promise<SocialAuthResult> => {
    if (Platform.OS !== 'ios') {
      return {
        success: false,
        error: 'Apple Sign-In est disponible uniquement sur iOS',
      };
    }

    if (!isAvailable) {
      return {
        success: false,
        error: 'Apple Sign-In n\'est pas disponible sur cet appareil',
      };
    }

    setIsLoading(true);

    try {
      // Générer un nonce pour la sécurité
      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString(36).substring(2) + Date.now().toString()
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce,
      });

      const { identityToken, fullName, email } = credential;

      if (!identityToken) {
        return {
          success: false,
          error: 'Aucun token d\'identité reçu d\'Apple',
        };
      }

      // Préparer les données utilisateur (seulement fourni à la première connexion)
      const userData: {
        email?: string;
        name?: {
          firstName?: string;
          lastName?: string;
        };
      } = {};

      if (email) {
        userData.email = email;
      }

      if (fullName) {
        userData.name = {
          firstName: fullName.givenName || undefined,
          lastName: fullName.familyName || undefined,
        };
      }

      // Envoyer le token au backend pour vérification
      const response = await authAPI.appleSignIn({
        identity_token: identityToken,
        user: Object.keys(userData).length > 0 ? userData : undefined,
      });

      const { access, refresh, user } = response.data;

      // Stocker les tokens
      await setTokens(access, refresh);

      return { success: true, user };
    } catch (error: any) {
      // Gérer l'annulation par l'utilisateur
      if (error.code === 'ERR_REQUEST_CANCELED') {
        return { success: false, error: 'Connexion annulée' };
      }

      if (__DEV__) console.error('Apple Sign-In error:', error);
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        'Erreur lors de la connexion Apple';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signIn,
    isLoading,
    isAvailable,
  };
}

/**
 * Hook pour l'authentification par numéro de téléphone (OTP SMS).
 * Flux : sendOTP(phone) → verifyOTP(phone, code) → User
 */
export function usePhoneAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [normalizedPhone, setNormalizedPhone] = useState('');

  const sendOTP = async (phoneNumber: string): Promise<SocialAuthResult & { normalizedPhone?: string }> => {
    setIsLoading(true);
    try {
      const res = await authAPI.phoneSendOTP(phoneNumber);
      const normalized: string = res.data?.phone_number || phoneNumber;
      setNormalizedPhone(normalized);
      return { success: true, normalizedPhone: normalized };
    } catch (error: any) {
      const msg =
        error.response?.data?.detail ||
        error.message ||
        'Impossible d\'envoyer le SMS';
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (
    phone: string,
    code: string,
  ): Promise<SocialAuthResult> => {
    setIsLoading(true);
    try {
      const res = await authAPI.phoneVerifyOTP(phone || normalizedPhone, code);
      const { access, refresh, user } = res.data;
      await setTokens(access, refresh);
      return { success: true, user };
    } catch (error: any) {
      const msg =
        error.response?.data?.detail ||
        error.message ||
        'Code incorrect ou expiré';
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendOTP,
    verifyOTP,
    isLoading,
    normalizedPhone,
  };
}
