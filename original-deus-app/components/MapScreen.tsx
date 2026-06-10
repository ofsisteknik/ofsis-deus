import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';
import { router } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useDeviceStore } from '../store/deviceStore';
import { StatusColors, StatusLabels } from '../constants/colors';
import { useThemeStore } from '../store/themeStore';
import { timeAgo } from '../utils/helpers';
import { Device, Activity } from '../types';

const TURKEY_REGION = {
  latitude: 38.9637, longitude: 35.2433,
  latitudeDelta: 7.0, longitudeDelta: 10.0,
};

const isAndroid = Platform.OS === 'android';
const mapProvider = isAndroid ? PROVIDER_GOOGLE : undefined;

export default function MapScreen() {
  const { currentUser } = useAuthStore();
  const { getDevicesForUser, selectedDeviceId, selectDevice, activities } = useDeviceStore();
  const { theme, colors } = useThemeStore();
  const [selectedActivity, setSelectedActivity] = React.useState<Activity | null>(null);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const devices = getDevicesForUser(currentUser?.assignedDeviceIds ?? []);
  const mapRef = useRef<MapView>(null);

  const seismicActivities = useMemo(() => {
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
    return activities.filter(act => 
      act.type === 'seismic' && 
      act.latitude && 
      act.longitude &&
      new Date(act.timestamp).getTime() > threeHoursAgo
    );
  }, [activities]);

  const latestActivity = useMemo(() => {
    if (seismicActivities.length === 0) return null;
    return [...seismicActivities].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  }, [seismicActivities]);

  const [isLegendOpen, setIsLegendOpen] = React.useState(true);

  const getMagnitudeColor = (mag: number) => {
    if (mag >= 7.0) return '#dc2626'; 
    if (mag >= 6.0) return '#ea580c'; 
    if (mag >= 5.0) return '#d97706'; 
    if (mag >= 4.0) return '#0f766e'; 
    if (mag >= 3.0) return '#06b6d4'; 
    return '#a3e635'; 
  };

  const selectedDevice = devices.find(d => d.id === selectedDeviceId) || null;

  useEffect(() => {
    if (selectedDevice) {
      const timer = setTimeout(() => {
        mapRef.current?.animateToRegion({
          latitude: selectedDevice.latitude,
          longitude: selectedDevice.longitude,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        }, 600);
      }, 300);
      return () => clearTimeout(timer);
    } else if (devices.length > 0 && mapRef.current) {
      const timer = setTimeout(() => {
        if (devices.length === 1) {
          mapRef.current?.animateToRegion({
            latitude: devices[0].latitude,
            longitude: devices[0].longitude,
            latitudeDelta: 1.5,
            longitudeDelta: 1.5,
          }, 600);
        } else {
          const coords = devices.map(d => ({ latitude: d.latitude, longitude: d.longitude }));
          mapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
            animated: true,
          });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [selectedDeviceId, devices.length]);

  const handleMarkerPress = (device: Device) => {
    setSelectedActivity(null);
    selectDevice(device.id);
  };

  const handleActivityPress = (act: Activity) => {
    selectDevice(null);
    setSelectedActivity(act);
    if (act.latitude && act.longitude) {
      mapRef.current?.animateToRegion({
        latitude: act.latitude,
        longitude: act.longitude,
        latitudeDelta: 1.5,
        longitudeDelta: 1.5,
      }, 500);
    }
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
        <Text style={styles.title}>Cihaz Haritası</Text>
        <View style={styles.legend}>
          {(['online', 'warning', 'alarm', 'offline'] as const).map(s => (
            <View key={s} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: StatusColors[s] }]} />
              <Text style={styles.legendText}>{StatusLabels[s]}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flex: 1, position: 'relative' }}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={mapProvider}
          initialRegion={TURKEY_REGION}
          mapType="standard"
          customMapStyle={theme === 'dark' ? (isAndroid ? undefined : darkMapStyle) : undefined}
        >
          {isAndroid && (
            <UrlTile
              urlTemplate={theme === 'dark' ? "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" : "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"}
              maximumZ={19}
              flipY={false}
              tileSize={256}
              shouldReplaceMapContent={true}
            />
          )}

          {devices.map(device => (
            <React.Fragment key={device.id}>
              {device.status === 'alarm' && (
                <Circle
                  center={{ latitude: device.latitude, longitude: device.longitude }}
                  radius={12000}
                  fillColor="rgba(232,75,75,0.06)"
                  strokeColor="rgba(232,75,75,0.25)"
                  strokeWidth={1}
                />
              )}
              <Marker
                coordinate={{ latitude: device.latitude, longitude: device.longitude }}
                onPress={() => handleMarkerPress(device)}
                title={device.name}
                description={device.location}
              >
                <View style={styles.markerContainer}>
                  <View style={[styles.markerBadge, { backgroundColor: colors.card, borderColor: StatusColors[device.status] }]}>
                    <Text style={styles.markerBadgeText}>{device.name}</Text>
                  </View>
                  <View style={[styles.markerOuter, { borderColor: StatusColors[device.status] }]}>
                    <View style={[styles.markerInner, { backgroundColor: StatusColors[device.status] }]} />
                  </View>
                </View>
              </Marker>
            </React.Fragment>
          ))}

          {seismicActivities.map(act => {
            const mag = act.actualMagnitude || act.estimatedMagnitude || 0;
            const strokeColor = getMagnitudeColor(mag);
            
            let fillColor = 'rgba(163, 230, 53, 0.15)';
            if (mag >= 7.0) fillColor = 'rgba(220, 38, 38, 0.2)';
            else if (mag >= 6.0) fillColor = 'rgba(234, 88, 12, 0.18)';
            else if (mag >= 5.0) fillColor = 'rgba(217, 119, 6, 0.16)';
            else if (mag >= 4.0) fillColor = 'rgba(15, 118, 110, 0.14)';
            else if (mag >= 3.0) fillColor = 'rgba(6, 182, 212, 0.12)';
            
            const radius = Math.max(1500, mag * 5000);
            const isLatest = latestActivity && act.id === latestActivity.id;
            
            return (
              <React.Fragment key={`seismic-${act.id}`}>
                <Circle
                  center={{ latitude: act.latitude!, longitude: act.longitude! }}
                  radius={radius}
                  fillColor={fillColor}
                  strokeColor={strokeColor}
                  strokeWidth={isLatest ? 2 : 1.5}
                />
                <Marker
                  coordinate={{ latitude: act.latitude!, longitude: act.longitude! }}
                  onPress={() => handleActivityPress(act)}
                >
                  <View style={styles.seismicDotContainer}>
                    {isLatest ? (
                      <View style={styles.latestConcentricContainer}>
                        <View style={styles.latestRing3} />
                        <View style={styles.latestRing2} />
                        <View style={styles.latestRing1} />
                        <View style={styles.latestCore} />
                      </View>
                    ) : (
                      <View style={[styles.seismicDot, { backgroundColor: strokeColor }]} />
                    )}
                  </View>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapView>

        {}
        {isLegendOpen ? (
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
        )}
      </View>

      {}
      {selectedActivity ? (
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={[styles.sheetDot, { backgroundColor: getMagnitudeColor(selectedActivity.actualMagnitude || selectedActivity.estimatedMagnitude || 0) }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetName}>{selectedActivity.location}</Text>
              <Text style={styles.sheetLoc}>Sismik Aktivite Detayı</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedActivity(null)} style={styles.closeBtnContainer}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sheetStats}>
            <View style={styles.sheetStat}>
              <Text style={styles.sheetStatLabel}>Büyüklük</Text>
              <Text style={[styles.sheetStatValue, { color: getMagnitudeColor(selectedActivity.actualMagnitude || selectedActivity.estimatedMagnitude || 0), fontSize: 13 }]}>
                {selectedActivity.actualMagnitude?.toFixed(1) || selectedActivity.estimatedMagnitude?.toFixed(1) || 'N/A'} ML
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
            <Text style={styles.seismicDescText}>{selectedActivity.description}</Text>
          </View>
        </View>
      ) : selectedDevice ? (
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View style={[styles.sheetDot, { backgroundColor: StatusColors[selectedDevice.status] }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetName}>{selectedDevice.name}</Text>
              <Text style={styles.sheetLoc}>{selectedDevice.location}</Text>
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
      ) : (
        <View style={styles.bottomList}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            {devices.map(d => (
              <TouchableOpacity key={d.id} style={styles.deviceChip} onPress={() => handleMarkerPress(d)} activeOpacity={0.8}>
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
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8 },
  legend: { flexDirection: 'row', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: colors.muted },
  map: { flex: 1 },
  markerContainer: { alignItems: 'center', justifyContent: 'center' },
  markerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: colors.card,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text,
  },
  markerOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  markerInner: { width: 10, height: 10, borderRadius: 5 },
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
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 12, color: colors.text, fontWeight: '500' },
  seismicDotContainer: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seismicDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 2,
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
  latestConcentricContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  latestRing3: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: 'rgba(220, 38, 38, 0.25)',
  },
  latestRing2: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(220, 38, 38, 0.45)',
  },
  latestRing1: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(220, 38, 38, 0.75)',
  },
  latestCore: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#dc2626',
  },
  floatingLegendCard: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: colors.surface === '#000000' || colors.surface === '#0b0f19' || colors.surface === '#0d1b2a' || colors.surface === 'rgba(11, 15, 25, 1)' ? 'rgba(11, 15, 25, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    padding: 12,
    width: 120,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
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
    top: 16,
    right: 16,
    backgroundColor: colors.surface === '#000000' || colors.surface === '#0b0f19' || colors.surface === '#0d1b2a' || colors.surface === 'rgba(11, 15, 25, 1)' ? 'rgba(11, 15, 25, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 10,
  },
  collapsedLegendIcon: {
    fontSize: 14,
  },
});

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0e1a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a2236' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#1e3a5f' }] },
];

