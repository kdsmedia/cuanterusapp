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
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { registerUser, loginUser } from '@/lib/api';
import { ADMIN_EMAIL } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import PrimaryButton from '@/components/PrimaryButton';
import { colors } from '@/lib/theme';

// ===== DAFTAR E-WALLET =====
const EWALLET_OPTIONS = [
  { id: 'dana', name: 'DANA', icon: '💙', color: '#0581e6' },
  { id: 'ovo', name: 'OVO', icon: '💜', color: '#4c2a86' },
  { id: 'gopay', name: 'GoPay', icon: '💚', color: '#00aa13' },
  { id: 'shopeepay', name: 'ShopeePay', icon: '🧡', color: '#ee4d2d' },
  { id: 'linkaja', name: 'LinkAja', icon: '❤️', color: '#e82127' },
  { id: 'bri', name: 'BRI (BRIVA)', icon: '🏦', color: '#00529c' },
  { id: 'bca', name: 'BCA', icon: '🏦', color: '#003d79' },
  { id: 'bni', name: 'BNI', icon: '🏦', color: '#f15a22' },
  { id: 'mandiri', name: 'Mandiri', icon: '🏦', color: '#003068' },
  { id: 'cimb', name: 'CIMB Niaga', icon: '🏦', color: '#7b0c17' },
  { id: 'isaku', name: 'iSaku', icon: '🔵', color: '#1a73e8' },
  { id: 'doku', name: 'DOKU', icon: '🟠', color: '#f5821f' },
  { id: 'sakuku', name: 'SakuKu', icon: '🔴', color: '#d42127' },
  { id: 'octo', name: 'OCTO Mobile (CIMB)', icon: '🏦', color: '#7b0c17' },
  { id: 'jenius', name: 'Jenius (BTPN)', icon: '🔵', color: '#00a3e0' },
  { id: 'blu', name: 'blu by BCA Digital', icon: '🔵', color: '#0066b3' },
  { id: 'jago', name: 'Bank Jago', icon: '🟡', color: '#ffc600' },
  { id: 'seabank', name: 'SeaBank', icon: '🌊', color: '#00adef' },
  { id: 'neo', name: 'Bank Neo Commerce', icon: '💎', color: '#6c5ce7' },
  { id: 'permata', name: 'PermataME', icon: '🏦', color: '#006738' },
];

// Konversi nomor ponsel ke email virtual untuk Firebase Auth
function phoneToEmail(phone: string): string {
  const clean = phone.replace(/[^0-9]/g, '');
  return `${clean}@cuanterus.app`;
}

