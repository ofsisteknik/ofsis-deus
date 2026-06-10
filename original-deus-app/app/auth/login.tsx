import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Alert, Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();
  const { colors } = useThemeStore();
  const styles = createStyles(colors);

  React.useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'OFSİS Ana Sayfa';
    }
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Hata', 'E-posta ve şifre alanları zorunludur.');
      return;
    }
    clearError();
    const success = await login(email.trim(), password);
    if (success) {
      router.replace('/tabs/home');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {}
        <View style={styles.logoSection}>
          <Image
            source={require('../../assets/ofSisLogo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.appName}>OFSİS</Text>
          <Text style={styles.appSubtitle}>SİSMİK İZLEME VE ANALİZ KONSOLU</Text>
        </View>

        {}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Yönetici Girişi</Text>
          <Text style={styles.formSubtitle}>
            Sadece yetkili kullanıcılar erişebilir.{'\n'}Hesap oluşturmak için sistem yöneticisiyle iletişime geçin.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-POSTA</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="kullanici@ofsis.io"
                placeholderTextColor={colors.dim}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ŞİFRE</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.dim}
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showPass ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>Giriş Yap</Text>
            )}
          </TouchableOpacity>

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Demo Hesaplar</Text>
            <TouchableOpacity onPress={() => { setEmail('admin@ofsis.io'); setPassword('Admin2026!'); }}>
              <Text style={styles.demoItem}>Admin: admin@ofsis.io / Admin2026!</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setEmail('baris@ofsis.io'); setPassword('Baris123!'); }}>
              <Text style={styles.demoItem}>Kullanıcı: baris@ofsis.io / Baris123!</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>OFSİS v1.0.0 · Kayıt sistemi aktif değil</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  logoSection: { alignItems: 'center', marginBottom: 40 },
  logoImage: {
    width: 80, height: 80, borderRadius: 20,
    marginBottom: 12,
  },
  appName: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: 4 },
  appSubtitle: { fontSize: 10, color: colors.muted, letterSpacing: 2.5, marginTop: 4 },
  form: {
    backgroundColor: colors.card,
    borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: colors.border,
  },
  formTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
  formSubtitle: { fontSize: 12, color: colors.muted, lineHeight: 18, marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 10, color: colors.muted, fontWeight: '600', letterSpacing: 1, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 14, color: colors.text },
  eyeBtn: { padding: 4 },
  eyeText: { fontSize: 16 },
  errorBox: {
    backgroundColor: 'rgba(232,75,75,0.1)',
    borderRadius: 10, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(232,75,75,0.3)',
  },
  errorText: { fontSize: 13, color: colors.accent },
  loginBtn: {
    backgroundColor: colors.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 20,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  demoBox: {
    backgroundColor: colors.surface, borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: colors.border,
  },
  demoTitle: { fontSize: 10, color: colors.dim, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  demoItem: { fontSize: 11, color: colors.blue, marginBottom: 4 },
  footer: { textAlign: 'center', fontSize: 11, color: colors.dim, marginTop: 24 },
});

