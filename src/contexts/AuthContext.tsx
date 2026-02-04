import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI, usersAPI, setTokens, clearTokens } from '../api/client';
import { User, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    confirm_password: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  setUser: (user: User) => void;  // Pour l'authentification sociale
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

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('eventez_access_token');
      if (token) {
        const response = await usersAPI.getCurrentUser();
        setState({
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Erreur de vérification auth:', error);
      await clearTokens();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  };

  const login = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await authAPI.login(email, password);
      const { access, refresh } = response.data;
      await setTokens(access, refresh);

      const userResponse = await usersAPI.getCurrentUser();
      setState({
        user: userResponse.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const register = async (data: {
    email: string;
    username: string;
    password: string;
    confirm_password: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
  }) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await authAPI.register(data);
      // Connecter automatiquement après inscription
      await login(data.email, data.password);
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.warn('Logout API call failed:', error);
    }
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const updateUser = async (data: Partial<User>) => {
    try {
      const response = await usersAPI.updateCurrentUser(data);
      setState((prev) => ({
        ...prev,
        user: response.data,
      }));
    } catch (error) {
      throw error;
    }
  };

  // Pour l'authentification sociale - met à jour l'utilisateur après connexion
  const setUser = (user: User) => {
    setState({
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        updateUser,
        setUser,
      }}
    >
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
