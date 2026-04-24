import React from 'react';
import { Text, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { editorial, pickWatermark } from './editorialTokens';

interface WatermarkNumeralProps {
  /** The big faded label — can be a step number ("01"), a section letter ("P"), or a short token. */
  children: string;
  size?: 'lg' | 'md';
  style?: StyleProp<TextStyle>;
}

/**
 * Giant faded display-font numeral/letter used as a backdrop behind scroll content.
 * Place as a sibling of the scroll view inside a `scrollWrap` container.
 */
export default function WatermarkNumeral({
  children,
  size = 'lg',
  style,
}: WatermarkNumeralProps) {
  const { isDark } = useTheme();
  return (
    <Text
      pointerEvents="none"
      style={[
        size === 'md' ? editorial.watermarkSmall : editorial.watermark,
        { color: pickWatermark(isDark) },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
