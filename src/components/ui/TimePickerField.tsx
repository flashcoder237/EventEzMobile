import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
  TOUCH_OPACITY,
} from '../../constants/theme';

interface TimePickerFieldProps {
  value?: Date;
  onChange: (date: Date) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

export default function TimePickerField({
  value,
  onChange,
  label,
  error,
  disabled = false,
  placeholder,
}: TimePickerFieldProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [showPicker, setShowPicker] = useState(false);
  const resolvedPlaceholder = placeholder ?? t('componentsUI.timePickerPlaceholder');

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (selectedDate && _event.type !== 'dismissed') {
        onChange(selectedDate);
      }
    } else if (selectedDate) {
      onChange(selectedDate);
    }
  };

  const renderPicker = () => (
    <RNDateTimePicker
      value={value || new Date()}
      mode="time"
      display="spinner"
      onChange={handleChange}
      locale="fr-FR"
      // iOS : la modale a un fond CLAIR → forcer le picker en thème clair +
      // texte sombre, sinon en mode sombre système le spinner est invisible.
      themeVariant="light"
      textColor="#111111"
    />
  );

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.gray700 }, error && styles.labelError]}>
          {label}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.trigger,
          { backgroundColor: colors.gray50, borderColor: colors.gray200 },
          error && styles.triggerError,
          disabled && styles.triggerDisabled,
        ]}
        onPress={() => !disabled && setShowPicker(true)}
        activeOpacity={disabled ? 1 : TOUCH_OPACITY}
      >
        <Text style={value ? [styles.valueText, { color: colors.gray900 }] : [styles.placeholderText, { color: colors.gray400 }]}>
          {value ? formatTime(value) : resolvedPlaceholder}
        </Text>
        <Ionicons
          name="time-outline"
          size={20}
          color={error ? colors.error : colors.gray400}
        />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* iOS: Modal with Done button */}
      {Platform.OS === 'ios' && showPicker && (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.gray100 }]}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={[styles.modalCancel, { color: colors.gray500 }]}>{t('componentsUI.modalCancel')}</Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.gray900 }]}>{label || t('componentsUI.modalTime')}</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={[styles.modalDone, { color: colors.primary }]}>{t('componentsUI.modalValidate')}</Text>
                </TouchableOpacity>
              </View>
              {renderPicker()}
            </View>
          </View>
        </Modal>
      )}

      {/* Android: inline picker auto-dismisses */}
      {Platform.OS === 'android' && showPicker && renderPicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSizes.sm,
    fontFamily: FontFamily.medium,
    color: Colors.gray700,
    marginBottom: Spacing.xs,
  },
  labelError: {
    color: Colors.error,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.gray50,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  triggerError: {
    borderColor: Colors.error,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  valueText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray900,
  },
  placeholderText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray400,
  },
  errorText: {
    fontSize: FontSizes.xs,
    fontFamily: FontFamily.regular,
    color: Colors.error,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    paddingBottom: Spacing['3xl'],
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  modalTitle: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
  },
  modalCancel: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray500,
  },
  modalDone: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
});
