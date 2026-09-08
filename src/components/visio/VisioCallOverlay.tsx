import React, { useRef, useState, useEffect, useMemo } from 'react';
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
  AppState,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useVisioCall } from '../../contexts/VisioCallContext';
import { FontFamily, FontSizes, Spacing } from '../../constants/theme';
import { enterPip, isPipSupported } from '../../../modules/eventez-pip/src';

/**
 * Overlay VISIO PERSISTANT — monté UNE fois à la racine. Rend UNE SEULE WebView
 * Jitsi qui SURVIT à la navigation ET au passage plein-écran ↔ bulle.
 *
 * ⚠️ POINT CRITIQUE : la WebView doit rester le MÊME nœud React (même position
 * dans l'arbre) dans les deux modes. Si on la place dans deux `return`
 * différents, React la DÉMONTE/REMONTE → elle se recharge → on SORT et RE-ENTRE
 * dans la réunion (bug signalé). Ici : un SEUL arbre, seul le style du conteneur
 * change ; les contrôles se superposent conditionnellement.
 *
 * Deux tailles de bulle (petite / grande) — l'utilisateur peut agrandir.
 */

const MARGIN = 12;
const BUBBLE_SMALL = { w: 120, h: 160 };
const BUBBLE_LARGE = { w: 190, h: 250 };

