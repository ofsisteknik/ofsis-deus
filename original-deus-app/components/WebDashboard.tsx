import React, { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Switch, ActivityIndicator, Dimensions, Platform, Image
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useDeviceStore } from '../store/deviceStore';
import { useThemeStore } from '../store/themeStore';
import { StatusColors, StatusLabels } from '../constants/colors';
import MapScreenWeb from './MapScreen.web';
import { formatDateTime, timeAgo, validateEmail, validatePassword } from '../utils/helpers';
import { Activity, Device, User } from '../types';

export default function WebDashboard() {
  const { currentUser, logout, users, createUser, toggleUserActive, deleteUser, updateUser } = useAuthStore();
  const { 
    devices: allDevices, 
    activities: allActivities, 
    selectedDeviceId, 
    selectDevice, 
    simulateNewActivity,
    getDevicesForUser,
    getActivitiesForUser,
    refreshData,
    addDevice,
    updateDevice,
    deleteDevice,
    clearActivities
  } = useDeviceStore();
  const { theme, toggleTheme, colors } = useThemeStore();

  const devices = currentUser?.role === 'admin' 
    ? allDevices 
    : getDevicesForUser(currentUser?.assignedDeviceIds ?? []);

  const activities = currentUser?.role === 'admin' 
    ? allActivities 
    : getActivitiesForUser(currentUser?.assignedDeviceIds ?? []);

  const [windowWidth, setWindowWidth] = useState(Platform.OS === 'web' ? window.innerWidth : Dimensions.get('window').width);
  const isMobile = windowWidth < 1024;

  const styles = createStyles(colors, theme, isMobile);

  const renderResponsiveTable = (tableElement: React.ReactNode, minWidth: number = 850) => {
    if (isMobile) {
      return (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={true} 
          style={{ width: '100%', marginBottom: 10 }}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View style={{ minWidth, width: '100%' }}>
            {tableElement}
          </View>
        </ScrollView>
      );
    }
    return tableElement;
  };

  const [activeTab, setActiveTab] = useState<'Harita' | 'Kullanıcılar' | 'Cihazlar' | 'Cihaz Grupları' | 'Aktiviteler' | 'Firmware'>('Harita');
  const [searchQuery, setSearchQuery] = useState('');
  const [activityPage, setActivityPage] = useState(1);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [assigningUser, setAssigningUser] = useState<User | null>(null);
  const [assignedIdsForModal, setAssignedIdsForModal] = useState<string[]>([]);

  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceLocation, setNewDeviceLocation] = useState('');
  const [newDeviceLatitude, setNewDeviceLatitude] = useState('');
  const [newDeviceLongitude, setNewDeviceLongitude] = useState('');
  const [newDeviceCoverageRadius, setNewDeviceCoverageRadius] = useState('150');
  const [newDeviceNotificationThreshold, setNewDeviceNotificationThreshold] = useState('3.0');
  const [newDeviceIpAddress, setNewDeviceIpAddress] = useState('');
  const [newDevicePort, setNewDevicePort] = useState('8080');
  const [newDeviceIsPhysical, setNewDeviceIsPhysical] = useState(false);
  const [newDeviceError, setNewDeviceError] = useState('');

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [newUserError, setNewUserError] = useState('');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isRightPanelOpenDesktop, setIsRightPanelOpenDesktop] = useState(true);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
    setIsProfileDropdownOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

      document.title = 'OFSİS Sismik İzleme Konsolu';
      let logoUrl = '';
      try {
        if ((Image as any).resolveAssetSource) {
          logoUrl = (Image as any).resolveAssetSource(require('../assets/ofSisLogo.png')).uri;
        }
      } catch (e) {}
      if (logoUrl) {
        let link: any = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = logoUrl;
      }

    const styleId = 'deus-dashboard-custom-css';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      styleTag.innerHTML = `
        .sidebar-transition {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), left 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .right-panel-transition {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .sidebar-btn {
          transition: all 0.2s ease;
          border-radius: 12px !important;
        }
        .sidebar-btn:hover {
          background-color: rgba(232, 75, 75, 0.08) !important;
          transform: translateX(4px);
        }
        .sidebar-btn-active {
          background-color: rgba(232, 75, 75, 0.15) !important;
        }
        .header-icon {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .header-icon:hover {
          background-color: rgba(128, 128, 128, 0.15) !important;
          transform: scale(1.05);
        }
        .dashboard-card {
          transition: all 0.25s ease;
        }
        .dashboard-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        .interactive-row {
          transition: background-color 0.15s ease;
        }
        .interactive-row:hover {
          background-color: rgba(128, 128, 128, 0.05) !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(128, 128, 128, 0.25);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(128, 128, 128, 0.4);
        }
      `;
      document.head.appendChild(styleTag);
    }
  }, []);
  useEffect(() => {
    refreshData();

    const interval = Platform.OS === 'web' ? 15000 : 3000;
    const syncTimer = setInterval(() => {
      refreshData();
    }, interval);
    return () => clearInterval(syncTimer);
  }, []);

  const handleFullscreen = () => {
    if (Platform.OS !== 'web') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleCreateUser = async () => {
    setNewUserError('');
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      setNewUserError('Lütfen tüm alanları doldurun.');
      return;
    }
    if (!validateEmail(newUserEmail)) {
      setNewUserError('Geçersiz e-posta formatı.');
      return;
    }
    const passErr = validatePassword(newUserPassword);
    if (passErr) {
      setNewUserError(passErr);
      return;
    }

    try {
      await createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
        assignedDeviceIds: [],
        isActive: true,
      });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('user');
      setShowUserModal(false);
    } catch (err: any) {
      setNewUserError(err.message || 'Kullanıcı eklenirken hata oluştu.');
    }
  };

  const handleCreateDevice = async () => {
    setNewDeviceError('');
    if (!newDeviceName.trim() || !newDeviceLocation.trim() || !newDeviceLatitude.trim() || !newDeviceLongitude.trim()) {
      setNewDeviceError('Lütfen tüm zorunlu (*) alanları doldurun.');
      return;
    }

    const lat = parseFloat(newDeviceLatitude);
    const lon = parseFloat(newDeviceLongitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setNewDeviceError('Geçersiz enlem değeri (-90 ile 90 arasında olmalıdır).');
      return;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      setNewDeviceError('Geçersiz boylam değeri (-180 ile 180 arasında olmalıdır).');
      return;
    }

    const radius = parseFloat(newDeviceCoverageRadius);
    if (isNaN(radius) || radius <= 0) {
      setNewDeviceError('Kapsama alanı pozitif bir sayı olmalıdır.');
      return;
    }

    const threshold = parseFloat(newDeviceNotificationThreshold);
    if (isNaN(threshold) || threshold < 0 || threshold > 10) {
      setNewDeviceError('Bildirim eşik değeri 0 ile 10 arasında bir sayı olmalıdır.');
      return;
    }

    try {
      if (editingDevice) {
        await updateDevice(editingDevice.id, {
          name: newDeviceName.trim(),
          location: newDeviceLocation.trim(),
          latitude: lat,
          longitude: lon,
          coverageRadius: radius,
          notificationThreshold: threshold,
          ipAddress: newDeviceIpAddress.trim(),
          port: parseInt(newDevicePort.trim()) || 8080,
          isPhysical: newDeviceIsPhysical,
        });
      } else {
        await addDevice({
          name: newDeviceName.trim(),
          location: newDeviceLocation.trim(),
          latitude: lat,
          longitude: lon,
          coverageRadius: radius,
          notificationThreshold: threshold,
          ownerId: currentUser?.id || 'user-admin-1',
          ipAddress: newDeviceIpAddress.trim(),
          port: parseInt(newDevicePort.trim()) || 8080,
          isPhysical: newDeviceIsPhysical,
        });
      }
      setNewDeviceName('');
      setNewDeviceLocation('');
      setNewDeviceLatitude('');
      setNewDeviceLongitude('');
      setNewDeviceCoverageRadius('150');
      setNewDeviceNotificationThreshold('3.0');
      setNewDeviceIpAddress('');
      setNewDevicePort('8080');
      setNewDeviceIsPhysical(false);
      setEditingDevice(null);
      setShowDeviceModal(false);
    } catch (err: any) {
      setNewDeviceError(err.message || 'Cihaz kaydedilirken hata oluştu.');
    }
  };

  const filteredDevices = devices.filter(d => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return d.name.toLowerCase().includes(q) ||
           d.id.toLowerCase().includes(q) ||
           d.location.toLowerCase().includes(q);
  });

  const totalDevices = devices.length;
  const onlineDevices = devices.filter(d => d.status !== 'offline').length;
  const offlineDevices = devices.filter(d => d.status === 'offline').length;
  
  const lastSeismicActivity = activities.find(a => a.type === 'seismic');
  const lastActivityDateFormatted = lastSeismicActivity 
    ? formatDateTime(lastSeismicActivity.timestamp)
    : 'YOK';

  const todayActivitiesCount = activities.filter(a => {
    const actDate = new Date(a.timestamp).toDateString();
    const todayDate = new Date().toDateString();
    return actDate === todayDate;
  }).length;

  const itemsPerPage = 7;
  const totalPages = Math.ceil(activities.length / itemsPerPage);
  const displayedActivities = activities.slice(
    (activityPage - 1) * itemsPerPage,
    activityPage * itemsPerPage
  );

  return (
    <View style={styles.webContainer}>
      {}
      <View style={styles.consoleFrame}>
        
        {}
        {isMobile && isSidebarOpen && (
          <TouchableOpacity
            style={styles.backdropOverlay}
            activeOpacity={1}
            onPress={() => setIsSidebarOpen(false)}
          />
        )}

        {}
        <View style={[
          styles.sidebar,
          isMobile && {
            position: 'absolute',
            left: isSidebarOpen ? 0 : -260,
            top: 0,
            bottom: 0,
            zIndex: 1000,
            boxShadow: `4px 0px 15px rgba(0, 0, 0, ${theme === 'dark' ? 0.35 : 0.12})`,
            elevation: 15,
          },
          { className: 'sidebar-transition' } as any
        ]}>
          <View style={styles.sidebarBrand}>
            <Image 
              source={require('../assets/ofSisLogo.png')} 
              style={styles.brandLogo} 
              resizeMode="contain" 
            />
            {isMobile && (
              <TouchableOpacity style={styles.sidebarCloseBtn} onPress={() => setIsSidebarOpen(false)}>
                <Text style={styles.sidebarCloseBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.sidebarMenu}>
            {[
              { id: 'Harita', label: 'Harita', icon: '🗺️' },
              { id: 'Kullanıcılar', label: 'Kullanıcılar', icon: '👤', adminOnly: true },
              { id: 'Cihazlar', label: 'Cihazlar', icon: '💻' },
              { id: 'Cihaz Grupları', label: 'Cihaz Grupları', icon: '📁', adminOnly: true },
              { id: 'Aktiviteler', label: 'Aktiviteler', icon: '📅' },
              { id: 'Firmware', label: 'Firmware', icon: '⚙️', adminOnly: true },
            ]
            .filter(item => !item.adminOnly || currentUser?.role === 'admin')
            .map(item => {
              const isActive = activeTab === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.sidebarBtn,
                    isActive && styles.sidebarBtnActive,
                    { className: `sidebar-btn ${isActive ? 'sidebar-btn-active' : ''}` } as any
                  ]}
                  onPress={() => setActiveTab(item.id as any)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.sidebarIcon, isActive && styles.sidebarTextActive]}>{item.icon}</Text>
                  <Text style={[styles.sidebarLabel, isActive && styles.sidebarTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.sidebarFooter}>
            <Text style={{ fontSize: 10, color: colors.dim, textAlign: 'center', fontWeight: '600' }}>OFSİS v1.0.0</Text>
          </View>
        </View>

        {}
        <View style={styles.contentArea}>
          
          {}
          <View style={[styles.header, isMobile && { paddingHorizontal: 16, gap: 10 }]}>
            {}
            {isMobile && (
              <TouchableOpacity
                style={styles.hamburgerBtn}
                onPress={() => setIsSidebarOpen(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.hamburgerBtnText}>☰</Text>
              </TouchableOpacity>
            )}

            {}
            <View style={[styles.searchContainer, isMobile && { flex: 1, width: 'auto' }]}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={isMobile ? "Cihaz ara..." : "Cihaz ara (isim, ID, Konum)..."}
                placeholderTextColor={colors.dim}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery !== '' && (
                <TouchableOpacity 
                  onPress={() => setSearchQuery('')}
                  style={{ paddingHorizontal: 8, paddingVertical: 4, marginRight: 4 }}
                >
                  <Text style={{ color: colors.dim, fontWeight: '700', fontSize: 13 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {}
            <View style={[styles.headerRight, isMobile && { gap: 8 }]}>
              {}
              <View style={[styles.statusBadge, isMobile && { paddingHorizontal: 8, paddingVertical: 4 }]}>
                {!isMobile && <Text style={styles.statusText}>Bağlantı Durumu:</Text>}
                <View style={styles.statusIndicatorRow}>
                  <View style={styles.greenDot} />
                  <Text style={styles.statusState}>Aktif</Text>
                </View>
              </View>

              {}
              <TouchableOpacity
                style={[styles.headerIconBtn, isMobile && { width: 36, height: 36 }, { className: 'header-icon' } as any]}
                onPress={toggleTheme}
                activeOpacity={0.8}
              >
                <Text style={[styles.headerIconText, isMobile && { fontSize: 14 }]}>{theme === 'dark' ? '☀️' : '🌙'}</Text>
              </TouchableOpacity>

              {}
              {!isMobile && (
                <TouchableOpacity
                  style={[styles.headerIconBtn, { className: 'header-icon' } as any]}
                  onPress={handleFullscreen}
                  activeOpacity={0.8}
                >
                  <Text style={styles.headerIconText}>⛶</Text>
                </TouchableOpacity>
              )}

              {}
              <View style={{ position: 'relative', zIndex: 2000 }}>
                <TouchableOpacity 
                  style={[styles.profileCard, isMobile && { paddingHorizontal: 6, paddingVertical: 6, borderRadius: 18 }]}
                  onPress={() => setIsProfileDropdownOpen(prev => !prev)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.profileAvatar, isMobile && { width: 32, height: 32, borderRadius: 16 }]}>
                    <Text style={[styles.profileAvatarText, isMobile && { fontSize: 10 }]}>
                      {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'US'}
                    </Text>
                  </View>
                  {!isMobile && (
                    <View style={styles.profileInfo}>
                      <Text style={styles.profileName}>{currentUser?.name || 'Kullanıcı Adı'}</Text>
                      <Text style={styles.profileEmail}>{currentUser?.email || 'Mail Adresi'}</Text>
                    </View>
                  )}
                  <Text style={[styles.profileChevron, isProfileDropdownOpen && { transform: [{ rotate: '180deg' }] } as any]}>▼</Text>
                </TouchableOpacity>

                {}
                {isProfileDropdownOpen && (
                  <>
                    {}
                    <TouchableOpacity
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 2001,
                        backgroundColor: 'transparent',
                      } as any}
                      onPress={() => setIsProfileDropdownOpen(false)}
                      activeOpacity={1}
                    />

                    {}
                    <View style={styles.profileDropdown}>
                      {isMobile && (
                        <View style={styles.dropdownHeader}>
                          <Text style={styles.dropdownName}>{currentUser?.name || 'Kullanıcı Adı'}</Text>
                          <Text style={styles.dropdownEmail}>{currentUser?.email || 'Mail Adresi'}</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => {
                          setIsProfileDropdownOpen(false);
                          logout();
                          router.replace('/auth/login');
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.dropdownItemText}>🚪 Oturumu Kapat</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>

          {}
          <View style={styles.tabBody}>
            
            {}
            {activeTab === 'Harita' && (
              <View style={styles.mapTabContainer}>
                {}
                <View style={styles.mapFrame}>
                  <MapScreenWeb
                    searchQuery={searchQuery}
                    isRightPanelOpenDesktop={isRightPanelOpenDesktop}
                    setIsRightPanelOpenDesktop={setIsRightPanelOpenDesktop}
                  />
                </View>

                {}
                {isMobile && !isRightPanelOpen && (
                  <TouchableOpacity
                    style={styles.floatingActivityToggleBtn}
                    onPress={() => setIsRightPanelOpen(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.floatingActivityToggleText}>⚡ Aktivite Logu</Text>
                  </TouchableOpacity>
                )}

                {}
                {isMobile && isRightPanelOpen && (
                  <TouchableOpacity
                    style={styles.backdropOverlay}
                    activeOpacity={1}
                    onPress={() => setIsRightPanelOpen(false)}
                  />
                )}

                {}
                {(isMobile ? isRightPanelOpen : isRightPanelOpenDesktop) && (
                  <View style={[
                    styles.overlayPanel,
                    isMobile ? {
                      position: 'absolute',
                      right: isRightPanelOpen ? 0 : -350,
                      top: 0,
                      bottom: 0,
                      borderRadius: 0,
                      zIndex: 1000,
                      boxShadow: `-4px 0px 15px rgba(0, 0, 0, ${theme === 'dark' ? 0.35 : 0.12})`,
                      elevation: 15,
                    } : {
                      position: 'relative',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      borderRadius: 0,
                      borderTopWidth: 0,
                      borderBottomWidth: 0,
                      borderRightWidth: 0,
                      borderLeftWidth: 1,
                      borderLeftColor: colors.border,
                      height: '100%',
                    },
                    { className: 'right-panel-transition' } as any
                  ]}>
                    {}
                    <View style={styles.overlayBlock}>
                      <View>
                        <Text style={styles.overlayLabel}>Cihaz Durumu</Text>
                        <View style={styles.overlayMetricsRow}>
                          <Text style={[styles.metricText, { color: colors.safe }]}>✓ {onlineDevices}</Text>
                          <Text style={styles.metricSeparator}>/</Text>
                          <Text style={[styles.metricText, { color: colors.accent }]}>✗ {offlineDevices}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.rightPanelCloseBtn}
                        onPress={() => isMobile ? setIsRightPanelOpen(false) : setIsRightPanelOpenDesktop(false)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.rightPanelCloseBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.overlayDivider} />

                    {}
                    <View style={styles.overlayBlock}>
                      <Text style={styles.overlayLabel}>Son Aktivite Tarihi</Text>
                      <Text style={styles.overlayTimeValue}>{lastActivityDateFormatted}</Text>
                    </View>

                    <View style={styles.overlayDivider} />

                    {}
                    <View style={styles.overlayBlock}>
                      <Text style={styles.overlayLabel}>Bugünkü Aktivite Sayısı</Text>
                      <Text style={styles.overlayActivityValue}>{todayActivitiesCount}</Text>
                    </View>

                    <View style={styles.overlayDivider} />

                    {}
                    <View style={styles.overlayListContainer}>
                      <View style={styles.overlayListHeader}>
                        <TouchableOpacity
                          disabled={activityPage === 1}
                          onPress={() => setActivityPage(prev => Math.max(1, prev - 1))}
                          style={[styles.pageBtn, activityPage === 1 && styles.pageBtnDisabled]}
                        >
                          <Text style={[styles.pageBtnText, activityPage === 1 && styles.pageBtnTextDisabled]}>Geri</Text>
                        </TouchableOpacity>

                        <Text style={styles.pageDisplay}>{activityPage} of {totalPages || 1}</Text>

                        <TouchableOpacity
                          disabled={activityPage === totalPages || totalPages === 0}
                          onPress={() => setActivityPage(prev => Math.min(totalPages, prev + 1))}
                          style={[styles.pageBtn, (activityPage === totalPages || totalPages === 0) && styles.pageBtnDisabled]}
                        >
                          <Text style={[styles.pageBtnText, (activityPage === totalPages || totalPages === 0) && styles.pageBtnTextDisabled]}>İleri</Text>
                        </TouchableOpacity>
                      </View>

                      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 1 }}>
                        {displayedActivities.map(act => {
                          const displayMag = act.actualMagnitude || act.estimatedMagnitude || 0;
                          let magColor = colors.text;
                          if (displayMag >= 5.0) magColor = colors.accent;
                          else if (displayMag >= 4.0) magColor = colors.warn;
                          else if (displayMag >= 3.0) magColor = colors.blue;
                          else if (displayMag > 0) magColor = colors.safe;

                          const formatTime = (isoString: string) => {
                            try {
                              const d = new Date(isoString);
                              return `${d.toLocaleDateString('tr-TR')} ${d.toLocaleTimeString('tr-TR')}`;
                            } catch {
                              return 'GG.AA.YYYY SS:DD:SS';
                            }
                          };

                          const isOutOfCoverage = act.type === 'seismic' && !act.deviceId;

                          return (
                            <View key={act.id} style={styles.overlayActivityRow}>
                              {isOutOfCoverage ? (
                                <>
                                  <View style={styles.overlayRowLeft}>
                                    <Text style={[styles.overlayRowMag, { color: magColor }]}>
                                      {act.actualMagnitude ? `${act.actualMagnitude.toFixed(1)} ${act.magnitudeScale || 'Mw'}` : `${act.estimatedMagnitude?.toFixed(1) || '-'} ML`}
                                    </Text>
                                    <Text style={styles.overlayRowMagEstimate} numberOfLines={1}>
                                      {act.deviceName || 'AFAD'}
                                    </Text>
                                  </View>

                                  <View style={styles.overlayRowRight}>
                                    <Text style={styles.overlayRowDevice} numberOfLines={1}>
                                      {act.location}
                                    </Text>
                                    <Text style={styles.overlayRowTimestamp}>
                                      {formatTime(act.timestamp)}
                                    </Text>
                                  </View>
                                </>
                              ) : (
                                <>
                                  <View style={styles.overlayRowLeft}>
                                    <Text style={[styles.overlayRowMag, { color: magColor }]}>
                                      {act.estimatedMagnitude ? `${act.estimatedMagnitude.toFixed(1)} ML` : '- ML'}
                                    </Text>
                                    <Text style={styles.overlayRowMagEstimate}>
                                      {act.type === 'seismic'
                                        ? `${act.actualMagnitude ? `${act.actualMagnitude.toFixed(1)} Mw` : '- Mw'}`
                                        : '-'}
                                    </Text>
                                  </View>

                                  <View style={styles.overlayRowRight}>
                                    <Text style={styles.overlayRowDevice} numberOfLines={1}>
                                      {act.deviceName || 'AFAD'}
                                    </Text>
                                    <Text style={styles.overlayRowTimestamp}>{formatTime(act.timestamp)}</Text>
                                  </View>
                                </>
                              )}
                            </View>
                          );
                        })}
                        {displayedActivities.length === 0 && (
                          <View style={styles.emptyOverlayList}>
                            <Text style={styles.emptyOverlayText}>Kayıtlı aktivite bulunmamaktadır.</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  </View>
                )}
              </View>
            )}

            {}
            {activeTab === 'Kullanıcılar' && (
              <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContentPadding}>
                <View style={[styles.tabSectionHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
                  <View>
                    <Text style={styles.tabHeading}>Kullanıcı Yönetimi</Text>
                    <Text style={styles.tabSubheading}>Sistem erişimine sahip kullanıcı yetkilendirmeleri</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.tabActionBtn, { className: 'web-btn' } as any]}
                    onPress={() => setShowUserModal(true)}
                  >
                    <Text style={styles.tabActionBtnText}>+ Yeni Kullanıcı Ekle</Text>
                  </TouchableOpacity>
                </View>

                {}
                {renderResponsiveTable(
                  <View style={styles.tableCard}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.tableHeaderCell, { flex: 2 }]}>KULLANICI</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>E-POSTA</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>ROL</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>DURUM</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'center' }]}>CİHAZLAR</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>İŞLEMLER</Text>
                    </View>

                    {users.map(u => (
                      <View key={u.id} style={[styles.tableBodyRow, { className: 'interactive-row' } as any]}>
                        <View style={[styles.tableBodyCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                          <View style={styles.tableAvatar}>
                            <Text style={styles.tableAvatarText}>
                              {u.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                            </Text>
                          </View>
                          <Text style={styles.tablePrimaryText}>{u.name}</Text>
                        </View>

                        <Text style={[styles.tableBodyCellText, { flex: 1.5, color: colors.muted }]}>{u.email}</Text>

                        <View style={[styles.tableBodyCell, { flex: 1, alignItems: 'center' }]}>
                          <View style={[
                            styles.roleBadge,
                            { backgroundColor: u.role === 'admin' ? 'rgba(232,75,75,0.1)' : 'rgba(59,130,246,0.1)' }
                          ]}>
                            <Text style={[
                              styles.roleBadgeText,
                              { color: u.role === 'admin' ? colors.accent : colors.blue }
                            ]}>
                              {u.role === 'admin' ? 'YÖNETİCİ' : 'KULLANICI'}
                            </Text>
                          </View>
                        </View>

                        <View style={[styles.tableBodyCell, { flex: 1, alignItems: 'center' }]}>
                          {u.id !== currentUser?.id ? (
                            <Switch
                              value={u.isActive}
                              onValueChange={() => toggleUserActive(u.id)}
                              trackColor={{ false: colors.dim, true: colors.safe }}
                              thumbColor="#fff"
                            />
                          ) : (
                            <Text style={{ color: colors.safe, fontSize: 11, fontWeight: '700' }}>✓ AKTİF</Text>
                          )}
                        </View>

                        <View style={[styles.tableBodyCell, { flex: 1.5, alignItems: 'center' }]}>
                          {u.role === 'admin' ? (
                            <View style={{ backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 }}>
                              <Text style={{ fontSize: 10, color: colors.safe, fontWeight: '700' }}>Sınırsız (Admin)</Text>
                            </View>
                          ) : (
                            <TouchableOpacity 
                              style={{ backgroundColor: 'rgba(59,130,246,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 0.5, borderColor: 'rgba(59,130,246,0.15)', flexDirection: 'row', alignItems: 'center', gap: 4 }}
                              onPress={() => {
                                setAssigningUser(u);
                                setAssignedIdsForModal(u.assignedDeviceIds || []);
                              }}
                            >
                              <Text style={{ fontSize: 10, color: colors.blue, fontWeight: '700' }}>🔌 {u.assignedDeviceIds?.length || 0} Cihaz</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        <View style={[styles.tableBodyCell, { flex: 1, alignItems: 'center' }]}>
                          {u.id !== currentUser?.id ? (
                            <TouchableOpacity style={styles.tableDeleteBtn} onPress={() => deleteUser(u.id)}>
                              <Text style={styles.tableDeleteBtnText}>🗑 Sil</Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={{ color: colors.dim, fontSize: 11 }}>-</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>,
                  900
                )}
              </ScrollView>
            )}

            {}
            {activeTab === 'Cihazlar' && (
              <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContentPadding}>
                <View style={[styles.tabSectionHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
                  <View>
                    <Text style={styles.tabHeading}>İstasyon Cihazları</Text>
                    <Text style={styles.tabSubheading}>Sismik erken uyarı şebekenizdeki istasyonlar</Text>
                  </View>
                  {currentUser?.role === 'admin' && (
                    <TouchableOpacity
                      style={[styles.tabActionBtn, { className: 'web-btn' } as any]}
                      onPress={() => {
                        setEditingDevice(null);
                        setNewDeviceName('');
                        setNewDeviceLocation('');
                        setNewDeviceLatitude('');
                        setNewDeviceLongitude('');
                        setNewDeviceCoverageRadius('150');
                        setNewDeviceNotificationThreshold('3.0');
                        setNewDeviceIpAddress('');
                        setNewDevicePort('8080');
                        setNewDeviceIsPhysical(false);
                        setNewDeviceError('');
                        setShowDeviceModal(true);
                      }}
                    >
                      <Text style={styles.tabActionBtnText}>+ Yeni Cihaz Ekle</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {}
                <View style={styles.devicesGrid}>
                  {filteredDevices.map(d => (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.deviceCard, { className: 'dashboard-card' } as any]}
                      onPress={() => {
                        selectDevice(d.id);
                        setActiveTab('Harita');
                      }}
                      activeOpacity={0.9}
                    >
                      <View style={styles.devCardHeader}>
                        <View style={[styles.statusDot, { backgroundColor: StatusColors[d.status] }]} />
                        <Text style={[styles.devCardStatusText, { color: StatusColors[d.status] }]}>
                          {StatusLabels[d.status]}
                        </Text>
                        <Text style={styles.devCardBattery}>🔋 %{d.batteryPercent}</Text>
                      </View>

                      <Text style={styles.devCardName}>{d.name}</Text>
                      <Text style={styles.devCardID}>ID: {d.id}</Text>
                      <Text style={styles.devCardLoc}>📍 {d.location}</Text>

                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        {d.isPhysical ? (
                          <View style={{ backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 0.5, borderColor: 'rgba(16,185,129,0.3)' }}>
                            <Text style={{ fontSize: 10, color: colors.safe || '#10b981', fontWeight: '800' }}>⚡ FİZİKSEL RPi 5</Text>
                          </View>
                        ) : (
                          <View style={{ backgroundColor: 'rgba(148,163,184,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 0.5, borderColor: 'rgba(148,163,184,0.3)' }}>
                            <Text style={{ fontSize: 10, color: colors.muted || '#94a3b8', fontWeight: '800' }}>💻 SİMÜLE (MOCK)</Text>
                          </View>
                        )}
                        <View style={{ backgroundColor: 'rgba(59,130,246,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 0.5, borderColor: 'rgba(59,130,246,0.2)' }}>
                          <Text style={{ fontSize: 10, color: colors.blue, fontWeight: '700' }}>📡 {d.coverageRadius || 150} km Çap</Text>
                        </View>
                        <View style={{ backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 0.5, borderColor: 'rgba(245,158,11,0.2)' }}>
                          <Text style={{ fontSize: 10, color: colors.warn, fontWeight: '700' }}>⚠️ ≥ {(d.notificationThreshold || 3.0).toFixed(1)} ML Bildirim</Text>
                        </View>
                        {d.ipAddress ? (
                          <View style={{ backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 0.5, borderColor: 'rgba(16,185,129,0.2)' }}>
                            <Text style={{ fontSize: 10, color: colors.safe || '#10b981', fontWeight: '700' }}>🔌 {d.ipAddress}:{d.port || 8080}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.devCardFooter}>
                        <Text style={styles.devCardFw}>Firmware: {d.firmwareVersion}</Text>
                        <Text style={styles.devCardActivity}>Bugün: {d.todayActivityCount} Sismik</Text>
                      </View>

                      {currentUser?.role === 'admin' && (
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }}>
                          <TouchableOpacity
                            style={{ flex: 1, backgroundColor: 'rgba(59,130,246,0.08)', borderRadius: 8, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(59,130,246,0.15)' }}
                            onPress={(e) => {
                              e.stopPropagation(); 
                              setEditingDevice(d);
                              setNewDeviceName(d.name);
                              setNewDeviceLocation(d.location);
                              setNewDeviceLatitude(d.latitude.toString());
                              setNewDeviceLongitude(d.longitude.toString());
                              setNewDeviceCoverageRadius((d.coverageRadius || 150).toString());
                              setNewDeviceNotificationThreshold((d.notificationThreshold || 3.0).toString());
                              setNewDeviceIpAddress(d.ipAddress || '');
                              setNewDevicePort((d.port || 8080).toString());
                              setNewDeviceIsPhysical(!!d.isPhysical);
                              setShowDeviceModal(true);
                            }}
                          >
                            <Text style={{ fontSize: 11, color: colors.blue, fontWeight: '700' }}>✏️ Düzenle</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ flex: 1, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 8, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' }}
                            onPress={(e) => {
                              e.stopPropagation(); 
                              if (confirm && typeof confirm === 'function') {
                                if (confirm(`${d.name} cihazını silmek istediğinize emin misiniz?`)) {
                                  deleteDevice(d.id);
                                }
                              } else {
                                deleteDevice(d.id);
                              }
                            }}
                          >
                            <Text style={{ fontSize: 11, color: colors.accent, fontWeight: '700' }}>🗑 Sil</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                  {filteredDevices.length === 0 && (
                    <View style={styles.emptyGridContainer}>
                      <Text style={styles.emptyGridText}>Aranan kriterlere uygun cihaz bulunamadı.</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            {}
            {activeTab === 'Cihaz Grupları' && (
              <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContentPadding}>
                <View style={[styles.tabSectionHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
                  <View>
                    <Text style={styles.tabHeading}>Sismik Cihaz Grupları</Text>
                    <Text style={styles.tabSubheading}>Tektonik fay segmentleri ve bölgesel izleme şebekeleri</Text>
                  </View>
                </View>

                {/* Groups Grid */}
                <View style={styles.groupsGrid}>
                  {[
                    { id: 'g-1', name: 'Ege Kıyı Segmenti', risk: 'Yüksek', color: '#e84b4b', description: 'İzmir, Muğla ve kıyı adalar bölgesini kapsayan fay segmenti.' },
                    { id: 'g-2', name: 'Marmara Segmenti', risk: 'Orta', color: '#f59e0b', description: 'Kuzey Anadolu Fay Hattı Batı segmentindeki istasyonlar.' },
                    { id: 'g-3', name: 'İç Anadolu Segmenti', risk: 'Düşük', color: '#10b981', description: 'Ankara merkezli tektonik oturum ve izleme istasyonları.' },
                  ].map(group => {
                    const groupDevices = (devices || []).filter(d => d.groupId === group.id);
                    const devicesCount = groupDevices.length;
                    const activeCount = groupDevices.filter(d => d.status !== 'offline').length;
                    
                    let computedStatus = 'offline';
                    if (groupDevices.length === 0) {
                      computedStatus = 'online';
                    } else if (groupDevices.some(d => d.status === 'alarm')) {
                      computedStatus = 'alarm';
                    } else if (groupDevices.some(d => d.status === 'warning')) {
                      computedStatus = 'warning';
                    } else if (groupDevices.some(d => d.status === 'online')) {
                      computedStatus = 'online';
                    }

                    const statusColor = computedStatus === 'alarm' ? colors.accent 
                                      : computedStatus === 'warning' ? colors.warn 
                                      : computedStatus === 'online' ? colors.safe 
                                      : colors.dim;

                    return (
                      <View key={group.id} style={[styles.groupCard, { className: 'dashboard-card' } as any]}>
                        <View style={styles.groupCardHeader}>
                          <Text style={styles.groupCardName}>{group.name}</Text>
                          <View style={[styles.riskBadge, { backgroundColor: group.color + '15' }]}>
                            <Text style={[styles.riskBadgeText, { color: group.color }]}>{group.risk} Risk</Text>
                          </View>
                        </View>

                        <Text style={styles.groupCardDesc}>{group.description}</Text>

                        <View style={styles.groupCardStats}>
                          <View style={styles.groupStatBox}>
                            <Text style={styles.groupStatVal}>{devicesCount}</Text>
                            <Text style={styles.groupStatLbl}>Toplam İstasyon</Text>
                          </View>
                          <View style={styles.groupStatBox}>
                            <Text style={[styles.groupStatVal, { color: colors.safe }]}>{activeCount}</Text>
                            <Text style={styles.groupStatLbl}>Çevrimiçi</Text>
                          </View>
                          <View style={styles.groupStatBox}>
                            <Text style={[styles.groupStatVal, { color: statusColor }]}>
                              {computedStatus.toUpperCase()}
                            </Text>
                            <Text style={styles.groupStatLbl}>Segment Durumu</Text>
                          </View>
                        </View>

                        {/* Admin Device Management UI */}
                        {currentUser?.role === 'admin' ? (
                          <View style={styles.groupAdminSection}>
                            <Text style={styles.groupSectionLabel}>GRUP İSTASYONLARI ({devicesCount}):</Text>
                            {groupDevices.length === 0 ? (
                              <Text style={styles.groupEmptyText}>Bu gruba henüz istasyon atanmamış.</Text>
                            ) : (
                              groupDevices.map(d => (
                                <View key={d.id} style={styles.groupDeviceRow}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <View style={[styles.statusDot, { backgroundColor: d.status === 'online' ? colors.safe : d.status === 'alarm' ? colors.accent : d.status === 'warning' ? colors.warn : colors.dim }]} />
                                    <Text style={styles.groupDeviceName}>{d.name} ({d.location})</Text>
                                  </View>
                                  <TouchableOpacity 
                                    style={styles.groupRemoveBtn}
                                    onPress={async () => {
                                      try {
                                        await updateDevice(d.id, { groupId: null });
                                      } catch (err: any) {
                                        alert("İstasyon gruptan çıkarılamadı: " + err.message);
                                      }
                                    }}
                                  >
                                    <Text style={styles.groupRemoveBtnText}>✕ Çıkar</Text>
                                  </TouchableOpacity>
                                </View>
                              ))
                            )}

                            {/* Dropdown/List of Devices that can be added */}
                            {devices.filter(d => d.groupId !== group.id).length > 0 && (
                              <View style={styles.groupAddContainer}>
                                <Text style={styles.groupSectionLabel}>İSTASYON EKLE:</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                                  {devices.filter(d => d.groupId !== group.id).map(d => (
                                    <TouchableOpacity 
                                      key={d.id} 
                                      style={styles.groupAddPill}
                                      onPress={async () => {
                                        try {
                                          await updateDevice(d.id, { groupId: group.id });
                                        } catch (err: any) {
                                          alert("İstasyon gruba eklenemedi: " + err.message);
                                        }
                                      }}
                                    >
                                      <Text style={styles.groupAddPillText}>+ {d.name}</Text>
                                    </TouchableOpacity>
                                  ))}
                                </ScrollView>
                              </View>
                            )}
                          </View>
                        ) : (
                          /* Non-admin read-only View */
                          <View style={styles.groupAdminSection}>
                            <Text style={styles.groupSectionLabel}>GRUP İSTASYONLARI ({devicesCount}):</Text>
                            {groupDevices.length === 0 ? (
                              <Text style={styles.groupEmptyText}>Bu gruba kayıtlı istasyon bulunmuyor.</Text>
                            ) : (
                              groupDevices.map(d => (
                                <View key={d.id} style={styles.groupDeviceRow}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <View style={[styles.statusDot, { backgroundColor: d.status === 'online' ? colors.safe : d.status === 'alarm' ? colors.accent : d.status === 'warning' ? colors.warn : colors.dim }]} />
                                    <Text style={styles.groupDeviceName}>{d.name} ({d.location})</Text>
                                  </View>
                                </View>
                              ))
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            {}
            {activeTab === 'Aktiviteler' && (
              <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContentPadding}>
                <View style={[styles.tabSectionHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
                  <View>
                    <Text style={styles.tabHeading}>Sismik Kayıt Günlüğü</Text>
                    <Text style={styles.tabSubheading}>İstasyonlar tarafından algılanan tüm sismik sarsıntılar</Text>
                  </View>
                  {currentUser?.role === 'admin' && (
                    <TouchableOpacity
                      style={[
                        styles.tabActionBtn,
                        { backgroundColor: 'rgba(232, 75, 75, 0.1)', borderWidth: 1, borderColor: colors.accent, flexDirection: 'row', alignItems: 'center', gap: 6 }
                      ]}
                      onPress={async () => {
                        if (confirm("Geçmiş sismik kayıt günlüğünü optimize etmek istiyor musunuz?\n\nBu işlem, veritabanını hızlandırmak için son 15 sismik kayıt dışındaki tüm eski geçmiş kayıtları kalıcı olarak silecektir.")) {
                          try {
                            await clearActivities(15);
                            alert("Kayıt günlüğü başarıyla optimize edildi. Sadece en son 15 sismik kayıt korundu.");
                          } catch (err: any) {
                            alert(err.message || "Günlük optimize edilirken bir hata oluştu.");
                          }
                        }
                      }}
                    >
                      <Text style={[styles.tabActionBtnText, { color: colors.accent }]}>🧹 Günlüğü Optimize Et (Son 15'i Koru)</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {}
                {renderResponsiveTable(
                  <View style={styles.tableCard}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.tableHeaderCell, { flex: 1 }]}>ŞİDDET (ML)</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>KAYNAK</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 2 }]}>KONUM</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>DERİNLİK (KM)</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: 'center' }]}>ZAMAN</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 2 }]}>OTOMATİK AKSİYON</Text>
                    </View>

                    {activities.slice(0, 30).map(act => {
                      let levelColor = colors.safe;
                      if (act.estimatedMagnitude) {
                        if (act.estimatedMagnitude >= 5.0) levelColor = colors.accent;
                        else if (act.estimatedMagnitude >= 4.0) levelColor = colors.warn;
                        else if (act.estimatedMagnitude >= 3.0) levelColor = colors.blue;
                      }

                      return (
                        <View key={act.id} style={[styles.tableBodyRow, { className: 'interactive-row' } as any]}>
                          <View style={[styles.tableBodyCell, { flex: 1 }]}>
                            <Text style={{ fontWeight: 'bold', color: levelColor }}>
                              {act.estimatedMagnitude ? `${act.estimatedMagnitude.toFixed(1)} ML` : '-'}
                            </Text>
                          </View>
                          <Text style={[styles.tableBodyCellText, { flex: 1.5, fontWeight: '600' }]}>
                            {act.deviceName || 'AFAD'}
                          </Text>
                          <Text style={[styles.tableBodyCellText, { flex: 2 }]}>{act.location || 'Bilinmiyor'}</Text>
                          <Text style={[styles.tableBodyCellText, { flex: 1, textAlign: 'center', color: colors.muted }]}>
                            {act.depth ? `${act.depth.toFixed(1)} km` : '-'}
                          </Text>
                          <Text style={[styles.tableBodyCellText, { flex: 2, textAlign: 'center', color: colors.muted }]}>
                            {formatDateTime(act.timestamp)}
                          </Text>
                          <View style={[styles.tableBodyCell, { flex: 2 }]}>
                            {act.actions && act.actions.length > 0 ? (
                              <View style={{ gap: 4 }}>
                                {act.actions.map((actName, idx) => (
                                  <View key={idx} style={styles.actionPill}>
                                    <Text style={styles.actionPillText}>⚡ {actName}</Text>
                                  </View>
                                ))}
                              </View>
                            ) : (
                              <Text style={{ color: colors.dim, fontSize: 12 }}>Aksiyon Yok</Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>,
                  950
                )}
              </ScrollView>
            )}

            {}
            {activeTab === 'Firmware' && (
              <ScrollView style={styles.tabScroll} contentContainerStyle={styles.tabContentPadding}>
                <View style={styles.tabSectionHeader}>
                  <View>
                    <Text style={styles.tabHeading}>Yazılım (Firmware) Yönetimi</Text>
                    <Text style={styles.tabSubheading}>Saha istasyonlarının mikroyazılım güncellemeleri</Text>
                  </View>
                </View>

                {}
                <View style={styles.fwStatsGrid}>
                  <View style={[styles.fwStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={styles.fwStatTitle}>En Son Yazılım Sürümü</Text>
                    <Text style={[styles.fwStatValue, { color: colors.blue }]}>v2.4.1</Text>
                    <Text style={styles.fwStatSub}>Yayınlanma: 12.04.2026</Text>
                  </View>
                  <View style={[styles.fwStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={styles.fwStatTitle}>Güncel İstasyon Sayısı</Text>
                    <Text style={[styles.fwStatValue, { color: colors.safe }]}>4 / 6</Text>
                    <Text style={styles.fwStatSub}>%66.7 Güncellik Oranı</Text>
                  </View>
                  <View style={[styles.fwStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={styles.fwStatTitle}>Bekleyen Güncelleme</Text>
                    <Text style={[styles.fwStatValue, { color: colors.warn }]}>2 İstasyon</Text>
                    <Text style={styles.fwStatSub}>Master-2 ve Master-6 çevrimdışı</Text>
                  </View>
                </View>

                {renderResponsiveTable(
                  <View style={styles.tableCard}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.tableHeaderCell, { flex: 2 }]}>İSTASYON</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'center' }]}>YÜKLÜ SÜRÜM</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'center' }]}>HEDEF SÜRÜM</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'center' }]}>DURUM</Text>
                      <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'center' }]}>İŞLEM</Text>
                    </View>

                    {devices.map(device => {
                      const isLatest = device.firmwareVersion === 'v2.4.1';
                      return (
                        <View key={device.id} style={[styles.tableBodyRow, { className: 'interactive-row' } as any]}>
                          <View style={[styles.tableBodyCell, { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                            <View style={[styles.statusDot, { backgroundColor: StatusColors[device.status] }]} />
                            <Text style={{ fontWeight: 'bold' }}>{device.name}</Text>
                          </View>
                          <Text style={[styles.tableBodyCellText, { flex: 1.5, textAlign: 'center', color: colors.muted }]}>{device.firmwareVersion}</Text>
                          <Text style={[styles.tableBodyCellText, { flex: 1.5, textAlign: 'center', color: colors.muted }]}>v2.4.1</Text>
                          <View style={[styles.tableBodyCell, { flex: 1.5, alignItems: 'center' }]}>
                            <View style={[
                              styles.roleBadge,
                              { backgroundColor: isLatest ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)' }
                            ]}>
                              <Text style={[
                                styles.roleBadgeText,
                                { color: isLatest ? colors.safe : colors.warn }
                              ]}>
                                {isLatest ? 'GÜNCEL' : 'GÜNCELLEME BEKLİYOR'}
                              </Text>
                            </View>
                          </View>
                          <View style={[styles.tableBodyCell, { flex: 1.5, alignItems: 'center' }]}>
                            <TouchableOpacity
                              style={[
                                styles.fwUpgradeBtn,
                                isLatest && styles.fwUpgradeBtnDisabled
                              ]}
                              disabled={isLatest || device.status === 'offline'}
                            >
                              <Text style={[
                                styles.fwUpgradeBtnText,
                                isLatest && styles.fwUpgradeBtnTextDisabled
                              ]}>
                                {isLatest ? 'Mükemmel' : device.status === 'offline' ? 'Cihaz Çevrimdışı' : 'Güncelle'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>,
                  800
                )}
              </ScrollView>
            )}

          </View>
        </View>

      </View>

      {}
      {showUserModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Kullanıcı Ekle</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>AD SOYAD</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ahmet Yılmaz"
                  placeholderTextColor={colors.dim}
                  value={newUserName}
                  onChangeText={setNewUserName}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>E-POSTA</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="ahmet@deus.io"
                  placeholderTextColor={colors.dim}
                  value={newUserEmail}
                  onChangeText={setNewUserEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>ŞİFRE</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="••••••••"
                  placeholderTextColor={colors.dim}
                  value={newUserPassword}
                  onChangeText={setNewUserPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>YETKİ ROLÜ</Text>
                <View style={styles.roleSelectionRow}>
                  <TouchableOpacity
                    style={[styles.roleSelectBtn, newUserRole === 'user' && styles.roleSelectBtnActive]}
                    onPress={() => setNewUserRole('user')}
                  >
                    <Text style={[styles.roleSelectText, newUserRole === 'user' && styles.roleSelectTextActive]}>Standart Kullanıcı</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleSelectBtn, newUserRole === 'admin' && styles.roleSelectBtnActive]}
                    onPress={() => setNewUserRole('admin')}
                  >
                    <Text style={[styles.roleSelectText, newUserRole === 'admin' && styles.roleSelectTextActive]}>Sistem Yöneticisi (Admin)</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {newUserError ? (
                <Text style={styles.formError}>⚠ {newUserError}</Text>
              ) : null}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowUserModal(false)}>
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleCreateUser}>
                <Text style={styles.modalSubmitText}>Kullanıcı Oluştur</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {}
      {showDeviceModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingDevice ? 'Sismik Cihazı Düzenle' : 'Yeni Sismik Cihaz Ekle'}</Text>
              <TouchableOpacity onPress={() => setShowDeviceModal(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>CİHAZ ADI *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Örn: Master-12"
                  placeholderTextColor={colors.dim}
                  value={newDeviceName}
                  onChangeText={setNewDeviceName}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>KONUM/ADRES *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Örn: İzmir, Bornova Merkez"
                  placeholderTextColor={colors.dim}
                  value={newDeviceLocation}
                  onChangeText={setNewDeviceLocation}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.formLabel}>COĞRAFİ ENLEM (LATITUDE) *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Örn: 38.4682"
                    placeholderTextColor={colors.dim}
                    value={newDeviceLatitude}
                    onChangeText={setNewDeviceLatitude}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.formLabel}>COĞRAFİ BOYLAM (LONGITUDE) *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Örn: 27.2178"
                    placeholderTextColor={colors.dim}
                    value={newDeviceLongitude}
                    onChangeText={setNewDeviceLongitude}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.formLabel}>KAPSAMA ALANI ÇAPI (KM)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Örn: 150"
                    placeholderTextColor={colors.dim}
                    value={newDeviceCoverageRadius}
                    onChangeText={setNewDeviceCoverageRadius}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.formLabel}>BİLDİRİM DEPREM EŞİĞİ (ML)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Örn: 3.0"
                    placeholderTextColor={colors.dim}
                    value={newDeviceNotificationThreshold}
                    onChangeText={setNewDeviceNotificationThreshold}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={[styles.formField, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8, paddingHorizontal: 4 }]}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={[styles.formLabel, { marginBottom: 2 }]}>FİZİKSEL CİHAZ (RPi 5) MI?</Text>
                  <Text style={{ fontSize: 10, color: colors.muted || '#94a3b8' }}>Aktif edildiğinde cihaz listesinde fiziksel etiketle gösterilir ve canlı ADXL355 verisini okur.</Text>
                </View>
                <Switch
                  value={newDeviceIsPhysical}
                  onValueChange={setNewDeviceIsPhysical}
                  trackColor={{ false: colors.border, true: colors.safe }}
                  thumbColor="#fff"
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.formLabel}>IP ADRESİ (RPi 5)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Örn: 192.168.1.120"
                    placeholderTextColor={colors.dim}
                    value={newDeviceIpAddress}
                    onChangeText={setNewDeviceIpAddress}
                  />
                </View>

                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.formLabel}>PORT (RPi 5)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Örn: 8080"
                    placeholderTextColor={colors.dim}
                    value={newDevicePort}
                    onChangeText={setNewDevicePort}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {newDeviceError ? (
                <Text style={styles.formError}>⚠ {newDeviceError}</Text>
              ) : null}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDeviceModal(false)}>
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleCreateDevice}>
                <Text style={styles.modalSubmitText}>{editingDevice ? 'Değişiklikleri Kaydet' : 'Cihazı Kaydet ve Başlat'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {}
      {assigningUser && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxWidth: 500 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Cihaz Atamalarını Yönet</Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
                  {assigningUser.name} ({assigningUser.email}) için sismik izleme cihaz yetkileri
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAssigningUser(null)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.modalBody, { maxHeight: 350 }]}>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10 }}>
                {devices.map(d => {
                  const isChecked = assignedIdsForModal.includes(d.id);
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 12,
                        borderRadius: 8,
                        backgroundColor: isChecked ? 'rgba(59,130,246,0.04)' : colors.card,
                        borderWidth: 1,
                        borderColor: isChecked ? colors.blue : colors.border,
                      }}
                      onPress={() => {
                        if (isChecked) {
                          setAssignedIdsForModal(assignedIdsForModal.filter(id => id !== d.id));
                        } else {
                          setAssignedIdsForModal([...assignedIdsForModal, d.id]);
                        }
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={{ fontWeight: 'bold', color: colors.text, fontSize: 14 }}>{d.name}</Text>
                        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>📍 {d.location}</Text>
                      </View>
                      
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        borderWidth: 2,
                        borderColor: isChecked ? colors.blue : colors.dim,
                        backgroundColor: isChecked ? colors.blue : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {isChecked && (
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>✓</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {devices.length === 0 && (
                  <Text style={{ textAlign: 'center', color: colors.muted, paddingVertical: 20 }}>
                    Sistemde tanımlı sismik cihaz bulunamadı.
                  </Text>
                )}
              </ScrollView>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAssigningUser(null)}>
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={async () => {
                  try {
                    await updateUser(assigningUser.id, { assignedDeviceIds: assignedIdsForModal });
                    setAssigningUser(null);
                  } catch (err: any) {
                    alert(err.message || 'Cihaz atamaları kaydedilirken bir hata oluştu.');
                  }
                }}
              >
                <Text style={styles.modalSubmitText}>Atamaları Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

    </View>
  );
}

const createStyles = (colors: any, theme: string, isMobile: boolean) => StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 0,
    width: '100vw' as any,
    height: '100vh' as any,
  },
  consoleFrame: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    borderRadius: 0,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  sidebar: {
    width: 260,
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    padding: 24,
    paddingTop: isMobile ? 64 : 24,
    justifyContent: 'space-between',
  },
  sidebarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    paddingHorizontal: 10,
  },
  brandLogo: {
    width: 220,
    height: 75,
  },
  brandText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 1.5,
  },
  brandIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  sidebarMenu: {
    flex: 1,
    gap: 8,
  },
  sidebarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sidebarBtnActive: {
    backgroundColor: 'rgba(232,75,75,0.12)',
  },
  sidebarIcon: {
    fontSize: 18,
    color: colors.dim,
  },
  sidebarLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  sidebarTextActive: {
    color: colors.accent,
  },
  sidebarFooter: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logoutBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  contentArea: {
    flex: 1,
    backgroundColor: colors.bg,
    flexDirection: 'column',
  },
  header: {
    height: isMobile ? 120 : 80,
    paddingTop: isMobile ? 40 : 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    width: 320,
    height: 44,
  },
  searchIcon: {
    fontSize: 14,
    color: colors.dim,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    outlineStyle: 'none' as any, 
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16,185,129,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.15)',
  },
  statusText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '500',
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  statusState: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 16,
    color: colors.text,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(232,75,75,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232,75,75,0.2)',
  },
  profileAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
  },
  profileInfo: {
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  profileEmail: {
    fontSize: 10,
    color: colors.dim,
    marginTop: 2,
  },
  profileChevron: {
    fontSize: 8,
    color: colors.dim,
    marginLeft: 6,
  },
  tabBody: {
    flex: 1,
    position: 'relative',
  },
  tabScroll: {
    flex: 1,
  },
  tabContentPadding: {
    padding: 24,
  },
  tabSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tabHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  tabSubheading: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  tabActionBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tabActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  mapTabContainer: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  mapFrame: {
    flex: 1,
  },
  overlayPanel: {
    position: 'absolute',
    right: 20,
    top: 20,
    bottom: 20,
    width: 350,
    backgroundColor: theme === 'dark' ? 'rgba(10, 14, 26, 0.92)' : 'rgba(255, 255, 255, 0.94)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    boxShadow: `0px 10px 10px rgba(0, 0, 0, ${theme === 'dark' ? 0.35 : 0.08})`,
    elevation: 8,
  },
  overlayBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  overlayLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  overlayMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricText: {
    fontSize: 15,
    fontWeight: '800',
  },
  metricSeparator: {
    color: colors.dim,
    fontSize: 13,
  },
  overlayTimeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  overlayActivityValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.safe,
  },
  overlayDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  overlayListContainer: {
    flex: 1,
    marginTop: 10,
    overflow: 'hidden',
  },
  overlayListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 4,
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.card,
  },
  pageBtnDisabled: {
    opacity: 0.3,
  },
  pageBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  pageBtnTextDisabled: {
    color: colors.dim,
  },
  pageDisplay: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '600',
  },
  overlayActivityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  overlayRowLeft: {
    alignItems: 'flex-start',
    flex: 1.2,
  },
  overlayRowMag: {
    fontSize: 13,
    fontWeight: '800',
  },
  overlayRowMagEstimate: {
    fontSize: 9,
    color: colors.dim,
    marginTop: 2,
  },
  overlayRowRight: {
    alignItems: 'flex-end',
    flex: 2,
  },
  overlayRowDevice: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  overlayRowTimestamp: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 2,
  },
  emptyOverlayList: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyOverlayText: {
    fontSize: 11,
    color: colors.muted,
  },
  tableCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dim,
    letterSpacing: 0.8,
  },
  tableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  tableBodyCell: {
  },
  tableBodyCellText: {
    fontSize: 13,
    color: colors.text,
  },
  tablePrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  tableAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59,130,246,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableAvatarText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.blue,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  tableDeleteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(232,75,75,0.08)',
  },
  tableDeleteBtnText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  actionPill: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  actionPillText: {
    fontSize: 11,
    color: colors.warn,
    fontWeight: '600',
  },
  devicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  deviceCard: {
    width: 'calc(33.333% - 11px)' as any, 
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    minWidth: 280,
  },
  devCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  devCardStatusText: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 'auto',
  },
  devCardBattery: {
    fontSize: 11,
    color: colors.muted,
  },
  devCardName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  devCardID: {
    fontSize: 10,
    color: colors.dim,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  devCardLoc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 10,
  },
  devCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 14,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  devCardFw: {
    fontSize: 10,
    color: colors.dim,
  },
  devCardActivity: {
    fontSize: 10,
    color: colors.dim,
    fontWeight: '600',
  },
  emptyGridContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  emptyGridText: {
    fontSize: 13,
    color: colors.muted,
  },
  groupsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  groupCard: {
    flex: 1,
    minWidth: 320,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  groupCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupCardName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  riskBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  groupCardDesc: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 16,
  },
  groupCardStats: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
  },
  groupStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  groupStatVal: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  groupStatLbl: {
    fontSize: 8,
    color: colors.dim,
    marginTop: 2,
    fontWeight: '500',
  },
  groupAdminSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
    gap: 10,
  },
  groupSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.5,
  },
  groupEmptyText: {
    fontSize: 11,
    color: colors.dim,
    fontStyle: 'italic',
  },
  groupDeviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupDeviceName: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  groupRemoveBtn: {
    backgroundColor: 'rgba(232, 75, 75, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(232, 75, 75, 0.2)',
  },
  groupRemoveBtnText: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '700',
  },
  groupAddContainer: {
    marginTop: 6,
    gap: 6,
  },
  groupAddPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  groupAddPillText: {
    fontSize: 10,
    color: colors.safe,
    fontWeight: '700',
  },
  fwStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  fwStatCard: {
    flex: 1,
    minWidth: 200,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  fwStatTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  fwStatValue: {
    fontSize: 24,
    fontWeight: '900',
    marginVertical: 10,
  },
  fwStatSub: {
    fontSize: 10,
    color: colors.dim,
  },
  fwUpgradeBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fwUpgradeBtnDisabled: {
    backgroundColor: 'rgba(128,128,128,0.1)',
  },
  fwUpgradeBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  fwUpgradeBtnTextDisabled: {
    color: colors.dim,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    width: isMobile ? '92%' : 480,
    maxWidth: 480,
    overflow: 'hidden',
    boxShadow: '0px 10px 15px rgba(0, 0, 0, 0.5)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 14,
    color: colors.dim,
  },
  modalBody: {
    padding: 20,
    gap: 16,
  },
  formField: {
    gap: 6,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.dim,
    letterSpacing: 0.8,
  },
  formInput: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 13,
    color: colors.text,
    outlineStyle: 'none' as any,
  },
  roleSelectionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleSelectBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  roleSelectBtnActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(232,75,75,0.06)',
  },
  roleSelectText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  roleSelectTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  formError: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  modalCancelBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  modalSubmitBtn: {
    backgroundColor: colors.safe,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalSubmitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  backdropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(4px)' as any,
    zIndex: 999,
  },
  sidebarCloseBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sidebarCloseBtnText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '800',
  },
  hamburgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hamburgerBtnText: {
    fontSize: 18,
    color: colors.text,
  },
  rightPanelCloseBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rightPanelCloseBtnText: {
    fontSize: 10,
    color: colors.text,
    fontWeight: '800',
  },
  floatingActivityToggleBtn: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    boxShadow: '0px 6px 10px rgba(0, 0, 0, 0.3)',
    elevation: 8,
    zIndex: 998,
  },
  floatingActivityToggleText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  profileDropdown: {
    position: 'absolute',
    top: isMobile ? 92 : 52,
    right: 0,
    width: 200,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: `0px 10px 15px rgba(0, 0, 0, ${theme === 'dark' ? 0.35 : 0.08})`,
    elevation: 10,
    zIndex: 2002,
    overflow: 'hidden',
    padding: 6,
  },
  dropdownHeader: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  dropdownName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  dropdownEmail: {
    fontSize: 10,
    color: colors.dim,
    marginTop: 2,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  dropdownItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  collapsedRightPanelBtn: {
    position: 'absolute',
    top: 72,
    right: 20,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
    zIndex: 99,
  },
  collapsedRightPanelIcon: {
    fontSize: 12,
    color: colors.accent,
  },
  collapsedRightPanelText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '700',
  },
});

