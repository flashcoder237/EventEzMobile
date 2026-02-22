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
        style={[styles.button, compact && styles.buttonCompact]}
        onPress={() => setVisible(true)}
        disabled={loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#7C3AED" />
        ) : (
          <Ionicons name="download-outline" size={20} color="#7C3AED" />
        )}
        {!compact && <Text style={styles.buttonText}>Exporter</Text>}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Choisir le format</Text>
            {filteredOptions.map((option) => (
              <TouchableOpacity
                key={option.format}
                style={styles.option}
                onPress={() => handleSelect(option.format)}
                activeOpacity={0.7}
              >
                <Ionicons name={option.icon} size={22} color="#6B7280" />
                <Text style={styles.optionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Annuler</Text>
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
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  buttonCompact: {
    paddingHorizontal: 10,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7C3AED',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
  },
  cancelButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
});