export default function VisioCallOverlay() {
  const { call, endCall, minimize, maximize } = useVisioCall();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bubbleLarge, setBubbleLarge] = useState(false);

  const screen = Dimensions.get('window');
  const bubbleSize = bubbleLarge ? BUBBLE_LARGE : BUBBLE_SMALL;
  const pan = useRef(
    new Animated.ValueXY({
      x: screen.width - BUBBLE_SMALL.w - MARGIN,
      y: screen.height - BUBBLE_SMALL.h - MARGIN - 80,
    }),
  ).current;

  useEffect(() => {
    if (call?.url) setIsLoading(true);
  }, [call?.url]);

  useEffect(() => {
    if (!call || !isLoading) return;
    const timer = setTimeout(() => setIsLoading(false), 6000);
    return () => clearTimeout(timer);
  }, [call, isLoading]);

  // Quand l'app part en arrière-plan pendant un appel : on remet la visio en
  // PLEIN ÉCRAN *avant* de déclencher le PiP système Android.
  //
  // POURQUOI : le PiP système capture l'écran de l'app tel qu'il est à cet
  // instant. S'il capturait un écran quelconque (profil + petite bulle), la
  // fenêtre PiP montrait l'UI de l'app, pas la vidéo (bug signalé). En forçant
  // le plein écran d'abord, le PiP capture la VISIO plein écran → on voit bien
  // la réunion dans la fenêtre flottante.
  //
  // Android émet `inactive` juste AVANT `background` : on maximise sur
  // `inactive` (une frame d'avance) puis on entre en PiP sur `background`.
  useEffect(() => {
    if (!call) return;
    const onChange = (state: string) => {
      if (state === 'inactive') {
        // Frame d'anticipation : la visio remplit l'écran avant la capture PiP.
        maximize();
      } else if (state === 'background' && isPipSupported()) {
        maximize();
        enterPip();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [call, maximize]);

  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: () => { pan.extractOffset(); },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => { pan.flattenOffset(); },
    }),
    [pan],
  );

  // Confirmation avant de raccrocher : les boutons hangup (plein écran + bulle)
  // sont petits et proches du bouton redimensionner → un tap malheureux coupait
  // l'appel (catastrophe pour un organisateur qui anime un direct devant du
  // monde). On demande confirmation.
  const confirmEndCall = () => {
    Alert.alert(
      t('visio.endCallConfirmTitle', { defaultValue: 'Quitter la visio ?' }),
      t('visio.endCallConfirmMessage', { defaultValue: 'Vous allez quitter la réunion en cours.' }),
      [
        { text: t('common.cancel', { defaultValue: 'Annuler' }), style: 'cancel' },
        { text: t('visio.endCall', { defaultValue: 'Raccrocher' }), style: 'destructive', onPress: () => endCall() },
      ],
    );
  };

  if (!call) return null;

  const isBubble = call.mode === 'bubble';

  // ── Conteneur : plein écran OU bulle flottante (MÊME arbre) ────────────────
  // fullscreen → View absolu plein écran. bubble → Animated.View draggable.
  // La WebView est le MÊME nœud dans les deux → jamais rechargée.
  const containerStyle = isBubble
    ? [
        styles.bubbleContainer,
        { width: bubbleSize.w, height: bubbleSize.h, borderColor: colors.primary },
        { transform: pan.getTranslateTransform() },
      ]
    : styles.fullContainer;

  // TOUJOURS Animated.View (jamais alterner le TYPE de composant : un View→
  // Animated.View remonterait tout l'arbre, WebView incluse → rechargement/
  // sortie de réunion). Les panHandlers ne sont actifs qu'en mode bulle.
  const containerProps = isBubble ? panResponder.panHandlers : {};

  return (
    <Animated.View style={containerStyle} {...containerProps}>
      {/* Zone WebView (position stable). En bulle : tap = agrandir en plein écran. */}
      <TouchableOpacity
        activeOpacity={1}
        disabled={!isBubble}
        onPress={isBubble ? maximize : undefined}
        style={styles.webviewZone}
      >
        <View style={styles.webviewWrap} pointerEvents={isBubble ? 'none' : 'auto'}>
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
          {isLoading && !isBubble && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* ── Contrôles PLEIN ÉCRAN (superposés, pas de re-render de la WebView) ── */}
      {!isBubble && (
        <>
          <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top : insets.top }]} pointerEvents="box-none">
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
              onPress={confirmEndCall}
              style={[styles.headerBtn, styles.hangupBtn]}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('visio.endCall', { defaultValue: 'Raccrocher' })}
            >
              <Ionicons name="call" size={18} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
          </View>

          {call.recordingNotice ? (
            <View style={[styles.recordingNotice, { top: insets.top + 52 }]} pointerEvents="none">
              <Ionicons name="radio-button-on" size={12} color="#FF6B6B" />
              <Text style={styles.recordingNoticeText} numberOfLines={2}>{call.recordingNotice}</Text>
            </View>
          ) : null}
        </>
      )}

      {/* ── Contrôles BULLE (agrandir la bulle / raccrocher) ── */}
      {isBubble && (
        <>
          <TouchableOpacity
            style={styles.bubbleResize}
            onPress={() => setBubbleLarge(v => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('visio.resizeBubble', { defaultValue: 'Redimensionner' })}
          >
            <Ionicons name={bubbleLarge ? 'contract' : 'expand'} size={12} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bubbleHangup}
            onPress={confirmEndCall}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('visio.endCall', { defaultValue: 'Raccrocher' })}
          >
            <Ionicons name="close" size={14} color="#fff" />
          </TouchableOpacity>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 9999,
  },
  webviewZone: { flex: 1 },
  webviewWrap: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: Spacing.sm,
    zIndex: 2,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  hangupBtn: { backgroundColor: '#EF4444' },
  headerTitle: {
    flex: 1, color: '#fff',
    fontFamily: FontFamily.semiBold, fontSize: FontSizes.sm, textAlign: 'center',
  },
  recordingNotice: {
    position: 'absolute',
    left: Spacing.md, right: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    backgroundColor: 'rgba(239,68,68,0.28)',
    borderRadius: 8,
    zIndex: 2,
  },
  recordingNoticeText: { flex: 1, color: '#fff', fontFamily: FontFamily.regular, fontSize: 11 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#000',
  },
  // Bulle flottante
  bubbleContainer: {
    position: 'absolute',
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
  bubbleHangup: {
    position: 'absolute',
    top: 4, right: 4,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.95)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 3,
  },
  bubbleResize: {
    position: 'absolute',
    top: 4, left: 4,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 3,
  },
});