export default function AuthScreen() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(true);
  const [loading, setLoading] = useState(false);

  // === Register fields ===
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedEwallet, setSelectedEwallet] = useState<typeof EWALLET_OPTIONS[0] | null>(null);
  const [ewalletOwner, setEwalletOwner] = useState('');
  const [ewalletNumber, setEwalletNumber] = useState('');
  const [referral, setReferral] = useState('');
  const [showEwalletPicker, setShowEwalletPicker] = useState(false);

  // === Login fields ===
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // ===== REGISTER =====
  const handleRegister = async () => {
    if (!name.trim()) return Alert.alert('Lengkapi Data', 'Nama lengkap wajib diisi!');
    if (!phone.trim() || phone.replace(/[^0-9]/g, '').length < 10) {
      return Alert.alert('Lengkapi Data', 'Masukkan nomor ponsel yang valid!');
    }
    if (password.length < 6) return Alert.alert('Password Lemah', 'Password minimal 6 karakter.');
    if (!selectedEwallet) return Alert.alert('Pilih E-Wallet', 'Pilih metode e-wallet untuk penarikan!');
    if (!ewalletOwner.trim()) return Alert.alert('Lengkapi Data', 'Nama pemilik e-wallet wajib diisi!');
    if (!ewalletNumber.trim()) return Alert.alert('Lengkapi Data', 'Nomor e-wallet wajib diisi!');

    setLoading(true);
    try {
      const email = phoneToEmail(phone);
      await registerUser(
        name.trim(),
        email,
        password,
        phone.trim(),
        referral.trim().toUpperCase(),
        {
          ewalletId: selectedEwallet.id,
          ewalletName: selectedEwallet.name,
          ewalletOwner: ewalletOwner.trim(),
          ewalletNumber: ewalletNumber.trim(),
        }
      );
      Alert.alert('Berhasil! 🎉', 'Akun kamu sudah dibuat.');
      navigateAfterAuth();
    } catch (e: any) {
      let msg = 'Gagal mendaftar.';
      if (e.code === 'auth/email-already-in-use') msg = 'Nomor ponsel sudah terdaftar. Coba login.';
      else if (e.message) msg = e.message;
      Alert.alert('Gagal', msg);
    } finally {
      setLoading(false);
    }
  };

  // ===== LOGIN =====
  const handleLogin = async () => {
    if (!loginPhone.trim()) return Alert.alert('Lengkapi Data', 'Masukkan nomor ponsel!');
    if (!loginPass.trim()) return Alert.alert('Lengkapi Data', 'Masukkan password!');

    setLoading(true);
    try {
      const email = phoneToEmail(loginPhone);
      await loginUser(email, loginPass);
      navigateAfterAuth();
    } catch (e: any) {
      let msg = 'Nomor atau Password salah.';
      if (e.code === 'auth/user-not-found') msg = 'Akun tidak ditemukan. Daftar dulu!';
      else if (e.code === 'auth/too-many-requests') msg = 'Terlalu banyak percobaan. Coba lagi nanti.';
      else if (e.code === 'auth/invalid-credential') msg = 'Nomor atau Password salah.';
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

  // ===== E-WALLET PICKER MODAL =====
  const renderEwalletPicker = () => (
    <Modal visible={showEwalletPicker} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pilih E-Wallet / Bank</Text>
            <TouchableOpacity onPress={() => setShowEwalletPicker(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={EWALLET_OPTIONS}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.ewalletItem,
                  selectedEwallet?.id === item.id && styles.ewalletItemActive,
                ]}
                onPress={() => {
                  setSelectedEwallet(item);
                  setShowEwalletPicker(false);
                }}
              >
                <Text style={styles.ewalletItemIcon}>{item.icon}</Text>
                <Text style={[
                  styles.ewalletItemName,
                  selectedEwallet?.id === item.id && { color: colors.cyan },
                ]}>
                  {item.name}
                </Text>
                {selectedEwallet?.id === item.id && (
                  <Text style={styles.ewalletCheck}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

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
        <Text style={styles.subtitle}>
          {isRegister ? 'Daftar & mulai kumpulkan cuanmu!' : 'Masuk dengan nomor ponsel'}
        </Text>

        {isRegister ? (
          <View style={styles.form}>
            {/* Nama Lengkap */}
            <Text style={styles.label}>Nama Lengkap</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan nama lengkap"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Nomor Ponsel */}
            <Text style={styles.label}>Nomor Ponsel</Text>
            <TextInput
              style={styles.input}
              placeholder="08xxxxxxxxxx"
              placeholderTextColor={colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimal 6 karakter"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Data E-Wallet</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Pilihan E-Wallet */}
            <Text style={styles.label}>E-Wallet / Bank</Text>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => setShowEwalletPicker(true)}
            >
              {selectedEwallet ? (
                <View style={styles.pickerSelected}>
                  <Text style={styles.pickerIcon}>{selectedEwallet.icon}</Text>
                  <Text style={styles.pickerName}>{selectedEwallet.name}</Text>
                </View>
              ) : (
                <Text style={styles.pickerPlaceholder}>Pilih e-wallet atau bank...</Text>
              )}
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>

            {/* Nama Pemilik E-Wallet */}
            <Text style={styles.label}>Nama Pemilik</Text>
            <TextInput
              style={styles.input}
              placeholder="Nama sesuai akun e-wallet / rekening"
              placeholderTextColor={colors.textMuted}
              value={ewalletOwner}
              onChangeText={setEwalletOwner}
            />

            {/* Nomor E-Wallet */}
            <Text style={styles.label}>
              Nomor {selectedEwallet?.name || 'E-Wallet'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={selectedEwallet?.id?.startsWith('b') || ['cimb', 'mandiri', 'permata', 'octo', 'jenius', 'blu', 'jago', 'seabank', 'neo'].includes(selectedEwallet?.id || '')
                ? 'Nomor rekening'
                : 'Nomor HP terdaftar'}
              placeholderTextColor={colors.textMuted}
              value={ewalletNumber}
              onChangeText={setEwalletNumber}
              keyboardType="phone-pad"
            />

            {/* Kode Referral */}
            <Text style={styles.label}>Kode Referral <Text style={styles.optional}>(Opsional)</Text></Text>
            <TextInput
              style={[styles.input, styles.referralInput]}
              placeholder="Masukkan kode referral"
              placeholderTextColor={colors.textMuted}
              value={referral}
              onChangeText={(t) => setReferral(t.toUpperCase())}
              autoCapitalize="characters"
            />

            <PrimaryButton
              title="🚀  DAFTAR SEKARANG"
              onPress={handleRegister}
              loading={loading}
              style={{ marginTop: 12 }}
            />

            <TouchableOpacity onPress={() => setIsRegister(false)} style={styles.switchBtn}>
              <Text style={styles.switchText}>
                Sudah punya akun? <Text style={styles.switchHighlight}>Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            {/* Login - Nomor Ponsel */}
            <Text style={styles.label}>Nomor Ponsel</Text>
            <TextInput
              style={styles.input}
              placeholder="08xxxxxxxxxx"
              placeholderTextColor={colors.textMuted}
              value={loginPhone}
              onChangeText={setLoginPhone}
              keyboardType="phone-pad"
            />

            {/* Login - Password */}
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan password"
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
              style={{ marginTop: 12 }}
            />

            <TouchableOpacity onPress={() => setIsRegister(true)} style={styles.switchBtn}>
              <Text style={styles.switchText}>
                Belum punya akun? <Text style={styles.switchHighlight}>Daftar</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {renderEwalletPicker()}
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
    marginBottom: 28,
  },
  form: { gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 4,
    marginLeft: 4,
  },
  optional: {
    fontWeight: '400',
    color: colors.textMuted,
    fontSize: 11,
  },
  input: {
    backgroundColor: colors.darkSurface,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    padding: 14,
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

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: '700',
    marginHorizontal: 12,
  },

  // E-Wallet Picker Button
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.darkSurface,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    padding: 14,
  },
  pickerSelected: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  pickerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pickerPlaceholder: {
    fontSize: 15,
    color: colors.textMuted,
  },
  pickerArrow: {
    fontSize: 12,
    color: colors.textMuted,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.darkSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 30,
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
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalClose: {
    fontSize: 20,
    color: colors.textMuted,
    padding: 4,
  },
  ewalletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  ewalletItemActive: {
    backgroundColor: 'rgba(6,182,212,0.08)',
  },
  ewalletItemIcon: {
    fontSize: 20,
    marginRight: 14,
    width: 28,
    textAlign: 'center',
  },
  ewalletItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  ewalletCheck: {
    fontSize: 18,
    color: colors.cyan,
    fontWeight: '700',
  },

  // Switch
  switchBtn: { alignItems: 'center', marginTop: 16, padding: 8 },
  switchText: { fontSize: 14, color: colors.textSecondary },
  switchHighlight: { color: colors.cyan, fontWeight: '700' },
});
