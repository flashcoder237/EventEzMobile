import React, { memo, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ImageStyle, ViewStyle, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode, Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Event } from '../../types';
import { getMediaUrl } from '../../api/config';
import EventImage from './EventImage';

interface EventCoverMediaProps {
  event: Pick<Event, 'id' | 'title' | 'banner_image' | 'banner_placeholder' | 'cover_video' | 'cover_video_embed' | 'category'> & Record<string, any>;
  /** "card" : autoplay seulement si visible (passe shouldPlay)
   *  "hero" : autoplay direct (page detail) */
  mode: 'card' | 'hero';
  /** Override pour viewport gating depuis FlatList (carte). Defaut: true en hero, true en card. */
  shouldPlay?: boolean;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  fallbackImageUri?: string | null;
  fallbackPlaceholder?: string;
  testID?: string;
  /** hero uniquement : affiche les contrôles in-place (son au tap + agrandir). */
  showControls?: boolean;
  /** Autoplay autorisé (réseau/a11y). Si false : poster + bouton play (pas d'autoplay). */
  allowAutoplay?: boolean;
  /** Callback « agrandir » → lecteur plein écran (fourni par le parent). */
  onExpand?: () => void;
  /** Appelé quand la vidéo est en erreur et qu'on retombe sur l'image : permet
   *  au parent de réactiver le tap galerie (sinon écran figé sans interaction). */
  onVideoUnavailable?: () => void;
}

/**
 * Affiche la cover d'un evenement (video upload via expo-av, embed YouTube/Vimeo via WebView, ou image fallback).
 *
 * Sur card : `shouldPlay` est controle par le parent (FlatList viewability)
 * Sur hero : autoplay direct
 *
 * Toujours mute + loop (pas de son sans tap utilisateur, regle iOS/Android).
 */
