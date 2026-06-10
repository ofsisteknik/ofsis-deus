import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, Alert, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useDeviceStore } from '../../store/deviceStore';
import { useThemeStore } from '../../store/themeStore';
import { StatusColors, StatusLabels, MagnitudeColors } from '../../constants/colors';
import { timeAgo, formatDateTime } from '../../utils/helpers';

export default function HomeScreen() {
  const { currentUser } = useAuthStore();
  const { getDevicesForUser, getActivitiesForUser, isLoading, refreshData, simulateNewActivity, unreadCount } = useDeviceStore();
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const assignedIds = currentUser?.assignedDeviceIds ?? [];
  const devices = getDevicesForUser(assignedIds);
  const activities = getActivitiesForUser(assignedIds);
  const lastActivity = activities[0];
  const activeCount = devices.filter(d => d.status !== 'offline').length;
  const alarmCount = devices.filter(d => d.status === 'alarm').length;

  const appStateRef = useRef(AppState.currentState);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimers = useCallback(() => {
    if (!syncTimerRef.current) {
      syncTimerRef.current = setInterval(() => {
        useDeviceStore.getState().refreshData(false);
      }, 2000);
    }
  }, []);

  const stopTimers = useCallback(() => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    useDeviceStore.getState().refreshData(true);
    startTimers();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        useDeviceStore.getState().refreshData(false);
        startTimers();
      } else if (nextState.match(/inactive|background/)) {
        stopTimers();
      }
      appStateRef.current = nextState;
    });

    return () => {
      stopTimers();
      subscription.remove();
    };
  }, []);

  const handleRefresh = useCallback(() => {
    useDeviceStore.getState().refreshData(true);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      >
        {}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Ana Harita</Text>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: activeCount > 0 ? colors.safe : colors.dim }]} />
              <Text style={styles.statusText}>{activeCount} cihaz aktif</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/tabs/notifications')} style={styles.bellBtn}>
            <Text style={styles.bellIcon}>🔔</Text>
            {unreadCount(assignedIds) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount(assignedIds)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {}
        <TouchableOpacity style={styles.mapCard} onPress={() => router.push('/tabs/map')} activeOpacity={0.9}>
          <View style={styles.mapPlaceholder}>
            {}
            <View style={styles.mapGridLineH1} />
            <View style={styles.mapGridLineH2} />
            <View style={styles.mapGridLineV1} />
            <View style={styles.mapGridLineV2} />
            <View style={styles.radarCircle1} />
            <View style={styles.radarCircle2} />
            
            <View style={styles.mapHeaderContainer}>
              <Text style={styles.mapRadarTitle}>📡 SİSMİK TAKİP RADARI</Text>
              <View style={styles.liveIndicatorContainer}>
                <View style={styles.liveIndicatorDot} />
                <Text style={styles.liveIndicatorText}>CANLI</Text>
              </View>
            </View>

            <Text style={styles.mapLabel}>🗺️ Cihaz Haritasını ve Konumları Göster</Text>
            
            <View style={styles.mapPins}>
              {devices.filter(d => d.status !== 'offline').map(d => (
                <View key={d.id} style={[styles.mapPin, { backgroundColor: StatusColors[d.status] }]}>
                  <Text style={styles.mapPinText}>{d.name.replace('Master-', 'M-')}</Text>
                </View>
              ))}
            </View>
          </View>
        </TouchableOpacity>

        {}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderColor: 'rgba(232,75,75,0.25)' }]}>
            <Text style={styles.summaryLabel}>SON DEPREM</Text>
            {lastActivity?.estimatedMagnitude ? (
              <>
                <Text style={[styles.summaryValue, { color: MagnitudeColors[lastActivity.level] }]}>
                  {lastActivity.estimatedMagnitude} ML
                </Text>
                <Text style={styles.summaryMeta}>{lastActivity.location}</Text>
                <Text style={styles.summaryTime}>{timeAgo(lastActivity.timestamp)}</Text>
              </>
            ) : (
              <Text style={styles.summaryValue}>—</Text>
            )}
          </View>
          <View style={[styles.summaryCard, { borderColor: 'rgba(16,185,129,0.25)' }]}>
            <Text style={styles.summaryLabel}>CİHAZLAR</Text>
            <Text style={[styles.summaryValue, { color: colors.safe }]}>{activeCount}/{devices.length}</Text>
            <Text style={styles.summaryMeta}>{alarmCount > 0 ? `${alarmCount} alarmda` : 'Sorun yok'}</Text>
          </View>
        </View>

        {}
        {alarmCount > 0 && (
          <TouchableOpacity style={styles.alarmBanner} onPress={() => router.push('/tabs/notifications')} activeOpacity={0.9}>
            <Text style={styles.alarmBannerIcon}>🚨</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.alarmBannerTitle}>{alarmCount} cihaz alarm modunda!</Text>
              <Text style={styles.alarmBannerSub}>Bildirimlere gitmek için dokun</Text>
            </View>
            <Text style={{ color: colors.accent }}>→</Text>
          </TouchableOpacity>
        )}

        {}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cihazlarım</Text>
            <TouchableOpacity onPress={() => router.push('/tabs/map')}>
              <Text style={styles.sectionLink}>Haritada gör</Text>
            </TouchableOpacity>
          </View>
          {devices.map(device => (
            <TouchableOpacity
              key={device.id}
              style={styles.deviceRow}
              onPress={() => { useDeviceStore.getState().selectDevice(device.id); router.push(`/device/${device.id}`); }}
              activeOpacity={0.8}
            >
              <View style={[styles.deviceDot, { backgroundColor: StatusColors[device.status] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceLoc}>{device.location}</Text>
              </View>
              <View style={styles.deviceRightContainer}>
                <View style={styles.deviceRight}>
                  <View style={[styles.statusBadge, { backgroundColor: StatusColors[device.status] + '22' }]}>
                    <Text style={[styles.statusBadgeText, { color: StatusColors[device.status] }]}>
                      {StatusLabels[device.status]}
                    </Text>
                  </View>
                  <Text style={styles.deviceMeta}>{device.todayActivityCount} aktivite</Text>
                </View>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    useDeviceStore.getState().selectDevice(device.id);
                    router.push('/tabs/map');
                  }}
                  style={styles.rowMapBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rowMapBtnText}>📍</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Son Aktiviteler</Text>
            <TouchableOpacity onPress={() => router.push('/tabs/logs')}>
              <Text style={styles.sectionLink}>Tümünü gör (50)</Text>
            </TouchableOpacity>
          </View>
          {activities.slice(0, 5).map(act => (
            <View key={act.id} style={[styles.actRow, { borderLeftColor: MagnitudeColors[act.level] }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actMag, { color: MagnitudeColors[act.level] }]}>
                  {act.estimatedMagnitude ? `${act.estimatedMagnitude} ML` : act.type === 'action' ? '⚡ Aksiyon' : 'ℹ Sistem'}
                </Text>
                <Text style={styles.actLoc}>{act.location} · {act.deviceName}</Text>
                {act.actions.length > 0 && (
                  <Text style={styles.actActions} numberOfLines={1}>
                    ✓ {act.actions.join(' · ')}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {act.actualMagnitude && (
                  <Text style={styles.actReal}>{act.actualMagnitude} Mw</Text>
                )}
                <Text style={styles.actTime}>{timeAgo(act.timestamp)}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, color: colors.muted },
  bellBtn: { position: 'relative', padding: 4 },
  bellIcon: { fontSize: 22 },
  badge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: colors.accent, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  mapCard: { marginHorizontal: 16, marginBottom: 14, borderRadius: 16, overflow: 'hidden' },
  mapPlaceholder: {
    height: 240, backgroundColor: colors.card,
    borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center', gap: 14,
    padding: 16, position: 'relative', overflow: 'hidden',
  },
  mapGridLineH1: { position: 'absolute', top: '33%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.02)' },
  mapGridLineH2: { position: 'absolute', top: '66%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.02)' },
  mapGridLineV1: { position: 'absolute', left: '33%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.02)' },
  mapGridLineV2: { position: 'absolute', left: '66%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.02)' },
  radarCircle1: { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(16,185,129,0.03)', alignSelf: 'center' },
  radarCircle2: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: 'rgba(16,185,129,0.02)', alignSelf: 'center' },
  mapHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 4, position: 'absolute', top: 16, zIndex: 5 },
  mapRadarTitle: { fontSize: 11, fontWeight: '700', color: colors.dim, letterSpacing: 1 },
  liveIndicatorContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(232,75,75,0.1)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  liveIndicatorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  liveIndicatorText: { fontSize: 9, fontWeight: '800', color: colors.accent, letterSpacing: 0.5 },
  mapLabel: { color: colors.text, fontSize: 13, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2, marginTop: 24, zIndex: 4 },
  mapPins: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', zIndex: 4 },
  mapPin: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 4 },
  mapPinText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 12 },
  summaryCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: colors.border,
  },
  summaryLabel: { fontSize: 9, color: colors.muted, letterSpacing: 1, fontWeight: '600', marginBottom: 4 },
  summaryValue: { fontSize: 24, fontWeight: '800', color: colors.text },
  summaryMeta: { fontSize: 11, color: colors.dim, marginTop: 2 },
  summaryTime: { fontSize: 10, color: colors.dim, marginTop: 1 },
  alarmBanner: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: 'rgba(232,75,75,0.1)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(232,75,75,0.3)',
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  alarmBannerIcon: { fontSize: 24 },
  alarmBannerTitle: { fontSize: 14, fontWeight: '700', color: colors.accent },
  alarmBannerSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  sectionLink: { fontSize: 12, color: colors.blue },
  deviceRow: {
    backgroundColor: colors.card, borderRadius: 14,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  deviceDot: { width: 10, height: 10, borderRadius: 5 },
  deviceName: { fontSize: 13, fontWeight: '600', color: colors.text },
  deviceLoc: { fontSize: 11, color: colors.dim, marginTop: 2 },
  deviceRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowMapBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rowMapBtnText: {
    fontSize: 14,
  },
  deviceRight: { alignItems: 'flex-end', gap: 4 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  deviceMeta: { fontSize: 10, color: colors.dim },
  actRow: {
    backgroundColor: colors.card, borderRadius: 12,
    padding: 12, flexDirection: 'row', gap: 8, marginBottom: 8,
    borderLeftWidth: 2, borderWidth: 1, borderColor: colors.border,
  },
  actMag: { fontSize: 13, fontWeight: '700' },
  actLoc: { fontSize: 11, color: colors.muted, marginTop: 2 },
  actActions: { fontSize: 10, color: colors.safe, marginTop: 3 },
  actReal: { fontSize: 11, color: colors.warn, fontWeight: '600' },
  actTime: { fontSize: 10, color: colors.dim, marginTop: 2 },
  simulateBtn: {
    marginHorizontal: 16, marginTop: 8, borderRadius: 12,
    backgroundColor: colors.card, borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)', padding: 14,
    alignItems: 'center',
  },
  simulateBtnText: { fontSize: 13, color: colors.warn, fontWeight: '600' },
});

