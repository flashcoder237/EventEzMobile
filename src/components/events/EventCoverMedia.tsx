import React, { memo, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ImageStyle, ViewStyle, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode, Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
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
}: EventCoverMediaProps) {
  const videoRef = useRef<Video>(null);
  const [videoError, setVideoError] = useState(false);
  const [muted, setMuted] = useState(true);
  // Lecture in-place : autoplay muet SI autorisé ; sinon on attend un tap play.
  const [manualPlay, setManualPlay] = useState(false);

  const coverVideoUri = event.cover_video ? getMediaUrl(event.cover_video) : null;
  const coverVideoEmbed = event.cover_video_embed || '';
  const hasUploadedVideo = !!coverVideoUri && !videoError;
  const hasEmbedVideo = !hasUploadedVideo && !!coverVideoEmbed;

  // La vidéo joue si : parent l'autorise (shouldPlay, ex. visible à l'écran) ET
  // (autoplay réseau/a11y autorisé OU l'utilisateur a tapé play).
  const playing = shouldPlay && (allowAutoplay || manualPlay);

  // Audio focus : en activant le son, on coupe la musique/podcast des autres
  // apps (comportement propre, façon Instagram). Rétabli en re-mutant.
  const applyAudioFocus = async (takeFocus: boolean) => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: takeFocus,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
      });
    } catch { /* best-effort */ }
  };

  const toggleMute = () => {
    setMuted(prev => {
      const next = !prev;
      applyAudioFocus(!next); // son ON → prend le focus audio
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
        <Video
          ref={videoRef}
          source={{ uri: coverVideoUri! }}
          posterSource={imageUri ? { uri: imageUri } : undefined}
          usePoster
          shouldPlay={playing}
          isMuted={muted}
          isLooping
          resizeMode={ResizeMode.COVER}
          onError={() => setVideoError(true)}
          style={StyleSheet.absoluteFill}
        />

        {/* Overlay play : quand l'autoplay est coupé (data éco / réduire les
            animations) et que l'utilisateur n'a pas encore tapé play. */}
        {showControls && !playing && (
          <TouchableOpacity
            style={styles.playOverlay}
            activeOpacity={0.85}
            onPress={() => setManualPlay(true)}
            accessibilityRole="button"
          >
            <View style={styles.playCircle}>
              <Ionicons name="play" size={26} color="#0F172A" />
            </View>
          </TouchableOpacity>
        )}

        {/* Contrôles in-place (son au tap + agrandir) — seulement en hero. */}
        {showControls && playing && (
          <View style={styles.controlsRow} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.ctrlBtn}
              onPress={toggleMute}
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={18} color="#FFFFFF" />
            </TouchableOpacity>
            {onExpand && (
              <TouchableOpacity
                style={styles.ctrlBtn}
                onPress={onExpand}
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="expand" size={18} color="#FFFFFF" />
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
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="expand" size={18} color="#FFFFFF" />
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
  // Contrôles son + agrandir, en bas à droite de la vidéo hero. La position
  // verticale exacte est gérée par le parent via le style du conteneur ; ici on
  // se cale en haut-droite pour ne pas gêner le bloc contenu qui chevauche le bas.
  controlsRow: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  ctrlBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    prev.onExpand === next.onExpand
  );
});

export default EventCoverMedia;
