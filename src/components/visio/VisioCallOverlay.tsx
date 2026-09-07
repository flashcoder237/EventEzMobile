import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useVisioCall } from '../../contexts/VisioCallContext';
import { FontFamily, FontSizes, Spacing } from '../../constants/theme';
import { enterPip, isPipSupported } from '../../../modules/eventez-pip/src';

/**
 * Overlay VISIO PERSISTANT — monté UNE fois à la racine (sibling de
 * RootNavigator), au-dessus de toute la navigation. Rend une SEULE WebView Jitsi
 * qui SURVIT à la navigation (l'appel ne se coupe plus quand on change d'écran).
 *
 * Deux modes (VisioCallContext) :
 *  - fullscreen : plein écran avec header + bouton réduire/raccrocher.
 *  - bubble     : vignette flottante draggable ; tap = repasser en plein écran.
 *
 * La WebView reste MONTÉE dans les deux modes → le flux WebRTC continue.
 */

const BUBBLE_W = 120;
const BUBBLE_H = 160;
const MARGIN = 12;

export default function VisioCallOverlay() {
  const { call, endCall, minimize, maximize } = useVisioCall();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Position de la bulle (coin bas-droit par défaut).
  const screen = Dimensions.get('window');
  const pan = useRef(
    new Animated.ValueXY({
      x: screen.width - BUBBLE_W - MARGIN,
      y: screen.height - BUBBLE_H - MARGIN - 80,
    }),
  ).current;

  // Réinitialise le loader à chaque nouvel appel.
  useEffect(() => {
    if (call?.url) setIsLoading(true);
  }, [call?.url]);

  // Filet anti-spinner-infini (SPA Jitsi : onLoadEnd non fiable).
  useEffect(() => {
    if (!call || !isLoading) return;
    const timer = setTimeout(() => setIsLoading(false), 6000);
    return () => clearTimeout(timer);
  }, [call, isLoading]);

  // PiP Android : si l'app part en arrière-plan pendant un appel, on passe en
  // fenêtre système flottante (le module eventez-pip reste utile).
  useEffect(() => {
    if (!call) return;
    const { AppState } = require('react-native');
    const onChange = (state: string) => {
      if ((state === 'inactive' || state === 'background') && isPipSupported()) {
        enterPip();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [call]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        pan.extractOffset();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    }),
  ).current;

  if (!call) return null;

  const isBubble = call.mode === 'bubble';

  // ── La WebView (identique dans les deux modes → JAMAIS démontée) ──────────
  const webview = (
    <WebView
      ref={webViewRef}
      source={{ uri: call.url }}
      style={{ flex: 1, backgroundColor: '#000' }}
      onLoadEnd={() => setIsLoading(false)}
      onError={() => setIsLoading(false)}
      onRenderProcessGone={() => setIsLoading(false)}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      mediaCapturePermissionGrantType="grant"
      domStorageEnabled
      javaScriptEnabled
      originWhitelist={['*']}
      setSupportMultipleWindows={false}
      mixedContentMode="always"
      sharedCookiesEnabled
    />
  );

  // ── MODE BULLE ────────────────────────────────────────────────────────────
  if (isBubble) {
    return (
      <Animated.View
        style={[
          styles.bubble,
          {
            transform: pan.getTranslateTransform(),
            borderColor: colors.primary,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.bubbleTapZone}
          onPress={maximize}
          accessibilityRole="button"
          accessibilityLabel={t('visio.expandCall', { defaultValue: 'Agrandir la visio' })}
        >
          <View style={styles.bubbleWebviewWrap} pointerEvents="none">
            {webview}
          </View>
          {/* Bouton raccrocher sur la bulle */}
          <TouchableOpacity
            style={styles.bubbleHangup}
            onPress={endCall}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('visio.endCall', { defaultValue: 'Raccrocher' })}
          >
            <Ionicons name="close" size={14} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ── MODE PLEIN ÉCRAN ──────────────────────────────────────────────────────
  return (
    <View style={StyleSheet.absoluteFill}>
      <SafeAreaView style={[styles.fullContainer, { backgroundColor: '#000' }]} edges={['top']}>
        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}>
          <TouchableOpacity
            onPress={minimize}
            style={styles.headerBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('visio.minimize', { defaultValue: 'Réduire' })}
          >
            <Ionicons name="chevron-down" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {call.title || t('componentsCommon.webviewVisioTitle', { defaultValue: 'Visioconférence' })}
          </Text>
          <TouchableOpacity
            onPress={endCall}
            style={[styles.headerBtn, styles.hangupBtn]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('visio.endCall', { defaultValue: 'Raccrocher' })}
          >
            <Ionicons name="call" size={18} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
        </View>

        {/* Notice RGPD d'enregistrement (fournie par event_join). */}
        {call.recordingNotice ? (
          <View style={styles.recordingNotice}>
            <Ionicons name="radio-button-on" size={12} color="#FF6B6B" />
            <Text style={styles.recordingNoticeText} numberOfLines={2}>
              {call.recordingNotice}
            </Text>
          </View>
        ) : null}

        <View style={{ flex: 1 }}>
          {webview}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.85)',
    gap: Spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hangupBtn: {
    backgroundColor: '#EF4444',
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontFamily: FontFamily.semiBold,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  recordingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,107,107,0.15)',
  },
  recordingNoticeText: {
    flex: 1,
    color: '#fff',
    fontFamily: FontFamily.regular,
    fontSize: 11,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  // Bulle flottante
  bubble: {
    position: 'absolute',
    width: BUBBLE_W,
    height: BUBBLE_H,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#000',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 9999,
  },
  bubbleTapZone: { flex: 1 },
  bubbleWebviewWrap: { flex: 1 },
  bubbleHangup: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
