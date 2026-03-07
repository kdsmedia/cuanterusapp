import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { claimVoucher, getUserLevel, SPIN_PRIZES, MAX_DAILY_SPINS, getSpinCountToday } from '@/lib/api';
import { sendLocalNotification } from '@/lib/permissions';
import GlassCard from '@/components/GlassCard';
import PrimaryButton from '@/components/PrimaryButton';
import Toast from '@/components/Toast';
import { colors } from '@/lib/theme';

export default function BonusScreen() {
  const router = useRouter();
  const { firebaseUser, userData } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as any });

  const level = getUserLevel(userData?.totalEarned || 0);
  const spinsToday = getSpinCountToday(userData);
  const spinsLeft = MAX_DAILY_SPINS - spinsToday;

  const handleClaim = async () => {
    if (!firebaseUser) return;
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return Alert.alert('Kosong', 'Masukkan kode voucher!');
    if (trimmed.length < 6) return Alert.alert('Kode Salah', 'Kode voucher harus 6 karakter.');

    setLoading(true);
    try {
      const msg = await claimVoucher(firebaseUser.uid, trimmed);
      setToast({ visible: true, message: msg, type: 'success' });
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
        <Text style={styles.title}>🎁 Bonus & Hadiah</Text>
        <Text style={styles.subtitle}>Dapatkan reward dari berbagai aktivitas!</Text>

        {/* Quick Menu */}
        <View style={styles.menuGrid}>
          {/* Spin */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push('/(tabs)/spin')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
              <Text style={{ fontSize: 28 }}>🎰</Text>
            </View>
            <Text style={styles.menuTitle}>Lucky Spin</Text>
            <Text style={styles.menuDesc}>
              {spinsLeft > 0 ? `${spinsLeft} spin tersisa` : 'Coba besok!'}
            </Text>
          </TouchableOpacity>

          {/* Leaderboard */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push('/(tabs)/leaderboard')}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(251,191,36,0.15)' }]}>
              <Text style={{ fontSize: 28 }}>🏆</Text>
            </View>
            <Text style={styles.menuTitle}>Ranking</Text>
            <Text style={styles.menuDesc}>
              {level.current.emoji} {level.current.name}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Level & Spin hidden — accessible via menu cards above */}

        {/* Voucher Section */}
        <GlassCard style={{ marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>🎫 Klaim Voucher</Text>
          <Text style={styles.voucherDesc}>
            Punya kode voucher? Masukkan di sini untuk reward gratis!
          </Text>
          <TextInput
            style={styles.voucherInput}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="Masukkan kode (6 karakter)"
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
            style={{ marginTop: 12 }}
          />
        </GlassCard>

        {/* Tips - hidden for cleaner UI */}

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

  // Menu grid
  menuGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  menuCard: {
    flex: 1,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  menuIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  menuDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Level
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  levelLabel: {
    fontSize: 12,
    color: colors.cyan,
    fontWeight: '600',
    marginTop: 2,
  },
  levelBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  levelFill: {
    height: '100%',
    backgroundColor: colors.cyan,
    borderRadius: 3,
  },
  levelNext: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.cyan,
  },

  // Spin
  spinDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  prizeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  prizeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  prizeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  spinStatus: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },

  // Voucher
  voucherDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  voucherInput: {
    backgroundColor: colors.darkBg,
    borderWidth: 2,
    borderColor: colors.cyan,
    borderRadius: 16,
    padding: 16,
    fontSize: 22,
    fontWeight: '900',
    color: colors.yellow,
    fontFamily: 'monospace',
    letterSpacing: 6,
  },

  // Tips
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 24,
  },
  tipText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
});
