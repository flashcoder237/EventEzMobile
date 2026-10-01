import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import App from './App';

// Android — actions de notification Notifee quand l'app est en arrière-plan ou
// fermée. Doit être enregistré au niveau module, AVANT registerRootComponent :
// Android peut lancer le JS sans interface juste pour traiter l'action.
//  - « Marquer comme lu » et « Répondre » (saisie) : traités ici, sans ouvrir
//    l'app, puis la notification est retirée.
//  - Les actions qui ouvrent l'app : la cible est mise de côté et rejouée par
//    pushNotificationService.setNavigationCallback dès que la navigation est prête.
if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: notifee, EventType } = require('@notifee/react-native');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { performNotificationAction } = require('./src/lib/notifications/notificationActions');
    // Même clé que pushNotificationService (PENDING_TAP_DATA_KEY).
    const PENDING_TAP_DATA_KEY = '@eventez_pending_tap_data';

    notifee.onBackgroundEvent(async ({ type, detail }: { type: number; detail: any }) => {
      const data = (detail?.notification?.data || {}) as Record<string, any>;
      if (type === EventType.ACTION_PRESS) {
        const actionId: string | undefined = detail?.pressAction?.id;
        if (!actionId) return;
        const target = await performNotificationAction(actionId, data, detail?.input).catch(() => data);
        if (actionId === 'mark_read' || actionId === 'reply') {
          if (detail?.notification?.id) await notifee.cancelNotification(detail.notification.id).catch(() => {});
        }
        if (target) await AsyncStorage.setItem(PENDING_TAP_DATA_KEY, JSON.stringify(target)).catch(() => {});
      } else if (type === EventType.PRESS) {
        await AsyncStorage.setItem(PENDING_TAP_DATA_KEY, JSON.stringify(data)).catch(() => {});
      }
    });
  } catch {
    // Notifee indisponible (Expo Go) : les notifications restent basiques.
  }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
