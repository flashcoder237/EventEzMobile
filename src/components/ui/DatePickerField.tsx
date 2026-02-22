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
import {
  Colors,
  FontSizes,
  FontFamily,
  BorderRadius,
  Spacing,
  Shadows,
  TOUCH_OPACITY,
} from '../../constants/theme';

interface DatePickerFieldProps {
  value?: Date;
  onChange: (date: Date) => void;
  label?: string;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  placeholder?: string;
}

export default function DatePickerField({
  value,
  onChange,
  label,
  error,
  minimumDate,
  maximumDate,
  disabled = false,
  placeholder = 'Sélectionner une date',
}: DatePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (selectedDate && _event.type !== 'dismissed') {
        onChange(selectedDate);
      }
    } else if (selectedDate) {
      // iOS: update continuously, dismiss via modal button
      onChange(selectedDate);
    }
  };

  const renderPicker = () => (
    <RNDateTimePicker
      value={value || new Date()}
      mode="date"
      display="spinner"
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      onChange={handleChange}
      locale="fr-FR"
    />
  );

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, error && styles.labelError]}>
          {label}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.trigger,
          error && styles.triggerError,
          disabled && styles.triggerDisabled,
        ]}
        onPress={() => !disabled && setShowPicker(true)}
        activeOpacity={disabled ? 1 : TOUCH_OPACITY}
      >
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value ? formatDate(value) : placeholder}
        </Text>
        <Ionicons
          name="calendar-outline"
          size={20}
          color={error ? Colors.error : Colors.gray400}
        />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* iOS: Modal with Done button */}
      {Platform.OS === 'ios' && showPicker && (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.modalCancel}>Annuler</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{label || 'Date'}</Text>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.modalDone}>Valider</Text>
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
