/**
 * Tests de useEventFormImages — sélection + persistance des images de l'event.
 *
 * Couverture : garde de permission (refus → alerte, pas de pick), bannière
 * (compression + persistance disque), galerie (compression de chaque image +
 * cap à 10), suppression par index, et annulation du picker (no-op).
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useState } from 'react';

const mockRequestPerms = jest.fn();
const mockLaunchLibrary = jest.fn();
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: (...a: any[]) => mockRequestPerms(...a),
  launchImageLibraryAsync: (...a: any[]) => mockLaunchLibrary(...a),
  MediaTypeOptions: { Images: 'Images' },
}));

const mockManipulate = jest.fn();
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: (...a: any[]) => mockManipulate(...a),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
}));

import { useEventFormImages } from '../useEventFormImages';

const showAlert = jest.fn();
const alertActions = { showAlert, showSuccess: jest.fn(), showError: jest.fn() } as any;

function useHost() {
  const [banner, setBannerImage] = useState<string | null>(null);
  const [gallery, setGalleryImages] = useState<string[]>([]);
  const api = useEventFormImages({ alertActions, setBannerImage, setGalleryImages });
  return { api, banner, gallery };
}

beforeEach(() => {
  showAlert.mockClear();
  mockRequestPerms.mockReset().mockResolvedValue({ status: 'granted' });
  mockLaunchLibrary.mockReset();
  // Par défaut la compression renvoie une uri "compressée".
  mockManipulate.mockReset().mockImplementation(async (uri: string) => ({ uri: `${uri}#c` }));
});

describe('permission', () => {
  it('refus → alerte et aucun pick', async () => {
    mockRequestPerms.mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() => useHost());
    await act(async () => { await result.current.api.pickImage(); });

    expect(showAlert).toHaveBeenCalledWith(
      'Permission requise', expect.any(String), undefined, 'warning',
    );
    expect(mockLaunchLibrary).not.toHaveBeenCalled();
  });
});

describe('pickImage (bannière)', () => {
  it('compresse puis persiste l\'image choisie', async () => {
    mockLaunchLibrary.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///photo.jpg' }] });
    const { result } = renderHook(() => useHost());
    await act(async () => { await result.current.api.pickImage(); });

    expect(mockManipulate).toHaveBeenCalledWith(
      'file:///photo.jpg',
      [{ resize: { width: 1920 } }],
      expect.objectContaining({ compress: 0.7 }),
    );
    // persistImageToDisk copie vers documentDirectory → uri finale sous file:///docs/
    await waitFor(() => expect(result.current.banner).toMatch(/^file:\/\/\/docs\/event_draft_images\//));
  });

  it('picker annulé → bannière inchangée', async () => {
    mockLaunchLibrary.mockResolvedValue({ canceled: true, assets: [] });
    const { result } = renderHook(() => useHost());
    await act(async () => { await result.current.api.pickImage(); });
    expect(result.current.banner).toBeNull();
  });
});

describe('pickGalleryImages', () => {
  it('compresse chaque image et les persiste', async () => {
    mockLaunchLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.jpg' }, { uri: 'file:///b.jpg' }],
    });
    const { result } = renderHook(() => useHost());
    await act(async () => { await result.current.api.pickGalleryImages(); });

    await waitFor(() => expect(result.current.gallery).toHaveLength(2));
    // 1 appel manipulate par image.
    expect(mockManipulate).toHaveBeenCalledTimes(2);
  });

  it('cap à 10 images maximum', async () => {
    const assets = Array.from({ length: 12 }, (_, i) => ({ uri: `file:///g${i}.jpg` }));
    mockLaunchLibrary.mockResolvedValue({ canceled: false, assets });
    const { result } = renderHook(() => useHost());
    await act(async () => { await result.current.api.pickGalleryImages(); });

    await waitFor(() => expect(result.current.gallery.length).toBeLessThanOrEqual(10));
    expect(result.current.gallery).toHaveLength(10);
  });

  it('picker annulé → galerie inchangée', async () => {
    mockLaunchLibrary.mockResolvedValue({ canceled: true, assets: [] });
    const { result } = renderHook(() => useHost());
    await act(async () => { await result.current.api.pickGalleryImages(); });
    expect(result.current.gallery).toEqual([]);
  });
});

describe('removeGalleryImage', () => {
  it('retire l\'image par index', async () => {
    mockLaunchLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///x.jpg' }, { uri: 'file:///y.jpg' }, { uri: 'file:///z.jpg' }],
    });
    const { result } = renderHook(() => useHost());
    await act(async () => { await result.current.api.pickGalleryImages(); });
    await waitFor(() => expect(result.current.gallery).toHaveLength(3));

    act(() => result.current.api.removeGalleryImage(1));
    expect(result.current.gallery).toHaveLength(2);
  });
});
