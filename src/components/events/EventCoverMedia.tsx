import React, { memo, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ImageStyle, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { WebView } from 'react-native-webview';
import { Event } from '../../types';
import { getMediaUrl } from '../../api/config';

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
}: EventCoverMediaProps) {
  const videoRef = useRef<Video>(null);
  const [videoError, setVideoError] = useState(false);

  const coverVideoUri = event.cover_video ? getMediaUrl(event.cover_video) : null;
  const coverVideoEmbed = event.cover_video_embed || '';
  const hasUploadedVideo = !!coverVideoUri && !videoError;
  const hasEmbedVideo = !hasUploadedVideo && !!coverVideoEmbed;

  // Image fallback URI (pour poster + image de secours)
  const imageUri =
    fallbackImageUri ||
    getMediaUrl(event.banner_image || event.category?.default_event_image || null);
  const placeholder = fallbackPlaceholder || event.banner_placeholder || event.category?.default_event_image_placeholder || undefined;

  // Play/pause via shouldPlay (controle par parent en mode card)
  useEffect(() => {
    if (!videoRef.current) return;
    if (shouldPlay) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [shouldPlay]);

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
          shouldPlay={shouldPlay}
          isMuted
          isLooping
          resizeMode={ResizeMode.COVER}
          onError={() => setVideoError(true)}
          style={StyleSheet.absoluteFill}
        />
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
      </View>
    );
  }

  // ─── Fallback : image LQIP ───
  return (
    <View style={[styles.container, style]} testID={testID}>
      {imageUri ? (
        <>
          {/* Voir commentaire plus haut sur le workaround LQIP. */}
          {placeholder && (
            <Image
              source={{ uri: placeholder }}
              contentFit="cover"
              cachePolicy="memory-disk"
              style={[StyleSheet.absoluteFill, imageStyle]}
            />
          )}
          <Image
            source={{ uri: imageUri }}
            contentFit="cover"
            transition={400}
            cachePolicy="memory-disk"
            style={[StyleSheet.absoluteFill, imageStyle]}
          />
        </>
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
});

export const EventCoverMedia = memo(EventCoverMediaImpl, (prev, next) => {
  return (
    prev.event.id === next.event.id &&
    prev.event.cover_video === next.event.cover_video &&
    prev.event.cover_video_embed === next.event.cover_video_embed &&
    prev.event.banner_image === next.event.banner_image &&
    prev.mode === next.mode &&
    prev.shouldPlay === next.shouldPlay
  );
});

export default EventCoverMedia;
