import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert, ActivityIndicator,
  TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useDeviceStore } from '../../store/deviceStore';
import { useThemeStore } from '../../store/themeStore';
import { StatusColors, StatusLabels, MagnitudeColors } from '../../constants/colors';
import { timeAgo, formatDateTime } from '../../utils/helpers';

export default function DeviceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { 
    getDevice, 
    getActivitiesForDevice,
    activeRpiData,
    isSimulated,
    setSimulated,
    connectToRpiDevice,
    disconnectRpiDevice,
    updateRpiSettings,
    triggerRpiRelay,
    triggerRpiCalibration,
    triggerRpiTestAlarm
  } = useDeviceStore();
  
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  const device = getDevice(id);
  const activities = getActivitiesForDevice(id);

  // local states for settings inputs
  const [elevatorVal, setElevatorVal] = useState('');
  const [gasVal, setGasVal] = useState('');
  const [alarmVal, setAlarmVal] = useState('');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [testingAlarm, setTestingAlarm] = useState(false);
  const [testingRelay, setTestingRelay] = useState(false);

  // Poll RPi if IP is set
  useEffect(() => {
    if (device?.ipAddress && device?.port) {
      connectToRpiDevice(device.ipAddress, device.port);
    }
    return () => {
      disconnectRpiDevice();
    };
  }, [device?.ipAddress, device?.port]);

  // Sync settings inputs when loaded
  useEffect(() => {
    if (activeRpiData.settings) {
      setElevatorVal((activeRpiData.settings.elevatorThreshold ?? 3.5).toString());
      setGasVal((activeRpiData.settings.gasThreshold ?? 4.0).toString());
      setAlarmVal((activeRpiData.settings.alarmThreshold ?? 5.0).toString());
    }
  }, [activeRpiData.settings]);

  if (!device) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Cihaz bulunamadı.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const seismicActs = activities.filter(a => a.type === 'seismic');
  const avgMag = seismicActs.length
    ? (seismicActs.reduce((s, a) => s + (a.estimatedMagnitude ?? 0), 0) / seismicActs.length).toFixed(1)
    : '—';
  const maxMag = seismicActs.length
    ? Math.max(...seismicActs.map(a => a.estimatedMagnitude ?? 0)).toFixed(1)
    : '—';

  // Handle RPi actions
  const handleSaveSettings = async () => {
    if (!device.ipAddress || !device.port) return;
    const eThresh = parseFloat(elevatorVal);
    const gThresh = parseFloat(gasVal);
    const aThresh = parseFloat(alarmVal);

    if (isNaN(eThresh) || isNaN(gThresh) || isNaN(aThresh)) {
      Alert.alert('Hata', 'Lütfen geçerli sayısal eşik değerleri girin.');
      return;
    }

    setIsUpdatingSettings(true);
    const success = await updateRpiSettings(device.ipAddress, device.port, {
      elevatorThreshold: eThresh,
      gasThreshold: gThresh,
      alarmThreshold: aThresh
    });
    setIsUpdatingSettings(false);

    if (success) {
      Alert.alert('Başarılı', 'RPi 5 Kiosk alarm eşik değerleri başarıyla güncellendi.');
    } else {
      Alert.alert('Hata', 'Ayarlar güncellenirken bir hata oluştu. Bağlantıyı kontrol edin.');
    }
  };

  const handleCalibrate = async () => {
    if (!device.ipAddress || !device.port) return;
    setCalibrating(true);
    const success = await triggerRpiCalibration(device.ipAddress, device.port);
    setCalibrating(false);
    if (success) {
      Alert.alert('Başarılı', 'İvmeölçer kalibrasyon komutu başarıyla gönderildi.');
    } else {
      Alert.alert('Hata', 'Kalibrasyon başlatılamadı. Bağlantıyı kontrol edin.');
    }
  };

  const handleTestAlarm = async () => {
    if (!device.ipAddress || !device.port) return;
    setTestingAlarm(true);
    const success = await triggerRpiTestAlarm(device.ipAddress, device.port);
    setTestingAlarm(false);
    if (success) {
      Alert.alert('Başarılı', 'Deprem alarm simülasyon testi tetiklendi.');
    } else {
      Alert.alert('Hata', 'Test alarmı tetiklenemedi. Bağlantıyı kontrol edin.');
    }
  };

  const handleTestRelay = async () => {
    if (!device.ipAddress || !device.port) return;
    setTestingRelay(true);
    const success = await triggerRpiRelay(device.ipAddress, device.port);
    setTestingRelay(false);
    if (success) {
      Alert.alert('Başarılı', 'Manuel röle tetikleme testi yapıldı.');
    } else {
      Alert.alert('Hata', 'Röle tetiklenemedi. Bağlantıyı kontrol edin.');
    }
  };

  const liveSeismicData = activeRpiData.status?.liveSeismicData || [];
  const maxSeismicVal = liveSeismicData.length ? Math.max(...liveSeismicData, 1.0) : 1.0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.title}>{device.name}</Text>
              {device.isPhysical ? (
                <View style={{ backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: 'rgba(16,185,129,0.3)' }}>
                  <Text style={{ fontSize: 9, color: colors.safe || '#10b981', fontWeight: '800' }}>FİZİKSEL</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: 'rgba(148,163,184,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: 'rgba(148,163,184,0.3)' }}>
                  <Text style={{ fontSize: 9, color: colors.muted || '#94a3b8', fontWeight: '800' }}>SİMÜLE</Text>
                </View>
              )}
            </View>
            <Text style={styles.subtitle}>{device.location}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: StatusColors[device.status] + '22' }]}>
            <View style={[styles.statusDot, { backgroundColor: StatusColors[device.status] }]} />
            <Text style={[styles.statusText, { color: StatusColors[device.status] }]}>
              {StatusLabels[device.status]}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Stats row */}
          <View style={styles.statsRow}>
            {[
              { label: 'Batarya', value: `%${device.batteryPercent}`, color: device.batteryPercent < 20 ? colors.accent : colors.safe },
              { label: 'Bugün', value: `${device.todayActivityCount}`, color: colors.text },
              { label: 'Ort. ML', value: avgMag, color: colors.warn },
              { label: 'Max ML', value: maxMag, color: colors.accent },
            ].map(s => (
              <View key={s.label} style={styles.statBox}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* RPI 5 CONNECTION DECK */}
          {device.ipAddress ? (
            <View style={styles.rpiDeck}>
              <View style={styles.rpiDeckHeader}>
                <View>
                  <Text style={styles.rpiDeckTitle}>RPi 5 SİSMİK KİOSK ENTEGRASYONU</Text>
                  <Text style={styles.rpiDeckSubtitle}>
                    Hedef: {device.ipAddress}:{device.port || 8080}
                  </Text>
                </View>
                <View style={[styles.connBadge, { backgroundColor: activeRpiData.isConnected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }]}>
                  <View style={[styles.connDot, { backgroundColor: activeRpiData.isConnected ? '#10b981' : '#ef4444' }]} />
                  <Text style={[styles.connText, { color: activeRpiData.isConnected ? '#10b981' : '#ef4444' }]}>
                    {activeRpiData.isConnected ? 'BAĞLI' : 'BAĞLANTI YOK'}
                  </Text>
                </View>
              </View>

              {/* Simulation Mode Toggle if not connected */}
              {!activeRpiData.isConnected && (
                <View style={styles.offlineBox}>
                  <Text style={styles.offlineText}>
                    Cihaza erişilemiyor. Local ağda olduğunuzdan emin olun veya test etmek için simülasyon modunu aktif edin.
                  </Text>
                </View>
              )}

              <View style={styles.simToggleRow}>
                <Text style={styles.simToggleLabel}>Simüle RPi Modu (Çevrimdışı Test):</Text>
                <Switch
                  value={isSimulated}
                  onValueChange={setSimulated}
                  trackColor={{ false: colors.dim, true: colors.safe }}
                  thumbColor="#fff"
                />
              </View>

              {activeRpiData.isLoading && (
                <View style={styles.rpiLoader}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={styles.rpiLoaderText}>Kiosk verileri senkronize ediliyor...</Text>
                </View>
              )}

              {activeRpiData.isConnected && activeRpiData.status && (
                <View style={{ marginTop: 12 }}>
                  {/* Status Grid indicators */}
                  <Text style={styles.sectionLabel}>CİHAZ VE RÖLE DURUMLARI</Text>
                  <View style={styles.statusGrid}>
                    <View style={styles.statusCard}>
                      <Text style={styles.statusCardLabel}>SENSÖR BAĞLANTISI</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <View style={[styles.connDot, { backgroundColor: activeRpiData.status.sensorConnected ? '#10b981' : '#ef4444' }]} />
                        <Text style={[styles.statusCardVal, { color: activeRpiData.status.sensorConnected ? '#10b981' : '#ef4444' }]}>
                          {activeRpiData.status.sensorConnected ? 'AKTİF' : 'HATA'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.statusCard}>
                      <Text style={styles.statusCardLabel}>ASANSÖR RÖLESİ</Text>
                      <Text style={[styles.statusCardVal, { color: activeRpiData.status.elevatorState ? colors.warn : colors.text }]}>
                        {activeRpiData.status.elevatorState ? 'TETİKLENDİ' : 'SERBEST'}
                      </Text>
                    </View>
                    <View style={styles.statusCard}>
                      <Text style={styles.statusCardLabel}>DOĞALGAZ VANASI</Text>
                      <Text style={[styles.statusCardVal, { color: activeRpiData.status.gasState ? colors.accent : colors.safe }]}>
                        {activeRpiData.status.gasState ? 'KAPATILDI' : 'AÇIK'}
                      </Text>
                    </View>
                    <View style={styles.statusCard}>
                      <Text style={styles.statusCardLabel}>ALARM DURUMU</Text>
                      <Text style={[styles.statusCardVal, { color: activeRpiData.status.alarmState ? colors.accent : colors.text }]}>
                        {activeRpiData.status.alarmState ? 'ALARM AKTİF' : 'SAKİN'}
                      </Text>
                    </View>
                  </View>

                  {/* Real-time Seismic Waveform monitor */}
                  <Text style={styles.sectionLabel}>ANLIK SİSMİK VERİ AKIŞI (ACCELEROMETER)</Text>
                  <View style={styles.chartContainer}>
                    <View style={styles.chartHeader}>
                      <Text style={styles.chartTitle}>Canlı İvme Ölçümü (X/Y/Z Bileşkesi)</Text>
                      <Text style={styles.chartValue}>
                        Son: {liveSeismicData.length ? liveSeismicData[liveSeismicData.length - 1].toFixed(3) : '0.000'} g
                      </Text>
                    </View>
                    <View style={styles.chartBars}>
                      {liveSeismicData.map((val, idx) => {
                        const heightPercent = `${Math.min(100, (val / maxSeismicVal) * 100)}%`;
                        const isHigh = val >= (activeRpiData.settings?.elevatorThreshold ?? 3.5);
                        return (
                          <View key={idx} style={styles.chartBarWrapper}>
                            <View 
                              style={[
                                styles.chartBar, 
                                { 
                                  height: heightPercent as any, 
                                  backgroundColor: isHigh ? colors.accent : colors.safe 
                                }
                              ]} 
                            />
                          </View>
                        );
                      })}
                      {!liveSeismicData.length && (
                        <Text style={styles.chartEmpty}>Veri bekleniyor...</Text>
                      )}
                    </View>
                    <View style={styles.chartXLabels}>
                      <Text style={styles.chartXText}>20s önce</Text>
                      <Text style={styles.chartXText}>Şimdi</Text>
                    </View>
                  </View>

                  {/* Controls center */}
                  <Text style={styles.sectionLabel}>KIOSK KONTROL PANELİ</Text>
                  <View style={styles.controlButtonsRow}>
                    <TouchableOpacity 
                      style={[styles.ctrlBtn, calibrating && styles.ctrlBtnDisabled]} 
                      onPress={handleCalibrate}
                      disabled={calibrating}
                    >
                      {calibrating ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.ctrlBtnText}>⚖ Sensör Kalibrasyonu</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.ctrlBtn, { backgroundColor: colors.warn }, testingAlarm && styles.ctrlBtnDisabled]} 
                      onPress={handleTestAlarm}
                      disabled={testingAlarm}
                    >
                      {testingAlarm ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.ctrlBtnText}>📢 Deprem Alarmı Testi</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.ctrlBtn, { backgroundColor: colors.blue }, testingRelay && styles.ctrlBtnDisabled]} 
                      onPress={handleTestRelay}
                      disabled={testingRelay}
                    >
                      {testingRelay ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.ctrlBtnText}>⚡ Board Röle Testi</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Settings thresholds adjustments */}
                  <Text style={styles.sectionLabel}>KIOSK ALARM EŞİK AYARLARI (ML)</Text>
                  <View style={styles.settingsForm}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Asansör Eşiği</Text>
                        <TextInput
                          style={styles.textInput}
                          value={elevatorVal}
                          onChangeText={setElevatorVal}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Doğalgaz Eşiği</Text>
                        <TextInput
                          style={styles.textInput}
                          value={gasVal}
                          onChangeText={setGasVal}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Genel Alarm Eşiği</Text>
                        <TextInput
                          style={styles.textInput}
                          value={alarmVal}
                          onChangeText={setAlarmVal}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={[styles.saveSettingsBtn, isUpdatingSettings && styles.ctrlBtnDisabled]} 
                      onPress={handleSaveSettings}
                      disabled={isUpdatingSettings}
                    >
                      {isUpdatingSettings ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveSettingsText}>Kaydet ve Kiosk'a Gönder</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Kiosk event logs */}
                  <Text style={styles.sectionLabel}>CİHAZ AKSİYON VE OLAY LOGLARI (SON 50)</Text>
                  <View style={styles.terminalContainer}>
                    <ScrollView style={styles.terminalScroll} nestedScrollEnabled>
                      {activeRpiData.logs && activeRpiData.logs.length > 0 ? (
                        activeRpiData.logs.map((log, idx) => {
                          let color = '#a3e635'; // green for normal/success
                          if (log.level === 'warning') color = '#fbbf24'; // yellow
                          if (log.level === 'danger' || log.level === 'error') color = '#f87171'; // red
                          if (log.level === 'info') color = '#38bdf8'; // blue
                          
                          return (
                            <Text key={idx} style={styles.terminalLine}>
                              <Text style={{ color: '#64748b' }}>[{formatDateTime(log.timestamp).split(' ')[1]}]</Text>{' '}
                              <Text style={{ color }}>{log.level?.toUpperCase()}:</Text>{' '}
                              <Text style={{ color: '#e2e8f0' }}>{log.event}</Text>
                            </Text>
                          );
                        })
                      ) : (
                        <Text style={styles.terminalLine}>Kayıtlı olay veya aksiyon logu yok.</Text>
                      )}
                    </ScrollView>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.card, { alignItems: 'center', paddingVertical: 24 }]}>
              <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center', marginBottom: 14 }}>
                Bu cihaz için IP adresi tanımlanmamış. Canlı RPi 5 entegrasyonu için cihaz ayarlarına bir IP girin.
              </Text>
              <TouchableOpacity 
                style={[styles.mapShowBtn, { paddingHorizontal: 20 }]} 
                onPress={() => router.replace('/tabs/home')}
              >
                <Text style={styles.mapShowBtnText}>Cihaz Ayarlarını Yaplandır</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Device info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>GENEL CİHAZ BİLGİLERİ</Text>
            {[
              { label: 'Firmware', value: device.firmwareVersion },
              { label: 'Son Görülme', value: timeAgo(device.lastSeenAt) },
              { label: 'Koordinat', value: `${device.latitude.toFixed(4)}, ${device.longitude.toFixed(4)}` },
            ].map(r => (
              <View key={r.label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{r.label}</Text>
                <Text style={styles.infoValue}>{r.value}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.mapShowBtn}
              onPress={() => {
                useDeviceStore.getState().selectDevice(device.id);
                router.push('/tabs/map');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.mapShowBtnText}>🗺 Konumu Haritada Göster</Text>
            </TouchableOpacity>
          </View>

          {/* Automations list */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>OTOMATİK AKSİYONLAR (MERKEZİ YAPI)</Text>
            {device.automations.length === 0 ? (
              <Text style={styles.emptyInCard}>Bu cihazda yapılandırılmış aksiyon yok.</Text>
            ) : (
              device.automations.map(auto => (
                <View key={auto.id} style={styles.autoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.autoName}>{auto.name}</Text>
                    <Text style={styles.autoTrigger}>≥{auto.triggerMagnitude} ML tetikler</Text>
                    <Text style={styles.autoAction}>→ {auto.action}</Text>
                  </View>
                  <Switch
                    value={auto.isActive}
                    onValueChange={() => Alert.alert('Bilgi', 'Otomatik aksiyon yetkilendirmesi RPi 5 kiosk üzerinden yönetilmektedir.')}
                    trackColor={{ false: colors.dim, true: colors.safe }}
                    thumbColor="#fff"
                    disabled
                  />
                </View>
              ))
            )}
          </View>

          {/* Recent activities for this device */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>SON AKTİVİTELER (BULUT DATABASE)</Text>
            {activities.slice(0, 10).map((act, i) => (
              <View key={act.id} style={[styles.actRow, i > 0 && styles.actRowBorder, { borderLeftColor: MagnitudeColors[act.level] }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actMag, { color: MagnitudeColors[act.level] }]}>
                    {act.estimatedMagnitude ? `${act.estimatedMagnitude} ML` : act.description.split('.')[0]}
                  </Text>
                  {act.actualMagnitude && (
                    <Text style={styles.actReal}>Gerçekleşen: {act.actualMagnitude} Mw</Text>
                  )}
                  {act.depth && <Text style={styles.actDepth}>Derinlik: {act.depth} km</Text>}
                </View>
                <Text style={styles.actTime}>{timeAgo(act.timestamp)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  backButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  backIcon: { fontSize: 18, color: colors.text },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statBox: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 9, color: colors.dim, marginTop: 3, letterSpacing: 0.5 },
  
  // RPi deck styles
  rpiDeck: { backgroundColor: colors.surface || colors.card, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.accent + '33' },
  rpiDeckHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12, marginBottom: 12 },
  rpiDeckTitle: { fontSize: 11, color: colors.accent, fontWeight: '900', letterSpacing: 1.2 },
  rpiDeckSubtitle: { fontSize: 11, color: colors.muted, marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  connBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  connText: { fontSize: 9, fontWeight: '900' },
  offlineBox: { backgroundColor: 'rgba(239,68,68,0.06)', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  offlineText: { fontSize: 11, color: '#f87171', lineHeight: 15 },
  simToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 0.5, borderColor: colors.border },
  simToggleLabel: { fontSize: 12, fontWeight: '600', color: colors.text },
  rpiLoader: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 10 },
  rpiLoaderText: { fontSize: 11, color: colors.muted },
  sectionLabel: { fontSize: 9, color: colors.dim, fontWeight: '800', letterSpacing: 1.0, marginTop: 16, marginBottom: 8 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusCard: { flex: 1, minWidth: '45%', backgroundColor: colors.card, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: colors.border },
  statusCardLabel: { fontSize: 8, color: colors.dim, fontWeight: '700', letterSpacing: 0.5 },
  statusCardVal: { fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 4 },
  
  // chart styles
  chartContainer: { backgroundColor: '#0f172a', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1e293b' },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  chartTitle: { fontSize: 10, color: '#94a3b8', fontWeight: '700' },
  chartValue: { fontSize: 11, color: '#38bdf8', fontWeight: '900', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  chartBars: { height: 70, flexDirection: 'row', alignItems: 'flex-end', gap: 3, borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 2 },
  chartBarWrapper: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  chartBar: { width: '100%', borderRadius: 1 },
  chartEmpty: { flex: 1, textAlign: 'center', color: '#64748b', fontSize: 11, paddingBottom: 25 },
  chartXLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  chartXText: { fontSize: 8, color: '#64748b' },

  // control panel
  controlButtonsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  ctrlBtn: { flex: 1, minWidth: '30%', backgroundColor: colors.accent, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' },
  ctrlBtnDisabled: { opacity: 0.5 },
  ctrlBtnText: { fontSize: 10, fontWeight: '800', color: '#fff', textAlign: 'center' },

  // settings thresholds
  settingsForm: { backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 0.5, borderColor: colors.border },
  inputLabel: { fontSize: 9, color: colors.muted, fontWeight: '700', marginBottom: 4 },
  textInput: { height: 38, backgroundColor: colors.bg, borderRadius: 8, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 10, fontSize: 12, textAlign: 'center', fontWeight: '600' },
  saveSettingsBtn: { backgroundColor: colors.safe, paddingVertical: 11, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  saveSettingsText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  // terminal styles
  terminalContainer: { height: 140, backgroundColor: '#020617', borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', overflow: 'hidden', padding: 8 },
  terminalScroll: { flex: 1 },
  terminalLine: { fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', lineHeight: 14, marginBottom: 4 },

  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 10, color: colors.dim, fontWeight: '700', letterSpacing: 1.5, marginBottom: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: 12, color: colors.muted },
  infoValue: { fontSize: 12, color: colors.text, fontWeight: '500' },
  mapShowBtn: {
    marginTop: 14,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  mapShowBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.blue,
  },
  autoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  autoName: { fontSize: 13, color: colors.text, fontWeight: '600' },
  autoTrigger: { fontSize: 11, color: colors.dim, marginTop: 2 },
  autoAction: { fontSize: 11, color: colors.safe, marginTop: 2 },
  actRow: { paddingVertical: 10, borderLeftWidth: 2, paddingLeft: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  actRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  actMag: { fontSize: 13, fontWeight: '700' },
  actReal: { fontSize: 11, color: colors.warn, marginTop: 2 },
  actDepth: { fontSize: 10, color: colors.dim, marginTop: 1 },
  actTime: { fontSize: 10, color: colors.dim },
  emptyInCard: { fontSize: 13, color: colors.dim, textAlign: 'center', paddingVertical: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: colors.dim, marginBottom: 12 },
  backBtn: { backgroundColor: colors.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  backBtnText: { fontSize: 14, color: colors.text },
});
