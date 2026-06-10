import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useDeviceStore } from '../store/deviceStore';
import { StatusColors, StatusLabels } from '../constants/colors';
import { useThemeStore } from '../store/themeStore';
import { timeAgo } from '../utils/helpers';
import { Device, Activity } from '../types';

declare global {
  interface Window {
    google: any;
    initGoogleMap?: () => void;
  }
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyBhdc7oH6bG2vzgVRzrZ673LDKHcNeyyRM';

const TURKEY_CENTER = { lat: 38.9637, lng: 35.2433 };

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0e1a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2236' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1e3a5f' }] },
];

export default function MapScreenWeb({
  searchQuery = '',
  isRightPanelOpenDesktop = true,
  setIsRightPanelOpenDesktop
}: {
  searchQuery?: string;
  isRightPanelOpenDesktop?: boolean;
  setIsRightPanelOpenDesktop?: (open: boolean) => void;
}) {
  const { currentUser } = useAuthStore();
  const { devices: allStoreDevices, getDevicesForUser, selectedDeviceId, selectDevice, activities } = useDeviceStore();
  const { theme, colors } = useThemeStore();
  const styles = createStyles(colors);
  
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [isLastHourPopupOpen, setIsLastHourPopupOpen] = useState(true);

  const seismicActivities = useMemo(() => {
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
    return activities.filter((act: Activity) => 
      act.type === 'seismic' && 
      act.latitude && 
      act.longitude &&
      new Date(act.timestamp).getTime() > threeHoursAgo
    );
  }, [activities]);

  const latestActivity = useMemo(() => {
    if (seismicActivities.length === 0) return null;
    return [...seismicActivities].sort((a: Activity, b: Activity) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  }, [seismicActivities]);

  const lastHourEarthquakes = useMemo(() => {
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
    return seismicActivities
      .filter((act: Activity) => new Date(act.timestamp).getTime() > threeHoursAgo)
      .sort((a: Activity, b: Activity) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [seismicActivities]);

  const getMagnitudeColor = (mag: number) => {
    if (mag >= 7.0) return '#dc2626'; 
    if (mag >= 6.0) return '#ea580c'; 
    if (mag >= 5.0) return '#d97706'; 
    if (mag >= 4.0) return '#0f766e'; 
    if (mag >= 3.0) return '#06b6d4'; 
    return '#a3e635'; 
  };

  const userDevices = currentUser?.role === 'admin'
    ? allStoreDevices
    : getDevicesForUser(currentUser?.assignedDeviceIds ?? []);

  const devices = userDevices.filter(d => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return d.name.toLowerCase().includes(q) ||
           d.id.toLowerCase().includes(q) ||
           d.location.toLowerCase().includes(q);
  });

  const selectedDevice = devices.find(d => d.id === selectedDeviceId) || null;

  const mapContainerRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const circlesRef = useRef<{ [key: string]: any }>({});
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    
    script.addEventListener('load', () => {
      setIsLoaded(true);
    });

    script.addEventListener('error', () => {
      setLoadError('Google Haritalar yüklenirken hata oluştu. İnternet bağlantınızı kontrol edin.');
    });

    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || !window.google) return;

    const mapElement = mapContainerRef.current;
    
    const mapOptions = {
      center: TURKEY_CENTER,
      zoom: 6,
      styles: theme === 'dark' ? darkMapStyle : [],
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    };

    const map = new window.google.maps.Map(mapElement, mapOptions);
    mapInstanceRef.current = map;

    map.addListener('click', () => {
      selectDevice(null);
    });

    return () => {
      if (window.google) {
        window.google.maps.event.clearInstanceListeners(map);
      }
    };
  }, [isLoaded, theme]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;

    const map = mapInstanceRef.current;
    const google = window.google;

    Object.values(markersRef.current).forEach(m => m.setMap(null));
    markersRef.current = {};

    Object.values(circlesRef.current).forEach(c => c.setMap(null));
    circlesRef.current = {};

    devices.forEach(device => {
      const position = { lat: device.latitude, lng: device.longitude };
      const color = StatusColors[device.status];

      const marker = new google.maps.Marker({
        position,
        map,
        title: device.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.9,
          scale: 10,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', (e: any) => {
        if (e && e.stop) e.stop();
        setSelectedActivity(null);
        selectDevice(device.id);
      });

      markersRef.current[device.id] = marker;

      if (device.status === 'alarm') {
        const circle = new google.maps.Circle({
          strokeColor: '#e84b4b',
          strokeOpacity: 0.8,
          strokeWeight: 1,
          fillColor: '#e84b4b',
          fillOpacity: 0.12,
          map,
          center: position,
          radius: 12000,
        });
        circlesRef.current[device.id] = circle;
      } else if (device.status === 'warning') {
        const circle = new google.maps.Circle({
          strokeColor: '#f59e0b',
          strokeOpacity: 0.7,
          strokeWeight: 1,
          fillColor: '#f59e0b',
          fillOpacity: 0.08,
          map,
          center: position,
          radius: 8000,
        });
        circlesRef.current[device.id] = circle;
      }
    });

    seismicActivities.forEach((act: Activity) => {
      const position = { lat: act.latitude!, lng: act.longitude! };
      const mag = act.actualMagnitude || act.estimatedMagnitude || 0;
      const strokeColor = getMagnitudeColor(mag);
      const isLatest = latestActivity && act.id === latestActivity.id;

      let fillColor = 'rgba(163, 230, 53, 0.15)';
      if (mag >= 7.0) fillColor = 'rgba(220, 38, 38, 0.2)';
      else if (mag >= 6.0) fillColor = 'rgba(234, 88, 12, 0.18)';
      else if (mag >= 5.0) fillColor = 'rgba(217, 119, 6, 0.16)';
      else if (mag >= 4.0) fillColor = 'rgba(15, 118, 110, 0.14)';
      else if (mag >= 3.0) fillColor = 'rgba(6, 182, 212, 0.12)';

      const radius = Math.max(12000, mag * 10000);

      const circle = new google.maps.Circle({
        strokeColor: strokeColor,
        strokeOpacity: 0.8,
        strokeWeight: isLatest ? 2.5 : 1.5,
        fillColor: strokeColor,
        fillOpacity: isLatest ? 0.22 : 0.12,
        map,
        center: position,
        radius,
      });
      circlesRef.current[`seismic-${act.id}`] = circle;

      const markerOptions: any = {
        position,
        map,
        title: `${mag} ML - ${act.location}`,
      };

      if (isLatest) {
        markerOptions.icon = {
          path: 'M 12,2 C 6.48,2 2,6.48 2,12 C 2,17.52 6.48,22 12,22 C 17.52,22 22,17.52 22,12 C 22,6.48 17.52,2 12,2 Z M 12,20 C 7.59,20 4,16.41 4,12 C 4,7.59 7.59,4 12,4 C 16.41,4 20,7.59 20,12 C 20,16.41 16.41,20 12,20 Z M 12,8 C 9.79,8 8,9.79 8,12 C 8,14.21 9.79,16 12,16 C 14.21,16 16,14.21 16,12 C 16,9.79 14.21,8 12,8 Z M 12,14 C 10.9,14 10,13.1 10,12 C 10,10.9 10.9,10 12,10 C 13.1,10 14,10.9 14,12 C 14,13.1 13.1,14 12,14 Z',
          fillColor: '#dc2626',
          fillOpacity: 1,
          scale: 2.2,
          anchor: new google.maps.Point(12, 12),
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
        };
      } else {
        markerOptions.icon = {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: strokeColor,
          fillOpacity: 0.9,
          scale: Math.max(9, mag * 4.0),
          strokeColor: '#ffffff',
          strokeWeight: 1.2,
        };
      }

      const marker = new google.maps.Marker(markerOptions);
      marker.addListener('click', (e: any) => {
        if (e && e.stop) e.stop();
        selectDevice(null);
        setSelectedActivity(act);
      });

      markersRef.current[`seismic-${act.id}`] = marker;
    });

  }, [isLoaded, devices, seismicActivities, theme]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;

    const map = mapInstanceRef.current;
    
    if (selectedDevice) {
      map.panTo({ lat: selectedDevice.latitude, lng: selectedDevice.longitude });
      map.setZoom(11);
    } else if (selectedActivity && selectedActivity.latitude && selectedActivity.longitude) {
      map.panTo({ lat: selectedActivity.latitude, lng: selectedActivity.longitude });
      map.setZoom(9);
    } else if (devices.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      devices.forEach(d => {
        bounds.extend({ lat: d.latitude, lng: d.longitude });
      });
      map.fitBounds(bounds);
      
      if (devices.length === 1) {
        setTimeout(() => {
          map.setZoom(10);
        }, 150);
      }
    }
  }, [selectedDeviceId, selectedActivity, isLoaded]);

  const handleMarkerPress = (device: Device) => {
    selectDevice(device.id);
  };

  const handleDeviceDetail = (device: Device) => {
    router.push(`/device/${device.id}`);
  };

  const handleCloseSheet = () => {
    selectDevice(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cihaz Haritası (Google Maps)</Text>
          <Text style={styles.subTitle}>Sismik izleme istasyonları aktif konum ve durum verileri</Text>
        </View>
        <View style={styles.legend}>
          {(['online', 'warning', 'alarm', 'offline'] as const).map(s => (
            <View key={s} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: StatusColors[s] }]} />
              <Text style={styles.legendText}>{StatusLabels[s]}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.mapContainer}>
        {loadError ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        ) : !isLoaded ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.loadingText}>Harita yükleniyor...</Text>
          </View>
        ) : (
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'absolute', left: 0, top: 0 }} />
        )}

        {}
        {isLoaded && (
          isLegendOpen ? (
            <View style={styles.floatingLegendCard}>
              <View style={styles.legendHeaderRow}>
                <Text style={styles.legendCardTitle}>Büyüklük</Text>
                <TouchableOpacity onPress={() => setIsLegendOpen(false)} style={styles.legendCloseBtn}>
                  <Text style={styles.legendCloseBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.legendList}>
                <View style={styles.legendCardItem}>
                  <View style={[styles.legendCardDot, { backgroundColor: '#a3e635' }]} />
                  <Text style={styles.legendCardText}>&lt; 3.0</Text>
                </View>
                <View style={styles.legendCardItem}>
                  <View style={[styles.legendCardDot, { backgroundColor: '#06b6d4' }]} />
                  <Text style={styles.legendCardText}>3.0-3.9</Text>
                </View>
                <View style={styles.legendCardItem}>
                  <View style={[styles.legendCardDot, { backgroundColor: '#0f766e' }]} />
                  <Text style={styles.legendCardText}>4.0-4.9</Text>
                </View>
                <View style={styles.legendCardItem}>
                  <View style={[styles.legendCardDot, { backgroundColor: '#d97706' }]} />
                  <Text style={styles.legendCardText}>5.0-5.9</Text>
                </View>
                <View style={styles.legendCardItem}>
                  <View style={[styles.legendCardDot, { backgroundColor: '#ea580c' }]} />
                  <Text style={styles.legendCardText}>6.0-6.9</Text>
                </View>
                <View style={styles.legendCardItem}>
                  <View style={[styles.legendCardDot, { backgroundColor: '#dc2626' }]} />
                  <Text style={styles.legendCardText}>&ge; 7.0</Text>
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setIsLegendOpen(true)} style={styles.collapsedLegendBtn} activeOpacity={0.85}>
              <Text style={styles.collapsedLegendIcon}>📊</Text>
            </TouchableOpacity>
          )
        )}

        {}
        {isLoaded && Platform.OS === 'web' && !isRightPanelOpenDesktop && setIsRightPanelOpenDesktop && (
          <TouchableOpacity
            onPress={() => setIsRightPanelOpenDesktop(true)}
            style={[styles.collapsedRightPanelBtn, { top: isLegendOpen ? 262 : 116 }]}
            activeOpacity={0.85}
          >
            <Text style={styles.collapsedRightPanelIcon}>⚡</Text>
          </TouchableOpacity>
        )}

        {}
        {isLoaded && (
          isLastHourPopupOpen && lastHourEarthquakes.length > 0 ? (
            <View style={styles.lastHourPopupCard}>
              <View style={styles.popupHeader}>
                <View style={styles.popupTitleRow}>
                  <Text style={styles.popupTitleIcon}>📢</Text>
                  <Text style={styles.popupTitleText}>Son 3 Saatteki Depremler ({lastHourEarthquakes.length})</Text>
                </View>
                <TouchableOpacity onPress={() => setIsLastHourPopupOpen(false)} style={styles.popupCloseBtn}>
                  <Text style={styles.popupCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.popupScroll} contentContainerStyle={{ gap: 8 }}>
                {lastHourEarthquakes.map((act: Activity) => {
                  const mag = act.actualMagnitude || act.estimatedMagnitude || 0;
                  const color = getMagnitudeColor(mag);
                  return (
                    <TouchableOpacity 
                      key={act.id} 
                      style={styles.popupItem}
                      onPress={() => {
                        setSelectedActivity(act);
                        selectDevice(null);
                        if (mapInstanceRef.current) {
                          mapInstanceRef.current.panTo({ lat: act.latitude, lng: act.longitude });
                          mapInstanceRef.current.setZoom(9);
                        }
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.popupMagBadge, { backgroundColor: color }]}>
                        <Text style={styles.popupMagText}>{mag.toFixed(1)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.popupItemLoc} numberOfLines={1}>{act.location}</Text>
                        <Text style={styles.popupItemTime}>{timeAgo(act.timestamp)} • Derinlik: {act.depth?.toFixed(1) || 'N/A'} km</Text>
                      </View>
                      <Text style={styles.popupItemGoIcon}>📍</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : lastHourEarthquakes.length > 0 ? (
            <TouchableOpacity onPress={() => setIsLastHourPopupOpen(true)} style={styles.collapsedAlertBtn} activeOpacity={0.85}>
              <Text style={styles.collapsedAlertIcon}>🔔</Text>
              <View style={styles.badgeCount}>
                <Text style={styles.badgeText}>{lastHourEarthquakes.length}</Text>
              </View>
            </TouchableOpacity>
          ) : null
        )}
      </View>

      {}
      {selectedDevice ? (
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={[styles.sheetDot, { backgroundColor: StatusColors[selectedDevice.status] }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetName}>{selectedDevice.name}</Text>
              <Text style={styles.sheetLoc}>{selectedDevice.location} ({selectedDevice.latitude.toFixed(2)}°N, {selectedDevice.longitude.toFixed(2)}°E)</Text>
            </View>
            <TouchableOpacity onPress={handleCloseSheet} style={styles.closeBtnContainer}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sheetStats}>
            <View style={styles.sheetStat}>
              <Text style={styles.sheetStatLabel}>Durum</Text>
              <Text style={[styles.sheetStatValue, { color: StatusColors[selectedDevice.status] }]}>
                {StatusLabels[selectedDevice.status]}
              </Text>
            </View>
            <View style={styles.sheetStat}>
              <Text style={styles.sheetStatLabel}>Batarya</Text>
              <Text style={[styles.sheetStatValue, { color: selectedDevice.batteryPercent < 20 ? colors.accent : colors.safe }]}>
                %{selectedDevice.batteryPercent}
              </Text>
            </View>
            <View style={styles.sheetStat}>
              <Text style={styles.sheetStatLabel}>Aktivite</Text>
              <Text style={styles.sheetStatValue}>{selectedDevice.todayActivityCount}</Text>
            </View>
            <View style={styles.sheetStat}>
              <Text style={styles.sheetStatLabel}>Son Görülme</Text>
              <Text style={styles.sheetStatValue}>{timeAgo(selectedDevice.lastSeenAt)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.detailBtn} onPress={() => handleDeviceDetail(selectedDevice)} activeOpacity={0.85}>
            <Text style={styles.detailBtnText}>Cihaz Detayını Aç →</Text>
          </TouchableOpacity>
        </View>
      ) : selectedActivity ? (
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={[styles.sheetDot, { backgroundColor: getMagnitudeColor(selectedActivity.actualMagnitude || selectedActivity.estimatedMagnitude || 0) }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetName}>{selectedActivity.location}</Text>
              <Text style={styles.sheetLoc}>Sismik Aktivite Detayı ({selectedActivity.latitude?.toFixed(2)}°N, {selectedActivity.longitude?.toFixed(2)}°E)</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedActivity(null)} style={styles.closeBtnContainer}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sheetStats}>
            <View style={styles.sheetStat}>
              <Text style={styles.sheetStatLabel}>Büyüklük</Text>
              <Text style={[styles.sheetStatValue, { color: getMagnitudeColor(selectedActivity.actualMagnitude || selectedActivity.estimatedMagnitude || 0), fontSize: 13 }]}>
                {(selectedActivity.actualMagnitude || selectedActivity.estimatedMagnitude || 0).toFixed(1)} ML
              </Text>
            </View>
            <View style={styles.sheetStat}>
              <Text style={styles.sheetStatLabel}>Derinlik</Text>
              <Text style={styles.sheetStatValue}>{selectedActivity.depth?.toFixed(1) || 'N/A'} km</Text>
            </View>
            <View style={styles.sheetStat}>
              <Text style={styles.sheetStatLabel}>Ölçek/Kaynak</Text>
              <Text style={styles.sheetStatValue}>
                {(selectedActivity.deviceName || 'AFAD').toUpperCase()}
              </Text>
            </View>
            <View style={styles.sheetStat}>
              <Text style={styles.sheetStatLabel}>Zaman</Text>
              <Text style={styles.sheetStatValue}>{timeAgo(selectedActivity.timestamp)}</Text>
            </View>
          </View>
          <View style={styles.seismicDescCard}>
            <Text style={styles.seismicDescText}>{selectedActivity.description || 'Deprem istasyon ölçüm verisi'}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.bottomList}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            {devices.map(d => (
              <TouchableOpacity
                key={d.id}
                style={[
                  styles.deviceChip,
                  selectedDeviceId === d.id && styles.deviceChipSelected
                ]}
                onPress={() => handleMarkerPress(d)}
                activeOpacity={0.8}
              >
                <View style={[styles.chipDot, { backgroundColor: StatusColors[d.status] }]} />
                <Text style={styles.chipText}>{d.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  subTitle: { fontSize: 11, color: colors.muted, marginTop: 2 },
  legend: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: colors.muted },
  mapContainer: { flex: 1, backgroundColor: colors.card, borderBlockColor: colors.border, borderTopWidth: 1, borderBottomWidth: 1, position: 'relative', overflow: 'hidden' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: colors.card },
  loadingText: { fontSize: 13, color: colors.muted },
  errorText: { fontSize: 13, color: colors.accent, textAlign: 'center', paddingHorizontal: 20 },
  bottomSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: colors.border, padding: 20,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: colors.dim, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sheetDot: { width: 12, height: 12, borderRadius: 6 },
  sheetName: { fontSize: 16, fontWeight: '700', color: colors.text },
  sheetLoc: { fontSize: 12, color: colors.muted, marginTop: 2 },
  closeBtnContainer: { padding: 4 },
  closeBtn: { fontSize: 16, color: colors.dim },
  sheetStats: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sheetStat: { flex: 1, backgroundColor: colors.card, borderRadius: 10, padding: 10, alignItems: 'center' },
  sheetStatLabel: { fontSize: 9, color: colors.dim, letterSpacing: 0.5, marginBottom: 4 },
  sheetStatValue: { fontSize: 13, fontWeight: '700', color: colors.text },
  detailBtn: { backgroundColor: colors.accent, borderRadius: 14, padding: 14, alignItems: 'center' },
  detailBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  bottomList: { backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, paddingVertical: 14 },
  deviceChip: {
    backgroundColor: colors.card, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  deviceChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 12, color: colors.text, fontWeight: '500' },
  floatingLegendCard: {
    position: 'absolute',
    top: 66,
    right: 16,
    backgroundColor: colors.surface === '#000000' || colors.surface === '#0b0f19' || colors.surface === '#0d1b2a' || colors.surface === 'rgba(11, 15, 25, 1)' ? 'rgba(11, 15, 25, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    padding: 12,
    width: 120,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.15)',
    zIndex: 10,
  },
  legendHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingBottom: 4,
  },
  legendCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.3,
  },
  legendCloseBtn: {
    padding: 2,
  },
  legendCloseBtnText: {
    fontSize: 9,
    color: colors.dim,
    fontWeight: '700',
  },
  legendList: {
    gap: 5,
  },
  legendCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendCardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  legendCardText: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '500',
  },
  collapsedLegendBtn: {
    position: 'absolute',
    top: 66,
    right: 16,
    backgroundColor: colors.surface === '#000000' || colors.surface === '#0b0f19' || colors.surface === '#0d1b2a' || colors.surface === 'rgba(11, 15, 25, 1)' ? 'rgba(11, 15, 25, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
    zIndex: 10,
  },
  collapsedLegendIcon: {
    fontSize: 14,
  },
  lastHourPopupCard: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 310,
    maxHeight: 250,
    backgroundColor: colors.surface === '#000000' || colors.surface === '#0b0f19' || colors.surface === '#0d1b2a' || colors.surface === 'rgba(11, 15, 25, 1)' ? 'rgba(11, 15, 25, 0.96)' : 'rgba(255, 255, 255, 0.96)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.18)',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  popupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  popupTitleIcon: {
    fontSize: 14,
  },
  popupTitleText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.2,
  },
  popupCloseBtn: {
    padding: 4,
  },
  popupCloseText: {
    fontSize: 10,
    color: colors.dim,
    fontWeight: '700',
  },
  popupScroll: {
    flex: 1,
  },
  popupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(128,128,128,0.06)',
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  popupMagBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupMagText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff',
  },
  popupItemLoc: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  popupItemTime: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 2,
  },
  popupItemGoIcon: {
    fontSize: 11,
    color: colors.dim,
  },
  collapsedAlertBtn: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: colors.surface === '#000000' || colors.surface === '#0b0f19' || colors.surface === '#0d1b2a' || colors.surface === 'rgba(11, 15, 25, 1)' ? 'rgba(11, 15, 25, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.16)',
    zIndex: 10,
  },
  collapsedAlertIcon: {
    fontSize: 15,
  },
  badgeCount: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
  },
  seismicDescCard: {
    backgroundColor: 'rgba(128,128,128,0.05)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  seismicDescText: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  collapsedRightPanelBtn: {
    position: 'absolute',
    right: 16,
    backgroundColor: colors.surface === '#000000' || colors.surface === '#0b0f19' || colors.surface === '#0d1b2a' || colors.surface === 'rgba(11, 15, 25, 1)' ? 'rgba(11, 15, 25, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
    zIndex: 10,
  },
  collapsedRightPanelIcon: {
    fontSize: 14,
  },
});

