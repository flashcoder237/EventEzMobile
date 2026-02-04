/**
 * Hooks pour l'authentification sociale (Google & Apple)
 */

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { authAPI, setTokens } from '../api/client';
import { User } from '../types';

// Fermer le navigateur web après l'authentification
WebBrowser.maybeCompleteAuthSession();

// Configuration Google - à remplacer par vos vraies valeurs
const GOOGLE_CONFIG = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
};

interface SocialAuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Hook pour l'authentification Google
 */
export function useGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false);

  // Configurer la requête Google OAuth
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_CONFIG.iosClientId,
    androidClientId: GOOGLE_CONFIG.androidClientId,
    webClientId: GOOGLE_CONFIG.webClientId,
  });

  const signIn = async (): Promise<SocialAuthResult> => {
    if (!request) {
      return {
        success: false,
        error: 'Google Sign-In non configuré. Vérifiez les credentials.',
      };
    }

    setIsLoading(true);

    try {
      const result = await promptAsync();

      if (result.type === 'success') {
        const { id_token } = result.params;

        if (!id_token) {
          return {
            success: false,
            error: 'Aucun token reçu de Google',
          };
        }

        // Envoyer le token au backend pour vérification
        const response = await authAPI.googleSignIn(id_token);
        const { access, refresh, user } = response.data;

        // Stocker les tokens
        await setTokens(access, refresh);

        return { success: true, user };
      } else if (result.type === 'cancel') {
        return { success: false, error: 'Connexion annulée' };
      } else {
        return { success: false, error: 'Échec de la connexion Google' };
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        'Erreur lors de la connexion Google';
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    signIn,
    isLoading,
    isReady: !!request,
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

      console.error('Apple Sign-In error:', error);
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
