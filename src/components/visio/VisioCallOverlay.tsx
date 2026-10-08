import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
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
import {
  addPipModeListener,
  isInPipMode,
  setPipAutoEnter,
} from '../../../modules/eventez-pip/src';
import { useVisioHush } from '../../hooks/useVisioHush';

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
/** Duree d'affichage de la mention d'enregistrement (consentement).
 *  Assez long pour etre lu, assez court pour ne pas gener la reunion. */
const NOTICE_VISIBLE_MS = 7000;

export default function VisioCallOverlay() {
  const { call, endCall, minimize, maximize } = useVisioCall();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  // G5 — même « chut » que l'écran visio : téléphone retourné = micro et
  // caméra coupés dans la page, « Réactiver » au retour (jamais automatique).
  const hush = useVisioHush(webViewRef, !!call);
  const [bubbleLarge, setBubbleLarge] = useState(false);
  // Mention d'enregistrement : TEMPORAIRE. Affichee en permanence, elle
  // recouvrait l'interface Jitsi (nom de salle, vignette camera) et
  // devenait illisible autant qu'elle rendait le reste illisible.
  // C'est une information de CONSENTEMENT : elle doit etre vue a
  // l'entree, pas rester affichee toute la reunion.
  const [showRecordingNotice, setShowRecordingNotice] = useState(true);
  const noticeOpacity = useRef(new Animated.Value(1)).current;

  // `useWindowDimensions` et NON `Dimensions.get()` : cette dernière fige la
  // taille au premier rendu. À la rotation, en multi-fenêtre ou sur iPad, la
  // bulle se retrouvait positionnée hors de l'écran — irrécupérable, puisque
  // c'est elle qui permet de revenir en plein écran.
  const screen = useWindowDimensions();
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

  // SILENCE PENDANT LA VISIO.
  //
  // Les sons de l'app (vente, arrivée, scan) sortent par le haut-parleur et
  // repartent donc dans le MICRO de la réunion : tout le monde les entend.
  // `setTransientMute` existait déjà mais n'était appelé que depuis l'écran
  // Live — jamais pour une visio Jitsi, c'est-à-dire précisément le cas où
  // l'on parle à d'autres gens.
  //
  // On coupe tant qu'un appel est en cours, en bulle comme en plein écran :
  // réduire la fenêtre ne fait pas quitter la réunion.
  useEffect(() => {
    if (!call) return;
    // Chargement PARESSEUX : `soundService` importe `expo-audio`, qui ne
    // s'initialise pas hors application native et faisait tomber des suites
    // de tests sans rapport avec le son.
    const mute = (value: boolean) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('../../services/soundService').default.setTransientMute(value);
      } catch {
        /* son indisponible — jamais bloquant */
      }
    };
    mute(true);
    return () => mute(false);
  }, [call]);

  // L'ÉCRAN change (rotation, multi-fenêtre, iPad) : on ramène la bulle dans
  // les limites. Sans cela, une bulle posée en bas à droite en portrait se
  // retrouve hors-champ en paysage — et c'est elle qui ramène au plein écran.
  useEffect(() => {
    if (call?.mode !== 'bubble') return;
    const maxX = Math.max(MARGIN, screen.width - bubbleSize.w - MARGIN);
    const maxY = Math.max(
      insets.top + MARGIN,
      screen.height - bubbleSize.h - MARGIN - insets.bottom,
    );
    const x = Math.min(Math.max((pan.x as any)._value ?? 0, MARGIN), maxX);
    const y = Math.min(
      Math.max((pan.y as any)._value ?? 0, insets.top + MARGIN), maxY);
    pan.setValue({ x, y });
  }, [
    call?.mode, screen.width, screen.height,
    bubbleSize.w, bubbleSize.h, insets.top, insets.bottom, pan,
  ]);

  useEffect(() => {
    if (!call || !isLoading) return;
    const timer = setTimeout(() => setIsLoading(false), 6000);
    return () => clearTimeout(timer);
  }, [call, isLoading]);

  // La mention reparait a CHAQUE entree en salle (nouvelle URL), puis
  // s'efface en fondu au bout de quelques secondes.
  useEffect(() => {
    if (!call?.recordingNotice) return;
    setShowRecordingNotice(true);
    noticeOpacity.setValue(1);
    const hide = setTimeout(() => {
      Animated.timing(noticeOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setShowRecordingNotice(false));
    }, NOTICE_VISIBLE_MS);
    return () => clearTimeout(hide);
  }, [call?.url, call?.recordingNotice, noticeOpacity]);

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
    // On ARME le PiP pour toute la durée de l'appel. L'entrée effective est
    // déclenchée côté natif depuis `onUserLeaveHint`, c'est-à-dire juste AVANT
    // la mise en pause, pendant que l'activité est encore visible.
    //
    // CORRECTION (2026-10-07) : on entrait en PiP depuis
    // `AppState === 'background'`, qui n'arrive qu'APRÈS que l'activité a
    // cessé d'être visible. Android refuse alors la demande — la
    // documentation est explicite : « The system may disallow entering
    // picture-in-picture [...] when the activity is not visible ». L'échec
    // était en plus avalé sans trace. C'est la cause de fond du « PiP mal
    // géré ».
    setPipAutoEnter(true);

    const onChange = (state: string) => {
      // `inactive` arrive AVANT que l'activité ne soit masquée : on remet la
      // visio en plein écran pour que la capture PiP montre la réunion, pas
      // l'écran où l'utilisateur se trouvait.
      if (state === 'inactive' || state === 'background') {
        maximize();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => {
      sub.remove();
      setPipAutoEnter(false);
    };
  }, [call, maximize]);

  // Masquage de l'interface pendant le PiP.
  //
  // Android réduit TOUTE la fenêtre de l'activité — il n'extrait pas la vidéo.
  // L'en-tête (titre, réduire, raccrocher) et le bandeau d'enregistrement se
  // retrouvaient donc dans une vignette d'environ 200 dp : ils couvraient la
  // vidéo et étaient intouchables.
  //
  // « Remove other UI elements before your activity enters PiP and restore
  //   them when your activity becomes full screen again. »
  //   https://developer.android.com/develop/ui/views/picture-in-picture
  const [isInPip, setIsInPip] = useState(false);
  useEffect(() => {
    if (!call) return;
    setIsInPip(isInPipMode());
    const sub = addPipModeListener(setIsInPip);
    return () => sub.remove();
  }, [call]);

  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: () => { pan.extractOffset(); },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        pan.flattenOffset();

        // AIMANTATION SUR LE BORD LE PLUS PROCHE + maintien dans l'écran.
        //
        // Sur iOS, cette bulle EST le picture-in-picture : le PiP système est
        // impossible pour une visio en WebView (Apple n'expose que des
        // couches vidéo natives). Elle doit donc être irréprochable.
        //
        // Deux défauts corrigés ici :
        //   - la bulle pouvait être lâchée À MOITIÉ HORS DE L'ÉCRAN, voire
        //     complètement : c'est pourtant elle qui permet de revenir en
        //     plein écran, donc on perdait l'accès à l'appel ;
        //   - elle restait là où le doigt l'avait laissée, en plein milieu du
        //     contenu. Toutes les fenêtres flottantes (FaceTime, WhatsApp)
        //     reviennent se coller à un bord.
        const maxX = Math.max(MARGIN, screen.width - bubbleSize.w - MARGIN);
        const maxY = Math.max(
          insets.top + MARGIN,
          screen.height - bubbleSize.h - MARGIN - insets.bottom,
        );
        const currentX = (pan.x as any)._value ?? 0;
        const currentY = (pan.y as any)._value ?? 0;

        // Bord gauche ou droit selon le côté où se trouve le CENTRE.
        const targetX = currentX + bubbleSize.w / 2 < screen.width / 2
          ? MARGIN
          : maxX;
        const targetY = Math.min(Math.max(currentY, insets.top + MARGIN), maxY);

        Animated.spring(pan, {
          toValue: { x: targetX, y: targetY },
          useNativeDriver: false,
          friction: 8,
          tension: 60,
        }).start();
      },
    }),
    [pan, screen.width, screen.height, bubbleSize.w, bubbleSize.h, insets.top, insets.bottom],
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
        <View
          style={[
            styles.webviewWrap,
            // SAFE AREA : en plein ecran, la WebView doit commencer SOUS la
            // barre d'etat / l'encoche.
            //
            // BUG CORRIGE (2026-10-07) : « la webview de la visio ne gere pas
            // de safearea, le contenu est superpose avec l'entete android ».
            // Le conteneur est en `absoluteFillObject` (plein ecran, voulu pour
            // le fond noir), et notre en-tete est superpose — mais Jitsi dessine
            // SA PROPRE interface tout en haut de la page : son logo et son
            // bouton de raccrochage passaient donc sous l'heure et les icones
            // reseau, illisibles et en partie intouchables.
            //
            // En mode BULLE on ne decale rien : la bulle flotte au milieu de
            // l'ecran, elle n'a aucun bord a eviter.
            !isBubble && {
              marginTop: insets.top,
              marginBottom: insets.bottom,
            },
          ]}
          pointerEvents={isBubble ? 'none' : 'auto'}
        >
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
            onMessage={hush.onMessage}
          />
          {hush.sensorElement}
          {isLoading && !isBubble && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* ── Contrôles PLEIN ÉCRAN (superposés, pas de re-render de la WebView) ──
             Masqués en fenêtre PiP : dans une vignette, ils couvriraient la
             vidéo et seraient de toute façon intouchables (le système ne
             transmet pas les évènements tactiles à une fenêtre PiP). */}
      {!isBubble && !isInPip && (
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

          {call.recordingNotice && showRecordingNotice ? (
            <Animated.View
              style={[
                styles.recordingNotice,
                { top: insets.top + 52, opacity: noticeOpacity },
              ]}
              pointerEvents="none"
              accessibilityLiveRegion="polite"
            >
              <Ionicons name="radio-button-on" size={12} color="#FF6B6B" />
              <Text style={styles.recordingNoticeText} numberOfLines={3}>{call.recordingNotice}</Text>
            </Animated.View>
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
