// src/services/pushNotificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationsAPI } from '../api';

const PUSH_TOKEN_KEY = '@eventez_push_token';
const MAX_REGISTER_RETRIES = 3;

// Get project ID from app config
const getProjectId = (): string => {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? '';
};

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationData {
  type?: string;
  notification_type?: string;
  notification_id?: string;
  event_id?: string;
  registration_id?: string;
  ticket_id?: string;
  conversation_id?: string;
  message_id?: string;
  url?: string;
  // Backend can send explicit screen + params for navigation
  screen?: string;
  params?: Record<string, any>;
  // Related object fields from backend
  related_object_type?: string;
  related_object_id?: string;
}

class PushNotificationService {
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private navigationCallback: ((data: PushNotificationData) => void) | null = null;

  /**
   * Initialize push notifications
   * Should be called when app starts
   */
  async initialize(): Promise<string | null> {
    // Check if running on physical device
    if (!Device.isDevice) {
      if (__DEV__) console.log('[Push] Must use physical device for push notifications');
      return null;
    }

    // Request permissions
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      if (__DEV__) console.log('[Push] Permission not granted');
      return null;
    }

    // Get push token
    try {
      const token = await this.getPushToken();
      if (token) {
        await this.registerTokenWithBackend(token);
        // Setup notification listeners
        this.setupListeners();
        return token;
      }
    } catch (error) {
      if (__DEV__) console.warn('[Push] Firebase not configured, push notifications disabled:', error);
      // Continue without push notifications - app still works
    }

    return null;
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        if (__DEV__) console.log('[Push] Failed to get push token - permission denied');
        return false;
      }

      // Android specific: Create notification channel
      if (Platform.OS === 'android') {
        await this.setupAndroidChannel();
      }

      return true;
    } catch (error) {
      if (__DEV__) console.error('[Push] Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Setup Android notification channel
   */
  private async setupAndroidChannel(): Promise<void> {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'EventEz Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7c3aed',
      sound: 'default',
      enableVibrate: true,
      enableLights: true,
      showBadge: true,
    });

    // Channel for event reminders
    await Notifications.setNotificationChannelAsync('event_reminders', {
      name: 'Rappels d\'événements',
      description: 'Notifications de rappel pour vos événements',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7c3aed',
      sound: 'default',
    });

    // Channel for payment confirmations
    await Notifications.setNotificationChannelAsync('payments', {
      name: 'Paiements',
      description: 'Confirmations et mises à jour de paiement',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });

    // Channel for messages
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      description: 'Nouveaux messages et conversations',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  /**
   * Get Expo push token
   */
  async getPushToken(): Promise<string | null> {
    try {
      const projectId = getProjectId();

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined,
      });

      const token = tokenData.data;
      if (__DEV__) console.log('[Push] Expo push token:', token);

      // Store token locally
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

      return token;
    } catch (error) {
      if (__DEV__) console.error('[Push] Error getting push token:', error);
      // Try without projectId for development builds
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;
        if (__DEV__) console.log('[Push] Expo push token (fallback):', token);
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
        return token;
      } catch (fallbackError) {
        if (__DEV__) console.error('[Push] Fallback also failed:', fallbackError);
        return null;
      }
    }
  }

  /**
   * Register device with retry logic and exponential backoff
   */
  private async registerDeviceWithRetry(deviceInfo: {
    push_token: string;
    device_type: 'ios' | 'android' | 'web';
    device_name: string;
    app_version: string;
  }): Promise<boolean> {
    for (let attempt = 0; attempt < MAX_REGISTER_RETRIES; attempt++) {
      try {
        await notificationsAPI.registerDevice(deviceInfo);
        if (__DEV__) console.log('[Push] Device registered successfully');
        return true;
      } catch (error) {
        if (__DEV__) console.warn(`[Push] Device registration failed (attempt ${attempt + 1}/${MAX_REGISTER_RETRIES}):`, error);
        if (attempt < MAX_REGISTER_RETRIES - 1) {
          const delay = 2000 * Math.pow(2, attempt);
          if (__DEV__) console.log(`[Push] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    if (__DEV__) console.error('[Push] Device registration failed after all retries');
    return false;
  }

  /**
   * Register push token with backend
   */
  async registerTokenWithBackend(token: string): Promise<boolean> {
    const deviceInfo = {
      push_token: token,
      device_type: Platform.OS as 'ios' | 'android' | 'web',
      device_name: Device.deviceName || `${Platform.OS} device`,
      app_version: '1.0.0',
    };

    return this.registerDeviceWithRetry(deviceInfo);
  }

  /**
   * Unregister device (on logout)
   * Note: This may fail if called after logout (401), which is fine
   */
  async unregisterDevice(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (token) {
        // Try to unregister from backend (may fail if already logged out)
        try {
          await notificationsAPI.unregisterDevice(token);
        } catch (apiError) {
          // Ignore API errors (401 is expected if called after logout)
          if (__DEV__) console.log('[Push] Backend unregister skipped (user may be logged out)');
        }
        // Always clear local token
        await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
        if (__DEV__) console.log('[Push] Device unregistered locally');
      }
    } catch (error) {
      if (__DEV__) console.error('[Push] Error unregistering device:', error);
    }
  }

  /**
   * Setup notification listeners
   */
  private setupListeners(): void {
    // Listener for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (__DEV__) console.log('[Push] Notification received in foreground:', notification);
        // The notification will be shown automatically due to setNotificationHandler
      }
    );

    // Listener for notification interactions (user tapped notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (__DEV__) console.log('[Push] Notification tapped:', response);
        const data = response.notification.request.content.data as PushNotificationData;
        this.handleNotificationTap(data);
      }
    );
  }

  /**
   * Handle notification tap - navigate to relevant screen
   */
  private handleNotificationTap(data: PushNotificationData): void {
    if (__DEV__) console.log('[Push] Handling notification tap with data:', data);

    if (this.navigationCallback) {
      this.navigationCallback(data);
    }
  }

  /**
   * Set navigation callback for handling notification taps
   */
  setNavigationCallback(callback: (data: PushNotificationData) => void): void {
    this.navigationCallback = callback;
  }

  /**
   * Get last notification response (for handling app opened from notification)
   */
  async getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
    return await Notifications.getLastNotificationResponseAsync();
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: PushNotificationData,
    triggerSeconds?: number
  ): Promise<string> {
    const trigger: Notifications.NotificationTriggerInput = triggerSeconds
      ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: triggerSeconds }
      : null;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: (data || {}) as Record<string, unknown>,
        sound: 'default',
      },
      trigger,
    });

    return notificationId;
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
