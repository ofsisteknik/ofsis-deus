import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useDeviceStore } from '../../store/deviceStore';
import { useThemeStore } from '../../store/themeStore';
import { MagnitudeColors, ActivityTypeLabels } from '../../constants/colors';
import { timeAgo, formatDateTime } from '../../utils/helpers';
import { Activity, ActivityType } from '../../types';

type Filter = 'all' | ActivityType;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'seismic', label: 'Sismik' },
  { key: 'action', label: 'Aksiyon' },
  { key: 'system', label: 'Sistem' },
];

export default function LogsScreen() {
  const { currentUser } = useAuthStore();
  const { getActivitiesForUser } = useDeviceStore();
  const { colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const [filter, setFilter] = useState<Filter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const all = getActivitiesForUser(currentUser?.assignedDeviceIds ?? []);
  const filtered = filter === 'all' ? all : all.filter(a => a.type === filter);

  const renderItem = ({ item, index }: { item: Activity; index: number }) => {
    const isOpen = expanded === item.id;
    const mag = item.estimatedMagnitude;
    const level = item.level;

    return (
      <TouchableOpacity
        style={[styles.row, { borderLeftColor: MagnitudeColors[level] }]}
        onPress={() => setExpanded(isOpen ? null : item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.rowHeader}>
          <Text style={styles.rowIndex}>#{String(index + 1).padStart(2, '0')}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowMag, { color: MagnitudeColors[level] }]}>
              {mag
                ? `${mag} ML`
                : item.type === 'action'
                ? '⚡ Otomatik Aksiyon'
                : 'ℹ Sistem Olayı'}
            </Text>
            <Text style={styles.rowMeta}>{item.deviceName} · {item.location}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {item.actualMagnitude && (
              <Text style={styles.rowReal}>{item.actualMagnitude} Mw</Text>
            )}
            <Text style={styles.rowTime}>{timeAgo(item.timestamp)}</Text>
            <Text style={styles.rowChevron}>{isOpen ? '▲' : '▼'}</Text>
          </View>
        </View>

        {isOpen && (
          <View style={styles.detail}>
            <View style={styles.detailGrid}>
              <View style={styles.detailCell}>
                <Text style={styles.detailLabel}>Tarih/Saat</Text>
                <Text style={styles.detailValue}>{formatDateTime(item.timestamp)}</Text>
              </View>
              {item.estimatedMagnitude && (
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>P-dalgası (tahmini)</Text>
                  <Text style={styles.detailValue}>{item.estimatedMagnitude} {item.magnitudeScale}</Text>
                </View>
              )}
              {item.actualMagnitude && (
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>S-dalgası (gerçek)</Text>
                  <Text style={styles.detailValue}>{item.actualMagnitude} Mw</Text>
                </View>
              )}
              {item.depth && (
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>Derinlik</Text>
                  <Text style={styles.detailValue}>{item.depth} km</Text>
                </View>
              )}
              <View style={styles.detailCell}>
                <Text style={styles.detailLabel}>Tür</Text>
                <Text style={styles.detailValue}>{ActivityTypeLabels[item.type]}</Text>
              </View>
            </View>
            <Text style={styles.detailDesc}>{item.description}</Text>
            {item.actions.length > 0 && (
              <View style={styles.actionsWrap}>
                <Text style={styles.detailLabel}>Tetiklenen Aksiyonlar</Text>
                {item.actions.map((a, i) => (
                  <Text key={i} style={styles.actionItem}>✓ {a}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Aktivite Logları</Text>
          <Text style={styles.sub}>{filtered.length} kayıt · Son 50</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={a => a.id}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Bu filtre için kayıt bulunamadı.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 12, color: colors.muted, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  row: {
    backgroundColor: colors.card, borderRadius: 12,
    padding: 14, borderLeftWidth: 2, borderWidth: 1, borderColor: colors.border,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowIndex: { fontSize: 10, color: colors.dim, paddingTop: 2, minWidth: 24 },
  rowMag: { fontSize: 13, fontWeight: '700' },
  rowMeta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  rowReal: { fontSize: 11, color: colors.warn, fontWeight: '600' },
  rowTime: { fontSize: 10, color: colors.dim },
  rowChevron: { fontSize: 9, color: colors.dim },
  detail: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: colors.border },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  detailCell: { minWidth: '45%' },
  detailLabel: { fontSize: 9, color: colors.dim, letterSpacing: 0.5, marginBottom: 2 },
  detailValue: { fontSize: 13, color: colors.text, fontWeight: '500' },
  detailDesc: { fontSize: 12, color: colors.muted, lineHeight: 18, marginBottom: 8 },
  actionsWrap: { gap: 4 },
  actionItem: { fontSize: 12, color: colors.safe, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: colors.dim },
});
