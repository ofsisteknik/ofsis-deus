'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuthStore } from '../store/authStore';
import { useEarthquakeStore } from '../store/earthquakeStore';
import { useThemeStore } from '../store/themeStore';
import { 
  Activity, 
  MapPin, 
  Clock, 
  Search, 
  LogOut, 
  RefreshCw, 
  Globe, 
  Server, 
  AlertTriangle,
  Sun,
  Moon
} from 'lucide-react';

// Dynamically import Map component to disable SSR for Leaflet
const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => (
    <div className="status-loading">
      <div className="loading-spinner" />
      <span style={{ fontSize: '10px', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)' }}>
        SİSMİK RADAR YÜKLENİYOR...
      </span>
    </div>
  ),
});

const getMagnitudeColor = (mag: number) => {
  if (mag < 3.0) return '#9EDE9E'; // Açık Yeşil (Light Green)
  if (mag < 4.0) return '#82B9B9'; // Teal/Light Blue
  if (mag < 5.0) return '#1B5E4C'; // Dark Green
  if (mag < 6.0) return '#DFA868'; // Orange-Yellow
  if (mag < 7.0) return '#D67035'; // Orange
  return '#C93545';                // Red
};

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser, checkAuth, logout } = useAuthStore();
  const { theme, toggleTheme, initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const { 
    earthquakes, 
    selectedEarthquakeId, 
    isLoading, 
    stats, 
    isLocalServerMode, 
    fetchEarthquakes, 
    selectEarthquake 
  } = useEarthquakeStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [minMagnitude, setMinMagnitude] = useState<number>(0);
  const [showLegend, setShowLegend] = useState(true);

  const [isChecking, setIsChecking] = useState(true);

  // Authenticate session on load
  useEffect(() => {
    checkAuth();
    // Allow a small tick for checkAuth to restore local storage state
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [checkAuth]);

  // Protect route
  useEffect(() => {
    if (!isChecking) {
      const session = typeof window !== 'undefined' ? localStorage.getItem('ofsis_session') : null;
      if (!session && !currentUser) {
        router.push('/login');
      }
    }
  }, [currentUser, router, isChecking]);

  // Fetch initial data & start polling every 15s
  useEffect(() => {
    fetchEarthquakes(true);
    
    const interval = setInterval(() => {
      fetchEarthquakes(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchEarthquakes]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Filter earthquakes based on search query and magnitude
  const filteredEarthquakes = useMemo(() => {
    return earthquakes.filter((eq) => {
      const matchesSearch = eq.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMag = eq.magnitude >= minMagnitude;
      return matchesSearch && matchesMag;
    });
  }, [earthquakes, searchQuery, minMagnitude]);



  if (isChecking || !currentUser) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--background)',
        color: 'var(--foreground)',
        gap: '12px'
      }}>
        <div className="loading-spinner" />
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>
          YETKİ KONTROLÜ YAPILIYOR...
        </span>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Decorative background radial glows */}
      <div style={{
        position: 'absolute', top: 0, left: '30%', width: '30vw', height: '30vw',
        borderRadius: '50%', background: 'rgba(6, 182, 212, 0.03)', filter: 'blur(120px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: 0, right: '25%', width: '40vw', height: '40vw',
        borderRadius: '50%', background: 'rgba(245, 158, 11, 0.02)', filter: 'blur(150px)', pointerEvents: 'none'
      }} />

      {/* LEFT SECTION: MAIN MAP & LIVE STATUS */}
      <div className="main-content">
        
        {/* Header Bar */}
        <header className="glass-panel header-bar" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '18px 24px' }}>
          {/* Left: Live Indicator */}
          <div style={{ justifySelf: 'start', display: 'flex', alignItems: 'center' }}>
            <div className="header-badge badge-live">
              <span className="badge-live-dot animate-live-glow" style={{ marginRight: '4px' }} />
              CANLI
            </div>
          </div>

          {/* Center: Branding */}
          <div className="brand-section" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
            <div className="brand-icon" style={{ width: '42px', height: '42px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', margin: 0 }}>
              <img src="/logo.jpg" alt="OFSİS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <h1 className="brand-title" style={{ margin: 0, fontSize: '20px', fontWeight: '950', letterSpacing: '0.05em', lineHeight: '1.1', color: 'var(--foreground)' }}>
                OFSİS
              </h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '9.5px', fontWeight: '800', color: 'var(--accent-cyan)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                DEPREM TAKİP SİSTEMİ
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="header-actions" style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className="btn-icon"
              title={theme === 'light' ? 'Karanlık Tema' : 'Aydınlık Tema'}
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>

            {/* Divider */}
            <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--panel-border)' }} />

            {/* Logout button */}
            <button 
              onClick={handleLogout}
              className="btn-icon"
              title="Güvenli Çıkış"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* Telemetry Metrics Grid */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--panel-border)', background: 'rgba(0, 0, 0, 0.08)' }}>
          <div className="grid grid-md-4 gap-3">
            {/* Stat 1: Total Today */}
            <div className="glass-panel metric-card">
              <span className="metric-label">Son 24 Saat Toplam</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                <span className="metric-value">{stats.totalCountToday}</span>
                <span style={{ fontSize: '10px', color: 'var(--dim-text)', fontFamily: 'var(--font-mono)' }}>Deprem</span>
              </div>
            </div>

            {/* Stat 2: Max Mag Today */}
            <div className="glass-panel metric-card">
              <span className="metric-label">Son 24 Saat En Büyük</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
                <span className="metric-value amber">
                  {stats.maxMagnitudeToday > 0 ? stats.maxMagnitudeToday.toFixed(1) : '—'}
                </span>
                {stats.maxMagnitudeToday > 0 && <span style={{ fontSize: '10px', color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>ML</span>}
              </div>
            </div>

            {/* Stat 3: Last Event Location */}
            <div className="glass-panel metric-card">
              <span className="metric-label">Son Deprem Merkez Üssü</span>
              <div className="metric-meta" title={stats.lastEventLocation}>
                {stats.lastEventLocation}
              </div>
            </div>

            {/* Stat 4: Last Event Time */}
            <div className="glass-panel metric-card">
              <span className="metric-label">Son Deprem Zamanı</span>
              <div className="metric-meta-icon">
                <Clock size={12} style={{ marginRight: '4px' }} />
                <span>{stats.lastEventTime}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel map-card-wrapper" style={{ position: 'relative' }}>
          <Map 
            earthquakes={filteredEarthquakes} 
            selectedEarthquakeId={selectedEarthquakeId} 
            onSelectEarthquake={selectEarthquake} 
          />

          {/* Map Layer Legend Toggle Button */}
          <button
            onClick={() => setShowLegend(prev => !prev)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              zIndex: 999,
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              color: '#1E293B',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)'; e.currentTarget.style.transform = 'scale(1)'; }}
            title="Büyüklük Skalası Göster/Gizle"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </button>

          {/* Magnitude Legend Overlay - Styled exactly like the screenshot */}
          {showLegend && (
            <div style={{
              position: 'absolute',
              top: '56px',
              right: '12px',
              zIndex: 999,
              padding: '12px 14px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              minWidth: '135px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              background: 'rgba(255, 255, 255, 0.98)',
              color: '#1E293B',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '5px', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: '850', color: '#0F172A', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Büyüklük (ML)
                </span>
                <button
                  onClick={() => setShowLegend(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748B',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    padding: '0 4px',
                    marginLeft: '8px'
                  }}
                  title="Kapat"
                >
                  ✕
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {[
                  { range: '< 3.0', color: '#9EDE9E' },
                  { range: '3.0 - 3.9', color: '#82B9B9' },
                  { range: '4.0 - 4.9', color: '#1B5E4C' },
                  { range: '5.0 - 5.9', color: '#DFA868' },
                  { range: '6.0 - 6.9', color: '#D67035' },
                  { range: '> 7.0', color: '#C93545' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color, boxShadow: `0 0 4px ${item.color}` }} />
                    <span style={{ fontSize: '10px', color: '#334155', fontWeight: '750', fontFamily: 'var(--font-mono)' }}>
                      {item.range}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR: RECENT ACTIVITIES LIST */}
      <aside className="glass-panel sidebar-panel">
        
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <h2 className="sidebar-title">
            <span className="sidebar-title-dot" />
            SON DEPREMLER ({filteredEarthquakes.length})
          </h2>
          <button 
            onClick={() => fetchEarthquakes(true)} 
            disabled={isLoading}
            className="btn-refresh"
            title="Yenile"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Sidebar Filters */}
        <div className="filters-box">
          {/* Location Search Input */}
          <div className="search-wrapper">
            <Search size={12} className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Konum veya bölge ara..."
              className="search-input"
            />
          </div>

          {/* Magnitude selector tabs */}
          <div className="mag-filters">
            {[0, 3, 4, 5].map((mag) => (
              <button
                key={mag}
                onClick={() => setMinMagnitude(mag)}
                className={`btn-filter ${minMagnitude === mag ? 'active' : ''}`}
              >
                {mag === 0 ? 'TÜMÜ' : `≥ ${mag}.0`}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable List container wrapper */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div className="scroll-list">
            {isLoading && earthquakes.length === 0 ? (
              <div className="status-loading">
                <div className="loading-spinner" />
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)' }}>VERİLER ÇEKİLİYOR...</span>
              </div>
            ) : filteredEarthquakes.length === 0 ? (
              <div className="status-empty">
                <AlertTriangle size={16} />
                <span>Arama kriterlerine uygun deprem kaydı bulunamadı.</span>
              </div>
            ) : (
              filteredEarthquakes.map((eq) => {
                const isSelected = eq.id === selectedEarthquakeId;
                const color = getMagnitudeColor(eq.magnitude);
                const isMostRecent = earthquakes.length > 0 && eq.id === earthquakes[0].id;
                
                return (
                  <div
                    key={eq.id}
                    onClick={() => selectEarthquake(eq.id)}
                    className={`eq-card ${isSelected ? 'selected' : ''} ${isMostRecent ? 'most-recent-card' : ''}`}
                  >
                    {/* Magnitude indicator badge */}
                    <div className="eq-mag-badge">
                      <span className="eq-mag-val">{eq.magnitude.toFixed(1)}</span>
                      <span className="eq-mag-scale">{eq.magnitudeScale}</span>
                    </div>

                    {/* Text meta details */}
                    <div className="eq-info">
                      <div className="eq-info-header">
                        <h3 className="eq-location" title={eq.location}>
                          {isMostRecent && (
                            <span style={{ 
                              fontSize: '8px', 
                              background: '#EF4444', 
                              color: '#FFFFFF', 
                              padding: '2px 4px', 
                              borderRadius: '3px',
                              fontWeight: 'bold',
                              fontFamily: 'var(--font-mono)',
                              letterSpacing: '0.05em',
                              marginRight: '6px',
                              display: 'inline-block',
                              boxShadow: '0 0 5px rgba(239, 68, 68, 0.4)'
                            }}>
                              EN SON
                            </span>
                          )}
                          {eq.location}
                        </h3>
                      </div>

                      <div className="eq-details-row">
                        <div className="eq-detail-item">
                          <MapPin size={9} />
                          <span>{eq.depth} km</span>
                        </div>
                        <div className="eq-detail-item">
                          <Clock size={9} />
                          <span>{new Date(eq.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
