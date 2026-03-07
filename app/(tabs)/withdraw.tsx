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
import { MIN_WITHDRAW } from '@/lib/firebase';
import { requestWithdrawal } from '@/lib/api';
import GlassCard from '@/components/GlassCard';
import PrimaryButton from '@/components/PrimaryButton';
import Toast from '@/components/Toast';
import { colors } from '@/lib/theme';

export default function WithdrawScreen() {
  const { firebaseUser, userData } = useAuth();
  const balance = userData?.balance ?? 0;
  const pct = Math.min((balance / MIN_WITHDRAW) * 100, 100);
  const canWithdraw = balance >= MIN_WITHDRAW;

  const [method, setMethod] = useState<'DANA' | 'OVO' | 'GoPay'>('DANA');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as any });

  const handleWithdraw = async () => {
    if (!firebaseUser || !canWithdraw) return;

    if (!accountNumber.trim()) {
      return Alert.alert('Lengkapi Data', 'Masukkan nomor akun / HP tujuan!');
    }

    Alert.alert(
      'Konfirmasi Penarikan',
      `Tarik Rp ${balance.toLocaleString('id-ID')} ke ${method} (${accountNumber})?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Tarik',
          onPress: async () => {
            setLoading(true);
            try {
              await requestWithdrawal(firebaseUser.uid, balance, method, accountNumber.trim());
              setToast({ visible: true, message: 'Penarikan diajukan! Tunggu persetujuan admin.', type: 'success' });
              setAccountNumber('');
            } catch (e: any) {
              setToast({ visible: true, message: e.message, type: 'error' });
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />

      <Text style={styles.title}>💰 Penarikan Saldo</Text>

      {/* Balance */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo Tersedia</Text>
        <Text style={styles.balanceAmount}>
          Rp {balance.toLocaleString('id-ID')}
        </Text>
      </View>

      {/* Progress */}
      <GlassCard style={{ marginBottom: 20 }}>
        <Text style={styles.progressLabel}>Progres Penarikan</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Rp {balance.toLocaleString('id-ID')} / Rp {MIN_WITHDRAW.toLocaleString('id-ID')}
        </Text>
      </GlassCard>

      {canWithdraw ? (
        <>
          {/* Method Selection */}
          <Text style={styles.formLabel}>Metode Penarikan</Text>
          <View style={styles.methodRow}>
            {(['DANA', 'OVO', 'GoPay'] as const).map((m) => (
              <GlassCard
                key={m}
                style={[
                  styles.methodCard,
                  method === m && styles.methodActive,
                ]}
              >
                <Text
                  style={[styles.methodText, method === m && { color: colors.cyan }]}
                  onPress={() => setMethod(m)}
                >
                  {m}
                </Text>
              </GlassCard>
            ))}
          </View>

          {/* Account Number */}
          <Text style={styles.formLabel}>Nomor {method}</Text>
          <TextInput
            style={styles.input}
            placeholder={`Masukkan nomor ${method}`}
            placeholderTextColor={colors.textMuted}
            value={accountNumber}
            onChangeText={setAccountNumber}
            keyboardType="phone-pad"
          />

          <PrimaryButton
            title="📤  TARIK SALDO"
            onPress={handleWithdraw}
            loading={loading}
            style={{ marginTop: 16 }}
          />
        </>
      ) : (
        <PrimaryButton
          title="🔒  BELUM MENCAPAI MINIMAL WD"
          onPress={() => {}}
          variant="disabled"
          disabled
        />
      )}

      {/* Info */}
      <GlassCard style={{ marginTop: 20 }}>
        <Text style={styles.infoTitle}>ℹ️ Informasi Penarikan</Text>
        <Text style={styles.infoText}>• Minimal penarikan: Rp 50.000</Text>
        <Text style={styles.infoText}>• Metode: DANA, OVO, GoPay</Text>
        <Text style={styles.infoText}>• Proses: 1-3 hari kerja</Text>
        <Text style={styles.infoText}>• Penarikan harus disetujui admin</Text>
      </GlassCard>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
    backgroundColor: colors.darkBg,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 24 },
  balanceCard: {
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.2)',
    borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 20,
  },
  balanceLabel: { fontSize: 14, color: 'rgba(253,224,71,0.8)' },
  balanceAmount: { fontSize: 36, fontWeight: '900', color: colors.yellow, marginTop: 8 },
  progressLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  progressTrack: { height: 12, backgroundColor: '#334155', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.cyan, borderRadius: 6 },
  progressText: { fontSize: 12, color: colors.textMuted, textAlign: 'right', marginTop: 8 },
  formLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 8, marginTop: 8 },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  methodCard: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  methodActive: { borderColor: colors.cyan },
  methodText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  input: {
    backgroundColor: colors.darkSurface,
    borderWidth: 1, borderColor: '#334155',
    borderRadius: 16, padding: 16, fontSize: 15, color: colors.textPrimary,
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  infoText: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
});
