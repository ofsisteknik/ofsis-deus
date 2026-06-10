import { create } from 'zustand';
import { Platform } from 'react-native';
import { Device, Activity, Notification, DeviceStatus, ActivityType, MagnitudeLevel, SystemSettings } from '../types';
import { MOCK_DEVICES, MOCK_ACTIVITIES, MOCK_NOTIFICATIONS } from '../data/mockData';
import { getApiBaseUrl } from '../constants/api';
import { fetchWithTimeout } from '../utils/helpers';

let lastRealFetchTime = 0;
let lastSismikHaritaFetchTime = 0;
let rpiPollInterval: any = null;

interface DeviceState {
  devices: Device[];
  activities: Activity[];
  notifications: Notification[];
  selectedDeviceId: string | null;
  isLoading: boolean;
  settings: SystemSettings;
  activeRpiData: {
    status: {
      deviceId: string;
      latitude: number;
      longitude: number;
      batteryPercent: number;
      sensorConnected: boolean;
      elevatorState: boolean;
      gasState: boolean;
      alarmState: boolean;
      liveSeismicData: number[];
    } | null;
    settings: {
      elevatorThreshold: number;
      gasThreshold: number;
      alarmThreshold: number;
    } | null;
    logs: {
      timestamp: string;
      event: string;
      level: string;
    }[];
    isConnected: boolean;
    isLoading: boolean;
    error: string | null;
  };
  isSimulated: boolean;

  getDevicesForUser: (assignedIds: string[]) => Device[];
  getActivitiesForUser: (assignedIds: string[]) => Activity[];
  getDevice: (id: string) => Device | undefined;
  getActivitiesForDevice: (deviceId: string) => Activity[];
  getNotificationsForUser: (assignedIds: string[]) => Notification[];
  unreadCount: (assignedIds?: string[]) => number;

  selectDevice: (id: string | null) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  refreshData: (showLoadingState?: boolean) => Promise<void>;
  updateSettings: (settings: Partial<SystemSettings>) => Promise<void>;
  addDevice: (device: Partial<Device>) => Promise<void>;
  updateDevice: (id: string, updates: Partial<Device>) => Promise<void>;
  deleteDevice: (id: string) => Promise<void>;
  clearActivities: (keepCount?: number) => Promise<void>;

  simulateNewActivity: (assignedDeviceIds?: string[]) => Promise<void>;
  cleanupExpiredLiveData: () => void;
  fetchRealEarthquakes: () => Promise<void>;

  connectToRpiDevice: (ip: string, port: number) => void;
  disconnectRpiDevice: () => void;
  setSimulated: (simulated: boolean) => void;
  updateRpiSettings: (ip: string, port: number, settings: any) => Promise<boolean>;
  triggerRpiRelay: (ip: string, port: number) => Promise<boolean>;
  triggerRpiCalibration: (ip: string, port: number) => Promise<boolean>;
  triggerRpiTestAlarm: (ip: string, port: number) => Promise<boolean>;
  fetchRpiLogs: (ip: string, port: number) => Promise<void>;
  fetchRpiStatus: (ip: string, port: number) => Promise<void>;
  fetchRpiSettings: (ip: string, port: number) => Promise<void>;
}

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function hasArrayChanged<T extends { id: string }>(current: T[], incoming: T[]): boolean {
  if (current.length !== incoming.length) return true;
  for (let i = 0; i < current.length; i++) {
    if (current[i].id !== incoming[i].id) return true;
  }
  return false;
}

