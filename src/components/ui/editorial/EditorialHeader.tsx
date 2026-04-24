import React from 'react';
import { View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../contexts/ThemeContext';
import { editorial } from './editorialTokens';

interface EditorialHeaderProps {
  /** Uppercase eyebrow above the title (e.g. "PROFIL / 01") */
  eyebrow?: string;
  /** Display-font title — short, editorial */
  title: string;
  /** Optional subtitle under title */
  subtitle?: string;
  /** Show back button (chevron). Default true. */
  back?: boolean;
  onBack?: () => void;
  /** Right-side action (icon button, badge, etc.) */
  right?: React.ReactNode;
  /** Align title center (default) or flush-left */
  align?: 'center' | 'left';
  style?: StyleProp<ViewStyle>;
}

/**
 * Editorial screen header: ghost back + eyebrow + display title + optional right slot.
 * Blends with the canvas (no card bg). Use inside <EditorialCanvas>.
 */
export default function EditorialHeader({
  eyebrow,
  title,
  subtitle,
  back = true,
  onBack,
  right,
  align = 'center',
  style,
}: EditorialHeaderProps) {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={[editorial.header, style]}>
      {back ? (
        <TouchableOpacity
          style={editorial.headerBack}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.gray900} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}

      <View style={align === 'left' ? editorial.headerCenterLeft : editorial.headerCenter}>
        {eyebrow ? (
          <Text style={[editorial.headerEyebrow, { color: colors.gray500 }]} numberOfLines={1}>
            {eyebrow}
          </Text>
        ) : null}
        <Text
          style={[editorial.headerTitle, { color: colors.gray900 }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[editorial.headerSubtitle, { color: colors.gray500 }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={editorial.headerRight}>{right || null}</View>
    </View>
  );
}
