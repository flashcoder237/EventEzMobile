/**
 * Demande de note in-app (ASO — levier #1 : volume + note moyenne).
 *
 * On déclenche `StoreReview.requestReview()` UNIQUEMENT à des moments « delight »
 * (achat de billet réussi, check-in réussi). L'OS rate-limite déjà fortement
 * (iOS : 3×/an max, peut ne rien afficher), mais on ajoute notre propre garde :
 *   - jamais deux fois pour la même version d'app,
 *   - jamais avant un nombre minimal de moments positifs,
 *   - jamais bloquant : toute erreur est avalée.
 *
 * Ne JAMAIS appeler après une erreur / un échec : on ne sollicite une note que
 * quand l'utilisateur vient de vivre quelque chose de positif.
 */
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const VERSION_KEY = 'review:lastPromptedVersion';
const COUNT_KEY = 'review:delightCount';

// Nombre de moments positifs requis avant la 1re sollicitation. 1 = on demande
// dès le premier achat réussi (l'utilisateur a démontré son engagement).
const MIN_DELIGHT = 1;

/**
 * Sollicite une note si les conditions sont réunies. Best-effort, silencieux.
 * @param trigger libellé du moment déclencheur (télémétrie/debug uniquement)
 */
export async function maybeRequestReview(trigger: string = 'generic'): Promise<void> {
  try {
    // Indispo en Expo Go / plateformes non supportées → no-op.
    const available = await StoreReview.isAvailableAsync();
    if (!available) return;

    const version = Constants.expoConfig?.version ?? 'unknown';

    // Déjà sollicité sur cette version → on ne réinsiste pas.
    const lastVersion = await AsyncStorage.getItem(VERSION_KEY);
    if (lastVersion === version) return;

    // Compteur de moments positifs — évite de solliciter trop tôt.
    const raw = await AsyncStorage.getItem(COUNT_KEY);
    const count = (raw ? parseInt(raw, 10) || 0 : 0) + 1;
    await AsyncStorage.setItem(COUNT_KEY, String(count));
    if (count < MIN_DELIGHT) return;

    if (__DEV__) console.log(`[reviewService] requestReview (trigger=${trigger}, v=${version})`);
    await StoreReview.requestReview();

    // On marque la version comme sollicitée même si l'OS n'a (peut-être) rien
    // affiché : impossible de le savoir, et on ne veut pas réinsister.
    await AsyncStorage.setItem(VERSION_KEY, version);
  } catch {
    // Silencieux : une demande de note ne doit jamais perturber un flow.
  }
}
