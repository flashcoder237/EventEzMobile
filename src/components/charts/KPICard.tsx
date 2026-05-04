import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';

/**
 * Composant KPI unifié — remplace les anciens duplicatas KPICardE (inline
 * AnalyticsDashboardScreen) et StatCard (inline EventAnalyticsScreen).
 *
 * Supporte 2 styles via le prop `variant` :
 * - `basic` (default) : title + value (+ subtitle), look stat card simple.
 *   → Utilisé par Treasury, EventAnalytics.
 * - `editorial` : eyebrow + value (+ suffix) + label, avec trend badge dans le
 *   coin haut-droit. Look magazine/data viz.
 *   → Utilisé par AnalyticsDashboard.
 *
 * `trend` accepte deux formats pour la rétro-compat :
 * - number : `12.5` → "+13%", `-5` → "−5%", `0..1` → "—" (flat).
 * - object : `{ value: 12, label: 'vs mois dernier' }` (legacy KPICard).
 */
interface KPICardProps {
  /** Titre simple (variant basic). Affiché sous la valeur en gris. */
  title?: string;
  /** Eyebrow uppercase (variant editorial). Affiché au-dessus de la valeur en accent. */
  eyebrow?: string;
  /** Label (variant editorial). Affiché sous la valeur en gris. */
  label?: string;
  /** Valeur principale, large. */
  value: string | number;
  /** Unité affichée à côté de la valeur (ex: 'FCFA', '%'). */
  suffix?: string;
  /** Texte secondaire optionnel. */
  subtitle?: string;
  /** Icône Ionicons en haut. */
  icon: keyof typeof Ionicons.glyphMap;
  /** Couleur d'accent (icône + trend). */
  color: string;
  /** Tendance — number simple ou objet `{ value, label }`. */
  trend?: number | { value: number; label?: string };
  /** Style preset. `editorial` = look AnalyticsDashboard, `basic` = look StatCard. */
  variant?: 'basic' | 'editorial';
  /** Override container style si besoin (ex: largeur fixe dans une grid). */
  style?: ViewStyle;
}

function KPICard({
  title,
  eyebrow,
  label,
  value,
  suffix,
  subtitle,
  icon,
  color,
  trend,
  variant = 'basic',
  style,
}: KPICardProps) {
  const { colors } = useTheme();

  // Normalise le trend en `{ value: number, hasLabel?: string }` quel que soit
  // le format d'entrée. Évite le branching dans le JSX.
  const trendValue = typeof trend === 'number' ? trend : trend?.value;
  const trendLabel = typeof trend === 'object' ? trend.label : undefined;
  const hasTrend = trendValue !== undefined;
  const trendUp = hasTrend && trendValue > 0;
  const trendFlat = hasTrend && Math.abs(trendValue) < 1;
  const trendBgColor = trendFlat
    ? colors.gray100
    : trendUp
      ? '#10B98115'
      : '#EF444415';
  const trendFgColor = trendFlat ? colors.gray500 : trendUp ? '#10B981' : '#EF4444';

  if (variant === 'editorial') {
    return (
      <View style={[styles.containerEditorial, { backgroundColor: colors.card, borderColor: colors.gray200 }, Shadows.sm, style]}>
        <View style={styles.topRow}>
          <View style={[styles.iconContainer, { backgroundColor: `${color}15`, width: 32, height: 32, borderRadius: 16 }]}>
            <Ionicons name={icon} size={16} color={color} />
          </View>
          {hasTrend && (
            <View style={[styles.trendBadge, { backgroundColor: trendBgColor }]}>
              <Ionicons
                name={trendFlat ? 'remove' : trendUp ? 'trending-up' : 'trending-down'}
                size={9}
                color={trendFgColor}
              />
              <Text style={[styles.trendTextSmall, { color: trendFgColor }]}>
                {trendFlat ? '—' : `${trendUp ? '+' : ''}${Math.round(trendValue!)}%`}
              </Text>
            </View>
          )}
        </View>
        {eyebrow && <Text style={[styles.eyebrow, { color: colors.accent }]}>{eyebrow}</Text>}
        <Text style={[styles.valueEditorial, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
          {suffix && <Text style={[styles.suffix, { color: colors.gray500 }]}> {suffix}</Text>}
        </Text>
        {label && <Text style={[styles.labelEditorial, { color: colors.gray500 }]}>{label}</Text>}
        {subtitle && <Text style={[styles.subtitle, { color: colors.gray400 }]}>{subtitle}</Text>}
      </View>
    );
  }

  // variant === 'basic' (default) — look StatCard / legacy KPICard
  return (
    <View style={[styles.container, { backgroundColor: colors.card }, Shadows.card, style]}>
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        {hasTrend && (
          <View style={[styles.trendBadge, { backgroundColor: trendBgColor }]}>
            <Ionicons
              name={trendFlat ? 'remove' : trendUp ? 'trending-up' : 'trending-down'}
              size={14}
              color={trendFgColor}
            />
            <Text style={[styles.trendText, { color: trendFgColor }]}>
              {trendFlat ? '—' : `${Math.abs(trendValue!)}%`}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.value, { color: colors.gray900 }]}>
        {value}
        {suffix && <Text style={[styles.suffix, { color: colors.gray500 }]}> {suffix}</Text>}
      </Text>
      {title && <Text style={[styles.title, { color: colors.gray500 }]}>{title}</Text>}
      {(subtitle || trendLabel) && (
        <Text style={[styles.subtitle, { color: colors.gray400 }]}>{subtitle || trendLabel}</Text>
      )}
    </View>
  );
}

export default memo(KPICard);

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    flex: 1,
  },
  containerEditorial: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    gap: 3,
  },
  trendText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
  },
  trendTextSmall: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: -0.1,
  },
  // Editorial variant
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  valueEditorial: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize: 22,
    letterSpacing: -0.7,
    lineHeight: 26,
    marginBottom: 2,
  },
  labelEditorial: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    letterSpacing: -0.1,
  },
  // Basic variant
  value: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes['2xl'],
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  // Common
  suffix: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
});
