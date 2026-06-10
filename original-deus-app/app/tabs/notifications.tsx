import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useDeviceStore } from '../../store/deviceStore';
import { useThemeStore } from '../../store/themeStore';
import { timeAgo } from '../../utils/helpers';
import { Notification } from '../../types';

export default function NotificationsScreen() {
  const { currentUser } = useAuthStore();
  const { getNotificationsForUser, markNotificationRead, markAllNotificationsRead, selectDevice } = useDeviceStore();
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const assignedIds = currentUser?.assignedDeviceIds ?? [];
  const userNotifications = getNotificationsForUser(assignedIds);
  const unread = userNotifications.filter(n => !n.isRead).length;

  const TYPE_CONFIG = {
    alarm: { color: colors.accent, bg: 'rgba(232,75,75,0.1)', border: 'rgba(232,75,75,0.3)', label: 'ACİL UYARI', icon: '🚨' },
    warning: { color: colors.warn, bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', label: 'UYARI', icon: '⚠️' },
    info: { color: colors.blue, bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', label: 'BİLGİ', icon: 'ℹ️' },
  };

  const handlePress = (n: Notification) => {
    markNotificationRead(n.id);
    if (n.deviceId) {
      selectDevice(n.deviceId);
      router.push(`/device/${n.deviceId}`);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bildirimler</Text>
          <Text style={styles.sub}>{unread > 0 ? `${unread} okunmamış` : 'Tümü okundu'}</Text>
        </View>
        {unread > 0 && (
          <TouchableOpacity onPress={markAllNotificationsRead} style={styles.readAllBtn}>
            <Text style={styles.readAllText}>Tümünü Okundu İşaretle</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={userNotifications}
        keyExtractor={n => n.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const cfg = TYPE_CONFIG[item.type];
          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: cfg.bg, borderColor: cfg.border }, !item.isRead && styles.cardUnread]}
              onPress={() => handlePress(item)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <Text style={styles.cardIcon}>{cfg.icon}</Text>
                  <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  {!item.isRead && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.cardTime}>{timeAgo(item.timestamp)}</Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
              {item.deviceId && (
                <Text style={styles.cardLink}>Cihaz detayına git →</Text>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔕</Text>
            <Text style={styles.emptyText}>Henüz bildirim yok</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  readAllBtn: { backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  readAllText: { fontSize: 11, color: colors.blue, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1 },
  cardUnread: { borderLeftWidth: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIcon: { fontSize: 18 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  cardTime: { fontSize: 11, color: colors.dim },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  cardBody: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  cardLink: { fontSize: 11, color: colors.blue, marginTop: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: colors.dim },
});
