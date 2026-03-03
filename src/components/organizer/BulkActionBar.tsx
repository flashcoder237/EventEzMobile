import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { FontFamily, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';

interface BulkActionBarProps {
  selectedCount: number;
  onApprove: () => void;
  onReject: () => void;
  onCheckIn: () => void;
  onCancel: () => void;
  loading?: boolean;
}

function BulkActionBar({ selectedCount, onApprove, onReject, onCheckIn, onCancel, loading }: BulkActionBarProps) {
  const { colors } = useTheme();

  if (selectedCount === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.card }, Shadows.bottomBar]}>
      <View style={styles.topRow}>
        <Text style={[styles.countText, { color: colors.gray900 }]}>
          {selectedCount} selectionne{selectedCount > 1 ? 's' : ''}
        </Text>
        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={22} color={colors.gray500} />
        </TouchableOpacity>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
          onPress={onApprove}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.actionText}>Approuver</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
          onPress={onReject}
          disabled={loading}
        >
          <Ionicons name="close-circle" size={18} color="#FFFFFF" />
          <Text style={styles.actionText}>Rejeter</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#7C3AED' }]}
          onPress={onCheckIn}
          disabled={loading}
        >
          <Ionicons name="qr-code" size={18} color="#FFFFFF" />
          <Text style={styles.actionText}>Check-in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default memo(BulkActionBar);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  countText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.md,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  actionText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.xs,
    color: '#FFFFFF',
  },
});
