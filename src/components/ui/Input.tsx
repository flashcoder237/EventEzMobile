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
  error?: string;
  success?: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

const AnimatedView = Animated.View;

function InputComponent({
  label,
  error,
  success,
  hint,
  icon,
  iconRight,
  disabled = false,
  secureTextEntry,
  containerStyle,
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
    return isDark ? colors.gray300 : '#EDE9FE';
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
        <Text style={[styles.label, { color: colors.gray700 }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: isDark ? colors.gray100 : colors.gray50,
            borderColor: getBorderColor(),
            borderWidth: focused ? 2 : 1,
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
          style={[
            styles.input,
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
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: INPUT_BORDER_RADIUS,
    paddingHorizontal: Spacing.base,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.base,
    paddingVertical: Spacing.md,
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
  helperText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
  },
});

export const Input = memo(InputComponent);
export default Input;
