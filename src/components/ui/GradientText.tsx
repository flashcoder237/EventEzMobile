import React, { memo } from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

interface GradientTextProps extends TextProps {
  colors?: readonly string[];
  children: React.ReactNode;
  style?: TextStyle;
}

function GradientTextComponent({ colors, children, style, ...props }: GradientTextProps) {
  const { gradients } = useTheme();
  const gradientColors = colors || gradients.brand;

  return (
    <MaskedView
      maskElement={
        <Text {...props} style={[style, { backgroundColor: 'transparent' }]}>
          {children}
        </Text>
      }
    >
      <LinearGradient
        colors={gradientColors as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text {...props} style={[style, { opacity: 0 }]}>
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}

export const GradientText = memo(GradientTextComponent);
export default GradientText;
