import React from 'react';
import { StyleSheet, StatusBar, View, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import { pickCanvas } from './editorialTokens';

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
}

/**
 * EditorialCanvas — warm-canvas page wrapper.
 * - Light: #F4F3F0 canvas
 * - Dark: themed background (slate)
 * - Manages StatusBar style
 */
export default function EditorialCanvas({
  children,
  edges = ['top', 'bottom'],
  plain = false,
  style,
  statusBar,
}: EditorialCanvasProps) {
  const { colors, isDark } = useTheme();
  const bg = pickCanvas(isDark, colors.background);

  const content = (
    <>
      <StatusBar
        barStyle={statusBar || (isDark ? 'light-content' : 'dark-content')}
        backgroundColor={bg}
      />
      {children}
    </>
  );

  if (plain) {
    return <View style={[styles.root, { backgroundColor: bg }, style]}>{content}</View>;
  }

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: bg }, style]}
      edges={edges}
    >
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
