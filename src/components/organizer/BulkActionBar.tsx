import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';

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
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.card }, Shadows.bottomBar]}>
      <View style={styles.topRow}>
        <Text style={[styles.countText, { color: colors.gray900 }]}>
          {t('organizer.bulkAction.selectedCount', { count: selectedCount })}
        </Text>
        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={22} color={colors.gray500} />
        </TouchableOpacity>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: Colors.success }]}
          onPress={onApprove}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
              <Text style={styles.actionText}>{t('organizer.bulkAction.approve')}</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: Colors.error }]}
          onPress={onReject}
          disabled={loading}
        >
          <Ionicons name="close-circle" size={18} color={Colors.white} />
          <Text style={styles.actionText}>{t('organizer.bulkAction.reject')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
          onPress={onCheckIn}
          disabled={loading}
        >
          <Ionicons name="qr-code" size={18} color={Colors.white} />
          <Text style={styles.actionText}>{t('organizer.bulkAction.checkIn')}</Text>
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
    color: Colors.white,
  },
});
