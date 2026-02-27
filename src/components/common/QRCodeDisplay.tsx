import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  FontSizes,
  BorderRadius,
  Spacing,
  Shadows,
} from '../../constants/theme';

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
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&format=png&qzone=1&margin=0&bgcolor=FFFFFF&color=5B21B6`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={22} color={Colors.gray500} />
          </TouchableOpacity>

          {/* Title */}
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          {/* QR Code */}
          <View style={styles.qrWrapper}>
            <View style={[styles.qrCard, { width: size + 32, height: size + 32 }]}>
              <Image
                source={{ uri: qrImageUrl }}
                style={{ width: size, height: size }}
                resizeMode="contain"
                defaultSource={undefined}
              />
            </View>
          </View>

          {/* Hint */}
          <Text style={styles.hint}>
            Faites scanner ce QR code
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    alignItems: 'center',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray300,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.xl,
    fontFamily: FontFamily.displayBold,
    color: Colors.gray900,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  qrWrapper: {
    marginVertical: Spacing.xl,
  },
  qrCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  hint: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});
