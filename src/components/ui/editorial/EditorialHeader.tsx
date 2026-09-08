import React from 'react';
import { View, Text, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import { resetToMainTab } from '../../../lib/navigation';
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
  /**
   * Affiche un bouton « Accueil » dans le slot droit (si aucun `right` fourni).
   * Sur les écrans PROFONDS (organisateur, mariage, exposant, wallet…), le seul
   * retour était une chaîne de goBack() : ce bouton effondre la pile et ramène
   * à l'accueil en un tap. Ne pas activer sur les écrans peu profonds.
   */
  home?: boolean;
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
  home = false,
  align = 'center',
  style,
}: EditorialHeaderProps) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  // Bouton « Accueil » : effondre la pile et revient à l'onglet Découvrir.
  const homeButton = home && !right ? (
    <TouchableOpacity
      onPress={() => resetToMainTab(navigation as any, 'Discover')}
      accessibilityRole="button"
      accessibilityLabel={t('common.home', { defaultValue: 'Accueil' })}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Ionicons name="home-outline" size={22} color={colors.gray900} />
    </TouchableOpacity>
  ) : null;

  return (
    <View style={[editorial.header, style]}>
      {back ? (
        <TouchableOpacity
          style={editorial.headerBack}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
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

      <View style={editorial.headerRight}>{right || homeButton}</View>
    </View>
  );
}
