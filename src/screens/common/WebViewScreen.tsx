import React, { useRef, useState, useEffect, useCallback } from 'react';
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
import { usePictureInPicture } from '../../hooks/usePictureInPicture';
import { virtualRoomsAPI } from '../../api/content';
import { useNetworkSpeed } from '../../hooks/useNetworkSpeed';

type BrowserRoute = RouteProp<RootStackParamList, 'Browser'>;

// Heuristique visio : jitsi self-hosted / 8x8 / lien porteur d'un JWT.
function isVisioUrl(u?: string): boolean {
  if (!u) return false;
  return /jitsi|8x8\.vc|jaas|\bjwt=/.test(u);
}

export default function WebViewScreen() {
  const navigation = useNavigation();
  const route = useRoute<BrowserRoute>();
  const { url, title, roomId } = route.params;
  const { colors } = useTheme();
  // Picture-in-Picture (Android) : uniquement pour une visio en cours — si
  // l'utilisateur quitte l'app pendant l'appel, la vidéo se réduit en fenêtre
  // flottante au lieu de se figer. No-op ailleurs.
  const isVisio = isVisioUrl(url);
  usePictureInPicture(isVisio);

  // Signale au serveur la sortie de salle. L'endpoint existait des deux côtés
  // mais n'était appelé par AUCUNE interface : le participant restait compté
  // présent jusqu'au rattrapage (max_duration + 30 min), faussant le compteur
  // « en direct », la limite de places et surtout le quota FACTURABLE en
  // participant-minutes.
  // Le retour Android sort de cet écran → le démontage couvre tous les cas.
  useEffect(() => {
    if (!isVisio || !roomId) return;
    return () => {
      virtualRoomsAPI.leave(roomId).catch(() => {
        // Silencieux : l'utilisateur est déjà parti. Le rattrapage serveur
        // reste le filet de sécurité.
      });
    };
  }, [isVisio, roomId]);
  const { t } = useTranslation();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [autoRetryIn, setAutoRetryIn] = useState<number | null>(null);

  // `useNetworkSpeed` existait et était utilisé partout SAUF sur l'écran qui
  // consomme réellement de la data. Il distingue « ton réseau est coupé » d'une
  // panne serveur : sans ça, l'utilisateur accuse la plateforme d'un problème
  // qui vient de sa connexion.
  const { isOffline, isSlowCellular } = useNetworkSpeed();

  // Au-delà, relancer en boucle use la batterie et le forfait sans résoudre
  // une coupure durable — on rend la main à l'utilisateur.
  const MAX_ATTEMPTS = 3;
  const canRetry = attempt < MAX_ATTEMPTS;
  const [pageTitle, setPageTitle] = useState(title ?? '');

  const retry = useCallback(() => {
    setAutoRetryIn(null);
    setAttempt((n) => n + 1);
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  }, []);

  /**
   * Reconnexion AUTOMATIQUE apres une coupure en visio.
   *
   * Exiger un tap suppose que l'utilisateur regarde l'ecran au moment de la
   * rupture — or sur connexion instable, il est le plus souvent en train
   * d'ECOUTER. Backoff exponentiel (4s, 8s, 16s) : laisser au reseau le temps
   * de revenir sans marteler le serveur.
   *
   * Reserve a la visio : recharger une page web quelconque en boucle n'a pas
   * le meme enjeu, et l'utilisateur y est devant son ecran.
   *
   * Inutile tant qu'on est HORS LIGNE : le retour du reseau declenche lui-meme
   * une reconnexion immediate (effet suivant).
   */
  useEffect(() => {
    if (!isVisio || !hasError || !canRetry || isOffline) {
      setAutoRetryIn(null);
      return;
    }
    const delay = 4 * Math.pow(2, attempt); // 4s, 8s, 16s
    setAutoRetryIn(delay);
    const tick = setInterval(() => {
      setAutoRetryIn((n) => (n === null || n <= 1 ? null : n - 1));
    }, 1000);
    const timer = setTimeout(retry, delay * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(timer);
    };
  }, [isVisio, hasError, canRetry, isOffline, attempt, retry]);

  /**
   * Retour du reseau : on retente TOUT DE SUITE plutot que d'attendre la fin
   * d'un delai arbitraire. C'est le cas le plus frequent en mobilite (tunnel,
   * ascenseur, changement de cellule).
   */
  const wasOffline = useRef(false);
  useEffect(() => {
    if (isOffline) {
      wasOffline.current = true;
      return;
    }
    if (wasOffline.current && isVisio && hasError) {
      wasOffline.current = false;
      retry();
    }
    wasOffline.current = false;
  }, [isOffline, isVisio, hasError, retry]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {/* Ne JAMAIS afficher l'URL brute d'une visio : elle porte le JWT
              (credential d'accès). Titre neutre pour la visio. */}
          {isVisio ? (title || t('componentsCommon.webviewVisioTitle', { defaultValue: 'Visioconférence' })) : (pageTitle || url)}
        </Text>

        {/* « Ouvrir dans le navigateur » MASQUÉ pour la visio : Linking.openURL
            exposerait le JWT dans le navigateur système (barre d'URL, historique). */}
        {!isVisio ? (
          <TouchableOpacity
            onPress={() => Linking.openURL(url)}
            style={styles.iconBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('componentsCommon.webviewOpenInBrowser')}
          >
            <Ionicons name="open-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}
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
        // VISIO en WebView : la caméra/micro doivent être accordés à la page
        // (Jitsi WebRTC). Sans ça → écran noir / pas de son. iOS :
        // mediaCapturePermissionGrantType="grant" accorde automatiquement.
        // Android : react-native-webview accorde de lui-même les permissions
        // média de la page tant que l'app a CAMERA/RECORD_AUDIO au manifeste
        // (déclarées dans app.json) — pas de handler à brancher.
        allowsInlineMediaPlayback
        mediaCapturePermissionGrantType="grant"
      />

      {/* Connexion lente detectee : prevenir AVANT que le forfait soit
          consomme. `useNetworkSpeed` etait utilise partout sauf ici — l'ecran
          qui consomme le plus de data. */}
      {isVisio && isSlowCellular && !hasError && (
        <View style={[styles.slowBanner, { backgroundColor: `${colors.warning}22` }]}>
          <Ionicons name="cellular-outline" size={14} color={colors.warning} />
          <Text style={[styles.slowBannerText, { color: colors.warning }]} numberOfLines={2}>
            {t('componentsCommon.webviewSlowNetwork')}
          </Text>
        </View>
      )}

      {isLoading && !hasError && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {hasError && (
        <View style={[styles.loadingOverlay, styles.errorOverlay, { backgroundColor: colors.background }]}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.gray400} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            {isOffline
              ? t('componentsCommon.webviewOfflineTitle')
              : t('componentsCommon.webviewErrorTitle')}
          </Text>
          <Text style={[styles.errorBody, { color: colors.gray500 }]}>
            {isOffline
              ? t('componentsCommon.webviewOfflineBody')
              : t('componentsCommon.webviewErrorBody')}
          </Text>
          {/* Compte a rebours : sans lui l'ecran parait fige et l'utilisateur
              quitte juste avant que la reconnexion aboutisse. */}
          {autoRetryIn !== null && !isOffline && (
            <Text
              style={[styles.errorBody, { color: colors.primary }]}
              accessibilityLiveRegion="polite"
            >
              {t('componentsCommon.webviewReconnectingIn', { seconds: autoRetryIn })}
            </Text>
          )}
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
          {/* Masqué pour la visio : ne pas exposer le JWT au navigateur système. */}
          {!isVisio && (
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
          )}
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
  slowBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  slowBannerText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 11,
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
