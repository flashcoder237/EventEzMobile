/**
 * ConnectionsScreen — Liste des connexions + actions QR.
 *
 * Design aligne sur le style editorial existant (header eyebrow + displayBold,
 * indigo + corail, watermark numeral en background). Mirror du pattern
 * MessagesScreen / ProfileScreen.
 *
 * Sections :
 *  - Header : back + eyebrow "RÉSEAU" + titre
 *  - Hero actions : 2 grosses cards "Mon QR" + "Scanner"
 *  - Liste : mes connexions actuelles + bouton retirer
 *  - Empty state : illustration + texte explicatif
 *
 * Modal "Mon QR" : full-screen avec QR genere via connectionsAPI.getMyQrToken
 * Modal "Scanner" : delegue au QRScannerScreen existant (cf. Phase B step 2)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { connectionsAPI, type Connection, getMediaUrl } from '../../api';
import { useAlert } from '../../contexts/AlertContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Colors, FontFamily, FontSizes, BorderRadius, Spacing, Shadows, TOUCH_OPACITY,
} from '../../constants/theme';
import { RootStackParamList } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SOURCE_LABELS: Record<Connection['source'], string> = {
  qr: 'QR',
  mutual_follow: 'Follow mutuel',
  manual: 'Ajout manuel',
};

const SOURCE_ICONS: Record<Connection['source'], keyof typeof Ionicons.glyphMap> = {
  qr: 'qr-code-outline',
  mutual_follow: 'people-outline',
  manual: 'person-add-outline',
};

export default function ConnectionsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { showConfirm, showError, showSuccess } = useAlert();
  const { t } = useTranslation();

  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const fetchConnections = useCallback(async () => {
    try {
      const response = await connectionsAPI.list();
      setConnections(response.data?.results || []);
    } catch (error) {
      if (__DEV__) console.error('[Connections] fetch failed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchConnections();
  }, [fetchConnections]));

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const openQrModal = useCallback(async () => {
    setQrLoading(true);
    setQrModalVisible(true);
    try {
      const response = await connectionsAPI.getMyQrToken();
      setQrToken(response.data.token);
    } catch (error: any) {
      if (__DEV__) console.error('[Connections] QR token failed:', error);
      showError(t('common.error'), t('connections.qrErrorGenerate'));
      setQrModalVisible(false);
    } finally {
      setQrLoading(false);
    }
  }, [showError, t]);

  const closeQrModal = useCallback(() => {
    setQrModalVisible(false);
    setQrToken(null);
  }, []);

  const openScanner = useCallback(() => {
    navigation.navigate('ConnectionScanner');
  }, [navigation]);

  const handleRemoveConnection = useCallback((conn: Connection) => {
    showConfirm(
      t('connections.removeTitle'),
      t('connections.removeDetail', { name: conn.user.full_name }),
      async () => {
        try {
          await connectionsAPI.remove(conn.user.id);
          setConnections(prev => prev.filter(c => c.id !== conn.id));
          showSuccess(t('connections.removeSuccess'));
        } catch (error: any) {
          if (__DEV__) console.error('[Connections] remove failed:', error);
          showError(t('common.error'), t('connections.removeError'));
        }
      },
    );
  }, [showConfirm, showError, showSuccess, t]);

  const renderItem = ({ item }: { item: Connection }) => {
    const avatar = getMediaUrl(item.user.profile_picture);
    const initials = item.user.full_name
      .split(' ')
      .map(s => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    const sourceLabel = SOURCE_LABELS[item.source];
    const sourceIcon = SOURCE_ICONS[item.source];

    return (
      <View style={[styles.connRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {avatar ? (
          <Image source={avatar} style={styles.connAvatar} contentFit="cover" cachePolicy="memory-disk" transition={200} />
        ) : (
          <View style={[styles.connAvatarFallback, { backgroundColor: `${colors.primary}15` }]}>
            <Text style={[styles.connAvatarInitials, { color: colors.primary }]}>{initials}</Text>
          </View>
        )}
        <View style={styles.connBody}>
          <Text style={[styles.connName, { color: colors.text }]} numberOfLines={1}>
            {item.user.full_name}
          </Text>
          <View style={styles.connMeta}>
            <Ionicons name={sourceIcon} size={11} color={colors.gray500} />
            <Text style={[styles.connSource, { color: colors.gray500 }]}>{sourceLabel}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => handleRemoveConnection(item)}
          style={[styles.removeBtn, { backgroundColor: isDark ? colors.gray100 : 'rgba(0,0,0,0.04)' }]}
          activeOpacity={TOUCH_OPACITY}
          accessibilityRole="button"
          accessibilityLabel={t('connections.remove')}
        >
          <Ionicons name="close" size={16} color={colors.gray600} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeroActions = () => (
    <View style={styles.heroRow}>
      <TouchableOpacity
        style={[styles.heroCard, { backgroundColor: colors.primary }, Shadows.sm]}
        onPress={openQrModal}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('connections.showMyQr')}
      >
        <Ionicons name="qr-code" size={32} color={Colors.white} />
        <Text style={[styles.heroTitle, { color: Colors.white }]}>{t('connections.showMyQr')}</Text>
        <Text style={[styles.heroSubtitle, { color: 'rgba(255,255,255,0.85)' }]}>
          {t('connections.showMyQrHint')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.heroCard, { backgroundColor: colors.accent }, Shadows.sm]}
        onPress={openScanner}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t('connections.scanQr')}
      >
        <Ionicons name="scan" size={32} color={Colors.white} />
        <Text style={[styles.heroTitle, { color: Colors.white }]}>{t('connections.scanQr')}</Text>
        <Text style={[styles.heroSubtitle, { color: 'rgba(255,255,255,0.85)' }]}>
          {t('connections.scanQrHint')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <Ionicons name="people-circle-outline" size={56} color={colors.gray300} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('connections.emptyTitle')}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.gray500 }]}>{t('connections.emptySubtitle')}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header editorial */}
      <View style={[styles.header, { borderBottomColor: isDark ? colors.border : 'rgba(0,0,0,0.05)' }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: colors.card }, Shadows.sm]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: Spacing.md }}>
          <Text style={[styles.headerEyebrow, { color: colors.accent }]}>{t('connections.eyebrow')}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('connections.title')}</Text>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={connections}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          ListHeaderComponent={renderHeroActions}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={connections.length === 0 ? styles.listEmpty : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchConnections(); }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        />
      )}

      {/* Modal Mon QR */}
      <Modal
        visible={qrModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeQrModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalEyebrow, { color: colors.accent }]}>{t('connections.qrModalEyebrow')}</Text>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('connections.qrModalTitle')}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.gray500 }]}>
              {t('connections.qrModalSubtitle')}
            </Text>
            <View style={styles.qrFrame}>
              {qrLoading ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : qrToken ? (
                <QRCode
                  value={qrToken}
                  size={220}
                  backgroundColor="#FFFFFF"
                  color="#111110"
                />
              ) : null}
            </View>
            <Text style={[styles.modalFooter, { color: colors.gray400 }]}>{t('connections.qrModalTtl')}</Text>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: colors.primary }]}
              onPress={closeQrModal}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCloseText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerEyebrow: {
    fontFamily: FontFamily.bold, fontSize: 11,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  headerTitle: {
    fontFamily: FontFamily.displayBold, fontSize: 22,
    letterSpacing: -0.5, marginTop: 2,
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.md, paddingBottom: Spacing.xl },
  listEmpty: { flexGrow: 1, padding: Spacing.md },

  // Hero actions
  heroRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  heroCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    minHeight: 130,
  },
  heroTitle: {
    fontFamily: FontFamily.displayBold,
    fontSize: 16,
    letterSpacing: -0.3,
    marginTop: Spacing.sm,
  },
  heroSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },

  // Connection row
  connRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  connAvatar: { width: 44, height: 44, borderRadius: 22 },
  connAvatarFallback: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  connAvatarInitials: { fontFamily: FontFamily.bold, fontSize: 14 },
  connBody: { flex: 1, minWidth: 0 },
  connName: { fontFamily: FontFamily.bold, fontSize: FontSizes.md },
  connMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  connSource: { fontFamily: FontFamily.regular, fontSize: 11 },
  removeBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },

  // Empty
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: FontFamily.displayBold, fontSize: 20,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular, fontSize: FontSizes.sm,
    textAlign: 'center', marginTop: Spacing.xs,
    lineHeight: 20,
  },

  // QR modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  modalEyebrow: {
    fontFamily: FontFamily.bold, fontSize: 11,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  modalTitle: {
    fontFamily: FontFamily.displayBold, fontSize: 22,
    letterSpacing: -0.5, marginTop: 2,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: FontFamily.regular, fontSize: FontSizes.sm,
    textAlign: 'center', marginTop: Spacing.xs,
    lineHeight: 20,
  },
  qrFrame: {
    width: 260, height: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.md,
  },
  modalFooter: {
    fontFamily: FontFamily.regular, fontSize: 11,
    textAlign: 'center', marginBottom: Spacing.md,
  },
  modalCloseBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: 12,
    borderRadius: BorderRadius.md,
    minWidth: 140,
    alignItems: 'center',
  },
  modalCloseText: {
    fontFamily: FontFamily.bold, fontSize: FontSizes.sm,
    color: Colors.white,
  },
});
