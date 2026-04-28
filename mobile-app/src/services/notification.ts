import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import logger from '../utils/logger';

export async function setupNotifications() {
  try {
    const isExpoGo =
      Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === 'storeClient';

    if (isExpoGo) {
      logger.info('Skipping push notification setup in Expo Go');
      return;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    logger.info('✅ Notifications setup completed');
  } catch (error) {
    logger.error('Notification setup error:', error);
  }
}

export function scheduleLocalNotification(
  title: string,
  body: string,
  delay: number = 5
) {
  Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { data: 'goes here' },
    },
    trigger: { seconds: delay },
  });
}
