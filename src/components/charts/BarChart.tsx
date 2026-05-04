import React, { memo, useMemo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import { useTheme } from '../../contexts/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { FontFamily, Spacing } from '../../constants/theme';

/**
 * Bar chart minimaliste maison — pas de lib externe.
 *
 * Features :
 * - Axe Y à 3 graduations (max, milieu, 0) avec lignes pointillées en fond.
 * - Animation d'entrée stagger : chaque barre grandit de 0 à sa hauteur cible
 *   avec un delay basé sur l'index (effet "vague"). Désactivé si reduced motion.
 * - Tap sur une barre → highlight + valeur affichée au-dessus pendant 2s.
 * - Format de nombre court (1.2K, 5M) pour les graduations Y.
 *
 * Limites assumées : pas de zoom/pan, pas de tooltip flottant complexe — c'est
 * un chart d'aperçu, pas un outil d'exploration. Pour ça il faudrait `victory-native`
 * ou `react-native-gifted-charts`.
 */
export interface BarChartDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartDatum[];
  /** Gradient des barres : [haut, bas]. Default = indigo. */
  gradientColors?: [string, string];
  /** Hauteur totale du chart (incluant labels X). Default = 160. */
  height?: number;
  /** Formate la valeur affichée au tap et en axe Y. Default = `n.toLocaleString()`. */
  formatValue?: (n: number) => string;
}

const DEFAULT_FORMAT = (n: number): string => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toLocaleString();
};

const Y_AXIS_WIDTH = 28;
const X_LABEL_HEIGHT = 18;
const HIGHLIGHT_DURATION_MS = 2000;

interface AnimatedBarProps {
  heightPct: number;
  gradientColors: [string, string];
  delayMs: number;
  reducedMotion: boolean;
  highlighted: boolean;
}

const AnimatedBar = memo(function AnimatedBar({
  heightPct,
  gradientColors,
  delayMs,
  reducedMotion,
  highlighted,
}: AnimatedBarProps) {
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      delayMs,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
  }, [heightPct, reducedMotion, delayMs, progress]);

  const animStyle = useAnimatedStyle(() => ({
    height: `${heightPct * progress.value}%` as any,
  }));

  return (
    <Animated.View style={[styles.barWrap, animStyle]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          styles.bar,
          highlighted && {
            shadowColor: gradientColors[0],
            shadowOpacity: 0.6,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
            elevation: 6,
          },
        ]}
      />
    </Animated.View>
  );
});

function BarChart({
  data,
  gradientColors = ['#4F46E5', '#312E81'],
  height = 160,
  formatValue = DEFAULT_FORMAT,
}: BarChartProps) {
  const { colors, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(0);

  const maxVal = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);
  const midVal = maxVal / 2;

  const handleBarPress = (idx: number) => {
    setHighlightedIdx(idx);
    // Auto-clear le highlight après ~2s pour ne pas garder une barre en highlight
    // après que l'utilisateur a regardé ailleurs.
    setTimeout(() => setHighlightedIdx((curr) => (curr === idx ? null : curr)), HIGHLIGHT_DURATION_MS);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    setChartWidth(e.nativeEvent.layout.width);
  };

  const yAxisColor = isDark ? colors.gray400 : colors.gray500;
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  // Position du tooltip : au-dessus de la barre highlightée. On évite que le
  // tooltip dépasse à gauche/droite du chart en clampant.
  const tooltipLeft = useMemo(() => {
    if (highlightedIdx === null || chartWidth === 0) return 0;
    const slotWidth = (chartWidth - Y_AXIS_WIDTH) / Math.max(data.length, 1);
    const center = Y_AXIS_WIDTH + slotWidth * (highlightedIdx + 0.5);
    return Math.max(Y_AXIS_WIDTH, Math.min(center - 30, chartWidth - 60));
  }, [highlightedIdx, chartWidth, data.length]);

  return (
    <View style={[styles.container, { height }]} onLayout={onLayout}>
      {/* Tooltip flottant — au-dessus de la barre tappée */}
      {highlightedIdx !== null && data[highlightedIdx] && (
        <View
          style={[
            styles.tooltip,
            {
              left: tooltipLeft,
              backgroundColor: colors.text,
            },
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.tooltipValue, { color: colors.background }]}>
            {formatValue(data[highlightedIdx].value)}
          </Text>
        </View>
      )}

      <View style={styles.plotRow}>
        {/* Axe Y — 3 graduations */}
        <View style={styles.yAxis}>
          <Text style={[styles.yAxisLabel, { color: yAxisColor }]} numberOfLines={1}>
            {formatValue(maxVal)}
          </Text>
          <Text style={[styles.yAxisLabel, { color: yAxisColor }]} numberOfLines={1}>
            {formatValue(midVal)}
          </Text>
          <Text style={[styles.yAxisLabel, { color: yAxisColor }]} numberOfLines={1}>
            0
          </Text>
        </View>

        {/* Zone de tracé */}
        <View style={styles.plot}>
          {/* Lignes de grille horizontales (au niveau des graduations Y) */}
          <View style={[styles.gridLine, { top: 0, backgroundColor: gridColor }]} />
          <View style={[styles.gridLine, { top: '50%', backgroundColor: gridColor }]} />
          <View style={[styles.gridLine, { bottom: 0, backgroundColor: gridColor }]} />

          {/* Barres */}
          <View style={styles.barsRow}>
            {data.map((item, idx) => {
              const heightPct = (item.value / maxVal) * 100;
              return (
                <Pressable
                  key={`${item.label}-${idx}`}
                  onPress={() => handleBarPress(idx)}
                  style={styles.barColumn}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label} : ${formatValue(item.value)}`}
                  hitSlop={4}
                >
                  <AnimatedBar
                    heightPct={heightPct}
                    gradientColors={gradientColors}
                    delayMs={idx * 50}
                    reducedMotion={reducedMotion}
                    highlighted={highlightedIdx === idx}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* Labels X — alignés avec la zone de tracé (pas avec l'axe Y) */}
      <View style={styles.xLabelsRow}>
        <View style={{ width: Y_AXIS_WIDTH }} />
        <View style={styles.xLabelsInner}>
          {data.map((item, idx) => (
            <Text
              key={`label-${idx}`}
              style={[styles.xLabel, { color: yAxisColor }]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

export default memo(BarChart);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 22, // place pour le tooltip
  },
  tooltip: {
    position: 'absolute',
    top: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
    zIndex: 10,
  },
  tooltipValue: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  plotRow: {
    flex: 1,
    flexDirection: 'row',
  },
  yAxis: {
    width: Y_AXIS_WIDTH,
    justifyContent: 'space-between',
    paddingVertical: 2,
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  yAxisLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  plot: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  barColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
  },
  barWrap: {
    width: 18,
    minHeight: 4,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  xLabelsRow: {
    flexDirection: 'row',
    height: X_LABEL_HEIGHT,
    marginTop: 6,
  },
  xLabelsInner: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  xLabel: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
