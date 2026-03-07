import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { getUserLevel } from '@/lib/api';
import { MIN_WITHDRAW } from '@/lib/firebase';
import GlassCard from '@/components/GlassCard';
import { colors } from '@/lib/theme';

export default function WalletScreen() {
  const router = useRouter();
  const { userData } = useAuth();
  const balance = userData?.balance ?? 0;
  const totalEarned = userData?.totalEarned ?? 0;
  const canWithdraw = balance >= MIN_WITHDRAW;
  const wdProgress = Math.min((balance / MIN_WITHDRAW) * 100, 100);

  const ewalletName = userData?.ewalletName || '-';
  const ewalletNumber = userData?.ewalletNumber || '-';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>💰 Dompet</Text>
        <Text style={styles.subtitle}>Kelola saldo, deposit & penarikan</Text>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>SALDO ANDA</Text>
          <Text style={styles.balanceAmount}>
            Rp {balance.toLocaleString('id-ID')}
          </Text>
          <Text style={styles.totalEarned}>
            💎 Total Penghasilan: Rp {totalEarned.toLocaleString('id-ID')}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/deposit')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(6,182,212,0.15)' }]}>
              <Text style={{ fontSize: 28 }}>💳</Text>
            </View>
            <Text style={styles.actionTitle}>Deposit</Text>
            <Text style={styles.actionDesc}>Top-up via QRIS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/withdraw')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(251,191,36,0.15)' }]}>
              <Text style={{ fontSize: 28 }}>💸</Text>
            </View>
            <Text style={styles.actionTitle}>Tarik Saldo</Text>
            <Text style={styles.actionDesc}>
              {canWithdraw ? 'Siap tarik!' : `Min Rp ${(MIN_WITHDRAW / 1000)}K`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Withdraw Progress */}
        <GlassCard style={{ marginBottom: 16 }}>
          <Text style={styles.sectionLabel}>📊 Progres Penarikan</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${wdProgress}%` }]} />
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              Rp {balance.toLocaleString('id-ID')}
            </Text>
            <Text style={styles.progressText}>
              Rp {MIN_WITHDRAW.toLocaleString('id-ID')}
            </Text>
          </View>
          {canWithdraw ? (
            <Text style={styles.progressStatus}>✅ Saldo cukup untuk tarik!</Text>
          ) : (
            <Text style={[styles.progressStatus, { color: colors.textMuted }]}>
              Kurang Rp {(MIN_WITHDRAW - balance).toLocaleString('id-ID')} lagi
            </Text>
          )}
        </GlassCard>

        {/* E-Wallet Info */}
        <GlassCard style={{ marginBottom: 16 }}>
          <Text style={styles.sectionLabel}>📱 Tujuan Penarikan</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Metode</Text>
            <Text style={styles.infoValue}>{ewalletName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nomor</Text>
            <Text style={styles.infoValue}>{ewalletNumber}</Text>
          </View>
          <Text style={styles.infoNote}>
            * Diambil dari data saat mendaftar
          </Text>
        </GlassCard>

        {/* Info */}
        <GlassCard>
          <Text style={styles.sectionLabel}>ℹ️ Informasi</Text>
          <Text style={styles.infoText}>• Deposit via QRIS, dikonfirmasi admin (maks 1x24 jam)</Text>
          <Text style={styles.infoText}>• Minimal penarikan: Rp 50.000</Text>
          <Text style={styles.infoText}>• Proses penarikan: 1-3 hari kerja</Text>
          <Text style={styles.infoText}>• E-wallet tujuan sesuai data registrasi</Text>
        </GlassCard>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBg },
  scroll: { padding: 16, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 20 },

  // Balance
  balanceCard: {
    backgroundColor: 'rgba(6,182,212,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.2)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 11,
    color: 'rgba(165,243,252,0.7)',
    fontWeight: '700',
    letterSpacing: 1,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    marginTop: 8,
  },
  totalEarned: {
    fontSize: 12,
    color: 'rgba(165,243,252,0.6)',
    marginTop: 8,
  },

  // Action cards
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  actionDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Progress
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#334155',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.cyan,
    borderRadius: 5,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  progressStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.green,
    marginTop: 8,
    textAlign: 'center',
  },

  // Info
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  infoLabel: { fontSize: 13, color: colors.textMuted },
  infoValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  infoNote: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
});
