import { useCallback, useEffect, useState } from 'react';
import {
  getSensoryPref,
  primeSensoryPrefs,
  setSensoryPref,
  subscribeSensoryPrefs,
  type SensoryPref,
} from '../lib/sensoryPrefs';

/** Lit et modifie une préférence sensorielle (vibrations, sons d'interface, gestes). */
export function useSensoryPref(name: SensoryPref): [boolean, (value: boolean) => Promise<void>] {
  const [value, setValue] = useState(() => getSensoryPref(name));

  useEffect(() => {
    const sync = () => setValue(getSensoryPref(name));
    const unsub = subscribeSensoryPrefs(sync);
    primeSensoryPrefs().then(sync);
    return unsub;
  }, [name]);

  const update = useCallback((next: boolean) => setSensoryPref(name, next), [name]);
  return [value, update];
}
