/**
 * Hook pour la gestion des rappels d'événements via notifications push locales
 * Utilise expo-notifications pour programmer des rappels 24h et 1h avant les événements
 */

import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const REMINDERS_KEY = 'eventez_scheduled_reminders';
const NOTIFICATION_SETTINGS_KEY = 'eventez_notification_settings';

// Configuration par défaut des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface ScheduledReminder {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  notificationIds: {
    reminder24h?: string;
    reminder1h?: string;
  };
  registrationId: string;
}

interface NotificationSettings {
  enabled: boolean;
  reminder24hEnabled: boolean;
  reminder1hEnabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  reminder24hEnabled: true,
  reminder1hEnabled: true,
};

export function useEventReminders() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [scheduledReminders, setScheduledReminders] = useState<Record<string, ScheduledReminder>>({});
  const [loading, setLoading] = useState(true);

  // Demander les permissions au chargement
  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      // Charger les paramètres
      const savedSettings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }

      // Charger les rappels programmés
      const savedReminders = await AsyncStorage.getItem(REMINDERS_KEY);
      if (savedReminders) {
        setScheduledReminders(JSON.parse(savedReminders));
      }

      // Vérifier les permissions
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        setPermissionGranted(finalStatus === 'granted');

        if (finalStatus !== 'granted') {
          console.log('Permission de notification refusée');
        }
      } else {
        console.log('Les notifications ne fonctionnent que sur un appareil physique');
      }

      // Configuration spécifique Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('event-reminders', {
          name: 'Rappels d\'événements',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366F1',
        });
      }
    } catch (error) {
      console.error('Erreur initialisation notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour les paramètres
  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));

    // Si les notifications sont désactivées, annuler tous les rappels
    if (!updated.enabled) {
      await cancelAllReminders();
    }
  }, [settings]);

  // Sauvegarder les rappels
  const saveReminders = useCallback(async (reminders: Record<string, ScheduledReminder>) => {
    await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
    setScheduledReminders(reminders);
  }, []);

  // Programmer un rappel pour un événement
  const scheduleReminder = useCallback(async (event: {
    id: string;
    title: string;
    start_date: string;
    location_name?: string;
    location_city?: string;
  }, registrationId: string): Promise<boolean> => {
    if (!permissionGranted || !settings.enabled) {
      console.log('Notifications non autorisées ou désactivées');
      return false;
    }

    const eventDate = new Date(event.start_date);
    const now = new Date();

    // Vérifier que l'événement est dans le futur
    if (eventDate <= now) {
      console.log('L\'événement est déjà passé');
      return false;
    }

    const reminder: ScheduledReminder = {
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.start_date,
      registrationId,
      notificationIds: {},
    };

    // Rappel 24h avant
    if (settings.reminder24hEnabled) {
      const reminder24hTime = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
      if (reminder24hTime > now) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: '📅 Rappel: Demain',
            body: `L'événement "${event.title}" commence demain!`,
            data: {
              type: 'event_reminder',
              eventId: event.id,
              registrationId,
              reminderType: '24h',
            },
            sound: true,
          },
          trigger: {
            date: reminder24hTime,
            channelId: 'event-reminders',
          },
        });
        reminder.notificationIds.reminder24h = id;
      }
    }

    // Rappel 1h avant
    if (settings.reminder1hEnabled) {
      const reminder1hTime = new Date(eventDate.getTime() - 60 * 60 * 1000);
      if (reminder1hTime > now) {
        const location = event.location_city || event.location_name;
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏰ Rappel: Dans 1 heure',
            body: `"${event.title}" commence bientôt${location ? ` à ${location}` : ''}!`,
            data: {
              type: 'event_reminder',
              eventId: event.id,
              registrationId,
              reminderType: '1h',
            },
            sound: true,
          },
          trigger: {
            date: reminder1hTime,
            channelId: 'event-reminders',
          },
        });
        reminder.notificationIds.reminder1h = id;
      }
    }

    // Sauvegarder le rappel
    const newReminders = { ...scheduledReminders, [event.id]: reminder };
    await saveReminders(newReminders);

    console.log(`Rappels programmés pour ${event.title}`);
    return true;
  }, [permissionGranted, settings, scheduledReminders, saveReminders]);

  // Annuler un rappel pour un événement
  const cancelReminder = useCallback(async (eventId: string): Promise<boolean> => {
    const reminder = scheduledReminders[eventId];
    if (!reminder) return false;

    // Annuler les notifications programmées
    if (reminder.notificationIds.reminder24h) {
      await Notifications.cancelScheduledNotificationAsync(reminder.notificationIds.reminder24h);
    }
    if (reminder.notificationIds.reminder1h) {
      await Notifications.cancelScheduledNotificationAsync(reminder.notificationIds.reminder1h);
    }

    // Supprimer de la liste
    const newReminders = { ...scheduledReminders };
    delete newReminders[eventId];
    await saveReminders(newReminders);

    return true;
  }, [scheduledReminders, saveReminders]);

  // Annuler tous les rappels
  const cancelAllReminders = useCallback(async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await saveReminders({});
  }, [saveReminders]);

  // Vérifier si un événement a un rappel programmé
  const hasReminder = useCallback((eventId: string): boolean => {
    return eventId in scheduledReminders;
  }, [scheduledReminders]);

  // Programmer les rappels pour plusieurs événements
  const scheduleMultipleReminders = useCallback(async (
    events: Array<{
      id: string;
      title: string;
      start_date: string;
      location_name?: string;
      location_city?: string;
      registrationId: string;
    }>
  ) => {
    const results = await Promise.all(
      events.map(event =>
        scheduleReminder(event, event.registrationId)
      )
    );
    return results.filter(Boolean).length;
  }, [scheduleReminder]);

  // Nettoyer les rappels expirés (événements passés)
  const cleanupExpiredReminders = useCallback(async () => {
    const now = new Date();
    const validReminders: Record<string, ScheduledReminder> = {};

    for (const [eventId, reminder] of Object.entries(scheduledReminders)) {
      const eventDate = new Date(reminder.eventDate);
      if (eventDate > now) {
        validReminders[eventId] = reminder;
      }
    }

    if (Object.keys(validReminders).length !== Object.keys(scheduledReminders).length) {
      await saveReminders(validReminders);
    }
  }, [scheduledReminders, saveReminders]);

  // Basculer le rappel pour un événement
  const toggleReminder = useCallback(async (event: {
    id: string;
    title: string;
    start_date: string;
    location_name?: string;
    location_city?: string;
  }, registrationId: string): Promise<boolean> => {
    if (hasReminder(event.id)) {
      await cancelReminder(event.id);
      return false;
    } else {
      await scheduleReminder(event, registrationId);
      return true;
    }
  }, [hasReminder, cancelReminder, scheduleReminder]);

  return {
    // État
    permissionGranted,
    settings,
    loading,
    scheduledReminders,
    reminderCount: Object.keys(scheduledReminders).length,

    // Actions
    updateSettings,
    scheduleReminder,
    cancelReminder,
    cancelAllReminders,
    hasReminder,
    toggleReminder,
    scheduleMultipleReminders,
    cleanupExpiredReminders,
    requestPermissions: initializeNotifications,
  };
}

export type { ScheduledReminder, NotificationSettings };
