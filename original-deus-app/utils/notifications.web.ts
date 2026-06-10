// Web stub for notifications to avoid bundling expo-notifications on web

export const setNotificationHandler = (config: any) => {
  // Do nothing on web
};

export const getPermissionsAsync = async () => {
  return { status: 'denied' };
};

export const requestPermissionsAsync = async () => {
  return { status: 'denied' };
};

export const scheduleNotificationAsync = async (request: any) => {
  return null;
};

export const AndroidNotificationPriority = {
  MIN: 'min',
  LOW: 'low',
  DEFAULT: 'default',
  HIGH: 'high',
  MAX: 'max',
};

export const Notifications = null;
