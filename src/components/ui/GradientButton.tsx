import React from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedPressable from './AnimatedPressable';
import {
  Colors,
  FontSizes,
  FontWeights,
  BorderRadius,
  Spacing,
  Shadows,
  Gradients,
} from '../../constants/theme';

interface GradientButtonProps {
  onPress: () => void;
  title: string;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
}

export default function GradientButton({
  onPress,
  title,
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'right',
  style,
  textStyle,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: GradientButtonProps) {
  const isDisabled = disabled || loading;

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'xs':
        return { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md };
      case 'sm':
        return { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.base };
      case 'lg':
        return { paddingVertical: Spacing.md + 2, paddingHorizontal: Spacing.xl };
      case 'xl':
        return { paddingVertical: Spacing.lg, paddingHorizontal: Spacing['2xl'] };
      default:
        return { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'xs':
        return FontSizes.xs;
      case 'sm':
        return FontSizes.sm;
      case 'lg':
        return FontSizes.base;
      case 'xl':
        return FontSizes.lg;
      default:
        return FontSizes.md;
    }
  };

  const getBorderRadius = () => {
    switch (size) {
      case 'xs':
        return BorderRadius.md;
      case 'sm':
        return BorderRadius.lg;
      case 'lg':
      case 'xl':
        return BorderRadius['2xl'];
      default:
        return BorderRadius.xl;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'xs':
        return 14;
      case 'sm':
        return 16;
      case 'lg':
      case 'xl':
        return 22;
      default:
        return 18;
    }
  };

  // Ghost variant
  if (variant === 'ghost') {
    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={isDisabled}
        animationType="scale"
        scaleValue={0.96}
        style={[
          styles.ghostButton,
          getSizeStyle(),
          fullWidth && styles.fullWidth,
          isDisabled && styles.buttonDisabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <View style={styles.iconLeft}>{icon}</View>
            )}
            <Text
              style={[
                styles.ghostText,
                { fontSize: getFontSize() },
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && (
              <View style={styles.iconRight}>{icon}</View>
            )}
          </>
        )}
      </AnimatedPressable>
    );
  }

  // Outline variant
  if (variant === 'outline') {
    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={isDisabled}
        animationType="both"
        scaleValue={0.97}
        style={[
          styles.outlineButton,
          getSizeStyle(),
          { borderRadius: getBorderRadius() },
          fullWidth && styles.fullWidth,
          isDisabled && styles.buttonDisabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <View style={styles.iconLeft}>{icon}</View>
            )}
            <Text
              style={[
                styles.outlineText,
                { fontSize: getFontSize() },
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && (
              <View style={styles.iconRight}>{icon}</View>
            )}
          </>
        )}
      </AnimatedPressable>
    );
  }

  // Secondary variant
  if (variant === 'secondary') {
    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={isDisabled}
        animationType="both"
        scaleValue={0.97}
        style={[
          styles.secondaryButton,
          getSizeStyle(),
          { borderRadius: getBorderRadius() },
          fullWidth && styles.fullWidth,
          isDisabled && styles.buttonDisabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <View style={styles.iconLeft}>{icon}</View>
            )}
            <Text
              style={[
                styles.secondaryText,
                { fontSize: getFontSize() },
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && (
              <View style={styles.iconRight}>{icon}</View>
            )}
          </>
        )}
      </AnimatedPressable>
    );
  }

  // Primary variant (gradient)
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      animationType="lift"
      scaleValue={0.97}
      style={[
        fullWidth && styles.fullWidth,
        isDisabled && styles.buttonDisabled,
        style,
      ]}
    >
      <LinearGradient
        colors={Gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.gradient,
          getSizeStyle(),
          { borderRadius: getBorderRadius() },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <View style={styles.iconLeft}>{icon}</View>
            )}
            <Text
              style={[
                styles.text,
                { fontSize: getFontSize() },
                textStyle,
              ]}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && (
              <View style={styles.iconRight}>{icon}</View>
            )}
          </>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.violet,
  },
  text: {
    color: Colors.white,
    fontWeight: FontWeights.semibold,
    letterSpacing: 0.3,
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  outlineText: {
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
    letterSpacing: 0.3,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryBg,
  },
  secondaryText: {
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
    letterSpacing: 0.3,
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: Colors.primary,
    fontWeight: FontWeights.semibold,
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  fullWidth: {
    width: '100%',
  },
});