function EventCoverMediaImpl({
  event,
  mode,
  shouldPlay = true,
  style,
  imageStyle,
  fallbackImageUri,
  fallbackPlaceholder,
  testID,
  showControls = false,
  allowAutoplay = true,
  onExpand,
  onVideoUnavailable,
}: EventCoverMediaProps) {
  const { t } = useTranslation();
  const videoRef = useRef<Video>(null);
  const [videoError, setVideoError] = useState(false);
  const [muted, setMuted] = useState(true);
  // Lecture in-place : autoplay muet SI autorisé ; sinon on attend un tap play.
  const [manualPlay, setManualPlay] = useState(false);
  // Suit si CE composant a pris le focus audio, pour ne le relâcher qu'une fois.
  const audioFocusHeldRef = useRef(false);

  const coverVideoUri = event.cover_video ? getMediaUrl(event.cover_video) : null;
  const coverVideoEmbed = event.cover_video_embed || '';
  const hasUploadedVideo = !!coverVideoUri && !videoError;
  const hasEmbedVideo = !hasUploadedVideo && !!coverVideoEmbed;

  // B4 (fix) : si le réseau interdit l'autoplay (data éco), on ANNULE aussi le
  // play manuel — sinon la vidéo continuait de streamer en 4G éco dès qu'on avait
  // touché une fois. Et on re-mute (pas de son sur data coûteuse).
  useEffect(() => {
    if (!allowAutoplay) {
      setManualPlay(false);
      setMuted(true);
    }
  }, [allowAutoplay]);

  // La vidéo joue si : parent l'autorise (shouldPlay, ex. visible à l'écran) ET
  // (autoplay réseau/a11y autorisé OU l'utilisateur a tapé play).
  const playing = shouldPlay && (allowAutoplay || manualPlay);

  // Audio focus : en activant le son, on coupe la musique/podcast des autres
  // apps (façon Instagram). B2 (fix) : on mémorise qu'on l'a pris et on le
  // RELÂCHE au démontage — sinon playsInSilentModeIOS restait vissé globalement
  // (mode silencieux iOS cassé pour toute l'app) et les autres apps jamais
  // relâchées.
  const applyAudioFocus = async (takeFocus: boolean) => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: takeFocus,
        interruptionModeIOS: takeFocus ? InterruptionModeIOS.DoNotMix : InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: takeFocus ? InterruptionModeAndroid.DoNotMix : InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
      });
      audioFocusHeldRef.current = takeFocus;
    } catch { /* best-effort */ }
  };

  // Relâche le focus audio au démontage s'il était pris (B2).
  useEffect(() => {
    return () => {
      if (audioFocusHeldRef.current) {
        Audio.setAudioModeAsync({
          playsInSilentModeIOS: false,
          interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          shouldDuckAndroid: true,
        }).catch(() => {});
      }
    };
  }, []);

  // Re-mute quand la vidéo cesse de jouer (scroll/plein écran) : évite que le
  // son resurgisse à fond au retour (B1 côté in-place, complément du fix parent).
  useEffect(() => {
    if (!playing && !muted) {
      setMuted(true);
      if (audioFocusHeldRef.current) applyAudioFocus(false);
    }
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMute = () => {
    setMuted(prev => {
      const next = !prev;
      applyAudioFocus(!next); // son ON → prend le focus audio ; son OFF → relâche
      if (!next && !manualPlay) setManualPlay(true); // activer le son démarre la lecture
      return next;
    });
  };

  // Image fallback URI (pour poster + image de secours)
  const imageUri =
    fallbackImageUri ||
    getMediaUrl(event.banner_image || event.category?.default_event_image || null);
  const placeholder = fallbackPlaceholder || event.banner_placeholder || event.category?.default_event_image_placeholder || undefined;

  // Play/pause : `playing` intègre shouldPlay (visibilité/parent) + autoplay
  // autorisé ou play manuel. Pause au scroll = shouldPlay passe à false.
  useEffect(() => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [playing]);

  // ─── Video uploadee via expo-av ───
  if (hasUploadedVideo) {
    return (
      <View style={[styles.container, style]} testID={testID}>
        {/* Couche placeholder LQIP — rendue comme `source` pour que
            contentFit="cover" remplisse le conteneur. Workaround d'un bug
            connu d'expo-image v3 où `placeholderContentFit` est ignoré sur
            les data URIs petits (le placeholder reste à sa taille
            intrinsèque ~20px et apparaît minuscule). */}
        {placeholder && (
          <Image
            source={{ uri: placeholder }}
            contentFit="cover"
            cachePolicy="memory-disk"
            style={[StyleSheet.absoluteFill, imageStyle]}
          />
        )}
        {/* Image en arriere-plan (poster + fallback chargement) */}
        {imageUri && (
          <Image
            source={{ uri: imageUri }}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            style={[StyleSheet.absoluteFill, imageStyle]}
          />
        )}
        {/* B11 (fix) : pas de `usePoster` — l'image de fond ci-dessus (absoluteFill,
            même URI) sert déjà de poster. En cumuler un 2e via la balise Video
            ajoutait une couche qui se relaie (flou→image→poster→vidéo = clignotement). */}
        <Video
          ref={videoRef}
          source={{ uri: coverVideoUri! }}
          shouldPlay={playing}
          isMuted={muted}
          isLooping
          resizeMode={ResizeMode.COVER}
          onError={() => { setVideoError(true); onVideoUnavailable?.(); }}
          style={StyleSheet.absoluteFill}
        />

        {/* Overlay play : quand l'autoplay est coupé (data éco / réduire les
            animations) et que l'utilisateur n'a pas encore tapé play.
            B9 (fix) : play + SON d'un seul tap (comme TikTok) — inutile de taper
            play puis son. */}
        {showControls && !playing && (
          <TouchableOpacity
            style={styles.playOverlay}
            activeOpacity={0.85}
            onPress={() => { setManualPlay(true); setMuted(false); applyAudioFocus(true); }}
            accessibilityRole="button"
            accessibilityLabel={t('eventDetails.videoPlayA11y', { defaultValue: 'Lire la vidéo avec le son' })}
          >
            <View style={styles.playCircle}>
              <Ionicons name="play" size={26} color="#0F172A" />
            </View>
          </TouchableOpacity>
        )}

        {/* Contrôles in-place (son au tap + agrandir) — seulement en hero.
            B8 (fix) : placés en BAS-GAUCHE pour ne plus être collés à follow/share
            (haut-droite), cibles 44×44 espacées. B7 (fix) : accessibilityLabel. */}
        {showControls && playing && (
          <View style={styles.controlsRow} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={toggleMute}
              accessibilityRole="button"
              accessibilityLabel={
                muted
                  ? t('eventDetails.videoUnmuteA11y', { defaultValue: 'Activer le son' })
                  : t('eventDetails.videoMuteA11y', { defaultValue: 'Couper le son' })
              }
            >
              <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={20} color="#FFFFFF" />
            </TouchableOpacity>
            {onExpand && (
              <TouchableOpacity
                style={styles.ctrlBtn}
                onPress={onExpand}
                accessibilityRole="button"
                accessibilityLabel={t('eventDetails.videoExpandA11y', { defaultValue: 'Agrandir la vidéo en plein écran' })}
              >
                <Ionicons name="expand" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  // ─── Embed YouTube/Vimeo via WebView (uniquement en mode hero, trop lourd pour les cards) ───
  if (hasEmbedVideo && mode === 'hero') {
    return (
      <View style={[styles.container, style]} testID={testID}>
        <WebView
          source={{ uri: coverVideoEmbed }}
          style={StyleSheet.absoluteFill}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() =>
            imageUri ? (
              <View style={StyleSheet.absoluteFill}>
                {/* Voir commentaire plus haut sur le workaround LQIP. */}
                {placeholder && (
                  <Image
                    source={{ uri: placeholder }}
                    contentFit="cover"
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Image
                  source={{ uri: imageUri }}
                  contentFit="cover"
                  style={StyleSheet.absoluteFill}
                />
              </View>
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0F172A' }]} />
            )
          }
        />
        {/* Embed : le son/lecture sont gérés par le lecteur YouTube/Vimeo lui-même.
            On propose juste « agrandir » vers le lecteur plein écran. */}
        {showControls && onExpand && (
          <View style={styles.controlsRow} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={onExpand}
              accessibilityRole="button"
              accessibilityLabel={t('eventDetails.videoExpandA11y', { defaultValue: 'Agrandir la vidéo en plein écran' })}
            >
              <Ionicons name="expand" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ─── Fallback : image LQIP ───
  return (
    <View style={[styles.container, style]} testID={testID}>
      {imageUri ? (
        <EventImage
          uri={imageUri}
          placeholder={placeholder}
          transition={400}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#E2E8F0' }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    // léger décalage optique du triangle play
    paddingLeft: 3,
  },
  // Contrôles son + agrandir : BAS-GAUCHE (loin de follow/share en haut-droite,
  // qui provoquaient des confusions de tap). Relevés de 56px pour ne pas être
  // masqués par le bloc de contenu qui chevauche le bas de la bannière.
  controlsRow: {
    position: 'absolute',
    bottom: 56,
    left: 12,
    flexDirection: 'row',
    gap: 12,
  },
  // 44×44 : cible tactile accessible (recommandation WCAG / iOS HIG).
  ctrlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const EventCoverMedia = memo(EventCoverMediaImpl, (prev, next) => {
  return (
    prev.event.id === next.event.id &&
    prev.event.cover_video === next.event.cover_video &&
    prev.event.cover_video_embed === next.event.cover_video_embed &&
    prev.event.banner_image === next.event.banner_image &&
    prev.mode === next.mode &&
    prev.shouldPlay === next.shouldPlay &&
    prev.showControls === next.showControls &&
    prev.allowAutoplay === next.allowAutoplay &&
    prev.onExpand === next.onExpand &&
    prev.onVideoUnavailable === next.onVideoUnavailable
  );
});

export default EventCoverMedia;
