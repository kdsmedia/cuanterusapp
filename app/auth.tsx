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
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { registerUser, loginUser, loginWithGoogle, completeGoogleProfile } from '@/lib/api';
import { ADMIN_EMAIL, ADMIN_PHONE, GOOGLE_WEB_CLIENT_ID, auth, db, USERS_PATH } from '@/lib/firebase';
import PrimaryButton from '@/components/PrimaryButton';
import { colors } from '@/lib/theme';

WebBrowser.maybeCompleteAuthSession();

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

// Cek apakah email adalah admin
function isAdminEmail(email: string): boolean {
  const e = email.toLowerCase();
  const adminVirtual = `${ADMIN_PHONE}@cuanterus.app`.toLowerCase();
  return e === ADMIN_EMAIL.toLowerCase() || e === adminVirtual;
}

export default function AuthScreen() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google profile completion mode
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);

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

  // === Complete profile fields (Google users) ===
  const [cpName, setCpName] = useState('');
  const [cpPhone, setCpPhone] = useState('');
  const [cpEwallet, setCpEwallet] = useState<typeof EWALLET_OPTIONS[0] | null>(null);
  const [cpEwalletOwner, setCpEwalletOwner] = useState('');
  const [cpEwalletNumber, setCpEwalletNumber] = useState('');
  const [cpLoading, setCpLoading] = useState(false);
  const [showCpEwalletPicker, setShowCpEwalletPicker] = useState(false);

  // Google Auth — use webClientId only (works for Expo Go + EAS builds)
  const redirectUri = makeRedirectUri({ scheme: 'cuanterus' });
  const [_request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    // Don't set androidClientId to webClientId — let expo-auth-session handle it
    // expoClientId is for Expo Go proxy
    expoClientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
  });

  // Handle Google response
  React.useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      // Extract id_token from either authentication or params
      const idToken =
        response.authentication?.idToken ||
        response.params?.id_token ||
        null;

      if (idToken) {
        handleGoogleLogin(idToken);
      } else {
        // Fallback: try to exchange access token
        const accessToken = response.authentication?.accessToken || response.params?.access_token;
        if (accessToken) {
          handleGoogleLoginWithAccessToken(accessToken);
        } else {
          Alert.alert('Gagal', 'Tidak bisa mendapatkan token dari Google. Coba lagi.');
          setGoogleLoading(false);
        }
      }
    } else if (response.type === 'error') {
      console.error('[Auth] Google error:', response.error);
      Alert.alert('Gagal', 'Login Google gagal. Coba lagi.');
      setGoogleLoading(false);
    } else if (response.type === 'dismiss') {
      setGoogleLoading(false);
    }
  }, [response]);

  // ===== GOOGLE LOGIN =====
  const handleGoogleLogin = async (idToken: string) => {
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle(idToken);
      const user = auth.currentUser;

      if (!user) {
        throw new Error('Gagal mendapatkan data pengguna.');
      }

      // Admin langsung masuk
      if (user.email && isAdminEmail(user.email)) {
        router.replace('/admin');
        return;
      }

      // User biasa — cek profil lengkap
      if (result.needsProfile) {
        // Pre-fill dari Google profile
        setCpName(user.displayName || '');
        setCpPhone('');
        setShowCompleteProfile(true);
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      console.error('[Auth] Google login error:', e);
      let msg = 'Login Google gagal.';
      if (e.code === 'auth/account-exists-with-different-credential') {
        msg = 'Email ini sudah terdaftar dengan metode login lain. Gunakan nomor ponsel.';
      } else if (e.code === 'auth/invalid-credential') {
        msg = 'Token Google tidak valid. Coba lagi.';
      } else if (e.code === 'auth/network-request-failed') {
        msg = 'Tidak ada koneksi internet.';
      } else if (e.message) {
        msg = e.message;
      }
      Alert.alert('Gagal', msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  // Fallback: login with access token (when id_token not available)
  const handleGoogleLoginWithAccessToken = async (accessToken: string) => {
    setGoogleLoading(true);
    try {
      // Fetch user info from Google API
      const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const userInfo = await res.json();

      if (!userInfo.email) {
        throw new Error('Tidak bisa mendapatkan email dari Google.');
      }

      // Try to get id_token from tokeninfo endpoint
      const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);
      const tokenInfo = await tokenRes.json();

      if (tokenInfo.error) {
        throw new Error('Token Google tidak valid.');
      }

      // Use the access token to create a Google credential
      // GoogleAuthProvider.credential can accept (idToken, accessToken) or just (idToken)
      // With only accessToken, we use it differently
      const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth');
      const credential = GoogleAuthProvider.credential(null, accessToken);
      const result = await signInWithCredential(auth, credential);
      const user = result.user;

      // Check/create Firestore profile
      const { doc: docRef, getDoc: getDocSnap, setDoc: setDocRef } = await import('firebase/firestore');
      const userRef = docRef(db, USERS_PATH, user.uid);
      const snap = await getDocSnap(userRef);

      if (!snap.exists()) {
        const refCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const now = new Date();
        await setDocRef(userRef, {
          uid: user.uid,
          email: user.email || '',
          name: user.displayName || userInfo.name || '',
          phone: '',
          balance: 0,
          totalEarned: 0,
          lastCheckin: '',
          streak: 0,
          myReferralCode: refCode,
          usedReferral: '',
          referralCount: 0,
          joinedAt: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          createdAt: now.toISOString(),
          adsToday: 0,
          lastAdDate: '',
          spinsToday: 0,
          lastSpinDate: '',
          blocked: false,
          ewalletId: '',
          ewalletName: '',
          ewalletOwner: '',
          ewalletNumber: '',
          loginMethod: 'google',
          profileComplete: false,
        });
        setCpName(user.displayName || userInfo.name || '');
        setShowCompleteProfile(true);
      } else {
        const data = snap.data();
        if (!data.profileComplete && data.loginMethod === 'google') {
          setCpName(data.name || user.displayName || '');
          setShowCompleteProfile(true);
        } else if (user.email && isAdminEmail(user.email)) {
          router.replace('/admin');
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (e: any) {
      console.error('[Auth] Google access token login error:', e);
      Alert.alert('Gagal', e.message || 'Login Google gagal.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ===== COMPLETE PROFILE (Google users) =====
  const handleCompleteProfile = async () => {
    if (!cpName.trim()) return Alert.alert('Lengkapi Data', 'Nama lengkap wajib diisi!');
    if (!cpPhone.trim() || cpPhone.replace(/[^0-9]/g, '').length < 10) {
      return Alert.alert('Lengkapi Data', 'Masukkan nomor ponsel yang valid!');
    }
    if (!cpEwallet) return Alert.alert('Pilih E-Wallet', 'Pilih metode e-wallet untuk penarikan!');
    if (!cpEwalletOwner.trim()) return Alert.alert('Lengkapi Data', 'Nama pemilik e-wallet wajib diisi!');
    if (!cpEwalletNumber.trim()) return Alert.alert('Lengkapi Data', 'Nomor e-wallet wajib diisi!');

    const user = auth.currentUser;
    if (!user) return Alert.alert('Error', 'Sesi tidak valid. Coba login ulang.');

    setCpLoading(true);
    try {
      await completeGoogleProfile(user.uid, {
        name: cpName.trim(),
        phone: cpPhone.trim(),
        ewalletId: cpEwallet.id,
        ewalletName: cpEwallet.name,
        ewalletOwner: cpEwalletOwner.trim(),
        ewalletNumber: cpEwalletNumber.trim(),
      });
      Alert.alert('Berhasil! 🎉', 'Profil kamu sudah lengkap.');
      setShowCompleteProfile(false);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Gagal', e.message || 'Gagal menyimpan profil.');
    } finally {
      setCpLoading(false);
    }
  };

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
      const cleanPhone = loginPhone.trim().replace(/[^0-9]/g, '');
      const email = phoneToEmail(loginPhone);

      try {
        await loginUser(email, loginPass);
      } catch (loginErr: any) {
        // Jika akun admin belum ada, otomatis daftarkan
        const isAdminAttempt = cleanPhone === ADMIN_PHONE.replace(/[^0-9]/g, '');
        if (isAdminAttempt && (loginErr.code === 'auth/user-not-found' || loginErr.code === 'auth/invalid-credential')) {
          const cred = await createUserWithEmailAndPassword(auth, email, loginPass);
          await setDoc(doc(db, USERS_PATH, cred.user.uid), {
            email,
            name: 'Admin CUANTERUS',
            phone: cleanPhone,
            balance: 0,
            totalEarned: 0,
            referralCode: 'ADMIN',
            referredBy: '',
            loginMethod: 'phone',
            profileComplete: true,
            blocked: false,
            createdAt: serverTimestamp(),
          });
        } else {
          throw loginErr;
        }
      }

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
    if (user?.email && isAdminEmail(user.email)) {
      router.replace('/admin');
    } else {
      router.replace('/(tabs)');
    }
  };

  // ===== E-WALLET PICKER MODAL (reusable) =====
  const renderEwalletPicker = (
    visible: boolean,
    onClose: () => void,
    selected: typeof EWALLET_OPTIONS[0] | null,
    onSelect: (item: typeof EWALLET_OPTIONS[0]) => void,
  ) => (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pilih E-Wallet / Bank</Text>
            <TouchableOpacity onPress={onClose}>
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
                  selected?.id === item.id && styles.ewalletItemActive,
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={styles.ewalletItemIcon}>{item.icon}</Text>
                <Text style={[
                  styles.ewalletItemName,
                  selected?.id === item.id && { color: colors.cyan },
                ]}>
                  {item.name}
                </Text>
                {selected?.id === item.id && (
                  <Text style={styles.ewalletCheck}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  // ===== COMPLETE PROFILE SCREEN (for Google users) =====
  if (showCompleteProfile) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.icon}>📝</Text>
          <Text style={styles.title}>Lengkapi Profil</Text>
          <Text style={styles.subtitle}>
            Isi data berikut untuk mulai menggunakan CUANTERUS
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Nama Lengkap</Text>
            <TextInput
              style={styles.input}
              placeholder="Masukkan nama lengkap"
              placeholderTextColor={colors.textMuted}
              value={cpName}
              onChangeText={setCpName}
            />

            <Text style={styles.label}>Nomor Ponsel</Text>
            <TextInput
              style={styles.input}
              placeholder="08xxxxxxxxxx"
              placeholderTextColor={colors.textMuted}
              value={cpPhone}
              onChangeText={setCpPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Data E-Wallet</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.label}>E-Wallet / Bank</Text>
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => setShowCpEwalletPicker(true)}
            >
              {cpEwallet ? (
                <View style={styles.pickerSelected}>
                  <Text style={styles.pickerIcon}>{cpEwallet.icon}</Text>
                  <Text style={styles.pickerName}>{cpEwallet.name}</Text>
                </View>
              ) : (
                <Text style={styles.pickerPlaceholder}>Pilih e-wallet atau bank...</Text>
              )}
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Nama Pemilik</Text>
            <TextInput
              style={styles.input}
              placeholder="Nama sesuai akun e-wallet / rekening"
              placeholderTextColor={colors.textMuted}
              value={cpEwalletOwner}
              onChangeText={setCpEwalletOwner}
            />

            <Text style={styles.label}>
              Nomor {cpEwallet?.name || 'E-Wallet'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={cpEwallet?.id?.startsWith('b') || ['cimb', 'mandiri', 'permata', 'octo', 'jenius', 'blu', 'jago', 'seabank', 'neo'].includes(cpEwallet?.id || '')
                ? 'Nomor rekening'
                : 'Nomor HP terdaftar'}
              placeholderTextColor={colors.textMuted}
              value={cpEwalletNumber}
              onChangeText={setCpEwalletNumber}
              keyboardType="phone-pad"
            />

            <PrimaryButton
              title="✅  SIMPAN & LANJUTKAN"
              onPress={handleCompleteProfile}
              loading={cpLoading}
              style={{ marginTop: 16 }}
            />
          </View>
        </ScrollView>
        {renderEwalletPicker(showCpEwalletPicker, () => setShowCpEwalletPicker(false), cpEwallet, setCpEwallet)}
      </KeyboardAvoidingView>
    );
  }

  // ===== MAIN AUTH SCREEN =====
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

            {/* Divider OR */}
            <View style={[styles.divider, { marginVertical: 16 }]}>  
              <View style={styles.dividerLine} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>ATAU</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign In */}
            <TouchableOpacity
              style={[styles.googleBtn, !_request && { opacity: 0.5 }]}
              onPress={() => {
                if (!_request) {
                  Alert.alert('Tidak Tersedia', 'Google Sign-In belum siap. Coba lagi dalam beberapa detik.');
                  return;
                }
                setGoogleLoading(true);
                promptAsync({ showInRecents: true }).catch((e) => {
                  console.error('[Auth] promptAsync error:', e);
                  setGoogleLoading(false);
                  Alert.alert('Gagal', 'Tidak bisa membuka Google Sign-In.');
                });
              }}
              disabled={googleLoading}
              activeOpacity={0.7}
            >
              {googleLoading ? (
                <ActivityIndicator color="#333" size="small" />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleText}>Daftar dengan Google</Text>
                </>
              )}
            </TouchableOpacity>

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

            {/* Divider OR */}
            <View style={[styles.divider, { marginVertical: 16 }]}>
              <View style={styles.dividerLine} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>ATAU</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign In */}
            <TouchableOpacity
              style={[styles.googleBtn, !_request && { opacity: 0.5 }]}
              onPress={() => {
                if (!_request) {
                  Alert.alert('Tidak Tersedia', 'Google Sign-In belum siap. Coba lagi dalam beberapa detik.');
                  return;
                }
                setGoogleLoading(true);
                promptAsync({ showInRecents: true }).catch((e) => {
                  console.error('[Auth] promptAsync error:', e);
                  setGoogleLoading(false);
                  Alert.alert('Gagal', 'Tidak bisa membuka Google Sign-In.');
                });
              }}
              disabled={googleLoading}
              activeOpacity={0.7}
            >
              {googleLoading ? (
                <ActivityIndicator color="#333" size="small" />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleText}>Masuk dengan Google</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsRegister(true)} style={styles.switchBtn}>
              <Text style={styles.switchText}>
                Belum punya akun? <Text style={styles.switchHighlight}>Daftar</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {renderEwalletPicker(showEwalletPicker, () => setShowEwalletPicker(false), selectedEwallet, setSelectedEwallet)}
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

  // Google Button
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '800',
    color: '#4285F4',
  },
  googleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333333',
  },

  // Switch
  switchBtn: { alignItems: 'center', marginTop: 16, padding: 8 },
  switchText: { fontSize: 14, color: colors.textSecondary },
  switchHighlight: { color: colors.cyan, fontWeight: '700' },
});
