/**
 * useEventFormImages — Image picking & persistence for event creation form
 *
 * Extracted from useEventForm to reduce hook size.
 */

import { useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

import type { AlertActions } from './useEventForm';

const DRAFT_IMAGES_DIR = (FileSystem.documentDirectory ?? '') + 'event_draft_images/';

async function persistImageToDisk(uri: string): Promise<string> {
  try {
    await FileSystem.makeDirectoryAsync(DRAFT_IMAGES_DIR, { intermediates: true });
    const ext = uri.toLowerCase().includes('.png') ? 'png' : 'jpg';
    const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const dest = DRAFT_IMAGES_DIR + filename;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}

interface UseEventFormImagesOptions {
  alertActions: AlertActions;
  setBannerImage: (value: string | null) => void;
  setGalleryImages: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useEventFormImages({ alertActions, setBannerImage, setGalleryImages }: UseEventFormImagesOptions) {
  const { showAlert } = alertActions;

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission requise', 'Veuillez autoriser l\'accès à la galerie', undefined, 'warning');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 1920 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        const persistent = await persistImageToDisk(compressed.uri);
        setBannerImage(persistent);
      } catch {
        const persistent = await persistImageToDisk(result.assets[0].uri);
        setBannerImage(persistent);
      }
    }
  }, [showAlert, setBannerImage]);

  const pickGalleryImages = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission requise', 'Veuillez autoriser l\'accès à la galerie', undefined, 'warning');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });
    if (!result.canceled && result.assets.length > 0) {
      const persistedUris = await Promise.all(
        result.assets.map(a => persistImageToDisk(a.uri))
      );
      setGalleryImages(prev => [...prev, ...persistedUris].slice(0, 10));
    }
  }, [showAlert, setGalleryImages]);

  const removeGalleryImage = useCallback((index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  }, [setGalleryImages]);

  return { pickImage, pickGalleryImages, removeGalleryImage };
}
