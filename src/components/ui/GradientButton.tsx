import React from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
  TouchableOpacity,
} from 'react-native';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
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
        return BorderRadius.xl;
      default:
        return BorderRadius.lg;
    }
  };

  // Ghost variant
  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
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
      </TouchableOpacity>
    );
  }

  // Outline variant
  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
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
      </TouchableOpacity>
    );
  }

  // Secondary variant
  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
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
      </TouchableOpacity>
    );
  }

  // Primary variant (solid color)
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.primaryButton,
        getSizeStyle(),
        { borderRadius: getBorderRadius() },
        fullWidth && styles.fullWidth,
        isDisabled && styles.buttonDisabled,
        style,
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ===== PRIMARY BUTTON =====
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  text: {
    color: Colors.white,
    fontFamily: FontFamily.semiBold,
    letterSpacing: 0.3,
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
  // ===== OUTLINE BUTTON =====
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  outlineText: {
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
    letterSpacing: 0.3,
  },
  // ===== SECONDARY BUTTON =====
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray100,
  },
  secondaryText: {
    color: Colors.gray700,
    fontFamily: FontFamily.semiBold,
    letterSpacing: 0.3,
  },
  // ===== GHOST BUTTON =====
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
});
