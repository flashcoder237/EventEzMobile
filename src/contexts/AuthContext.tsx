import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI, usersAPI, setTokens, clearTokens } from '../api';
import CacheService from '../services/CacheService';
import { eventBus } from '../lib/eventBus';
import { User, AuthState } from '../types';
import { EventEzAnalytics, setAnalyticsUser, clearAnalyticsUser } from '../services/analyticsService';
import { setUser as setSentryUser, clearUser as clearSentryUser } from '../services/sentryService';

const REMEMBER_ME_KEY = 'eventez_remember_me';

interface AuthContextType extends AuthState {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    confirm_password: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
  }) => Promise<{ requires_verification: boolean; email: string }>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  setUser: (user: User) => Promise<void>;  // Pour l'authentification sociale
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Vérifier l'authentification au démarrage
  useEffect(() => {
    checkAuth();
  }, []);

  // Ecouter les erreurs d'authentification definitives (refresh echoue)
  useEffect(() => {
    const unsub = eventBus.on('api-auth-error', async () => {
      if (__DEV__) console.log('[Auth] Received api-auth-error event, clearing session');
      try {
        await clearTokens();
      } catch (clearError) {
        if (__DEV__) console.warn('Failed to clear tokens on auth error:', clearError);
      }
      // Ne pas toucher REMEMBER_ME_KEY — l'utilisateur devra se reconnecter
      // mais sa préférence "Se souvenir de moi" est préservée
      setState({ user: null, isAuthenticated: false, isLoading: false });
    });
    return unsub;
  }, []);

  const checkAuth = async () => {
    try {
      const rememberMe = await SecureStore.getItemAsync(REMEMBER_ME_KEY);
      const token = await SecureStore.getItemAsync('eventez_access_token');

      if (!token) {
        // Pas de token : pas d'auto-connexion possible
        setState({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      // Si "Se souvenir de moi" explicitement désactivé, effacer les tokens
      if (rememberMe === 'false') {
        if (__DEV__) console.log('[Auth] Remember me disabled, clearing tokens');
        await clearTokens();
        setState({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      // rememberMe est 'true' ou null (jamais configuré = auto-connexion par défaut)
      const response = await usersAPI.getCurrentUser();
      const user = response.data;
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      setAnalyticsUser(user.id, { role: user.role || 'user' });
      setSentryUser({ id: user.id, email: user.email, role: user.role });
    } catch (error) {
      if (__DEV__) console.error('Erreur de vérification auth:', error);
      // Token invalide/expiré, nettoyer
      try {
        await clearTokens();
      } catch (clearError) {
        if (__DEV__) console.warn('Failed to clear tokens during auth check:', clearError);
      }
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  };

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = true) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await authAPI.login(email, password);
      const { access, refresh } = response.data;
      await setTokens(access, refresh);

      // Sauvegarder la préférence "Se souvenir de moi"
      await SecureStore.setItemAsync(REMEMBER_ME_KEY, rememberMe.toString());

      const userResponse = await usersAPI.getCurrentUser();
      const user = userResponse.data;
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      // Track login in analytics & error monitoring
      EventEzAnalytics.login('email');
      setAnalyticsUser(user.id, { role: user.role || 'user' });
      setSentryUser({ id: user.id, email: user.email, role: user.role });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const register = useCallback(async (data: {
    email: string;
    username: string;
    password: string;
    confirm_password: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
  }): Promise<{ requires_verification: boolean; email: string }> => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await authAPI.register(data);
      setState((prev) => ({ ...prev, isLoading: false }));
      EventEzAnalytics.signup('email');
      return {
        requires_verification: response.data?.requires_verification ?? true,
        email: response.data?.email ?? data.email,
      };
    } catch (error: any) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      if (__DEV__) console.warn('Logout API call failed:', error);
    }
    // Track logout in analytics & error monitoring
    EventEzAnalytics.logout();
    clearAnalyticsUser();
    clearSentryUser();

    // Filet de securite : s'assurer que les tokens sont bien supprimes
    try {
      await clearTokens();
    } catch (clearError) {
      if (__DEV__) console.warn('Failed to clear tokens during logout:', clearError);
    }
    // Vider le cache mémoire — les données AsyncStorage restent pour le prochain login
    CacheService.clearMemory();
    // Ne PAS réinitialiser REMEMBER_ME_KEY — la préférence est conservée
    // pour le prochain login. Les tokens effacés empêchent l'auto-connexion.
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const updateUser = useCallback(async (data: Partial<User>) => {
    try {
      const response = await usersAPI.updateCurrentUser(data);
      setState((prev) => ({
        ...prev,
        user: response.data,
      }));
    } catch (error) {
      throw error;
    }
  }, []);

  // Pour l'authentification sociale - met à jour l'utilisateur après connexion
  const setUserFn = useCallback(async (user: User) => {
    const accessToken = await SecureStore.getItemAsync('eventez_access_token');
    const refreshToken = await SecureStore.getItemAsync('eventez_refresh_token');
    if (!accessToken || !refreshToken) {
      if (__DEV__) console.warn('[Auth] setUser called but tokens not found');
      setState({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    // Activer "Se souvenir de moi" par défaut pour l'authentification sociale
    await SecureStore.setItemAsync(REMEMBER_ME_KEY, 'true');
    setState({
      user,
      isAuthenticated: true,
      isLoading: false,
    });
    EventEzAnalytics.login('social');
    setAnalyticsUser(user.id, { role: user.role || 'user' });
    setSentryUser({ id: user.id, email: user.email, role: user.role });
  }, []);

  const value = useMemo(() => ({
    ...state,
    login,
    register,
    logout,
    updateUser,
    setUser: setUserFn,
  }), [state, login, register, logout, updateUser, setUserFn]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
