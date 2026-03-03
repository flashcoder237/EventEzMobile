import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useExport, ExportFormat } from '../../hooks/useExport';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
  TOUCH_OPACITY,
} from '../../constants/theme';

interface ExportButtonProps {
  endpoint: string;
  filename: string;
  params?: Record<string, string>;
  formats?: ExportFormat[];
  /** Icon-only compact mode */
  compact?: boolean;
}

const FORMAT_OPTIONS: { format: ExportFormat; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { format: 'csv', label: 'CSV', icon: 'document-text-outline' },
  { format: 'excel', label: 'Excel (.xlsx)', icon: 'grid-outline' },
  { format: 'pdf', label: 'PDF', icon: 'document-outline' },
];

export default function ExportButton({
  endpoint,
  filename,
  params = {},
  formats = ['csv', 'excel', 'pdf'],
  compact = false,
}: ExportButtonProps) {
  const { colors, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const { exportData, loading } = useExport();

  const handleSelect = async (format: ExportFormat) => {
    setVisible(false);
    await exportData(endpoint, format, filename, params);
  };

  const filteredOptions = FORMAT_OPTIONS.filter((o) => formats.includes(o.format));

  return (
    <>
      <TouchableOpacity
        style={[styles.button, compact && styles.buttonCompact, { borderColor: colors.gray200, backgroundColor: colors.card }]}
        onPress={() => setVisible(true)}
        disabled={loading}
        activeOpacity={TOUCH_OPACITY}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="download-outline" size={20} color={colors.primary} />
        )}
        {!compact && <Text style={[styles.buttonText, { color: colors.primary }]}>Exporter</Text>}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.title, { color: colors.gray900 }]}>Choisir le format</Text>
            {filteredOptions.map((option) => (
              <TouchableOpacity
                key={option.format}
                style={[styles.option, { borderBottomColor: colors.gray100 }]}
                onPress={() => handleSelect(option.format)}
                activeOpacity={TOUCH_OPACITY}
              >
                <Ionicons name={option.icon} size={22} color={colors.gray500} />
                <Text style={[styles.optionText, { color: colors.gray700 }]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.gray100 }]}
              onPress={() => setVisible(false)}
              activeOpacity={TOUCH_OPACITY}
            >
              <Text style={[styles.cancelText, { color: colors.gray500 }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  buttonCompact: {
    paddingHorizontal: Spacing.sm + 2,
  },
  buttonText: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.medium,
    color: Colors.primary,
  },
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlayLight,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'] + 2,
  },
  title: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
    color: Colors.gray900,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md + 2,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  optionText: {
    fontSize: FontSizes.base + 1,
    fontFamily: FontFamily.regular,
    color: Colors.gray700,
  },
  cancelButton: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray100,
  },
  cancelText: {
    fontSize: FontSizes.base + 1,
    fontFamily: FontFamily.medium,
    color: Colors.gray500,
  },
});
