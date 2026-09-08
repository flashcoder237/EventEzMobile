import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

/**
 * Lecteur PLEIN ÉCRAN de la cover video d'un événement — AVEC LE SON.
 *
 * Problème résolu : sur la fiche, la cover video jouait en fond, muette, et le
 * tap sur la bannière ouvrait le VISIONNEUR DE PHOTOS (la vidéo disparaissait).
 * L'utilisateur qui voulait « voir la vidéo » tombait sur une image figée.
 * Ici, on ouvre un vrai lecteur : son activé, contrôles natifs (play/pause/seek),
 * fermeture explicite.
 *
 * - Vidéo uploadée (`videoUri`) → composant expo-av `Video` avec `useNativeControls`.
 * - Embed YouTube/Vimeo (`embedUrl`) → WebView (les contrôles viennent du lecteur
 *   embarqué).
 */
interface Props {
  visible: boolean;
  onClose: () => void;
  /** URL de la vidéo uploadée (prioritaire). */
  videoUri?: string | null;
  /** URL d'embed YouTube/Vimeo (fallback si pas de vidéo uploadée). */
  embedUrl?: string | null;
  /** Poster affiché pendant le chargement. */
  posterUri?: string | null;
}

export default function EventCoverVideoModal({
  visible,
  onClose,
  videoUri,
  embedUrl,
  posterUri,
}: Props) {
  const { t } = useTranslation();
  const videoRef = useRef<Video>(null);
  const [loading, setLoading] = useState(true);

  const useUploaded = !!videoUri;
  // Autoplay avec son : on est en plein écran suite à un tap explicite de
  // l'utilisateur, donc le son est légitime (contrairement à l'autoplay de la
  // bannière qui DOIT rester muet côté iOS/Android).
  const onStatus = (status: AVPlaybackStatus) => {
    if (status.isLoaded && loading) setLoading(false);
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {useUploaded ? (
          <Video
            ref={videoRef}
            source={{ uri: videoUri! }}
            posterSource={posterUri ? { uri: posterUri } : undefined}
            usePoster={!!posterUri}
            shouldPlay
            isMuted={false}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            onPlaybackStatusUpdate={onStatus}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
            style={StyleSheet.absoluteFill}
          />
        ) : embedUrl ? (
          <WebView
            source={{ uri: embedUrl }}
            style={StyleSheet.absoluteFill}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            onLoadEnd={() => setLoading(false)}
          />
        ) : null}

        {loading && (
          <View style={styles.loader} pointerEvents="none">
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}

        {/* Bouton fermer — toujours au-dessus des contrôles natifs. */}
        <SafeAreaView style={styles.closeSafe} edges={['top']} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close', { defaultValue: 'Fermer' })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
            <Text style={styles.closeText}>{t('common.close', { defaultValue: 'Fermer' })}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  closeSafe: { position: 'absolute', top: 0, left: 0, right: 0 },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    margin: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    // Marge de sécurité sous la status bar translucide sur Android.
    marginTop: Platform.OS === 'android' ? 20 : 12,
  },
  closeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
