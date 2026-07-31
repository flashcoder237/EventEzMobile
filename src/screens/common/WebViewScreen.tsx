import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList } from '../../types';
import { FontFamily, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

type BrowserRoute = RouteProp<RootStackParamList, 'Browser'>;

export default function WebViewScreen() {
  const navigation = useNavigation();
  const route = useRoute<BrowserRoute>();
  const { url, title } = route.params;
  const { colors } = useTheme();
  const { t } = useTranslation();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [pageTitle, setPageTitle] = useState(title ?? '');

  const retry = () => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {pageTitle || url}
        </Text>

        <TouchableOpacity
          onPress={() => Linking.openURL(url)}
          style={styles.iconBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('componentsCommon.webviewOpenInBrowser')}
        >
          <Ionicons name="open-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={{ flex: 1, backgroundColor: colors.background }}
        onLoadStart={() => { setIsLoading(true); setHasError(false); }}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => { setIsLoading(false); setHasError(true); }}
        onHttpError={() => { setIsLoading(false); setHasError(true); }}
        onNavigationStateChange={(state) => {
          if (!title && state.title) setPageTitle(state.title);
        }}
        allowsBackForwardNavigationGestures
        sharedCookiesEnabled
        mediaPlaybackRequiresUserAction={false}
      />

      {isLoading && !hasError && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {hasError && (
        <View style={[styles.loadingOverlay, styles.errorOverlay, { backgroundColor: colors.background }]}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.gray400} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            {t('componentsCommon.webviewErrorTitle')}
          </Text>
          <Text style={[styles.errorBody, { color: colors.gray500 }]}>
            {t('componentsCommon.webviewErrorBody')}
          </Text>
          <TouchableOpacity
            onPress={retry}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('common.retry')}
          >
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL(url)}
            style={styles.linkBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('componentsCommon.webviewOpenInBrowser')}
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>
              {t('componentsCommon.webviewOpenInBrowser')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorOverlay: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  errorTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.lg,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  errorBody: {
    fontFamily: FontFamily.regular,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  retryText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    color: '#fff',
  },
  linkBtn: {
    paddingVertical: Spacing.sm,
  },
  linkText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSizes.sm,
  },
});
