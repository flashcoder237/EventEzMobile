import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/theme';

interface DotPatternProps {
  color?: string;
  opacity?: number;
  spacing?: number;
  dotSize?: number;
}

/**
 * Subtle dot-grid background pattern for auth screens.
 * Pure RN Views — no SVG dependency.
 */
export default function DotPattern({
  color = Colors.primary,
  opacity = 0.07,
  spacing = 28,
  dotSize = 3,
}: DotPatternProps) {
  const cols = 16;
  const rows = 35;

  const dots = useMemo(() => {
    const arr = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        arr.push(
          <View
            key={`${r}-${c}`}
            style={{
              position: 'absolute',
              top: r * spacing,
              left: c * spacing,
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: color,
            }}
          />
        );
      }
    }
    return arr;
  }, [color, spacing, dotSize]);

  return (
    <View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      {dots}
    </View>
  );
}
