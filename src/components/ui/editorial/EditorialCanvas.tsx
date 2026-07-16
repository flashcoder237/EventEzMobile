import React from 'react';
import { StyleSheet, StatusBar, View, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from '../../../contexts/ThemeContext';
import { pickCanvas, pickCanvasGradient, canvasGradientLocations } from './editorialTokens';

type Glow = 'none' | 'indigo' | 'coral';

interface EditorialCanvasProps {
  children: React.ReactNode;
  edges?: Edge[];
  /**
   * If true, renders as a plain <View> (for use inside other safe-area wrappers).
   * Default: wraps in SafeAreaView with edges ['top','bottom'].
   */
  plain?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Optional status-bar override — defaults to dark content on light canvas. */
  statusBar?: 'dark-content' | 'light-content';
  /**
   * Depth gradient behind content (apple-design §12 materials & depth). On by default —
   * a barely-there "lit from above" warmth. Set false for a flat fill.
   */
  depth?: boolean;
  /**
   * Optional brand-tinted glow blooming from the top (apple-design §12). Opt-in, for
   * hero screens (Discover, auth). Kept low-opacity so it never steals focus (§16 restraint).
   */
  glow?: Glow;
}

/**
 * EditorialCanvas — warm-canvas page wrapper.
 * - Light: #F4F3F0 canvas
 * - Dark: themed background (slate)
 * - Subtle top-lit depth gradient behind content (opt-out via depth={false})
 * - Optional brand glow for hero screens (glow="indigo" | "coral")
 * - Manages StatusBar style
 */
export default function EditorialCanvas({
  children,
  edges = ['top', 'bottom'],
  plain = false,
  style,
  statusBar,
  depth = true,
  glow = 'none',
}: EditorialCanvasProps) {
  const { colors, isDark } = useTheme();
  const bg = pickCanvas(isDark, colors.background);
  const gradient = pickCanvasGradient(isDark, colors.background);
  // Unique gradient id (avoids SVG id collisions when canvases nest); ':' is invalid in url().
  const gradId = 'cg' + React.useId().replace(/:/g, '');

  const glowColor =
    glow === 'coral'
      ? '#FF6B6B'
      : glow === 'indigo'
      ? isDark
        ? '#818CF8'
        : '#4F46E5'
      : null;

  const content = (
    <>
      <StatusBar
        barStyle={statusBar || (isDark ? 'light-content' : 'dark-content')}
        backgroundColor={bg}
      />
      {children}
    </>
  );

  // Full-bleed backdrop — covers insets too, so no seam between notch and body.
  const backdrop = (
    <>
      {depth ? (
        <LinearGradient
          colors={gradient}
          locations={canvasGradientLocations}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      {glowColor ? (
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient id={gradId} cx="0.5" cy="0" r="0.8">
              <Stop offset="0" stopColor={glowColor} stopOpacity={isDark ? 0.2 : 0.13} />
              <Stop offset="1" stopColor={glowColor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradId})`} />
        </Svg>
      ) : null}
    </>
  );

  if (plain) {
    return (
      <View style={[styles.root, { backgroundColor: bg }, style]}>
        {backdrop}
        {content}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      {backdrop}
      <SafeAreaView style={[styles.root, styles.transparent, style]} edges={edges}>
        {content}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  transparent: { backgroundColor: 'transparent' },
});
