/**
 * Test Utilities
 * Utilitaires pour les tests React Native
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '../../contexts/AuthContext';
import { mockUser } from './mockData';

// ============================================
// PROVIDERS WRAPPER
// ============================================

interface WrapperProps {
  children: React.ReactNode;
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
  isAuthenticated?: boolean;
  user?: typeof mockUser | null;
}

// Wrapper avec tous les providers nécessaires
const AllTheProviders = ({ children }: WrapperProps) => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AuthProvider>
          {children}
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

// Wrapper minimal sans auth
const MinimalProviders = ({ children }: WrapperProps) => {
  return (
    <SafeAreaProvider>
      {children}
    </SafeAreaProvider>
  );
};

// Wrapper avec navigation
const NavigationProviders = ({ children }: WrapperProps) => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {children}
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

// ============================================
// CUSTOM RENDER FUNCTIONS
// ============================================

/**
 * Render avec tous les providers
 */
const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions,
) => {
  return render(ui, { wrapper: AllTheProviders, ...options });
};

/**
 * Render minimal (sans auth)
 */
const renderWithMinimalProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  return render(ui, { wrapper: MinimalProviders, ...options });
};

/**
 * Render avec navigation seulement
 */
const renderWithNavigation = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  return render(ui, { wrapper: NavigationProviders, ...options });
};

// ============================================
// MOCK HOOKS
// ============================================

/**
 * Mock du contexte d'authentification
 */
export const mockAuthContext = (overrides = {}) => ({
  user: mockUser,
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  updateUser: jest.fn(),
  refreshUser: jest.fn(),
  ...overrides,
});

/**
 * Mock de la navigation
 */
export const mockNavigation = (overrides = {}) => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn(),
  setOptions: jest.fn(),
  setParams: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
  getParent: jest.fn(),
  getState: jest.fn(),
  ...overrides,
});

/**
 * Mock de la route
 */
export const mockRoute = (params = {}) => ({
  key: 'test-route-key',
  name: 'TestScreen',
  params,
});

// ============================================
// ASYNC HELPERS
// ============================================

/**
 * Attendre que les promesses soient résolues
 */
export const flushPromises = () =>
  new Promise(resolve => setImmediate(resolve));

/**
 * Attendre un délai
 */
export const waitFor = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Simuler une action async dans act()
 */
export const actAsync = async (callback: () => Promise<void>) => {
  const { act } = require('@testing-library/react-native');
  await act(async () => {
    await callback();
    await flushPromises();
  });
};

// ============================================
// ASSERTION HELPERS
// ============================================

/**
 * Vérifier si un élément est visible
 */
export const expectToBeVisible = (element: any) => {
  expect(element).toBeTruthy();
  expect(element.props.style).not.toContainEqual({ display: 'none' });
  expect(element.props.style).not.toContainEqual({ opacity: 0 });
};

/**
 * Vérifier si un bouton est désactivé
 */
export const expectToBeDisabled = (element: any) => {
  expect(element.props.disabled).toBe(true);
};

/**
 * Vérifier le texte d'un élément
 */
export const expectText = (element: any, text: string) => {
  expect(element.children).toContain(text);
};

// ============================================
// EVENT HELPERS
// ============================================

/**
 * Créer un événement de changement de texte
 */
export const createChangeEvent = (value: string) => ({
  nativeEvent: { text: value },
});

/**
 * Créer un événement de scroll
 */
export const createScrollEvent = (options: {
  contentOffset?: { x: number; y: number };
  contentSize?: { width: number; height: number };
  layoutMeasurement?: { width: number; height: number };
} = {}) => ({
  nativeEvent: {
    contentOffset: options.contentOffset || { x: 0, y: 0 },
    contentSize: options.contentSize || { width: 375, height: 1000 },
    layoutMeasurement: options.layoutMeasurement || { width: 375, height: 667 },
  },
});

// ============================================
// FORM HELPERS
// ============================================

/**
 * Remplir un formulaire
 */
export const fillForm = async (
  getByTestId: (testId: string) => any,
  fields: Record<string, string>,
  fireEvent: any,
) => {
  for (const [testId, value] of Object.entries(fields)) {
    const input = getByTestId(testId);
    fireEvent.changeText(input, value);
  }
};

// ============================================
// SNAPSHOT HELPERS
// ============================================

/**
 * Créer un snapshot simplifié (sans styles inline)
 */
export const createSimpleSnapshot = (element: ReactElement) => {
  const { toJSON } = render(element, { wrapper: MinimalProviders });
  return toJSON();
};

// ============================================
// EXPORTS
// ============================================

export * from '@testing-library/react-native';
export { customRender as render };
export { renderWithMinimalProviders, renderWithNavigation };
