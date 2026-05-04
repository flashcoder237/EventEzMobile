import React, { useState } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { RootStackParamList } from '../../types';
import { FontFamily, FontSizes, Spacing } from '../../constants/theme';

type BrowserRoute = RouteProp<RootStackParamList, 'Browser'>;

export default function WebViewScreen() {
  const navigation = useNavigation();
  const route = useRoute<BrowserRoute>();
  const { url, title } = route.params;
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState(title ?? '');

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
          accessibilityLabel="Ouvrir dans le navigateur"
        >
          <Ionicons name="open-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <WebView
        source={{ uri: url }}
        style={{ flex: 1, backgroundColor: colors.background }}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => setIsLoading(false)}
        onHttpError={() => setIsLoading(false)}
        onNavigationStateChange={(state) => {
          if (!title && state.title) setPageTitle(state.title);
        }}
        allowsBackForwardNavigationGestures
        sharedCookiesEnabled
        mediaPlaybackRequiresUserAction={false}
      />

      {isLoading && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
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
});
