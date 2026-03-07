import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { registerUser, loginUser } from '@/lib/api';
import { ADMIN_EMAIL } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import PrimaryButton from '@/components/PrimaryButton';
import { colors } from '@/lib/theme';

export default function AuthScreen() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(true);
  const [loading, setLoading] = useState(false);

  // Register fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referral, setReferral] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      return Alert.alert('Lengkapi Data', 'Nama, Email, dan Password wajib diisi!');
    }
    if (password.length < 6) {
      return Alert.alert('Password Lemah', 'Password minimal 6 karakter.');
    }

    setLoading(true);
    try {
      await registerUser(name.trim(), email.trim(), password, phone.trim(), referral.trim().toUpperCase());
      Alert.alert('Berhasil! 🎉', 'Akun kamu sudah dibuat.');
      navigateAfterAuth();
    } catch (e: any) {
      let msg = 'Gagal mendaftar.';
      if (e.code === 'auth/email-already-in-use') msg = 'Email sudah terdaftar. Coba login.';
      else if (e.code === 'auth/invalid-email') msg = 'Format email tidak valid.';
      Alert.alert('Gagal', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPass.trim()) {
      return Alert.alert('Lengkapi Data', 'Email dan Password harus diisi!');
    }

    setLoading(true);
    try {
      await loginUser(loginEmail.trim(), loginPass);
      navigateAfterAuth();
    } catch (e: any) {
      let msg = 'Email atau Password salah.';
      if (e.code === 'auth/user-not-found') msg = 'Akun tidak ditemukan.';
      else if (e.code === 'auth/too-many-requests') msg = 'Terlalu banyak percobaan.';
      Alert.alert('Gagal Login', msg);
    } finally {
      setLoading(false);
    }
  };

  const navigateAfterAuth = () => {
    const user = auth.currentUser;
    if (user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      router.replace('/admin');
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.icon}>💰</Text>
        <Text style={styles.title}>{isRegister ? 'Buat Akun' : 'Selamat Datang'}</Text>
        <Text style={styles.subtitle}>Mulai kumpulkan cuanmu hari ini!</Text>

        {isRegister ? (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Nama Lengkap"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Nomor WhatsApp"
              placeholderTextColor={colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password (min 6 karakter)"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextInput
              style={[styles.input, styles.referralInput]}
              placeholder="Kode Referral (Opsional)"
              placeholderTextColor={colors.textMuted}
              value={referral}
              onChangeText={(t) => setReferral(t.toUpperCase())}
              autoCapitalize="characters"
            />
            <PrimaryButton
              title="🚀  DAFTAR SEKARANG"
              onPress={handleRegister}
              loading={loading}
              style={{ marginTop: 8 }}
            />
            <TouchableOpacity onPress={() => setIsRegister(false)} style={styles.switchBtn}>
              <Text style={styles.switchText}>
                Sudah punya akun? <Text style={styles.switchHighlight}>Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={loginEmail}
              onChangeText={setLoginEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={loginPass}
              onChangeText={setLoginPass}
              secureTextEntry
            />
            <PrimaryButton
              title="🔑  MASUK"
              onPress={handleLogin}
              loading={loading}
              variant="blue"
              style={{ marginTop: 8 }}
            />
            <TouchableOpacity onPress={() => setIsRegister(true)} style={styles.switchBtn}>
              <Text style={styles.switchText}>
                Belum punya akun? <Text style={styles.switchHighlight}>Daftar</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.darkBg,
  },
  icon: { fontSize: 56, textAlign: 'center', marginBottom: 12 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  form: { gap: 12 },
  input: {
    backgroundColor: colors.darkSurface,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: colors.textPrimary,
  },
  referralInput: {
    backgroundColor: '#0f172a',
    borderStyle: 'dashed',
    borderColor: '#334155',
    color: colors.yellow,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  switchBtn: { alignItems: 'center', marginTop: 16, padding: 8 },
  switchText: { fontSize: 14, color: colors.textSecondary },
  switchHighlight: { color: colors.cyan, fontWeight: '700' },
});
