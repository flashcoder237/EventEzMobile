import React, { useCallback, useEffect, useRef } from 'react';
import type { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { usePhonePosture } from '../components/ui/motion/usePhonePosture';
import { useAppActive } from '../components/ui/motion/useMotionGate';
import { useInAppToast } from '../contexts/InAppToastContext';
import { haptics } from '../utils/haptics';
import { buildHushScript, parseHushMessage } from '../lib/gestures/hush';

/**
 * G5 — téléphone posé face contre table pendant une visio Jitsi : micro et
 * caméra COUPÉS dans la page (double haptique « avertissement »). Au retour,
 * un toast le dit, avec « Réactiver ». Jamais de réactivation automatique, et
 * on ne promet rien sur le silence du téléphone lui-même.
 */
export function useVisioHush(
  webViewRef: React.RefObject<WebView | null>,
  enabled: boolean,
): { sensorElement: React.ReactElement | null; onMessage: (e: WebViewMessageEvent) => void } {
  const { t } = useTranslation();
  const { showToast } = useInAppToast();
  const hushed = useRef(false);
  const confirmed = useRef(false);

  const faceDown = useCallback(() => {
    if (hushed.current) return;
    hushed.current = true;
    confirmed.current = false;
    webViewRef.current?.injectJavaScript(buildHushScript(true));
    haptics.warning();
    setTimeout(() => haptics.warning(), 180);
  }, [webViewRef]);

  const faceUp = useCallback(() => {
    if (!hushed.current) return;
    hushed.current = false;
    // Rien à dire si la page n'a pas pu couper (Jitsi pas encore prêt).
    if (!confirmed.current) return;
    showToast({
      title: t('gestures.hush.title'),
      body: t('gestures.hush.reactivate'),
      icon: 'info',
      anchor: 'bottom',
      duration: 8000,
      dedupKey: 'visio-hush',
      onPress: () => {
        webViewRef.current?.injectJavaScript(buildHushScript(false));
        haptics.light();
      },
    });
  }, [showToast, t, webViewRef]);

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    const msg = parseHushMessage(e.nativeEvent.data);
    if (msg?.mute && msg.ok) confirmed.current = true;
  }, []);

  // Écran éteint pendant que le téléphone était retourné : le capteur ne
  // verra jamais « faceUp ». Revenir dans l'app = téléphone repris.
  const appActive = useAppActive();
  useEffect(() => {
    if (appActive && hushed.current) faceUp();
  }, [appActive, faceUp]);

  const { sensorElement } = usePhonePosture({ faceDown, faceUp }, { enabled });
  return { sensorElement, onMessage };
}

export default useVisioHush;
