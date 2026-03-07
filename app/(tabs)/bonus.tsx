import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { claimVoucher } from '@/lib/api';
import { sendLocalNotification } from '@/lib/permissions';
import GlassCard from '@/components/GlassCard';
import PrimaryButton from '@/components/PrimaryButton';
import Toast from '@/components/Toast';
import { colors } from '@/lib/theme';

export default function BonusScreen() {
  const { firebaseUser, userData } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as any });
  const [lastClaimed, setLastClaimed] = useState<string | null>(null);

  const handleClaim = async () => {
    if (!firebaseUser) return;
    const trimmed = code.trim().toUpperCase();

    if (!trimmed) {
      return Alert.alert('Kosong', 'Masukkan kode voucher terlebih dahulu!');
    }
    if (trimmed.length < 6) {
      return Alert.alert('Kode Salah', 'Kode voucher harus 6 karakter.');
    }

    setLoading(true);
    try {
      const msg = await claimVoucher(firebaseUser.uid, trimmed);
      setToast({ visible: true, message: msg, type: 'success' });
      setLastClaimed(trimmed);
      setCode('');
      sendLocalNotification('🎁 Voucher Berhasil!', msg, 'reward');
    } catch (e: any) {
      setToast({ visible: true, message: e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerIcon}>
          <Text style={{ fontSize: 56 }}>🎁</Text>
        </View>
        <Text style={styles.title}>Kode Voucher</Text>
        <Text style={styles.subtitle}>
          Masukkan kode voucher untuk mendapatkan reward gratis!
        </Text>

        {/* Balance */}
        <GlassCard style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo Kamu</Text>
          <Text style={styles.balanceValue}>
            Rp {(userData?.balance ?? 0).toLocaleString('id-ID')}
          </Text>
        </GlassCard>

        {/* Voucher Input */}
        <GlassCard style={styles.inputCard}>
          <Text style={styles.inputLabel}>Masukkan Kode Voucher</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="Contoh: ABC123"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            maxLength={6}
            textAlign="center"
          />

          <PrimaryButton
            title="🎁  KLAIM VOUCHER"
            onPress={handleClaim}
            loading={loading}
            disabled={!code.trim()}
            variant={code.trim() ? 'cyan' : 'disabled'}
            style={{ marginTop: 16 }}
          />
        </GlassCard>

        {/* Success indicator */}
        {lastClaimed && (
          <GlassCard style={styles.successCard}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successText}>
              Voucher <Text style={styles.successCode}>{lastClaimed}</Text> berhasil diklaim!
            </Text>
          </GlassCard>
        )}

        {/* Info */}
        <GlassCard style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Tentang Voucher</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>⏰</Text>
            <Text style={styles.infoText}>Voucher berlaku 24 jam sejak dibuat</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>1️⃣</Text>
            <Text style={styles.infoText}>Setiap voucher hanya bisa diklaim 1x per akun</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>💳</Text>
            <Text style={styles.infoText}>Beberapa voucher membutuhkan deposit terlebih dahulu</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoBullet}>💰</Text>
            <Text style={styles.infoText}>Reward langsung masuk ke saldo kamu</Text>
          </View>
        </GlassCard>

        {/* Tips */}
        <GlassCard style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Dapatkan Kode Voucher</Text>
          <Text style={styles.tipsText}>• Follow social media CUANTERUS</Text>
          <Text style={styles.tipsText}>• Ikuti event & giveaway</Text>
          <Text style={styles.tipsText}>• Undang banyak teman</Text>
          <Text style={styles.tipsText}>• Cek notifikasi & broadcast</Text>
        </GlassCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBg },
  scroll: { padding: 20, paddingTop: 56 },
  headerIcon: { alignItems: 'center', marginBottom: 8 },
  title: {
    fontSize: 26, fontWeight: '800', color: colors.textPrimary, textAlign: 'center',
  },
  subtitle: {
    fontSize: 13, color: colors.textSecondary, textAlign: 'center',
    marginTop: 4, marginBottom: 20, paddingHorizontal: 20,
  },
  balanceCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  balanceLabel: { fontSize: 13, color: colors.textSecondary },
  balanceValue: { fontSize: 18, fontWeight: '800', color: colors.yellow },
  inputCard: { marginBottom: 16, padding: 24 },
  inputLabel: {
    fontSize: 14, fontWeight: '700', color: colors.textPrimary,
    marginBottom: 12, textAlign: 'center',
  },
  input: {
    backgroundColor: colors.darkBg,
    borderWidth: 2,
    borderColor: colors.cyan,
    borderRadius: 16,
    padding: 18,
    fontSize: 24,
    fontWeight: '900',
    color: colors.yellow,
    fontFamily: 'monospace',
    letterSpacing: 8,
    textAlign: 'center',
  },
  successCard: {
    marginBottom: 16, alignItems: 'center', padding: 20,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  successIcon: { fontSize: 36, marginBottom: 8 },
  successText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  successCode: { fontWeight: '900', color: colors.cyan, fontFamily: 'monospace' },
  infoCard: { marginBottom: 16 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoBullet: { fontSize: 14, marginRight: 10, width: 24 },
  infoText: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  tipsCard: { marginBottom: 16 },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: colors.yellow, marginBottom: 8 },
  tipsText: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
});
