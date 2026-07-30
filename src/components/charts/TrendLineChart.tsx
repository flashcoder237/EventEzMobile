// ============================================
// TrendLineChart — wrapper léger autour de react-native-chart-kit LineChart
// ============================================
//
// Le but est d'avoir UN composant simple, themable, qu'on peut réutiliser
// pour revenue trend, registrations over time, etc., sans réécrire 60 lignes
// de config par appel.
//
// Si la série est vide (pas encore de données), on render rien — c'est au
// caller de gérer l'empty state pour donner du contexte (les analytics
// mensuelles sur un event sans historique = on attend les données).

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';

interface Props {
  /** Section eyebrow above the title (uppercase, letter-spaced). */
  eyebrow?: string;
  /** Section title shown above the chart. */
  title: string;
  /** Optional helper text under the title. */
  subtitle?: string;
  /** Labels d'axe X (mois, jours, semaines…). */
  labels: string[];
  /** Valeurs Y alignées avec labels. */
  values: number[];
  /** Symbole de devise/unité affiché en suffixe sur l'axe Y. */
  unitSuffix?: string;
  /** Color hex pour la ligne. Default = primary. */
  color?: string;
  /** Hauteur en px (default 220). */
  height?: number;
  /** Si true, affiche les data dots et leur valeur au-dessus. */
  withDataPointLabels?: boolean;
}


export default function TrendLineChart({
  eyebrow,
  title,
  subtitle,
  labels,
  values,
  unitSuffix = '',
  color,
  height = 220,
  withDataPointLabels = false,
}: Props) {
  const { colors, isDark } = useTheme();

  // Largeur du graphe = largeur RÉELLE mesurée du conteneur (onLayout), et non
  // un SCREEN_WIDTH figé au chargement du module. Sinon, sur iPad (mode compat)
  // ou dans un conteneur plus étroit/large, le chart est mal dimensionné.
  const [chartWidth, setChartWidth] = useState(0);

  // Garde-fous : si aucune valeur ou tous zéros → on n'affiche rien plutôt
  // qu'un graphe plat trompeur. Le caller peut décider de remplacer par un
  // empty state au-dessus.
  const hasData = values.length > 0 && values.some(v => Number.isFinite(v));
  if (!hasData) return null;

  // chart-kit demande les données alignées (labels.length === values.length).
  // Si désync, on tronque à la plus courte.
  const length = Math.min(labels.length, values.length);
  const safeLabels = labels.slice(0, length);
  const safeValues = values.slice(0, length).map(v => Number.isFinite(v) ? v : 0);

  const lineColor = color || colors.primary;

  // Configuration chart-kit. La couleur de la ligne / des labels prend en
  // entrée une fonction (opacity → string), ce qui permet à la lib d'animer
  // l'opacité interne. On lit colors via `useTheme` pour rester aligné.
  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => hexWithOpacity(lineColor, opacity),
    labelColor: (opacity = 1) =>
      hexWithOpacity(isDark ? '#94A3B8' : '#64748B', opacity),
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: lineColor,
    },
    propsForBackgroundLines: {
      strokeDasharray: '3,6',
      stroke: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    },
  };

  // Largeur interne du graphe (conteneur mesuré moins le padding de la carte).
  const innerChartWidth = chartWidth > 0 ? chartWidth - Spacing.lg * 2 : 0;

  return (
    <View
      onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: isDark ? colors.gray200 : 'rgba(0,0,0,0.06)' },
        Shadows.sm,
      ]}
    >
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: colors.accent }]}>{eyebrow}</Text>
      ) : null}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.gray500 }]}>{subtitle}</Text>
      ) : null}

      {innerChartWidth > 0 && (
      <LineChart
        data={{
          labels: safeLabels,
          datasets: [{ data: safeValues }],
        }}
        width={innerChartWidth - Spacing.md * 2}
        height={height}
        yAxisSuffix={unitSuffix ? ` ${unitSuffix}` : ''}
        withInnerLines
        withOuterLines={false}
        withDots
        withShadow={false}
        bezier
        chartConfig={chartConfig}
        style={styles.chart}
        renderDotContent={withDataPointLabels ? ({ x, y, index }) => (
          <Text
            key={index}
            style={[styles.dotLabel, { color: colors.text, top: y - 18, left: x - 16 }]}
          >
            {safeValues[index]}
          </Text>
        ) : undefined}
      />
      )}
    </View>
  );
}

/**
 * Convertit un hex `#RRGGBB` en rgba avec opacité — chart-kit attend ce format
 * dans ses fonctions `color()` / `labelColor()`. Si l'input n'est pas un hex
 * valide, on retourne tel quel (chart-kit tolère).
 */
function hexWithOpacity(hex: string, opacity: number): string {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) {
    return hex;
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    paddingRight: 0,
    overflow: 'hidden',
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.lg,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginBottom: Spacing.sm,
  },
  chart: {
    marginVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    paddingRight: 0,
  },
  dotLabel: {
    position: 'absolute',
    fontFamily: FontFamily.bold,
    fontSize: 10,
    width: 32,
    textAlign: 'center',
  },
});
