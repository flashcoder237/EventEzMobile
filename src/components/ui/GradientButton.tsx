/**
 * Composant GradientButton
 * Bouton stylise avec plusieurs variantes
 */

import React, { memo } from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TOUCH_OPACITY,
  DISABLED_OPACITY,
  BUTTON_BORDER_RADIUS,
} from '../../constants/theme';

interface GradientButtonProps {
  /** Callback appele lors du clic */
  onPress: () => void;
  /** Texte du bouton */
  title: string;
  /** Afficher un indicateur de chargement */
  loading?: boolean;
  /** Desactiver le bouton */
  disabled?: boolean;
  /** Icone React Node personnalisee */
  icon?: React.ReactNode;
  /** Nom de l'icone Ionicons a gauche */
  iconLeft?: keyof typeof Ionicons.glyphMap;
  /** Nom de l'icone Ionicons a droite */
  iconRight?: keyof typeof Ionicons.glyphMap;
  /** Position de l'icone (si icon est utilise) */
  iconPosition?: 'left' | 'right';
  /** Style personnalise du container */
  style?: ViewStyle;
  /** Style personnalise du texte */
  textStyle?: TextStyle;
  /** Variante du bouton */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /** Taille du bouton */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Prendre toute la largeur disponible */
  fullWidth?: boolean;
}

function GradientButtonComponent({
  onPress,
  title,
  loading = false,
  disabled = false,
  icon,
  iconLeft,
  iconRight,
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

  const getIconSize = () => {
    switch (size) {
      case 'xs':
        return 14;
      case 'sm':
        return 16;
      case 'lg':
        return 20;
      case 'xl':
        return 22;
      default:
        return 18;
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
        return BUTTON_BORDER_RADIUS;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return Colors.white;
      case 'secondary':
        return Colors.gray700;
      case 'outline':
      case 'ghost':
        return Colors.primary;
      default:
        return Colors.white;
    }
  };

  const getLoaderColor = () => {
    return variant === 'primary' ? Colors.white : Colors.primary;
  };

  const renderIcon = (position: 'left' | 'right') => {
    const iconName = position === 'left' ? iconLeft : iconRight;
    const hasCustomIcon = icon && iconPosition === position;

    if (!iconName && !hasCustomIcon) return null;

    const iconStyle = position === 'left' ? styles.iconLeft : styles.iconRight;

    if (hasCustomIcon) {
      return <View style={iconStyle}>{icon}</View>;
    }

    if (iconName) {
      return (
        <Ionicons
          name={iconName}
          size={getIconSize()}
          color={getTextColor()}
          style={iconStyle}
        />
      );
    }

    return null;
  };

  const buttonStyle = (() => {
    switch (variant) {
      case 'ghost':
        return styles.ghostButton;
      case 'outline':
        return styles.outlineButton;
      case 'secondary':
        return styles.secondaryButton;
      default:
        return styles.primaryButton;
    }
  })();

  const textStyleVariant = (() => {
    switch (variant) {
      case 'ghost':
        return styles.ghostText;
      case 'outline':
        return styles.outlineText;
      case 'secondary':
        return styles.secondaryText;
      default:
        return styles.text;
    }
  })();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={TOUCH_OPACITY}
      style={[
        buttonStyle,
        getSizeStyle(),
        { borderRadius: getBorderRadius() },
        fullWidth && styles.fullWidth,
        isDisabled && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getLoaderColor()} size="small" />
      ) : (
        <>
          {renderIcon('left')}
          <Text
            style={[
              textStyleVariant,
              { fontSize: getFontSize() },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {renderIcon('right')}
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
    marginRight: Spacing.xs,
  },
  iconRight: {
    marginLeft: Spacing.xs,
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
    opacity: DISABLED_OPACITY,
  },
  fullWidth: {
    width: '100%',
  },
});

export const GradientButton = memo(GradientButtonComponent);
export default GradientButton;
