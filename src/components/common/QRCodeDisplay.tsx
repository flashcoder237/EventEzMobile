import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Reanimated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';
import { useBottomSheetAnim } from '../../hooks/useBottomSheetAnim';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_QR_SIZE = SCREEN_WIDTH * 0.55;

interface QRCodeDisplayProps {
  data: string;
  size?: number;
  title?: string;
  subtitle?: string;
  visible: boolean;
  onClose: () => void;
}

export default function QRCodeDisplay({
  data,
  size = DEFAULT_QR_SIZE,
  title,
  subtitle,
  visible,
  onClose,
}: QRCodeDisplayProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { modalOpen, sheetAnim, backdropAnim } = useBottomSheetAnim(visible);

  return (
    <Modal
      visible={modalOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Reanimated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropAnim]} />
      <TouchableWithoutFeedback onPress={onClose}>
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
        {/* Handle bar */}
        <View style={[styles.handleBar, { backgroundColor: colors.gray300 }]} />

        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.gray100 }]}
          onPress={onClose}
        >
          <Ionicons name="close" size={22} color={colors.gray500} />
        </TouchableOpacity>

        {/* Title */}
        {title && (
          <Text style={[styles.title, { color: colors.gray900 }]}>{title}</Text>
        )}
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.gray500 }]}>{subtitle}</Text>
        )}

        {/* QR Code */}
        <View style={styles.qrWrapper}>
          <View
            style={[
              styles.qrCard,
              {
                width: size + 32,
                height: size + 32,
                borderColor: colors.primary,
                backgroundColor: Colors.white,
              },
            ]}
          >
            <QRCode
              value={data}
              size={size}
              color={isDark ? '#4C1D95' : '#5B21B6'}
              backgroundColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Hint */}
        <Text style={[styles.hint, { color: colors.gray500 }]}>
          {t('componentsCommon.qrCodeHint')}
        </Text>
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
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.md,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  qrWrapper: {
    marginVertical: Spacing.xl,
  },
  qrCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  hint: {
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});
