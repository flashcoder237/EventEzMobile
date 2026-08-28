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

interface DateTimePickerFieldProps {
  value?: Date;
  onChange: (date: Date) => void;
  label?: string;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Two-step picker: tap → date picker → automatically time picker → onChange with combined Date.
 * On Android: two sequential dialogs. On iOS: modal with date first, then time.
 */
export default function DateTimePickerField({
  value,
  onChange,
  label,
  error,
  minimumDate,
  maximumDate,
  disabled = false,
  placeholder,
}: DateTimePickerFieldProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const resolvedPlaceholder = placeholder ?? t('componentsUI.dateTimePickerPlaceholder');
  const [pickerStep, setPickerStep] = useState<'hidden' | 'date' | 'time'>('hidden');
  const [tempDate, setTempDate] = useState<Date>(value || new Date());

  const formatDateTime = (date: Date) => {
    const locale = t('componentsUI.dateTimePickerLocale');
    const separator = t('componentsUI.dateTimePickerSeparator');
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }) + separator + date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openPicker = () => {
    if (disabled) return;
    setTempDate(value || new Date());
    setPickerStep('date');
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (_event.type === 'dismissed') {
        setPickerStep('hidden');
        return;
      }
      if (selectedDate) {
        // Preserve time from current value
        const merged = new Date(selectedDate);
        const timeSource = value || new Date();
        merged.setHours(timeSource.getHours(), timeSource.getMinutes());
        setTempDate(merged);
        // Move to time step
        setPickerStep('time');
      }
    } else if (selectedDate) {
      // iOS: continuous update
      const merged = new Date(selectedDate);
      merged.setHours(tempDate.getHours(), tempDate.getMinutes());
      setTempDate(merged);
    }
  };

  const handleTimeChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setPickerStep('hidden');
      if (selectedDate && _event.type !== 'dismissed') {
        const merged = new Date(tempDate);
        merged.setHours(selectedDate.getHours(), selectedDate.getMinutes());
        onChange(merged);
      }
    } else if (selectedDate) {
      // iOS: continuous update
      const merged = new Date(tempDate);
      merged.setHours(selectedDate.getHours(), selectedDate.getMinutes());
      setTempDate(merged);
    }
  };

  const handleIOSConfirm = () => {
    onChange(tempDate);
    setPickerStep('hidden');
  };

  const handleIOSNext = () => {
    setPickerStep('time');
  };

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
        onPress={openPicker}
        activeOpacity={disabled ? 1 : TOUCH_OPACITY}
      >
        <Text style={value ? [styles.valueText, { color: colors.gray900 }] : [styles.placeholderText, { color: colors.gray400 }]}>
          {value ? formatDateTime(value) : resolvedPlaceholder}
        </Text>
        <Ionicons
          name="calendar-outline"
          size={20}
          color={error ? colors.error : colors.gray400}
        />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* iOS: Modal flow */}
      {Platform.OS === 'ios' && pickerStep !== 'hidden' && (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.gray100 }]}>
                <TouchableOpacity onPress={() => setPickerStep('hidden')}>
                  <Text style={[styles.modalCancel, { color: colors.gray500 }]}>{t('componentsUI.modalCancel')}</Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.gray900 }]}>
                  {pickerStep === 'date' ? t('componentsUI.modalChooseDate') : t('componentsUI.modalChooseTime')}
                </Text>
                <TouchableOpacity
                  onPress={pickerStep === 'date' ? handleIOSNext : handleIOSConfirm}
                >
                  <Text style={[styles.modalDone, { color: colors.primary }]}>
                    {pickerStep === 'date' ? t('componentsUI.modalNext') : t('componentsUI.modalValidate')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Step indicator */}
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, { backgroundColor: colors.gray200 }, pickerStep === 'date' && [styles.stepDotActive, { backgroundColor: colors.primary }]]} />
                <View style={[styles.stepLine, { backgroundColor: colors.gray200 }]} />
                <View style={[styles.stepDot, { backgroundColor: colors.gray200 }, pickerStep === 'time' && [styles.stepDotActive, { backgroundColor: colors.primary }]]} />
              </View>

              {pickerStep === 'date' && (
                <RNDateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  onChange={handleDateChange}
                  locale="fr-FR"
                  // iOS : la modale a un fond CLAIR (colors.card) → forcer le
                  // picker en thème clair + texte sombre, sinon en mode sombre
                  // système le spinner rend un texte blanc INVISIBLE sur blanc.
                  themeVariant="light"
                  textColor="#111111"
                />
              )}
              {pickerStep === 'time' && (
                <RNDateTimePicker
                  value={tempDate}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                  locale="fr-FR"
                  themeVariant="light"
                  textColor="#111111"
                />
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Android: Sequential dialogs */}
      {Platform.OS === 'android' && pickerStep === 'date' && (
        <RNDateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleDateChange}
        />
      )}
      {Platform.OS === 'android' && pickerStep === 'time' && (
        <RNDateTimePicker
          value={tempDate}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
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
    flex: 1,
  },
  placeholderText: {
    fontSize: FontSizes.base,
    fontFamily: FontFamily.regular,
    color: Colors.gray400,
    flex: 1,
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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.gray200,
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: Colors.gray200,
  },
});
