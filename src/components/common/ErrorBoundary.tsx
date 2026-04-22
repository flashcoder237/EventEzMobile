/**
 * ErrorBoundary Component
 * Catches uncaught JavaScript errors in the component tree and displays
 * a friendly error screen with retry and navigation options.
 */

import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Alert as AlertIllustration, AnimatedIllustration } from '../illustrations';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import GradientButton from '../ui/GradientButton';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional callback when the user presses "Retour a l'accueil" */
  onGoHome?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (__DEV__) console.error('[ErrorBoundary] Uncaught error:', error);
    if (__DEV__) console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onGoHome) {
      this.props.onGoHome();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallbackUI
          error={this.state.error}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}

/** Functional wrapper for the error UI so it can use useTheme() hook */
function ErrorFallbackUI({
  error,
  onRetry,
  onGoHome,
}: {
  error: Error | null;
  onRetry: () => void;
  onGoHome: () => void;
}) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.white} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Illustration */}
          <AnimatedIllustration entry="bounce" idle="breathe">
            <View style={styles.illustrationContainer}>
              <AlertIllustration color={colors.primary} size={200} />
            </View>
          </AnimatedIllustration>

          {/* Title */}
          <Text style={[styles.eyebrow, { color: colors.accent }]}>Pépin</Text>
          <Text style={[styles.title, { color: colors.gray900 }]}>
            Oups ! Quelque chose s'est mal passe
          </Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: colors.gray500 }]}>
            Nous sommes desoles, une erreur inattendue s'est produite.
          </Text>

          {/* Error details (dev only) */}
          {__DEV__ && error && (
            <View style={[styles.errorDetailsContainer, { backgroundColor: colors.errorLight, borderColor: colors.error + '30' }]}>
              <Text style={[styles.errorDetailsLabel, { color: colors.error }]}>Details de l'erreur :</Text>
              <Text style={[styles.errorDetailsText, { color: colors.errorDark }]} numberOfLines={4}>
                {error.message}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <GradientButton
              title="Reessayer"
              onPress={onRetry}
              variant="primary"
              size="lg"
              fullWidth
              iconLeft="refresh-outline"
            />

            <View style={styles.buttonSpacer} />

            <GradientButton
              title="Retour a l'accueil"
              onPress={onGoHome}
              variant="outline"
              size="lg"
              fullWidth
              iconLeft="home-outline"
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  illustrationContainer: {
    position: 'relative',
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  outerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  decorStar1: {
    position: 'absolute',
    top: 10,
    right: 5,
  },
  decorStar2: {
    position: 'absolute',
    bottom: 20,
    left: 5,
  },
  decorDot: {
    position: 'absolute',
    top: 30,
    left: 15,
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.3,
    color: Colors.gray900,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: FontSizes.xl * 1.3,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    color: Colors.gray500,
    textAlign: 'center',
    lineHeight: FontSizes.base * 1.6,
    maxWidth: 300,
    marginBottom: Spacing['2xl'],
  },
  errorDetailsContainer: {
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  errorDetailsLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
    color: Colors.error,
    marginBottom: Spacing.xs,
  },
  errorDetailsText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    color: Colors.errorDark,
    lineHeight: FontSizes.xs * 1.5,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
  },
  buttonSpacer: {
    height: Spacing.md,
  },
});
