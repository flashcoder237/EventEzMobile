/**
 * Préférences sensorielles (round 3, P1) : défauts, persistance, et respect du
 * réglage « Vibrations » par utils/haptics.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  __resetSensoryPrefs,
  getSensoryPref,
  primeSensoryPrefs,
  setSensoryPref,
  subscribeSensoryPrefs,
} from '../sensoryPrefs';
import { haptics } from '../../utils/haptics';

beforeEach(async () => {
  __resetSensoryPrefs();
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('sensoryPrefs', () => {
  it('défauts : vibrations ON, sons d’interface OFF, gestes ON', () => {
    expect(getSensoryPref('vibrations')).toBe(true);
    expect(getSensoryPref('uiSounds')).toBe(false);
    expect(getSensoryPref('motionGestures')).toBe(true);
  });

  it('persiste et relit la valeur au prochain démarrage', async () => {
    await setSensoryPref('vibrations', false);
    __resetSensoryPrefs();
    expect(getSensoryPref('vibrations')).toBe(true); // avant amorçage : défaut
    await primeSensoryPrefs();
    expect(getSensoryPref('vibrations')).toBe(false);
  });

  it('notifie les abonnés', async () => {
    const listener = jest.fn();
    subscribeSensoryPrefs(listener);
    await setSensoryPref('uiSounds', true);
    expect(listener).toHaveBeenCalled();
  });
});

describe('haptics respecte « Vibrations »', () => {
  it('vibre quand le réglage est actif', () => {
    haptics.success();
    haptics.light();
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
  });

  it('ne vibre plus quand le réglage est coupé', async () => {
    await setSensoryPref('vibrations', false);
    haptics.success();
    haptics.light();
    haptics.selection();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });
});
