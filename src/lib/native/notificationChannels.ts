/**
 * H3 — Canaux de notification à son dédié (Android) + même son sur iOS.
 *
 * Android fige le son d'un canal à sa CRÉATION : on ne peut pas « changer le
 * son » des canaux existants (default, event_reminders, payments…). D'où deux
 * canaux NOUVEAUX, chacun avec sa signature sonore EventEz :
 *  - `eventez_moments` : portes ouvertes, « c'est maintenant » (carillon) ;
 *  - `eventez_sales`   : vente encaissée, côté organisateur (double note).
 * Les fichiers sont embarqués par le plugin expo-notifications (`sounds` dans
 * app.json → res/raw sur Android, bundle sur iOS).
 *
 * Côté serveur, il suffit d'envoyer `channelId: "eventez_moments"` (Android)
 * et `sound: "eventez_chime.wav"` (iOS) pour les types concernés — voir la
 * note de version. Tant que le backend ne les utilise pas, ces canaux sont
 * créés mais inactifs : aucun effet de bord.
 */
import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import i18n from '../../i18n';

export const MOMENTS_CHANNEL = 'eventez_moments';
export const SALES_CHANNEL = 'eventez_sales';
export const CHIME_SOUND = 'eventez_chime.wav';
export const SALE_SOUND = 'eventez_sale.wav';

let done = false;

export async function ensureSoundChannels(): Promise<void> {
  if (done || Platform.OS !== 'android') return;
  done = true;
  const fr = !String(i18n.language || 'fr').startsWith('en');
  try {
    await Notifications.setNotificationChannelAsync(MOMENTS_CHANNEL, {
      name: fr ? 'Moments forts' : 'Big moments',
      description: fr
        ? 'Ouverture des portes, début de vos événements'
        : 'Doors opening, your events starting',
      importance: Notifications.AndroidImportance.HIGH,
      sound: CHIME_SOUND,
      vibrationPattern: [0, 180, 120, 260],
      lightColor: '#4F46E5',
    });
    await Notifications.setNotificationChannelAsync(SALES_CHANNEL, {
      name: fr ? 'Ventes' : 'Sales',
      description: fr ? 'Billets vendus pour vos événements' : 'Tickets sold for your events',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: SALE_SOUND,
      lightColor: '#FF6B6B',
    });
  } catch {
    done = false;
  }
}

/**
 * Ouvre les réglages SYSTÈME des notifications d'EventEz, là où l'utilisateur
 * choisit le son de chaque catégorie.
 *
 * - Android : liste des canaux de l'app (Moments forts, Ventes, Messages,
 *   Rappels…) → pour chacun : son, vibration, silence. C'est la seule façon
 *   fiable : le son d'un canal est figé par le système après sa création.
 * - iOS : réglages de l'app (Notifications > Sons). iOS ne permet pas à une
 *   app de proposer un choix de son par catégorie.
 */
export async function openNotificationSoundSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      const IntentLauncher = require('expo-intent-launcher');
      const pkg = Constants.expoConfig?.android?.package || 'net.overbrand.eventez';
      await IntentLauncher.startActivityAsync('android.settings.APP_NOTIFICATION_SETTINGS', {
        extra: { 'android.provider.extra.APP_PACKAGE': pkg },
      });
      return;
    } catch {
      // Constructeur exotique : on retombe sur la fiche de l'app.
    }
  }
  await Linking.openSettings().catch(() => {});
}
