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
import {
  claimVoucher, getUserLevel, MAX_DAILY_SPINS, getSpinCountToday,
  getPiggyBankData, saveToPiggyBank, breakPiggyBank,
  PIGGY_BANK_TARGET, PIGGY_BANK_BONUS,
} from '@/lib/api';
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
  const [piggyAmount, setPiggyAmount] = useState('');
  const [piggyLoading, setPiggyLoading] = useState(false);

  const level = getUserLevel(userData?.totalEarned || 0);
  const piggy = getPiggyBankData(userData);
  const spinsToday = getSpinCountToday(userData);
  const spinsLeft = MAX_DAILY_SPINS - spinsToday;

  // ===== PIGGY BANK =====
  const handlePiggySave = async () => {
    if (!firebaseUser) return;
    const amount = parseInt(piggyAmount);
    if (!amount || isNaN(amount)) return Alert.alert('Error', 'Masukkan jumlah yang valid!');

    setPiggyLoading(true);
    try {
      const msg = await saveToPiggyBank(firebaseUser.uid, amount);
      setToast({ visible: true, message: msg, type: 'success' });
      setPiggyAmount('');
    } catch (e: any) {
      setToast({ visible: true, message: e.message, type: 'error' });
    } finally {
      setPiggyLoading(false);
    }
  };

  const handlePiggyBreak = async () => {
    if (!firebaseUser) return;
    Alert.alert('🐷 Pecahkan Celengan?', `Kamu akan dapat:\n\nTabungan: Rp ${piggy.saved.toLocaleString('id-ID')}\nBonus: Rp ${PIGGY_BANK_BONUS.toLocaleString('id-ID')}\n\nTotal: Rp ${(piggy.saved + PIGGY_BANK_BONUS).toLocaleString('id-ID')}`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: '💥 PECAHKAN!',
        onPress: async () => {
          setPiggyLoading(true);
          try {
            const msg = await breakPiggyBank(firebaseUser.uid);
            setToast({ visible: true, message: msg, type: 'success' });
          } catch (e: any) {
            setToast({ visible: true, message: e.message, type: 'error' });
          } finally {
            setPiggyLoading(false);
          }
        },
      },
    ]);
  };

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

        {/* Piggy Bank */}
        <GlassCard style={{ marginBottom: 16, borderColor: 'rgba(251,191,36,0.2)' }}>
          <View style={styles.piggyHeader}>
            <Text style={{ fontSize: 40 }}>🐷</Text>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.piggyTitle}>Celengan</Text>
              <Text style={styles.piggySaved}>
                Rp {piggy.saved.toLocaleString('id-ID')}
              </Text>
            </View>
            {piggy.canBreak && (
              <TouchableOpacity
                style={styles.piggyBreakBtn}
                onPress={handlePiggyBreak}
                disabled={piggyLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.piggyBreakText}>💥 PECAH!</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Progress bar */}
          <View style={styles.piggyProgress}>
            <View style={[styles.piggyFill, { width: `${piggy.progress}%` }]} />
          </View>
          <View style={styles.piggyProgressLabels}>
            <Text style={styles.piggyProgressText}>
              {Math.round(piggy.progress)}%
            </Text>
            <Text style={styles.piggyProgressText}>
              Target: Rp {PIGGY_BANK_TARGET.toLocaleString('id-ID')}
            </Text>
          </View>

          {/* Save input */}
          {!piggy.canBreak && (
            <View style={styles.piggySaveRow}>
              <TextInput
                style={styles.piggySaveInput}
                value={piggyAmount}
                onChangeText={setPiggyAmount}
                placeholder="Jumlah"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={4}
              />
              <TouchableOpacity
                style={styles.piggySaveBtn}
                onPress={handlePiggySave}
                disabled={piggyLoading || !piggyAmount}
                activeOpacity={0.7}
              >
                <Text style={styles.piggySaveBtnText}>
                  {piggyLoading ? '...' : '💰 TABUNG'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.piggyInfo}>
            {piggy.canBreak
              ? `🎉 Celengan penuh! Pecahkan untuk dapat bonus Rp ${PIGGY_BANK_BONUS.toLocaleString('id-ID')}!`
              : `Tabung saldo ke celengan. Penuh = bonus Rp ${PIGGY_BANK_BONUS.toLocaleString('id-ID')}!`
            }
          </Text>
        </GlassCard>

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

  // Piggy Bank
  piggyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  piggyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  piggySaved: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.yellow,
    marginTop: 2,
  },
  piggyBreakBtn: {
    backgroundColor: 'rgba(251,191,36,0.2)',
    borderWidth: 1,
    borderColor: colors.yellow,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  piggyBreakText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.yellow,
  },
  piggyProgress: {
    height: 12,
    backgroundColor: '#334155',
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 14,
  },
  piggyFill: {
    height: '100%',
    backgroundColor: colors.yellow,
    borderRadius: 6,
  },
  piggyProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  piggyProgressText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  piggySaveRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  piggySaveInput: {
    flex: 1,
    backgroundColor: colors.darkBg,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  piggySaveBtn: {
    backgroundColor: colors.yellow,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  piggySaveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  piggyInfo: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 16,
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
