/**
 * Tests pour AuthContext
 * Vérifie la gestion de l'authentification et de l'état utilisateur
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { authAPI, usersAPI, setTokens, clearTokens } from '../../api/client';
import { mockUser } from '../mocks/mockData';

// Mock SecureStore
jest.mock('expo-secure-store');
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

// Mock API client
jest.mock('../../api/client', () => ({
  authAPI: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  },
  usersAPI: {
    getCurrentUser: jest.fn(),
    updateCurrentUser: jest.fn(),
  },
  setTokens: jest.fn(),
  clearTokens: jest.fn(),
}));

const mockAuthAPI = authAPI as jest.Mocked<typeof authAPI>;
const mockUsersAPI = usersAPI as jest.Mocked<typeof usersAPI>;
const mockSetTokens = setTokens as jest.Mock;
const mockClearTokens = clearTokens as jest.Mock;

// Wrapper pour les tests
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Par défaut, pas de token stocké
    mockSecureStore.getItemAsync.mockResolvedValue(null);
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('should provide auth context when used within AuthProvider', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current).toBeDefined();
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Initial State', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Initially isLoading is true during checkAuth
      expect(result.current.isLoading).toBe(true);
    });

    it('should check for existing token on mount', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce('existing-token');
      mockUsersAPI.getCurrentUser.mockResolvedValueOnce({ data: mockUser });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('eventez_access_token');
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('should set isAuthenticated to false when no token exists', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should clear tokens and set unauthenticated on API error', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce('invalid-token');
      mockUsersAPI.getCurrentUser.mockRejectedValueOnce(new Error('Token expired'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockClearTokens).toHaveBeenCalled();
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
      });
    });
  });

  describe('login', () => {
    const loginCredentials = {
      email: 'test@eventez.com',
      password: 'password123',
    };

    it('should login successfully', async () => {
      mockAuthAPI.login.mockResolvedValueOnce({
        data: {
          access: 'new-access-token',
          refresh: 'new-refresh-token',
        },
      });
      mockUsersAPI.getCurrentUser.mockResolvedValueOnce({ data: mockUser });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login(loginCredentials.email, loginCredentials.password);
      });

      expect(mockAuthAPI.login).toHaveBeenCalledWith(
        loginCredentials.email,
        loginCredentials.password
      );
      expect(mockSetTokens).toHaveBeenCalledWith('new-access-token', 'new-refresh-token');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it('should handle login failure', async () => {
      const error = new Error('Invalid credentials');
      mockAuthAPI.login.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login(loginCredentials.email, loginCredentials.password);
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should set loading state during login', async () => {
      let resolveLogin: (value: any) => void;
      mockAuthAPI.login.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLogin = resolve;
          })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.login(loginCredentials.email, loginCredentials.password);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });
    });
  });

  describe('register', () => {
    const registerData = {
      email: 'new@eventez.com',
      username: 'newuser',
      password: 'password123',
      confirm_password: 'password123',
      first_name: 'Jean',
      last_name: 'Dupont',
      phone_number: '+237699999999',
    };

    it('should register and auto-login successfully', async () => {
      mockAuthAPI.register.mockResolvedValueOnce({ data: mockUser });
      mockAuthAPI.login.mockResolvedValueOnce({
        data: {
          access: 'new-access-token',
          refresh: 'new-refresh-token',
        },
      });
      mockUsersAPI.getCurrentUser.mockResolvedValueOnce({ data: mockUser });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.register(registerData);
      });

      expect(mockAuthAPI.register).toHaveBeenCalledWith(registerData);
      expect(mockAuthAPI.login).toHaveBeenCalledWith(registerData.email, registerData.password);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle registration failure', async () => {
      const error = new Error('Email already exists');
      mockAuthAPI.register.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.register(registerData);
        })
      ).rejects.toThrow('Email already exists');

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // Setup authenticated state
      mockSecureStore.getItemAsync.mockResolvedValueOnce('existing-token');
      mockUsersAPI.getCurrentUser.mockResolvedValueOnce({ data: mockUser });
      mockAuthAPI.logout.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockAuthAPI.logout).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should handle logout API failure gracefully', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce('existing-token');
      mockUsersAPI.getCurrentUser.mockResolvedValueOnce({ data: mockUser });
      mockAuthAPI.logout.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Logout should still work even if API call fails
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user data successfully', async () => {
      const updatedUser = { ...mockUser, first_name: 'Pierre' };
      mockSecureStore.getItemAsync.mockResolvedValueOnce('existing-token');
      mockUsersAPI.getCurrentUser.mockResolvedValueOnce({ data: mockUser });
      mockUsersAPI.updateCurrentUser.mockResolvedValueOnce({ data: updatedUser });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await act(async () => {
        await result.current.updateUser({ first_name: 'Pierre' });
      });

      expect(mockUsersAPI.updateCurrentUser).toHaveBeenCalledWith({ first_name: 'Pierre' });
      expect(result.current.user?.first_name).toBe('Pierre');
    });

    it('should handle update failure', async () => {
      const error = new Error('Update failed');
      mockSecureStore.getItemAsync.mockResolvedValueOnce('existing-token');
      mockUsersAPI.getCurrentUser.mockResolvedValueOnce({ data: mockUser });
      mockUsersAPI.updateCurrentUser.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await expect(
        act(async () => {
          await result.current.updateUser({ first_name: 'Pierre' });
        })
      ).rejects.toThrow('Update failed');

      // User should remain unchanged
      expect(result.current.user?.first_name).toBe(mockUser.first_name);
    });
  });
});

describe('AuthContext State Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureStore.getItemAsync.mockResolvedValue(null);
  });

  it('should maintain user state across re-renders', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce('existing-token');
    mockUsersAPI.getCurrentUser.mockResolvedValueOnce({ data: mockUser });

    const { result, rerender } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    // Re-render
    rerender({});

    // User should persist
    expect(result.current.user).toEqual(mockUser);
  });

  it('should provide correct role-based information', async () => {
    const organizerUser = { ...mockUser, role: 'organizer' };
    mockSecureStore.getItemAsync.mockResolvedValueOnce('existing-token');
    mockUsersAPI.getCurrentUser.mockResolvedValueOnce({ data: organizerUser });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user?.role).toBe('organizer');
    });
  });
});
