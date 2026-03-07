import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { logoutUser, getTransactions, getUserLevel } from '@/lib/api';
import GlassCard from '@/components/GlassCard';
import PrimaryButton from '@/components/PrimaryButton';
import { colors } from '@/lib/theme';

export default function ProfileScreen() {
  const { firebaseUser, userData } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const level = getUserLevel(userData?.totalEarned || 0);

  useEffect(() => {
    if (showHistory && firebaseUser) {
      getTransactions(firebaseUser.uid).then(setTransactions).catch(console.error);
    }
  }, [showHistory, firebaseUser]);

  const handleLogout = () => {
    Alert.alert('Keluar Akun', 'Yakin mau keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await logoutUser();
          router.replace('/auth');
        },
      },
    ]);
  };

  const txIcon = (type: string) => {
    switch (type) {
      case 'checkin': return '📅';
      case 'watch_ad': return '▶️';
      case 'spin': return '🎰';
      case 'referral': return '👥';
      case 'withdraw_request': return '💸';
      case 'withdraw_refund': return '↩️';
      case 'admin_adjust': return '🔧';
      default: return '💰';
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Avatar & Level */}
      <View style={styles.avatar}>
        <Text style={{ fontSize: 40 }}>{level.current.emoji}</Text>
      </View>
      <Text style={styles.name}>{userData?.name || '...'}</Text>
      <Text style={styles.levelText}>{level.current.emoji} {level.current.name} (Level {level.current.level})</Text>
      <Text style={styles.email}>{userData?.email || '...'}</Text>
      {userData?.phone ? <Text style={styles.phone}>WA: {userData.phone}</Text> : null}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <GlassCard style={styles.statItem}>
          <Text style={styles.statValue}>Rp {(userData?.balance ?? 0).toLocaleString('id-ID')}</Text>
          <Text style={styles.statLabel}>Saldo</Text>
        </GlassCard>
        <GlassCard style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.yellow }]}>Rp {(userData?.totalEarned ?? 0).toLocaleString('id-ID')}</Text>
          <Text style={styles.statLabel}>Total Earned</Text>
        </GlassCard>
        <GlassCard style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#f97316' }]}>🔥 {userData?.streak || 0}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </GlassCard>
        <GlassCard style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.green }]}>{userData?.referralCount || 0}</Text>
          <Text style={styles.statLabel}>Referral</Text>
        </GlassCard>
      </View>

      {/* Info Card */}
      <GlassCard style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📅  Bergabung</Text>
          <Text style={styles.infoValue}>{userData?.joinedAt || '-'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>🔗  Kode Referral</Text>
          <Text style={[styles.infoValue, { color: colors.cyan, fontFamily: 'monospace' }]}>
            {userData?.myReferralCode || '---'}
          </Text>
        </View>
      </GlassCard>

      {/* Transaction History */}
      <TouchableOpacity
        style={styles.historyToggle}
        onPress={() => setShowHistory(!showHistory)}
        activeOpacity={0.7}
      >
        <Text style={styles.historyToggleText}>
          📜 Riwayat Transaksi {showHistory ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {showHistory && (
        <View style={styles.historyList}>
          {transactions.length === 0 ? (
            <Text style={styles.historyEmpty}>Belum ada transaksi.</Text>
          ) : (
            transactions.map((tx, i) => (
              <View key={i} style={styles.txItem}>
                <Text style={styles.txIcon}>{txIcon(tx.type)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txDesc}>{tx.description}</Text>
                  <Text style={styles.txDate}>
                    {tx.date ? new Date(tx.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </Text>
                </View>
                <Text style={[styles.txAmount, tx.amount < 0 && { color: colors.red }]}>
                  {tx.amount >= 0 ? '+' : ''}Rp {Math.abs(tx.amount).toLocaleString('id-ID')}
                </Text>
              </View>
            ))
          )}
        </View>
      )}

      <PrimaryButton
        title="🚪  KELUAR AKUN"
        onPress={handleLogout}
        variant="red"
        style={{ marginTop: 20 }}
      />

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 56,
    backgroundColor: colors.darkBg,
    alignItems: 'center',
  },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.cyan,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  name: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  levelText: { fontSize: 13, color: colors.cyan, fontWeight: '600', marginTop: 4 },
  email: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  phone: { fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: 16 },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    width: '100%', marginVertical: 16,
  },
  statItem: { width: '48%', flexGrow: 1, alignItems: 'center', padding: 12 },
  statValue: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 4, fontWeight: '600' },
  infoCard: { width: '100%' },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 14,
  },
  infoLabel: { fontSize: 14, color: colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.border },
  historyToggle: {
    width: '100%', padding: 16,
    backgroundColor: colors.glass,
    borderRadius: 16, marginTop: 16,
    alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  historyToggleText: { fontSize: 14, fontWeight: '700', color: colors.cyan },
  historyList: { width: '100%', marginTop: 8 },
  historyEmpty: { textAlign: 'center', color: colors.textMuted, padding: 20 },
  txItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  txIcon: { fontSize: 20, marginRight: 12 },
  txDesc: { fontSize: 13, color: colors.textPrimary },
  txDate: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  txAmount: { fontSize: 13, fontWeight: '700', color: colors.green },
});
