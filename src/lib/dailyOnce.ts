/**
 * « Une fois par jour » (R3 W4/W5) : une petite attention apparaît lors de la
 * première visite du jour et reste visible pendant cette session (l'écran peut
 * être remonté) ; elle ne revient pas aux ouvertures suivantes de la journée.
 * Clé de jour LOCAL.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dayKey } from './utils/rituals';

const PREFIX = '@eventez_daily_once_';
const claimedInSession = new Map<string, string>();

const refusedInSession = new Map<string, string>();

/**
 * `true` si `name` peut être montré : jamais montré aujourd'hui, ou montré
 * pendant CETTE session. Le premier `true` du jour le marque montré.
 */
export async function claimDaily(name: string, today: Date = new Date()): Promise<boolean> {
  const day = dayKey(today);
  if (claimedInSession.get(name) === day) return true;
  if (refusedInSession.get(name) === day) return false;
  try {
    const stored = await AsyncStorage.getItem(PREFIX + name);
    if (stored === day) {
      refusedInSession.set(name, day);
      return false;
    }
    await AsyncStorage.setItem(PREFIX + name, day);
  } catch {
    /* stockage indisponible : la session fait foi */
  }
  claimedInSession.set(name, day);
  return true;
}

/** Tests uniquement. */
export function __resetDailyOnce() {
  claimedInSession.clear();
  refusedInSession.clear();
}