let _isRefreshing = false;

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: MOCK_DEVICES,
  activities: MOCK_ACTIVITIES,
  notifications: MOCK_NOTIFICATIONS,
  selectedDeviceId: null,
  isLoading: false,
  settings: {
    elevatorThreshold: 3.5,
    gasThreshold: 4.0,
    alarmThreshold: 5.0,
  },
  activeRpiData: {
    status: null,
    settings: null,
    logs: [],
    isConnected: false,
    isLoading: false,
    error: null,
  },
  isSimulated: false,

  getDevicesForUser: (assignedIds) => {
    const { devices } = get();
    return devices.filter(d => assignedIds.includes(d.id));
  },

  getActivitiesForUser: (assignedIds) => {
    const { activities } = get();
    return activities
      .filter(a => !a.deviceId || a.deviceId === '' || assignedIds.includes(a.deviceId))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);
  },

  getDevice: (id) => get().devices.find(d => d.id === id),

  getActivitiesForDevice: (deviceId) => {
    return get().activities
      .filter(a => a.deviceId === deviceId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);
  },

  getNotificationsForUser: (assignedIds) => {
    const { notifications } = get();
    return notifications.filter(n => !n.deviceId || assignedIds.includes(n.deviceId));
  },

  unreadCount: (assignedIds) => {
    const { notifications } = get();
    if (assignedIds) {
      return notifications.filter(n => !n.isRead && (!n.deviceId || assignedIds.includes(n.deviceId))).length;
    }
    return notifications.filter(n => !n.isRead).length;
  },

  selectDevice: (id) => set({ selectedDeviceId: id }),

  markNotificationRead: async (id) => {
    const { notifications } = get();
    set({ notifications: notifications.map(n => n.id === id ? { ...n, isRead: true } : n) });

    try {
      const baseUrl = getApiBaseUrl();
      await fetchWithTimeout(`${baseUrl}/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
    } catch (e) {
      console.warn("Failed to sync notification read state to server:", e);
    }
  },

  markAllNotificationsRead: async () => {
    const { notifications } = get();
    set({ notifications: notifications.map(n => ({ ...n, isRead: true })) });

    try {
      const baseUrl = getApiBaseUrl();
      const unreadNotifs = notifications.filter(n => !n.isRead);
      await Promise.all(
        unreadNotifs.map(n =>
          fetchWithTimeout(`${baseUrl}/api/notifications/${n.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: true }),
          })
        )
      );
    } catch (e) {
      console.warn("Failed to sync mark-all-read to server:", e);
    }
  },

  refreshData: async (showLoadingState = false) => {
    if (_isRefreshing) return;
    _isRefreshing = true;

    const isServerlessWeb = Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      (window.location.hostname.endsWith('github.io') || window.location.protocol === 'https:');

    if (isServerlessWeb) {
      if (showLoadingState) set({ isLoading: true });
      try {
        await get().fetchRealEarthquakes();
      } catch (e) {
        console.warn("Failed to fetch real earthquakes in serverless web:", e);
      } finally {
        if (showLoadingState) set({ isLoading: false });
        _isRefreshing = false;
      }
      return;
    }

    if (showLoadingState) set({ isLoading: true });
    try {
      const baseUrl = getApiBaseUrl();
      let devices: Device[] = [];
      let activities: Activity[] = [];
      let notifications: Notification[] = [];
      let success = false;

      try {
        const syncRes = await fetchWithTimeout(`${baseUrl}/api/sync`);
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          devices = syncData.devices;
          activities = syncData.activities;
          notifications = syncData.notifications;
          if (syncData.settings) {
            set({ settings: syncData.settings });
          }
          success = true;
        }
      } catch (syncErr) {
        console.warn("Consolidated sync endpoint failed or not found, falling back to multi-endpoint polling...");
      }

      if (!success) {
        const [devicesRes, activitiesRes, notificationsRes] = await Promise.all([
          fetchWithTimeout(`${baseUrl}/api/devices`),
          fetchWithTimeout(`${baseUrl}/api/activities`),
          fetchWithTimeout(`${baseUrl}/api/notifications`),
        ]);

        if (devicesRes.ok && activitiesRes.ok && notificationsRes.ok) {
          devices = await devicesRes.json();
          activities = await activitiesRes.json();
          notifications = await notificationsRes.json();
          success = true;
        }
      }

      if (success) {
        const { devices: currentDevices, activities: currentActivities, notifications: currentNotifications } = get();

        const devicesChanged = hasArrayChanged(currentDevices, devices);
        const activitiesChanged = hasArrayChanged(currentActivities, activities);
        const notificationsChanged = hasArrayChanged(currentNotifications, notifications);

        if (devicesChanged || activitiesChanged || notificationsChanged) {
          const nextState: Partial<DeviceState> = {};
          if (devicesChanged) nextState.devices = devices;
          if (activitiesChanged) nextState.activities = activities;
          if (notificationsChanged) nextState.notifications = notifications;
          set(nextState);
        }
      }
    } catch (e) {
      console.warn("Local API server not reachable, falling back to local simulation memory:", (e as any)?.message);
      await get().fetchRealEarthquakes();
    } finally {
      if (showLoadingState) set({ isLoading: false });
      _isRefreshing = false;
    }
  },

  simulateNewActivity: async (_assignedDeviceIds?: string[]) => {
    return;
  },

  fetchRealEarthquakes: async () => {
    const now = Date.now();
    if (now - lastRealFetchTime < 15000) {
      console.log('[fetchRealEarthquakes] Skipping fetch (cooldown active)');
      return;
    }
    lastRealFetchTime = now;

    try {
      let afadData: any[] = [];
      let kandilliData: any[] = [];
      let isAfadDirect = false;

      // Yardımcı: Resmi AFAD API'sine doğrudan veya CORS proxy'leri üzerinden istek atar (Son 3 saat, limit 100)
      const fetchAfadDirect = async (): Promise<any[] | null> => {
        const nowTime = new Date();
        const pastTime = new Date(nowTime.getTime() - 3 * 60 * 60 * 1000); // Son 3 saat (en son depremler için hafif istek)

        const formatUtcDate = (d: Date) => {
          const y = d.getUTCFullYear();
          const m = String(d.getUTCMonth() + 1).padStart(2, '0');
          const day = String(d.getUTCDate()).padStart(2, '0');
          const hh = String(d.getUTCHours()).padStart(2, '0');
          const mm = String(d.getUTCMinutes()).padStart(2, '0');
          const ss = String(d.getUTCSeconds()).padStart(2, '0');
          return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
        };

        const startStr = formatUtcDate(pastTime);
        const endStr = formatUtcDate(nowTime);
        const afadUrl = `https://deprem.afad.gov.tr/apiv2/event/filter?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}&limit=100&orderby=timedesc`;

        const stdHeaders = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };

        if (Platform.OS !== 'web') {
          try {
            const res = await fetchWithTimeout(afadUrl, { headers: stdHeaders }, 4000);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data)) return data;
            }
          } catch (e) {
            console.warn('[fetchAfadDirect] Direct mobile fetch failed:', e);
          }
          return null;
        }

        // Web (CORS engeli aşma proxy zinciri)
        const proxies = [
          `https://corsproxy.io/?${encodeURIComponent(afadUrl)}`,
          `https://api.allorigins.win/raw?url=${encodeURIComponent(afadUrl)}`,
          `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(afadUrl)}`,
        ];

        for (const proxyUrl of proxies) {
          try {
            const res = await fetchWithTimeout(proxyUrl, { headers: stdHeaders }, 2500);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data)) {
                console.log(`[fetchAfadDirect] Proxy successful: ${proxyUrl.split('?')[0]}`);
                return data;
              }
            }
          } catch (e) {
            console.warn(`[fetchAfadDirect] Proxy failed: ${proxyUrl.split('?')[0]}`);
          }
        }
        return null;
      };

      // ── 1. Öncelikli olarak AFAD resmi API'sinden veri çekmeyi deniyoruz ──
      const directAfad = await fetchAfadDirect();
      if (directAfad && directAfad.length > 0) {
        afadData = directAfad;
        isAfadDirect = true;
        console.log(`[fetchRealEarthquakes] AFAD Resmi API verisi çekildi (${afadData.length} deprem)`);
      } else {
        // ── 2. Resmi API başarısız olduysa yedek API'den AFAD verisini alıyoruz ──
        console.log('[fetchRealEarthquakes] AFAD Resmi API başarısız. Yedek API deneniyor...');
        try {
          const res = await fetchWithTimeout('https://api.orhanaydogdu.com.tr/deprem/afad/live?limit=100', {}, 3000);
          if (res.ok) {
            const json = await res.json();
            if (json.status && Array.isArray(json.result)) {
              afadData = json.result;
              isAfadDirect = false;
              console.log(`[fetchRealEarthquakes] AFAD verisi yedek API üzerinden alındı (${afadData.length} deprem)`);
            }
          }
        } catch (e) {
          console.warn('[fetchRealEarthquakes] AFAD yedek API de başarısız:', e);
        }
      }

      // ── 3. Kandilli Rasathanesi verisini yedek/destekleyici olarak her durumda çekiyoruz ──
      try {
        const kandilliRes = await fetchWithTimeout('https://api.orhanaydogdu.com.tr/deprem/kandilli/live?limit=100', {}, 3000);
        if (kandilliRes.ok) {
          const json = await kandilliRes.json();
          if (json.status && Array.isArray(json.result)) {
            kandilliData = json.result;
          }
        }
      } catch (e) {
        console.warn('[fetchRealEarthquakes] Kandilli API fetch failed:', e);
      }

      const { activities: currentActivities, devices: currentDevices, notifications: currentNotifications, settings } = get();
      const newActivities: Activity[] = [...currentActivities];
      const newDevices = currentDevices.map(d => ({ ...d }));
      const newNotifications = [...currentNotifications];
      let changed = false;

      // Helper to process new activities
      const processActivity = (id: string, lat: number, lon: number, mag: number, depth: number, location: string, timestamp: string, provider: string, type: string) => {
        const eqTime = new Date(timestamp).getTime();
        const dupIndex = newActivities.findIndex(act => {
          if (act.type !== 'seismic') return false;
          const tDiff = Math.abs(new Date(act.timestamp).getTime() - eqTime) / 1000;
          if (tDiff > 180) return false;
          if (act.latitude != null && act.longitude != null) {
            if (calcDistance(lat, lon, act.latitude, act.longitude) > 80) return false;
          }
          return Math.abs((act.actualMagnitude ?? 0) - mag) <= 0.8;
        });

        if (dupIndex !== -1) {
          const existing = newActivities[dupIndex];
          const existingProvider = (existing.provider || existing.magnitudeScale || 'AFAD').toUpperCase();
          if (provider === 'AFAD' && existingProvider !== 'AFAD') {
            newActivities.splice(dupIndex, 1);
          } else {
            return;
          }
        } else {
          if (newActivities.some(a => a.id === id)) return;
        }

        const level: Activity['level'] = mag >= 5.0 ? 'severe' : mag >= 4.0 ? 'high' : mag >= 3.0 ? 'moderate' : 'low';

        let closestDeviceId = '';
        let closestDeviceName = provider;
        let minDist = Infinity;
        newDevices.forEach(d => {
          const dist = calcDistance(lat, lon, d.latitude, d.longitude);
          const radius = d.coverageRadius || 150;
          if (dist < radius && dist < minDist) {
            minDist = dist;
            closestDeviceId = d.id;
            closestDeviceName = d.name;
          }
        });

        if (closestDeviceId) {
          const dev = newDevices.find(d => d.id === closestDeviceId);
          if (dev) {
            dev.todayActivityCount += 1;
            dev.lastSeenAt = new Date().toISOString();
            if (mag >= settings.alarmThreshold) {
              dev.status = 'alarm';
            } else if (mag >= settings.elevatorThreshold && dev.status !== 'alarm') {
              dev.status = 'warning';
            }

            // Create notification if mag >= notificationThreshold
            const threshold = dev.notificationThreshold || 3.0;
            if (mag >= threshold) {
              const notifType = mag >= settings.alarmThreshold ? 'alarm' : mag >= settings.elevatorThreshold ? 'warning' : 'info';
              newNotifications.unshift({
                id: `notif-real-${Date.now()}-${dev.id}-${id}`,
                title: `${mag} ML Deprem Algılandı`,
                body: `${dev.name} (${dev.location}) cihazına ${minDist.toFixed(1)} km uzaklıkta deprem meydana geldi!`,
                type: notifType,
                activityId: id,
                deviceId: dev.id,
                isRead: false,
                timestamp: new Date().toISOString()
              });
            }
          }
        }

        newActivities.unshift({
          id,
          deviceId: closestDeviceId,
          deviceName: closestDeviceName,
          type: 'seismic',
          estimatedMagnitude: parseFloat((mag - 0.2).toFixed(1)),
          actualMagnitude: mag,
          magnitudeScale: type || 'ML',
          location: location,
          depth: depth,
          timestamp: new Date(eqTime).toISOString(),
          actions: [],
          level,
          description: `${location} bölgesinde ${depth} km derinlikte ${mag} büyüklüğünde sismik aktivite (${provider}).`,
          latitude: lat,
          longitude: lon,
          provider: provider,
        });
        changed = true;
      };

      // Process AFAD (high priority)
      if (afadData.length > 0) {
        const realEqs = afadData.slice().reverse();
        for (const eq of realEqs) {
          let mag: number, lat: number, lon: number, depth: number, location: string, timestamp: string, id: string;

          if (isAfadDirect) {
            // Resmi AFAD JSON formatı
            mag = parseFloat(eq.magnitude);
            lat = parseFloat(eq.latitude);
            lon = parseFloat(eq.longitude);
            depth = parseFloat(eq.depth) || 0;
            location = eq.location || 'Bilinmeyen Konum';
            timestamp = eq.date + 'Z';
            id = eq.eventID;
          } else {
            // Yedek API (Orhan Aydoğdu) formatı
            mag = eq.mag;
            lon = eq.geojson?.coordinates?.[0];
            lat = eq.geojson?.coordinates?.[1];
            depth = eq.depth || 0;
            location = eq.title || 'Bilinmeyen Konum';
            timestamp = new Date(eq.created_at * 1000).toISOString();
            id = eq.earthquake_id;
          }

          if (mag == null || isNaN(mag) || lat == null || lon == null || isNaN(lat) || isNaN(lon)) continue;

          // Türkiye coğrafi sınırları (Lat: 35-43, Lon: 25-46)
          if (lat < 35.0 || lat > 43.0 || lon < 25.0 || lon > 46.0) {
            continue;
          }

          processActivity(id, lat, lon, mag, depth, location, timestamp, 'AFAD', 'ML');
        }
      }

      // Process Kandilli
      if (kandilliData.length > 0) {
        const realEqs = kandilliData.slice().reverse();
        for (const eq of realEqs) {
          const mag = eq.mag;
          if (mag == null || isNaN(mag)) continue;
          const lon = eq.geojson?.coordinates?.[0];
          const lat = eq.geojson?.coordinates?.[1];
          if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) continue;

          // Türkiye coğrafi sınırları (Lat: 35-43, Lon: 25-46)
          if (lat < 35.0 || lat > 43.0 || lon < 25.0 || lon > 46.0) {
            continue;
          }

          processActivity(
            eq.earthquake_id,
            lat,
            lon,
            mag,
            eq.depth || 0,
            eq.title || 'Bilinmeyen Konum',
            new Date(eq.created_at * 1000).toISOString(),
            'KANDILLI',
            'ML'
          );
        }
      }

      if (changed) {
        newActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const nextActivities = newActivities.slice(0, 50);
        const nextNotifications = newNotifications.slice(0, 50);
        
        set({
          activities: nextActivities,
          devices: newDevices,
          notifications: nextNotifications
        });
      }
    } catch (e) {
      console.warn('[fetchRealEarthquakes] API processing failed:', (e as any)?.message);
    }
  },

  cleanupExpiredLiveData: () => {
    const { activities, notifications, devices } = get();
    const now = Date.now();
    const EXPIRE_MS = 60 * 1000;

    const cleanedActivities = activities.filter(a => {
      if (!a.id.startsWith('act-live-')) return true;
      const timestampMs = parseInt(a.id.replace('act-live-', ''));
      return now - timestampMs < EXPIRE_MS;
    });

    const cleanedNotifications = notifications.filter(n => {
      if (!n.id.startsWith('notif-live-')) return true;
      const timestampMs = parseInt(n.id.replace('notif-live-', ''));
      return now - timestampMs < EXPIRE_MS;
    });

    const updatedDevices: Device[] = devices.map(d => {
      const hasActiveLiveActivity = cleanedActivities.some(a => a.deviceId === d.id && (a.estimatedMagnitude ?? 0) >= 3.5);
      if (!hasActiveLiveActivity && (d.status === 'alarm' || d.status === 'warning')) {
        return { ...d, status: 'online' as DeviceStatus };
      }
      return d;
    });

    const activitiesChanged = cleanedActivities.length !== activities.length;
    const notificationsChanged = cleanedNotifications.length !== notifications.length;
    const devicesChanged = updatedDevices.some((d, i) => d.status !== devices[i].status);

    if (activitiesChanged || notificationsChanged || devicesChanged) {
      set({
        activities: cleanedActivities,
        notifications: cleanedNotifications,
        devices: updatedDevices,
      });
    }
  },

  updateSettings: async (settingsUpdates) => {
    const updatedSettings = { ...get().settings, ...settingsUpdates };
    set({ settings: updatedSettings });

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetchWithTimeout(`${baseUrl}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsUpdates),
      });
      if (res.ok) {
        const updated = await res.json();
        set({ settings: updated });
        get().refreshData();
      }
    } catch (e) {
      console.warn("Failed to save settings to server:", e);
    }
  },

  addDevice: async (deviceData) => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetchWithTimeout(`${baseUrl}/api/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceData),
      });
      if (res.ok) {
        const newDevice = await res.json();
        set({ devices: [...get().devices, newDevice] });
        await get().refreshData();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Cihaz eklenirken sunucu hatası oluştu.');
      }
    } catch (e) {
      console.warn("Failed to add device to server:", e);
      throw e;
    }
  },

  updateDevice: async (id, updates) => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetchWithTimeout(`${baseUrl}/api/devices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        const updatedDevices = get().devices.map(d => d.id === id ? updated : d);
        set({ devices: updatedDevices });
        await get().refreshData();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Cihaz güncellenirken sunucu hatası oluştu.');
      }
    } catch (e) {
      console.warn("Failed to update device on server:", e);
      throw e;
    }
  },

  deleteDevice: async (id) => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetchWithTimeout(`${baseUrl}/api/devices/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        set({ devices: get().devices.filter(d => d.id !== id) });
        await get().refreshData();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Cihaz silinirken sunucu hatası oluştu.');
      }
    } catch (e) {
      console.warn("Failed to delete device on server:", e);
      throw e;
    }
  },

  clearActivities: async (keepCount) => {
    const isServerlessWeb = Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      (window.location.hostname.endsWith('github.io') || window.location.protocol === 'https:');

    if (isServerlessWeb) {
      const current = get().activities;
      const sorted = [...current].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const updated = keepCount !== undefined ? sorted.slice(0, keepCount) : [];
      set({ activities: updated });
      return;
    }

    try {
      const baseUrl = getApiBaseUrl();
      const url = keepCount !== undefined
        ? `${baseUrl}/api/activities?keepCount=${keepCount}`
        : `${baseUrl}/api/activities`;
      const res = await fetchWithTimeout(url, {
        method: 'DELETE',
      });
      if (res.ok) {
        const current = get().activities;
        const sorted = [...current].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const updated = keepCount !== undefined ? sorted.slice(0, keepCount) : [];
        set({ activities: updated });
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Aktiviteler temizlenirken sunucu hatası oluştu.');
      }
    } catch (e) {
      console.warn("Failed to delete activities on server, falling back to local state:", e);
      const current = get().activities;
      const sorted = [...current].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const updated = keepCount !== undefined ? sorted.slice(0, keepCount) : [];
      set({ activities: updated });
    }
  },

  setSimulated: (simulated) => set({ isSimulated: simulated }),

  connectToRpiDevice: (ip, port) => {
    if (rpiPollInterval) {
      clearInterval(rpiPollInterval);
      rpiPollInterval = null;
    }
    
    set(state => ({
      activeRpiData: {
        ...state.activeRpiData,
        isLoading: true,
        error: null
      }
    }));
    
    const poll = async () => {
      const { isSimulated } = get();
      const baseUrl = `http://${ip}:${port}`;
      
      if (isSimulated) {
        const device = get().devices.find(d => d.ipAddress === ip && d.port === port) || get().devices.find(d => d.id === 'dev-1') || get().devices[0];
        const deviceId = device ? device.id : 'dev-1';
        const latitude = device ? device.latitude : 38.4682;
        const longitude = device ? device.longitude : 27.2178;

        const nowMs = Date.now();
        const settings = get().settings;

        // Check if there is an active real earthquake mapped to this device (e.g. within 5 minutes)
        const activeRealEq = get().activities.find(a => 
          a.deviceId === deviceId && 
          a.type === 'seismic' && 
          (nowMs - new Date(a.timestamp).getTime()) < 5 * 60 * 1000
        );

        let alarmState = false;
        let gasState = false;
        let elevatorState = false;
        let liveSeismicData = [];

        if (activeRealEq) {
          const mag = activeRealEq.actualMagnitude ?? 4.0;
          alarmState = mag >= settings.alarmThreshold;
          gasState = mag >= settings.gasThreshold;
          elevatorState = mag >= settings.elevatorThreshold;

          const elapsedSec = (nowMs - new Date(activeRealEq.timestamp).getTime()) / 1000;
          const decay = Math.exp(-elapsedSec / 90); // decay over ~2-3 minutes
          const baseNoise = parseFloat((Math.random() * 0.05 + 0.02).toFixed(3));
          liveSeismicData = Array.from({ length: 20 }, (_, index) => {
            const wave = Math.sin((Date.now() + index * 100) / 400) * mag * 0.5 * decay;
            const noise = Math.random() * 0.1;
            return parseFloat(Math.max(0.01, baseNoise + Math.abs(wave) + noise).toFixed(3));
          });
        } else {
          liveSeismicData = Array.from({ length: 20 }, () => parseFloat((Math.random() * 0.04 + 0.01).toFixed(3)));
        }

        const mockStatus = {
          deviceId,
          latitude,
          longitude,
          batteryPercent: Math.max(10, Math.min(100, Math.floor(95 - (Date.now() / 100000) % 5))),
          sensorConnected: true,
          elevatorState,
          gasState,
          alarmState,
          liveSeismicData
        };
        
        const mockSettings = {
          elevatorThreshold: settings.elevatorThreshold,
          gasThreshold: settings.gasThreshold,
          alarmThreshold: settings.alarmThreshold
        };
        
        const mockLogs = [
          { timestamp: new Date(Date.now() - 2000).toISOString(), event: 'Sismik izleme aktif - ivme ölçümü stabil', level: 'info' },
          { timestamp: new Date(Date.now() - 12000).toISOString(), event: 'Cihaz kalibrasyon tamamlandı', level: 'success' },
          { timestamp: new Date(Date.now() - 25000).toISOString(), event: 'Kiosk FastAPI sunucusu başlatıldı', level: 'info' },
        ];
        
        if (activeRealEq) {
          const mag = activeRealEq.actualMagnitude ?? 4.0;
          mockLogs.unshift({
            timestamp: activeRealEq.timestamp,
            event: `KRİTİK UYARI: ${mag} ML deprem algılandı, alarm aktif! (Konum: ${activeRealEq.location})`,
            level: mag >= settings.alarmThreshold ? 'danger' : 'warning'
          });
        }
        
        set({
          activeRpiData: {
            status: mockStatus,
            settings: mockSettings,
            logs: mockLogs,
            isConnected: true,
            isLoading: false,
            error: null
          }
        });
        return;
      }
      
      try {
        const [statusRes, settingsRes, logsRes] = await Promise.all([
          fetchWithTimeout(`${baseUrl}/api/status`, {}, 2500),
          fetchWithTimeout(`${baseUrl}/api/settings`, {}, 2500),
          fetchWithTimeout(`${baseUrl}/api/logs`, {}, 2500).catch(() => null)
        ]);
        
        if (statusRes && statusRes.ok && settingsRes && settingsRes.ok) {
          const rawStatus = await statusRes.json();
          const rawSettings = await settingsRes.json();
          const rawLogs = logsRes && logsRes.ok ? await logsRes.json() : [];
          
          // 1. Map Settings
          const settings = {
            elevatorThreshold: rawSettings.ELEVATOR_SYSTEM_THRESHOLD ?? 3.5,
            gasThreshold: rawSettings.GAS_VALVE_THRESHOLD ?? 4.0,
            alarmThreshold: rawSettings.ALARM_SYSTEM_THRESHOLD ?? 5.0,
          };

          // 2. Map Logs
          const logs = Array.isArray(rawLogs) ? rawLogs.map((l: any) => ({
            timestamp: l.iso_timestamp || l.timestamp,
            event: `${l.user || 'Sistem'}: ${l.action || l.event} ${l.details ? `(PGA: ${l.details.pga || ''}, ML: ${l.details.magnitude || ''})` : ''}`,
            level: l.level || (l.action?.includes('Alarm') || l.action?.includes('Kapatıldı') ? 'danger' : 'info')
          })) : [];

          // 3. Map status & rolling seismic data
          const prevLiveSeismicData = get().activeRpiData.status?.liveSeismicData || [];
          const newPga = rawStatus.latest_data?.pga ?? 0;
          let liveSeismicData = [...prevLiveSeismicData, newPga];
          if (liveSeismicData.length === 0 || (liveSeismicData.length === 1 && liveSeismicData[0] === 0)) {
            // Pre-fill some points if empty for smoother waveform start
            liveSeismicData = Array.from({ length: 20 }, () => newPga);
          }
          if (liveSeismicData.length > 30) {
            liveSeismicData = liveSeismicData.slice(liveSeismicData.length - 30);
          }

          const status = {
            deviceId: rawStatus.device_id || 'dev-1',
            latitude: rawStatus.latitude ?? 38.4682,
            longitude: rawStatus.longitude ?? 27.2178,
            batteryPercent: rawStatus.battery_percentage ?? 100,
            sensorConnected: !!rawStatus.sensor_connected,
            elevatorState: rawStatus.elevator_status === 'GROUND_FLOOR' || rawStatus.elevator_status === 'TRIGGERED',
            gasState: rawStatus.gas_valve_status === 'CLOSED' || rawStatus.gas_valve_status === 'TRIGGERED',
            alarmState: !!rawStatus.alarm_active || rawStatus.alarm_status === 'ALARM',
            liveSeismicData,
          };

          set({
            activeRpiData: {
              status,
              settings,
              logs,
              isConnected: true,
              isLoading: false,
              error: null
            }
          });
        } else {
          throw new Error('Cihaz geçersiz durum döndürdü.');
        }
      } catch (err: any) {
        set(state => ({
          activeRpiData: {
            ...state.activeRpiData,
            isConnected: false,
            isLoading: false,
            error: `Cihaza bağlanılamıyor: ${err.message || 'Zaman aşımı'}`
          }
        }));
      }
    };
    
    poll();
    rpiPollInterval = setInterval(poll, 3000);
  },

  disconnectRpiDevice: () => {
    if (rpiPollInterval) {
      clearInterval(rpiPollInterval);
      rpiPollInterval = null;
    }
    set({
      activeRpiData: {
        status: null,
        settings: null,
        logs: [],
        isConnected: false,
        isLoading: false,
        error: null
      }
    });
  },

  updateRpiSettings: async (ip, port, settings) => {
    const { isSimulated } = get();
    if (isSimulated) {
      set(state => ({
        activeRpiData: {
          ...state.activeRpiData,
          settings: { ...state.activeRpiData.settings, ...settings },
          logs: [
            { timestamp: new Date().toISOString(), event: `Uzaktan ayarlar güncellendi (Simüle): ${JSON.stringify(settings)}`, level: 'info' },
            ...(state.activeRpiData.logs || [])
          ]
        }
      }));
      return true;
    }
    
    try {
      const baseUrl = `http://${ip}:${port}`;
      const payload: any = {};
      if (settings.elevatorThreshold !== undefined) payload.ELEVATOR_SYSTEM_THRESHOLD = settings.elevatorThreshold;
      if (settings.gasThreshold !== undefined) payload.GAS_VALVE_THRESHOLD = settings.gasThreshold;
      if (settings.alarmThreshold !== undefined) payload.ALARM_SYSTEM_THRESHOLD = settings.alarmThreshold;

      const res = await fetchWithTimeout(`${baseUrl}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, 3000);
      return res.ok;
    } catch (e) {
      console.warn("Failed to update settings on Rpi device:", e);
      return false;
    }
  },

  triggerRpiRelay: async (ip, port) => {
    const { isSimulated } = get();
    if (isSimulated) {
      set(state => ({
        activeRpiData: {
          ...state.activeRpiData,
          logs: [
            { timestamp: new Date().toISOString(), event: 'Manuel röle tetikleme sinyali gönderildi (Simüle)', level: 'info' },
            ...(state.activeRpiData.logs || [])
          ]
        }
      }));
      return true;
    }
    
    try {
      const baseUrl = `http://${ip}:${port}`;
      const res = await fetchWithTimeout(`${baseUrl}/api/control/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin_name: 'IO_OUT_DRY_1', state: true })
      }, 3000);
      return res.ok;
    } catch (e) {
      console.warn("Failed to trigger relay on Rpi device:", e);
      return false;
    }
  },

  triggerRpiCalibration: async (ip, port) => {
    const { isSimulated } = get();
    if (isSimulated) {
      set(state => ({
        activeRpiData: {
          ...state.activeRpiData,
          logs: [
            { timestamp: new Date().toISOString(), event: 'Uzaktan ivmeölçer kalibrasyon komutu gönderildi (Simüle)', level: 'info' },
            ...(state.activeRpiData.logs || [])
          ]
        }
      }));
      return true;
    }
    
    try {
      const baseUrl = `http://${ip}:${port}`;
      const res = await fetchWithTimeout(`${baseUrl}/api/control/calibrate`, {
        method: 'POST'
      }, 3000);
      return res.ok;
    } catch (e) {
      console.warn("Failed to trigger calibration on Rpi device:", e);
      return false;
    }
  },

  triggerRpiTestAlarm: async (ip, port) => {
    const { isSimulated } = get();
    if (isSimulated) {
      set(state => ({
        activeRpiData: {
          ...state.activeRpiData,
          logs: [
            { timestamp: new Date().toISOString(), event: 'Test deprem alarmı simülasyonu başlatıldı (Simüle)', level: 'warning' },
            ...(state.activeRpiData.logs || [])
          ]
        }
      }));
      return true;
    }
    
    try {
      const baseUrl = `http://${ip}:${port}`;
      const res = await fetchWithTimeout(`${baseUrl}/api/control/test-alarm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnitude: 4.5, pga: 0.5 })
      }, 3000);
      return res.ok;
    } catch (e) {
      console.warn("Failed to trigger test-alarm on Rpi device:", e);
      return false;
    }
  },

  fetchRpiLogs: async (ip, port) => {
    try {
      const baseUrl = `http://${ip}:${port}`;
      const res = await fetchWithTimeout(`${baseUrl}/api/logs`, {}, 3000);
      if (res.ok) {
        const rawLogs = await res.json();
        const logs = Array.isArray(rawLogs) ? rawLogs.map((l: any) => ({
          timestamp: l.iso_timestamp || l.timestamp,
          event: `${l.user || 'Sistem'}: ${l.action || l.event} ${l.details ? `(PGA: ${l.details.pga || ''}, ML: ${l.details.magnitude || ''})` : ''}`,
          level: l.level || (l.action?.includes('Alarm') || l.action?.includes('Kapatıldı') ? 'danger' : 'info')
        })) : [];
        set(state => ({
          activeRpiData: {
            ...state.activeRpiData,
            logs
          }
        }));
      }
    } catch (e) {
      console.warn("Failed to fetch logs from Rpi device:", e);
    }
  },

  fetchRpiStatus: async (ip, port) => {
    try {
      const baseUrl = `http://${ip}:${port}`;
      const res = await fetchWithTimeout(`${baseUrl}/api/status`, {}, 3000);
      if (res.ok) {
        const rawStatus = await res.json();
        const prevLiveSeismicData = get().activeRpiData.status?.liveSeismicData || [];
        const newPga = rawStatus.latest_data?.pga ?? 0;
        let liveSeismicData = [...prevLiveSeismicData, newPga];
        if (liveSeismicData.length === 0 || (liveSeismicData.length === 1 && liveSeismicData[0] === 0)) {
          liveSeismicData = Array.from({ length: 20 }, () => newPga);
        }
        if (liveSeismicData.length > 30) {
          liveSeismicData = liveSeismicData.slice(liveSeismicData.length - 30);
        }

        const status = {
          deviceId: rawStatus.device_id || 'dev-1',
          latitude: rawStatus.latitude ?? 38.4682,
          longitude: rawStatus.longitude ?? 27.2178,
          batteryPercent: rawStatus.battery_percentage ?? 100,
          sensorConnected: !!rawStatus.sensor_connected,
          elevatorState: rawStatus.elevator_status === 'GROUND_FLOOR' || rawStatus.elevator_status === 'TRIGGERED',
          gasState: rawStatus.gas_valve_status === 'CLOSED' || rawStatus.gas_valve_status === 'TRIGGERED',
          alarmState: !!rawStatus.alarm_active || rawStatus.alarm_status === 'ALARM',
          liveSeismicData,
        };
        set(state => ({
          activeRpiData: {
            ...state.activeRpiData,
            status
          }
        }));
      }
    } catch (e) {
      console.warn("Failed to fetch status from Rpi device:", e);
    }
  },

  fetchRpiSettings: async (ip, port) => {
    try {
      const baseUrl = `http://${ip}:${port}`;
      const res = await fetchWithTimeout(`${baseUrl}/api/settings`, {}, 3000);
      if (res.ok) {
        const rawSettings = await res.json();
        const settings = {
          elevatorThreshold: rawSettings.ELEVATOR_SYSTEM_THRESHOLD ?? 3.5,
          gasThreshold: rawSettings.GAS_VALVE_THRESHOLD ?? 4.0,
          alarmThreshold: rawSettings.ALARM_SYSTEM_THRESHOLD ?? 5.0,
        };
        set(state => ({
          activeRpiData: {
            ...state.activeRpiData,
            settings
          }
        }));
      }
    } catch (e) {
      console.warn("Failed to fetch settings from Rpi device:", e);
    }
  },
}));

