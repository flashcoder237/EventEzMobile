import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors, FontFamily, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import { useBottomSheetAnim } from '../../hooks/useBottomSheetAnim';

interface PushPermissionModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function PushPermissionModal({
  visible,
  onAccept,
  onDecline,
}: PushPermissionModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { modalOpen, sheetAnim, backdropAnim } = useBottomSheetAnim(visible);

  return (
    <Modal
      visible={modalOpen}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Reanimated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnim]} />
      <TouchableWithoutFeedback onPress={onDecline}>
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
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.gray300 }]} />

        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="notifications" size={40} color={colors.primary} />
        </View>

        {/* Title */}
        <Text style={[styles.eyebrow, { color: colors.accent }]}>Ne manque rien</Text>
        <Text style={[styles.title, { color: colors.gray900 }]}>Restez informé</Text>

        {/* Description */}
        <Text style={[styles.description, { color: colors.gray600 }]}>
          Activez les notifications pour recevoir :
        </Text>

        {/* Features */}
        <View style={styles.featureList}>
          {[
            { icon: 'calendar-outline' as const, label: 'Rappels de vos événements' },
            { icon: 'ticket-outline' as const, label: "Confirmations d'inscription" },
            { icon: 'chatbubble-outline' as const, label: 'Nouveaux messages' },
            { icon: 'card-outline' as const, label: 'Confirmations de paiement' },
          ].map(({ icon, label }) => (
            <View key={label} style={styles.featureItem}>
              <Ionicons name={icon} size={20} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.gray700 }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: colors.primary }]}
          onPress={onAccept}
          activeOpacity={0.8}
        >
          <Text style={styles.acceptButtonText}>Activer les notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.declineButton} onPress={onDecline} activeOpacity={0.8}>
          <Text style={[styles.declineButtonText, { color: colors.gray500 }]}>Plus tard</Text>
        </TouchableOpacity>
      </Reanimated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    alignItems: 'center',
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
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 6,
  },
  title: {
    fontFamily: FontFamily.displayBold,
    fontSize: FontSizes.xl,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  featureList: {
    width: '100%',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  featureText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
    flex: 1,
  },
  acceptButton: {
    width: '100%',
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  acceptButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  declineButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  declineButtonText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
  },
});
