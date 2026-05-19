import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import i18n from 'i18next';
import { authAPI, usersAPI, setTokens, clearTokens, getAccessToken, getRefreshToken } from '../api';
import CacheService from '../services/CacheService';
import { eventBus } from '../lib/eventBus';
import { changeLanguage } from '../i18n';
import { User, AuthState } from '../types';
import { EventEzAnalytics, setAnalyticsUser, clearAnalyticsUser } from '../services/analyticsService';
import { setUser as setCrashUser, clearUser as clearCrashUser } from '../services/crashReporting';
import { getJWTUserId } from '../lib/utils/jwt';

const REMEMBER_ME_KEY = 'eventez_remember_me';

interface AuthContextType extends AuthState {
  /** True only during initial app startup auth check (splash screen) */
  isInitializing: boolean;
  /** Convenience derived flag — true when user is signed in as a guest. */
  isGuest: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User>;
  /** Re-fetch the current user from the API and update local state (e.g. after email verification). */
  refreshUser: () => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    confirm_password: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
  }) => Promise<{ requires_verification: boolean; email: string }>;
  /**
   * Guest checkout : crée (ou réutilise) un compte invité sans mot de passe
   * pour finaliser une inscription à un event gratuit. Le user retourné a
   * is_guest=true. Throw avec error.response.status === 409 si l'email
   * correspond déjà à un compte complet (le mobile bascule alors vers login).
   */
  guestRegister: (data: { email: string; first_name: string; last_name?: string }) => Promise<User>;
  /**
   * Upgrade le compte courant (qui doit être is_guest=true) en compte complet
   * en posant un mot de passe. Déclenche aussi l'envoi d'un email de
   * vérification côté backend.
   */
  upgradeGuest: (data: { password: string; confirm_password: string; last_name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  setUser: (user: User) => Promise<void>;  // Pour l'authentification sociale
  /**
   * Sync local de l'état user — PAS d'appel API. À utiliser après un PATCH
   * fait directement par l'écran (ex: EditProfileScreen) quand on a déjà la
   * réponse complète et qu'on veut juste rafraîchir le contexte.
   * `updateUser(response.data)` re-PATCH le serveur avec l'objet complet (qui
   * contient profile_picture en string URL → 400 backend).
   */
  syncUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Si la préférence backend (`user.language`) diffère de la langue active i18n,
 * applique-la côté client. Garantit qu'un user qui se reconnecte sur un
 * nouvel appareil retrouve sa préférence (même si AsyncStorage local a une
 * autre valeur ou est vide).
 */
async function applyUserLanguagePreference(user: User | null | undefined): Promise<void> {
  const lang = user?.language as 'fr' | 'en' | undefined;
  if (!lang || (lang !== 'fr' && lang !== 'en')) return;
  if (i18n.language === lang) return;
  try {
    await changeLanguage(lang);
  } catch (error) {
    if (__DEV__) console.warn('[Auth] failed to apply user language', error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // isInitializing: true only during the first auth check at app start
  const [isInitializing, setIsInitializing] = useState(true);
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
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
      // Refresh définitif échoué → purger le cache (mémoire + AsyncStorage) pour
      // qu'un nouveau login ne voie pas les données du user expulsé.
      try {
        await CacheService.clearAll();
      } catch (cacheError) {
        if (__DEV__) console.warn('Failed to clear cache on auth error:', cacheError);
      }
      setState({ user: null, isAuthenticated: false, isLoading: false });
    });
    return unsub;
  }, []);

  const checkAuth = async () => {
    try {
      // Plus besoin de checker REMEMBER_ME_KEY ici :
      //   - Si rememberMe=false au login, les tokens n'ont JAMAIS été écrits
      //     en SecureStore — ils vivaient en mémoire et sont morts avec le
      //     process. getAccessToken() retournera null → pas de session.
      //   - Si rememberMe=true, les tokens sont en SecureStore → session
      //     restaurée.
      const token = await getAccessToken();

      if (!token) {
        setState({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const response = await usersAPI.getCurrentUser();
      const user = response.data;

      // Defense-in-depth : si le JWT contient un user_id différent de celui
      // retourné par /users/me/, c'est que le token mémoire et SecureStore
      // sont désynchronisés (corruption, restore atypique, bug). On ferme
      // la session pour repartir d'un état propre. Voir AUDIT §2.4.
      const jwtUserId = getJWTUserId(token);
      if (jwtUserId && String(user.id) !== jwtUserId) {
        if (__DEV__) {
          console.warn(
            `[Auth] JWT user_id (${jwtUserId}) ≠ /users/me/ id (${user.id}) — clearing session`,
          );
        }
        await clearTokens();
        try { await CacheService.clearAll(); } catch { /* ignore */ }
        setState({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      setAnalyticsUser(user.id, { role: user.role || 'user' });
      setCrashUser({ id: user.id, email: user.email, role: user.role });
      // Sync i18n avec la préférence backend (si différente de l'AsyncStorage local)
      applyUserLanguagePreference(user);
    } catch (error) {
      if (__DEV__) console.error('Erreur de vérification auth:', error);
      try {
        await clearTokens();
      } catch (clearError) {
        if (__DEV__) console.warn('Failed to clear tokens during auth check:', clearError);
      }
      setState({ user: null, isAuthenticated: false, isLoading: false });
    } finally {
      setIsInitializing(false);
    }
  };

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = true) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await authAPI.login(email, password);
      const { access, refresh } = response.data;
      // rememberMe=true → tokens en SecureStore (persistent entre sessions)
      // rememberMe=false → tokens en mémoire uniquement (évaporent au kill)
      await setTokens(access, refresh, rememberMe);

      // On garde quand même la préférence sur disque pour que la checkbox
      // du LoginScreen affiche le dernier choix de l'utilisateur.
      await SecureStore.setItemAsync(REMEMBER_ME_KEY, rememberMe.toString());

      const userResponse = await usersAPI.getCurrentUser();
      const user = userResponse.data;
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      EventEzAnalytics.login('email');
      setAnalyticsUser(user.id, { role: user.role || 'user' });
      setCrashUser({ id: user.id, email: user.email, role: user.role });
      // Sync i18n avec la préférence backend (si différente de l'AsyncStorage local)
      applyUserLanguagePreference(user);
      return user;
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

  const guestRegister = useCallback(async (data: { email: string; first_name: string; last_name?: string }) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await authAPI.guestRegister(data);
      const { access, refresh, user } = response.data;
      // Guest sessions persistent jusqu'à ce que le token refresh expire — on
      // applique rememberMe=true pour qu'ils survivent au kill (sinon le user
      // perdrait son billet en quittant l'app).
      await setTokens(access, refresh, true);
      await SecureStore.setItemAsync(REMEMBER_ME_KEY, 'true');
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      EventEzAnalytics.signup('guest');
      setAnalyticsUser(user.id, { role: user.role || 'user' });
      setCrashUser({ id: user.id, email: user.email, role: user.role });
      return user;
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const upgradeGuest = useCallback(async (data: { password: string; confirm_password: string; last_name?: string }) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await authAPI.upgradeGuest(data);
      // Le backend retourne le user mis à jour (is_guest=false). On rafraîchit
      // le state local sans toucher aux tokens (l'access token reste valable).
      setState({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    // ORDRE IMPORTANT pour l'isolation des push notifications :
    // 1. Désenregistrer le push token côté backend AVANT de blackliste les
    //    tokens JWT. Sinon, l'API unregister-device retourne 401 et le
    //    PushDeviceToken reste actif lié à l'ancien user — risque qu'un push
    //    en transit soit livré. Voir UX_AUDIT_NOTIFICATIONS_ISOLATION.md §5.2.
    // 2. Ensuite seulement, authAPI.logout() blackliste le refresh + clear
    //    SecureStore (clearTokens() dans son finally).
    try {
      // Lazy import pour éviter le cycle AuthContext ↔ NotificationContext
      const pushService = (await import('../services/pushNotificationService')).default;
      await pushService.unregisterDevice();
    } catch (error) {
      if (__DEV__) console.warn('Push unregister failed:', error);
    }
    try {
      await authAPI.logout();
    } catch (error) {
      if (__DEV__) console.warn('Logout API call failed:', error);
    }
    EventEzAnalytics.logout();
    clearAnalyticsUser();
    clearCrashUser();
    // Purge mémoire ET AsyncStorage : sans ça, un user qui se reconnecte sur
    // le même device verrait brièvement les données cachées du user précédent
    // (events suivis, conversations, dashboard) le temps qu'une requête fraîche
    // arrive. Voir AUDIT_PROFOND_2026-05-04.md §2.3.
    try {
      await CacheService.clearAll();
    } catch (cacheError) {
      if (__DEV__) console.warn('Cache clearAll on logout failed:', cacheError);
    }
    // Purge le cache fichier des voice messages — eviter qu'un autre user
    // sur le meme device puisse acceder aux .m4a en lisant cacheDirectory.
    // Inclut aussi le cache des voices envoyes (sentVoiceMap) pour la meme
    // raison : un autre user pourrait re-jouer les vocaux du precedent.
    try {
      const { clearVoiceCache, clearSentVoiceCache } = await import('../hooks/useVoicePrefetch');
      await clearVoiceCache();
      clearSentVoiceCache();
    } catch (voiceCacheError) {
      if (__DEV__) console.warn('clearVoiceCache on logout failed:', voiceCacheError);
    }
    // Purge l'état de navigation persisté : sans ça, le prochain user (ou le
    // même user sur un autre compte) verrait au prochain cold start l'écran
    // organizer / paiement / autre sur lequel l'ancien user était.
    try {
      const { clearNavigationState } = await import('../lib/navigationPersistence');
      await clearNavigationState();
    } catch (navError) {
      if (__DEV__) console.warn('clearNavigationState on logout failed:', navError);
    }
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await usersAPI.getCurrentUser();
      setState((prev) => ({ ...prev, user: response.data }));
    } catch (error) {
      if (__DEV__) console.warn('[Auth] refreshUser failed:', error);
    }
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

  // Sync sans API call — utilisé après un PATCH déjà fait par l'écran.
  const syncUser = useCallback((user: User) => {
    setState((prev) => ({ ...prev, user }));
  }, []);

  // Pour l'authentification sociale - met à jour l'utilisateur après connexion
  const setUserFn = useCallback(async (user: User) => {
    const accessToken = await getAccessToken();
    const refreshToken = await getRefreshToken();
    if (!accessToken || !refreshToken) {
      if (__DEV__) console.warn('[Auth] setUser called but tokens not found');
      setState({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    await SecureStore.setItemAsync(REMEMBER_ME_KEY, 'true');
    setState({
      user,
      isAuthenticated: true,
      isLoading: false,
    });
    EventEzAnalytics.login('social');
    setAnalyticsUser(user.id, { role: user.role || 'user' });
    // Sync i18n avec la préférence backend (si différente de l'AsyncStorage local)
    applyUserLanguagePreference(user);
  }, []);

  const value = useMemo(() => ({
    ...state,
    isInitializing,
    isGuest: !!state.user?.is_guest,
    login,
    register,
    guestRegister,
    upgradeGuest,
    logout,
    refreshUser,
    updateUser,
    setUser: setUserFn,
    syncUser,
  }), [state, isInitializing, login, register, guestRegister, upgradeGuest, logout, refreshUser, updateUser, setUserFn, syncUser]);

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
