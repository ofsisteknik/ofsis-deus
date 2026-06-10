import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Dynamically resolves the computer's local IP address to connect Web/Android clients to the shared local backend server.
 */
export function getApiBaseUrl(): string {
  if (Platform.OS === 'web') {
    // Dynamic web resolution (works on both localhost and local LAN IPs like http://192.168.1.100:8081)
    const host = (typeof window !== 'undefined' && window.location)
      ? window.location.hostname
      : 'localhost';
    const resolvedHost = host === 'localhost' ? '127.0.0.1' : host;
    return `http://${resolvedHost}:5000`;
  } else {
    // Dynamic mobile resolution: Expo Metro host IP address
    const hostUri = Constants.expoConfig?.hostUri; // e.g., "192.168.1.100:8081"
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      return `http://${ip}:5000`;
    }
    // Standard android emulator loopback fallback pointing to the host machine
    return 'http://10.0.2.2:5000';
  }
}
