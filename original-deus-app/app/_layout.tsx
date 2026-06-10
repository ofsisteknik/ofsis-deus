import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { setNotificationHandler } from '../utils/notifications';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useDeviceStore } from '../store/deviceStore';

// Configure foreground notifications behavior (Android only)
if (Platform.OS === 'android') {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export default function RootLayout() {
  const { currentUser } = useAuthStore();
  const { theme, colors } = useThemeStore();
  const cleanup = useDeviceStore(s => s.cleanupExpiredLiveData);

  useEffect(() => {
    // Periodic cleanup every 15 seconds to auto-delete simulated live data older than 60 seconds
    const timer = setInterval(() => {
      cleanup();
    }, 15000);
    return () => clearInterval(timer);
  }, [cleanup]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={colors.bg} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        {!currentUser ? (
          <Stack.Screen name="auth/login" />
        ) : (
          <Stack.Screen name="tabs" />
        )}
      </Stack>
    </GestureHandlerRootView>
  );
}
