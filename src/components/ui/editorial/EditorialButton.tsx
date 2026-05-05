import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { Colors, FontFamily, FontSizes, Spacing } from '../../../constants/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Tone = 'primary' | 'accent' | 'lime';

interface EditorialButtonProps {
  /** Texte principal du bouton (toujours requis) */
  label: string;
  /** Eyebrow uppercase optionnel — si fourni, layout dual-line style EditorialPillCTA */
  eyebrow?: string;
  onPress: () => void;
  variant?: Variant;
  /** Couleur d'accent pour le primary (defaults à primary) */
  tone?: Tone;
  loading?: boolean;
  disabled?: boolean;
  /** Icône Ionicons. Sur primary, devient le disc à droite. Sur secondary/danger, gauche du label. */
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  fullWidth?: boolean;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * EditorialButton — composant unifié pour CTAs.
 *
 * Variants :
 * - `primary`   : pilule pleine (gradient/couleur tone). Avec eyebrow → 2 lignes
 *                 + arrow disc à droite (style EditorialPillCTA classique).
 *                 Sans eyebrow → label centré, optionnellement avec disc.
 * - `secondary` : pilule outline (border colorée, fond transparent).
 * - `danger`    : pilule outline rouge.
 * - `ghost`     : sans bordure, label seul (CTA tertiaire).
 *
 * Pour CTAs principaux d'écrans avec une vibe éditoriale, garde l'eyebrow
 * (ex: "Entrer" / "Se connecter"). Pour AuthGuardScreen ou écrans utilitaires,
 * laisse-le vide.
 */
export default function EditorialButton({
  label,
  eyebrow,
  onPress,
  variant = 'primary',
  tone = 'primary',
  loading,
  disabled,
  icon,
  fullWidth = true,
  size = 'lg',
  style,
  accessibilityLabel,
}: EditorialButtonProps) {
  const { colors, isDark } = useTheme();

  const accentColor =
    tone === 'accent' ? colors.accent : tone === 'lime' ? Colors.lime : colors.primary;
  const dangerColor = '#EF4444';

  const isCompact = size === 'md';
  const verticalPadding = isCompact ? 4 : 6;
  const arrowSize = isCompact ? 36 : 40;

  // Style commun à tous les variants
  const baseStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: eyebrow ? 'space-between' : 'center',
    paddingLeft: Spacing.lg,
    paddingRight: eyebrow || icon ? 6 : Spacing.lg,
    paddingVertical: verticalPadding,
    borderRadius: 999,
    minHeight: isCompact ? 48 : 54,
    ...(fullWidth ? { width: '100%' } : { flex: 1 }),
  };

  // Couleurs par variant
  let bgColor: string;
  let borderColor: string;
  let labelColor: string;
  let eyebrowColor: string;
  let iconColor: string;
  let shadowConfig: ViewStyle | null = null;

  if (variant === 'primary') {
    bgColor = accentColor;
    borderColor = accentColor;
    labelColor = tone === 'lime' ? Colors.gray900 : '#FFFFFF';
    eyebrowColor = tone === 'lime' ? Colors.gray900 : Colors.lime;
    iconColor = labelColor;
    shadowConfig = {
      shadowColor: accentColor,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 16,
      elevation: 5,
    };
  } else if (variant === 'secondary') {
    bgColor = 'transparent';
    borderColor = isDark ? colors.gray400 : colors.gray700;
    labelColor = isDark ? colors.text : colors.gray900;
    eyebrowColor = colors.gray500;
    iconColor = labelColor;
  } else if (variant === 'danger') {
    bgColor = 'transparent';
    borderColor = dangerColor;
    labelColor = dangerColor;
    eyebrowColor = dangerColor;
    iconColor = dangerColor;
  } else {
    // ghost
    bgColor = 'transparent';
    borderColor = 'transparent';
    labelColor = colors.text;
    eyebrowColor = colors.gray500;
    iconColor = labelColor;
  }

  const isOutlineLike = variant === 'secondary' || variant === 'danger';
  const showArrowDisc = variant === 'primary' && (eyebrow || icon);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={variant === 'ghost' ? 0.6 : 0.88}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      style={[
        baseStyle,
        {
          backgroundColor: bgColor,
          borderWidth: isOutlineLike ? 1.5 : 0,
          borderColor,
        },
        shadowConfig,
        disabled && { opacity: 0.55 },
        style,
      ]}
    >
      {eyebrow ? (
        <View style={styles.dualContent}>
          <Text
            style={[styles.eyebrow, { color: eyebrowColor }]}
            numberOfLines={1}
          >
            {eyebrow.toUpperCase()}
          </Text>
          <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      ) : (
        <View style={styles.singleContent}>
          {icon && !showArrowDisc && (
            <Ionicons
              name={icon}
              size={isCompact ? 16 : 18}
              color={iconColor}
              style={{ marginRight: 8 }}
            />
          )}
          {loading ? (
            <ActivityIndicator size="small" color={iconColor} />
          ) : (
            <Text style={[styles.labelCentered, { color: labelColor }]} numberOfLines={1}>
              {label}
            </Text>
          )}
        </View>
      )}

      {showArrowDisc && (
        <View
          style={[
            styles.arrowDisc,
            {
              width: arrowSize,
              height: arrowSize,
              borderRadius: arrowSize / 2,
              backgroundColor: 'rgba(255,255,255,0.18)',
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={iconColor} />
          ) : (
            <Ionicons name={icon || 'arrow-forward'} size={isCompact ? 16 : 18} color={iconColor} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  dualContent: {
    flex: 1,
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  singleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.8,
    lineHeight: 11,
  },
  label: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.2,
    marginTop: 2,
  },
  labelCentered: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: FontSizes.base,
    letterSpacing: -0.2,
  },
  arrowDisc: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
