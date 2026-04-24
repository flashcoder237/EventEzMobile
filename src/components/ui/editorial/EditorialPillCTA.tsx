import React from 'react';
import { TouchableOpacity, View, Text, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { Colors } from '../../../constants/theme';
import { editorial } from './editorialTokens';

interface EditorialPillCTAProps {
  /** Uppercase eyebrow (e.g. "SUIVANT", "FINALISER", "OUVRIR") */
  eyebrow: string;
  /** Main label (display font) */
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Icon name for the arrow disc. Default arrow-forward. */
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Use accent/coral background instead of primary/indigo. */
  tone?: 'primary' | 'accent' | 'lime';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Editorial pill CTA: eyebrow + label (dual-line) with a 40px arrow disc on the right.
 * Use for primary screen actions inside a stickyBar or as a standalone CTA.
 */
export default function EditorialPillCTA({
  eyebrow,
  label,
  onPress,
  loading,
  disabled,
  icon = 'arrow-forward',
  tone = 'primary',
  style,
  accessibilityLabel,
}: EditorialPillCTAProps) {
  const { colors } = useTheme();
  const bg =
    tone === 'accent' ? colors.accent : tone === 'lime' ? Colors.lime : colors.primary;
  const shadow =
    tone === 'accent' ? colors.accent : tone === 'lime' ? Colors.limeDark : colors.primary;
  const eyebrowColor = tone === 'lime' ? Colors.gray900 : Colors.lime;
  const labelColor = tone === 'lime' ? Colors.gray900 : '#FFFFFF';

  return (
    <TouchableOpacity
      style={[
        editorial.pillCTA,
        { backgroundColor: bg, shadowColor: shadow },
        disabled && { opacity: 0.6 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      activeOpacity={0.88}
    >
      <View style={editorial.pillCTAContent}>
        <Text style={[editorial.pillCTAEyebrow, { color: eyebrowColor }]}>
          {eyebrow}
        </Text>
        <Text style={[editorial.pillCTALabel, { color: labelColor }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={editorial.pillCTAArrow}>
        {loading ? (
          <ActivityIndicator size="small" color={labelColor} />
        ) : (
          <Ionicons name={icon} size={18} color={labelColor} />
        )}
      </View>
    </TouchableOpacity>
  );
}
