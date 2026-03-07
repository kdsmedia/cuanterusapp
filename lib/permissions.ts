import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

/**
 * Request all necessary permissions on first launch
 */
export async function requestAllPermissions() {
  // Push Notifications
  await registerForPushNotifications();
}

/**
 * Register for push notifications
 */
export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('[Permissions] Notifications only work on physical devices');
    return null;
  }

  // Set notification handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Permissions] Push notification permission denied');
    return null;
  }

  // Set notification channel for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'CUANTERUS',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#06b6d4',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('deposit', {
      name: 'Deposit',
      description: 'Notifikasi deposit masuk',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('reward', {
      name: 'Reward',
      description: 'Notifikasi reward dan bonus',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('[Permissions] Push token:', token);
    return token;
  } catch (e) {
    console.log('[Permissions] Failed to get push token:', e);
    return null;
  }
}

/**
 * Send a local notification
 */
export async function sendLocalNotification(title: string, body: string, channelId: string = 'default') {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId }),
    },
    trigger: null, // immediate
  });
}

/**
 * Schedule a daily reminder notification
 */
export async function scheduleDailyReminder() {
  // Cancel existing reminders
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Schedule daily at 9:00 AM
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💰 Jangan lupa cuan hari ini!',
      body: 'Check-in harian, nonton video, dan spin wheel menunggu kamu!',
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'reward' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  });

  console.log('[Notifications] Daily reminder scheduled at 09:00');
}
