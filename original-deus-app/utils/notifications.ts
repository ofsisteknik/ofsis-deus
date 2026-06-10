import * as Notifications from 'expo-notifications';

export const setNotificationHandler = (config: any) => {
  Notifications.setNotificationHandler(config);
};

export const getPermissionsAsync = async () => {
  return await Notifications.getPermissionsAsync();
};

export const requestPermissionsAsync = async () => {
  return await Notifications.requestPermissionsAsync();
};

export const scheduleNotificationAsync = async (request: any) => {
  return await Notifications.scheduleNotificationAsync(request);
};

export const AndroidNotificationPriority = Notifications.AndroidNotificationPriority;
export { Notifications };
