import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Switch, Modal,
  TextInput, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getPermissionsAsync, requestPermissionsAsync, scheduleNotificationAsync, AndroidNotificationPriority } from '../../utils/notifications';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { getInitials, validateEmail, validatePassword } from '../../utils/helpers';
import { User } from '../../types';
import { useDeviceStore } from '../../store/deviceStore';

export default function SettingsScreen() {
  const { currentUser, logout, users, createUser, toggleUserActive, deleteUser, isLoading, error, clearError } = useAuthStore();
  const { theme, toggleTheme, colors } = useThemeStore();
  const { settings, updateSettings } = useDeviceStore();
  
  const styles = useMemo(() => createStyles(colors), [colors]);
  const mStyles = useMemo(() => createMStyles(colors), [colors]);
  
  const isAdmin = currentUser?.role === 'admin';
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleThresholdChange = (key: 'elevator' | 'gas' | 'alarm', delta: number) => {
    let newVal = 0;
    if (key === 'elevator') {
      newVal = Math.max(1.0, Math.min(9.0, settings.elevatorThreshold + delta));
      updateSettings({ elevatorThreshold: parseFloat(newVal.toFixed(1)) });
    } else if (key === 'gas') {
      newVal = Math.max(1.0, Math.min(9.0, settings.gasThreshold + delta));
      updateSettings({ gasThreshold: parseFloat(newVal.toFixed(1)) });
    } else if (key === 'alarm') {
      newVal = Math.max(1.0, Math.min(9.0, settings.alarmThreshold + delta));
      updateSettings({ alarmThreshold: parseFloat(newVal.toFixed(1)) });
    }
  };

  const triggerLocalTestNotification = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Bildirim Devre Dışı', 'Cihaza anlık bildirim gönderme özelliği yalnızca Android platformunda desteklenmektedir.');
      return;
    }
    try {
      const { status: existingStatus } = await getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('İzin Reddedildi', 'Bildirim gönderilebilmesi için cihaz ayarlarından izin vermelisiniz.');
        return;
      }

      await scheduleNotificationAsync({
        content: {
          title: '🔔 DEUS Bildirim Bağlantısı Aktif',
          body: 'Sistemle olan mobil veri ve anlık uyarı bağlantınız başarılı şekilde doğrulandı.',
          sound: Platform.OS === 'android' ? 'alarm.wav' : true,
          priority: AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
    } catch (err: any) {
      Alert.alert('Hata', `Bildirim testi başarısız: ${err.message}`);
    }
  };

  const triggerEmergencyTestNotification = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Bildirim Devre Dışı', 'Cihaza anlık bildirim gönderme özelliği yalnızca Android platformunda desteklenmektedir.');
      return;
    }
    try {
      const { status: existingStatus } = await getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('İzin Reddedildi', 'Bildirim gönderilebilmesi için cihaz ayarlarından izin vermelisiniz.');
        return;
      }

      await scheduleNotificationAsync({
        content: {
          title: '🚨 DEPREM ERKEN UYARI TESTİ (M 6.4)',
          body: 'İstanbul - Marmara Denizi segmentinde sismik hareket algılandı. Bu bir uyarım test yayınıdır.',
          sound: Platform.OS === 'android' ? 'alarm.wav' : true,
          priority: AndroidNotificationPriority.MAX,
        },
        trigger: null,
      });
    } catch (err: any) {
      Alert.alert('Hata', `Acil durum uyarısı testi başarısız: ${err.message}`);
    }
  };

  const handleLogout = () => {
    Alert.alert('Çıkış', 'Hesabınızdan çıkmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: () => { logout(); router.replace('/auth/login'); } },
    ]);
  };

  const handleDeleteUser = (u: User) => {
    if (u.id === currentUser?.id) return Alert.alert('Hata', 'Kendinizi silemezsiniz.');
    Alert.alert('Kullanıcı Sil', `${u.name} silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteUser(u.id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Ayarlar</Text>
 
        {/* Profile Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PROFİL</Text>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(currentUser?.name ?? '')}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{currentUser?.name}</Text>
              <Text style={styles.profileEmail}>{currentUser?.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{currentUser?.role === 'admin' ? '⭐ Admin' : '👤 Kullanıcı'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Admin: User Management */}
        {isAdmin && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>KULLANICI YÖNETİMİ</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => { clearError(); setShowCreateModal(true); }}>
                <Text style={styles.addBtnText}>+ Kullanıcı Ekle</Text>
              </TouchableOpacity>
            </View>
            {users.map(u => (
              <View key={u.id} style={styles.userRow}>
                <View style={[styles.userAvatar, { backgroundColor: u.role === 'admin' ? 'rgba(232,75,75,0.15)' : 'rgba(59,130,246,0.15)' }]}>
                  <Text style={[styles.userAvatarText, { color: u.role === 'admin' ? colors.accent : colors.blue }]}>
                    {getInitials(u.name)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.name}</Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                  <Text style={styles.userMeta}>
                    {u.role === 'admin' ? 'Admin' : `${u.assignedDeviceIds.length} cihaz`} ·
                    {u.isActive ? <Text style={{ color: colors.safe }}> Aktif</Text> : <Text style={{ color: colors.dim }}> Devre Dışı</Text>}
                  </Text>
                </View>
                <View style={styles.userActions}>
                  {u.id !== currentUser?.id && (
                    <>
                      <Switch
                        value={u.isActive}
                        onValueChange={() => toggleUserActive(u.id)}
                        trackColor={{ false: colors.dim, true: colors.safe }}
                        thumbColor="#fff"
                        style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                      />
                      <TouchableOpacity onPress={() => handleDeleteUser(u)} style={styles.deleteBtn}>
                        <Text style={styles.deleteBtnText}>🗑</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Assigned devices (for non-admin) */}
        {!isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CİHAZLARIM</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                {currentUser?.assignedDeviceIds.length} cihaza erişim izniniz var.
                Cihaz eklemek için sistem yöneticisiyle iletişime geçin.
              </Text>
            </View>
          </View>
        )}

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UYGULAMA</Text>
          <View style={styles.menuCard}>
            <View style={[styles.menuItem, styles.menuItemBorder]}>
              <Text style={styles.menuIcon}>🎨</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Aydınlık Tema</Text>
                <Text style={styles.menuSub}>Açık renkli arayüzü etkinleştir</Text>
              </View>
              <Switch
                value={theme === 'light'}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.dim, true: colors.accent }}
                thumbColor="#fff"
              />
            </View>
            {[
              { icon: '🔔', label: 'Bildirim Ayarları', sub: 'Eşik değerleri ve ses' },
              { icon: '📍', label: 'Konum İzni', sub: 'Harita için gerekli' },
              { icon: '🌐', label: 'API Ayarları', sub: 'Mock mod aktif' },
              { icon: 'ℹ️', label: 'Uygulama Hakkında', sub: 'DEUS v1.0.0' },
            ].map((item, i, arr) => (
              <TouchableOpacity key={item.label} style={[styles.menuItem, i < arr.length - 1 && styles.menuItemBorder]} activeOpacity={0.7}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <Text style={styles.menuChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bildirim Eşikleri Settings Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BİLDİRİM EŞİKLERİ (DEPREM BÜYÜKLÜĞÜ)</Text>
          <View style={styles.thresholdCard}>
            
            {/* Elevator Threshold Row */}
            <View style={styles.thresholdRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.thresholdLabel}>🚪 Asansör Koruma Eşiği</Text>
                <Text style={styles.thresholdSub}>Deprem büyüklüğü ≥ bu değer ise asansör en yakın zemin kata indirilir.</Text>
              </View>
              <View style={styles.thresholdControls}>
                <TouchableOpacity 
                  onPress={() => handleThresholdChange('elevator', -0.1)} 
                  style={styles.thresholdBtn}
                >
                  <Text style={styles.thresholdBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.thresholdValue}>{settings.elevatorThreshold.toFixed(1)} ML</Text>
                <TouchableOpacity 
                  onPress={() => handleThresholdChange('elevator', 0.1)} 
                  style={styles.thresholdBtn}
                >
                  <Text style={styles.thresholdBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.thresholdDivider} />

            {/* Gas Valve Threshold Row */}
            <View style={styles.thresholdRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.thresholdLabel}>🔥 Doğalgaz Vana Kapatma Eşiği</Text>
                <Text style={styles.thresholdSub}>Deprem büyüklüğü ≥ bu değer ise doğalgaz ana vanası otomatik kapatılır.</Text>
              </View>
              <View style={styles.thresholdControls}>
                <TouchableOpacity 
                  onPress={() => handleThresholdChange('gas', -0.1)} 
                  style={styles.thresholdBtn}
                >
                  <Text style={styles.thresholdBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.thresholdValue}>{settings.gasThreshold.toFixed(1)} ML</Text>
                <TouchableOpacity 
                  onPress={() => handleThresholdChange('gas', 0.1)} 
                  style={styles.thresholdBtn}
                >
                  <Text style={styles.thresholdBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.thresholdDivider} />

            {/* Alarm Threshold Row */}
            <View style={styles.thresholdRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.thresholdLabel}>🚨 Genel Alarm Bildirim Eşiği</Text>
                <Text style={styles.thresholdSub}>Deprem büyüklüğü ≥ bu değer ise tüm kullanıcılara yüksek öncelikli sesli alarm gönderilir.</Text>
              </View>
              <View style={styles.thresholdControls}>
                <TouchableOpacity 
                  onPress={() => handleThresholdChange('alarm', -0.1)} 
                  style={styles.thresholdBtn}
                >
                  <Text style={styles.thresholdBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.thresholdValue}>{settings.alarmThreshold.toFixed(1)} ML</Text>
                <TouchableOpacity 
                  onPress={() => handleThresholdChange('alarm', 0.1)} 
                  style={styles.thresholdBtn}
                >
                  <Text style={styles.thresholdBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>

        {/* System Tests Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SİSTEM TESTLERİ</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]} onPress={triggerLocalTestNotification} activeOpacity={0.75}>
              <Text style={styles.menuIcon}>🔔</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Normal Bildirim Test Et</Text>
                <Text style={styles.menuSub}>Standart bildirim bağlantısını test edin</Text>
              </View>
              <Text style={styles.menuActionText}>GÖNDER</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={triggerEmergencyTestNotification} activeOpacity={0.75}>
              <Text style={styles.menuIcon}>🚨</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>Acil Durum Uyarısı Test Et</Text>
                <Text style={styles.menuSub}>Yüksek öncelikli sismik erken uyarı yayını</Text>
              </View>
              <Text style={[styles.menuActionText, { color: colors.accent }]}>YAYINLA</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Create User Modal */}
      <CreateUserModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        colors={colors}
        mStyles={mStyles}
      />
    </SafeAreaView>
  );
}

function CreateUserModal({ visible, onClose, colors, mStyles }: { visible: boolean; onClose: () => void; colors: any; mStyles: any }) {
  const { createUser, isLoading, error, clearError } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleCreate = async () => {
    setLocalError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setLocalError('Tüm alanlar zorunludur.'); return;
    }
    if (!validateEmail(email)) { setLocalError('Geçerli bir e-posta girin.'); return; }
    const passErr = validatePassword(password);
    if (passErr) { setLocalError(passErr); return; }
    try {
      await createUser({ name: name.trim(), email: email.trim(), password, role: 'user', assignedDeviceIds: [], isActive: true });
      setName(''); setEmail(''); setPassword('');
      Alert.alert('Başarılı', 'Kullanıcı oluşturuldu.');
      onClose();
    } catch {}
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={mStyles.overlay}>
        <View style={mStyles.sheet}>
          <View style={mStyles.handle} />
          <Text style={mStyles.title}>Yeni Kullanıcı Ekle</Text>
          <Text style={mStyles.sub}>Oluşturulan kullanıcı sisteme giriş yapabilir. Cihaz ataması sonradan yapılır.</Text>

          {[
            { label: 'AD SOYAD', value: name, set: setName, placeholder: 'Örn: Ahmet Yılmaz', secure: false },
            { label: 'E-POSTA', value: email, set: setEmail, placeholder: 'ahmet@firma.com', secure: false },
            { label: 'ŞİFRE', value: password, set: setPassword, placeholder: 'Min 8 karakter, büyük harf, rakam', secure: true },
          ].map(f => (
            <View key={f.label} style={mStyles.field}>
              <Text style={mStyles.label}>{f.label}</Text>
              <TextInput
                style={mStyles.input}
                value={f.value}
                onChangeText={f.set}
                placeholder={f.placeholder}
                placeholderTextColor={colors.dim}
                secureTextEntry={f.secure}
                autoCapitalize={f.secure ? 'none' : 'words'}
              />
            </View>
          ))}

          {(localError || error) ? (
            <Text style={mStyles.error}>⚠ {localError || error}</Text>
          ) : null}

          <View style={mStyles.btnRow}>
            <TouchableOpacity style={mStyles.cancelBtn} onPress={() => { clearError(); onClose(); }}>
              <Text style={mStyles.cancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={mStyles.submitBtn} onPress={handleCreate} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={mStyles.submitText}>Oluştur</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, paddingHorizontal: 20, paddingVertical: 16 },
  section: { marginHorizontal: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 10, color: colors.dim, fontWeight: '700', letterSpacing: 1.5, marginBottom: 10 },
  profileCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 14, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(232,75,75,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.accent },
  profileName: { fontSize: 15, fontWeight: '700', color: colors.text },
  profileEmail: { fontSize: 12, color: colors.muted, marginTop: 2 },
  roleBadge: { backgroundColor: 'rgba(232,75,75,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 6 },
  roleBadgeText: { fontSize: 10, color: colors.accent, fontWeight: '600' },
  addBtn: { backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  addBtnText: { fontSize: 11, color: colors.safe, fontWeight: '600' },
  userRow: { backgroundColor: colors.card, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  userAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { fontSize: 13, fontWeight: '700' },
  userName: { fontSize: 13, fontWeight: '600', color: colors.text },
  userEmail: { fontSize: 11, color: colors.dim, marginTop: 1 },
  userMeta: { fontSize: 10, color: colors.dim, marginTop: 2 },
  userActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 16 },
  infoCard: { backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  infoText: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  menuCard: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIcon: { fontSize: 18, width: 28 },
  menuLabel: { fontSize: 13, color: colors.text, fontWeight: '500' },
  menuSub: { fontSize: 11, color: colors.dim, marginTop: 1 },
  menuChevron: { fontSize: 18, color: colors.dim },
  logoutBtn: { marginHorizontal: 16, backgroundColor: 'rgba(232,75,75,0.1)', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(232,75,75,0.3)' },
  logoutText: { fontSize: 15, color: colors.accent, fontWeight: '700' },
  menuActionText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.blue,
    letterSpacing: 0.5,
    backgroundColor: 'rgba(59,130,246,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  thresholdCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
  },
  thresholdLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  thresholdSub: {
    fontSize: 11,
    color: colors.dim,
    marginTop: 4,
    lineHeight: 16,
  },
  thresholdControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(128,128,128,0.05)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thresholdBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thresholdBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  thresholdValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.accent,
    minWidth: 50,
    textAlign: 'center',
  },
  thresholdDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
});

const createMStyles = (colors: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderTopWidth: 1, borderColor: colors.border },
  handle: { width: 36, height: 4, backgroundColor: colors.dim, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
  sub: { fontSize: 12, color: colors.muted, lineHeight: 17, marginBottom: 20 },
  field: { marginBottom: 14 },
  label: { fontSize: 10, color: colors.dim, fontWeight: '600', letterSpacing: 1, marginBottom: 6 },
  input: { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, fontSize: 14, color: colors.text },
  error: { fontSize: 12, color: colors.accent, marginBottom: 12 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cancelText: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  submitBtn: { flex: 2, backgroundColor: colors.safe, borderRadius: 12, padding: 14, alignItems: 'center' },
  submitText: { fontSize: 14, color: '#fff', fontWeight: '700' },
});
