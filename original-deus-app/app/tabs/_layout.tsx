import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useDeviceStore } from '../../store/deviceStore';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import HomeScreen from './home';
import MapScreen from './map';
import NotificationsScreen from './notifications';
import LogsScreen from './logs';
import SettingsScreen from './settings';
import WebDashboard from '../../components/WebDashboard';

function TabIcon({ focused, color, icon, label }: { focused: boolean; color: string; icon: string; label: string }) {
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Text style={[styles.tabIcon, { color }]}>{icon}</Text>
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </View>
  );
}

function BellIcon({ focused, color }: { focused: boolean; color: string }) {
  const { currentUser } = useAuthStore();
  const assignedIds = currentUser?.assignedDeviceIds ?? [];
  const unread = useDeviceStore(s => s.unreadCount(assignedIds));
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <View>
        <Text style={[styles.tabIcon, { color }]}>🔔</Text>
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tabLabel, { color }]}>Bildirimler</Text>
    </View>
  );
}

function ActiveTabScreen({ index }: { index: number }) {
  switch (index) {
    case 0: return <HomeScreen />;
    case 1: return <MapScreen />;
    case 2: return <NotificationsScreen />;
    case 3: return <LogsScreen />;
    case 4: return <SettingsScreen />;
    default: return <HomeScreen />;
  }
}

export default function TabsLayout() {
  if (Platform.OS === 'web') {
    return <WebDashboard />;
  }

  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleTabPress = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const tabs = [
    { index: 0, icon: '🏠', label: 'Ana Sayfa' },
    { index: 1, icon: '🗺️', label: 'Harita' },
    { index: 2, isBell: true, icon: '🔔', label: 'Bildirimler' },
    { index: 3, icon: '📋', label: 'Loglar' },
    { index: 4, icon: '⚙️', label: 'Ayarlar' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {}
      <View style={styles.pager}>
        <ActiveTabScreen index={activeIndex} />
      </View>

      {}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {tabs.map((tab) => {
          const focused = activeIndex === tab.index;
          const activeColor = colors.accent;
          const inactiveColor = colors.dim;
          const iconColor = focused ? activeColor : inactiveColor;

          return (
            <TouchableOpacity
              key={tab.index}
              style={styles.tabButton}
              onPress={() => handleTabPress(tab.index)}
              activeOpacity={0.8}
            >
              {tab.isBell ? (
                <BellIcon focused={focused} color={iconColor} />
              ) : (
                <TabIcon focused={focused} color={iconColor} icon={tab.icon || ''} label={tab.label || ''} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  pager: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    height: 80,
    paddingBottom: 16,
    borderTopWidth: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: { flex: 1, height: '100%', justifyContent: 'center', alignItems: 'center' },
  tabItem: { alignItems: 'center', gap: 3, paddingTop: 8 },
  tabItemActive: {},
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 9, fontWeight: '500' },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: colors.accent,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },
});

