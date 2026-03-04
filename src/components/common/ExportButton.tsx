import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  Modal,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useExport, ExportFormat } from '../../hooks/useExport';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  TOUCH_OPACITY,
} from '../../constants/theme';
import { useBottomSheetAnim } from '../../hooks/useBottomSheetAnim';

interface ExportButtonProps {
  endpoint: string;
  filename: string;
  params?: Record<string, string>;
  formats?: ExportFormat[];
  /** Icon-only compact mode */
  compact?: boolean;
}

const FORMAT_OPTIONS: { format: ExportFormat; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { format: 'csv',   label: 'CSV',        icon: 'document-text-outline' },
  { format: 'excel', label: 'Excel (.xlsx)', icon: 'grid-outline' },
  { format: 'pdf',   label: 'PDF',        icon: 'document-outline' },
];

export default function ExportButton({
  endpoint,
  filename,
  params = {},
  formats = ['csv', 'excel', 'pdf'],
  compact = false,
}: ExportButtonProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const { exportData, loading } = useExport();
  const { modalOpen, sheetAnim, backdropAnim } = useBottomSheetAnim(visible);

  const handleClose = () => setVisible(false);

  const handleSelect = async (format: ExportFormat) => {
    handleClose();
    await exportData(endpoint, format, filename, params);
  };

  const filteredOptions = FORMAT_OPTIONS.filter((o) => formats.includes(o.format));

  return (
    <>
      <TouchableOpacity
        style={[
          styles.button,
          compact && styles.buttonCompact,
          { borderColor: colors.gray200, backgroundColor: colors.card },
        ]}
        onPress={() => setVisible(true)}
        disabled={loading}
        activeOpacity={TOUCH_OPACITY}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="download-outline" size={20} color={colors.primary} />
        )}
        {!compact && (
          <Text style={[styles.buttonText, { color: colors.primary }]}>Exporter</Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalOpen}
        transparent
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        {/* Backdrop */}
        <Reanimated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnim]} />
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        {/* Sheet */}
        <Reanimated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: Math.max(insets.bottom + Spacing.md, Spacing.xl),
            },
            sheetAnim,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.gray300 }]} />

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
            onPress={handleClose}
            activeOpacity={TOUCH_OPACITY}
          >
            <Text style={[styles.cancelText, { color: colors.gray500 }]}>Annuler</Text>
          </TouchableOpacity>
        </Reanimated.View>
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
  },
  buttonCompact: {
    paddingHorizontal: Spacing.sm + 2,
  },
  buttonText: {
    fontSize: FontSizes.md,
    fontFamily: FontFamily.medium,
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.lg,
    fontFamily: FontFamily.semiBold,
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
  },
  optionText: {
    fontSize: FontSizes.base + 1,
    fontFamily: FontFamily.regular,
  },
  cancelButton: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  cancelText: {
    fontSize: FontSizes.base + 1,
    fontFamily: FontFamily.medium,
  },
});
