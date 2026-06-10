'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, isLoading, currentUser, checkAuth, clearError } = useAuthStore();
  const router = useRouter();

  const { initTheme } = useThemeStore();

  // Restore session
  useEffect(() => {
    checkAuth();
    initTheme();
  }, [checkAuth, initTheme]);

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      router.push('/');
    }
  }, [currentUser, router]);

  // Clear errors on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    const success = await login(email, password);
    if (success) {
      router.push('/');
    }
  };

  return (
    <div className="login-bg">
      {/* Decorative Blur Spheres */}
      <div className="login-glow-1" />
      <div className="login-glow-2" />
      
      {/* Grid Pattern Background overlay */}
      <div className="login-grid-bg" />

      <div className="login-box">
        {/* Logo and Brand Title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div className="login-badge animate-pulse">
            <span className="login-badge-dot" />
            DEPREM TAKİP SİSTEMİ
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
            <div style={{ width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src="/logo.jpg" alt="OFSİS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <h1 className="login-title" style={{ margin: 0, fontSize: '22px', fontWeight: '950', color: 'var(--foreground)', lineHeight: '1' }}>
                OFSİS
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Deprem Takip Sistemi
              </p>
            </div>
          </div>
          <p className="login-subtitle" style={{ marginTop: '12px' }}>Deprem Takip ve Sismik Veri Konsolu</p>
        </div>

        {/* Credentials Form Card */}
        <div className="login-card">
          <h2 className="login-card-header">
            KONSOL YETKİLENDİRME
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">KULLANICI ADI VEYA E-POSTA</label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Kullanıcı adı veya e-posta girin"
                className="form-input"
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label className="form-label">ŞİFRE</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Şifrenizi girin"
                className="form-input"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="error-badge glow-red">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{ marginTop: '20px' }}
            >
              {isLoading ? 'BAĞLANIYOR...' : 'GİRİŞ YAP'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
