import React, { memo, useState, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  INPUT_BORDER_RADIUS,
} from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  /** Right-side micro-text (char counter, optional indicator, etc.) */
  labelTrailing?: string;
  error?: string;
  success?: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  /** Typographic variant: "default" (body regular) or "title" (Funnel Display semibold) */
  variant?: 'default' | 'title';
  /** Label d'accessibilite personnalise */
  accessibilityLabel?: string;
  /** Indice d'accessibilite */
  accessibilityHint?: string;
}

const AnimatedView = Animated.View;

function InputComponent({
  label,
  labelTrailing,
  error,
  success,
  hint,
  icon,
  iconRight,
  disabled = false,
  secureTextEntry,
  containerStyle,
  variant = 'default',
  accessibilityLabel: a11yLabel,
  accessibilityHint: a11yHint,
  ...textInputProps
}: InputProps) {
  const { colors, isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  const [secureVisible, setSecureVisible] = useState(!secureTextEntry);
  const shakeX = useSharedValue(0);

  // Shake on error
  useEffect(() => {
    if (error) {
      shakeX.value = withSequence(
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(4, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [error]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const getBorderColor = () => {
    if (error) return colors.error;
    if (success) return colors.success;
    if (focused) return colors.primary;
    return isDark ? colors.gray300 : '#E0E7FF';
  };

  const handleFocus = useCallback((e: any) => {
    setFocused(true);
    textInputProps.onFocus?.(e);
  }, [textInputProps.onFocus]);

  const handleBlur = useCallback((e: any) => {
    setFocused(false);
    textInputProps.onBlur?.(e);
  }, [textInputProps.onBlur]);

  return (
    <AnimatedView style={[shakeStyle, containerStyle]}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.gray600 }]}>{label}</Text>
          {labelTrailing ? (
            <Text style={[styles.labelTrailing, { color: colors.gray400 }]}>{labelTrailing}</Text>
          ) : null}
        </View>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: isDark ? colors.card : colors.card,
            borderColor: getBorderColor(),
            borderWidth: focused ? 1.5 : 1,
          },
          disabled && { opacity: 0.5 },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={focused ? colors.primary : colors.gray400}
            style={styles.iconLeft}
          />
        )}
        <TextInput
          {...textInputProps}
          editable={!disabled}
          secureTextEntry={secureTextEntry && !secureVisible}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={colors.textTertiary}
          accessible={true}
          accessibilityLabel={a11yLabel || label || textInputProps.placeholder}
          accessibilityHint={a11yHint || (hint ? hint : undefined)}
          accessibilityState={disabled ? { disabled: true } : undefined}
          style={[
            styles.input,
            variant === 'title' && styles.inputTitle,
            { color: colors.text },
            icon && { paddingLeft: 0 },
            (iconRight || secureTextEntry) && { paddingRight: 0 },
          ]}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setSecureVisible(!secureVisible)}
            style={styles.iconRight}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={secureVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.gray400}
            />
          </TouchableOpacity>
        )}
        {iconRight && !secureTextEntry && (
          <Ionicons
            name={iconRight}
            size={20}
            color={colors.gray400}
            style={styles.iconRight}
          />
        )}
      </View>
      {error && (
        <Text style={[styles.helperText, { color: colors.error }]}>{error}</Text>
      )}
      {success && !error && (
        <Text style={[styles.helperText, { color: colors.success }]}>{success}</Text>
      )}
      {hint && !error && !success && (
        <Text style={[styles.helperText, { color: colors.textTertiary }]}>{hint}</Text>
      )}
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  label: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  labelTrailing: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: INPUT_BORDER_RADIUS,
    paddingHorizontal: Spacing.base,
    minHeight: 50,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    paddingVertical: Spacing.md,
  },
  inputTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 18,
    letterSpacing: -0.3,
    paddingVertical: 16,
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
  helperText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.xs,
    lineHeight: 16,
    marginTop: Spacing.xs,
  },
});

export const Input = memo(InputComponent);
export default Input;
