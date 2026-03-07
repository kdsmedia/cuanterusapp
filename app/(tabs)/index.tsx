import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/lib/auth-context';
import {
  dailyCheckin, claimAdReward, getAdCountToday,
  getUserLevel, getStreakReward, STREAK_BONUSES,
  WATCH_AD_REWARD, MAX_DAILY_ADS,
} from '@/lib/api';
import { showRewarded, isRewardedReady } from '@/lib/admob';
import { sendLocalNotification } from '@/lib/permissions';
import GlassCard from '@/components/GlassCard';
import Toast from '@/components/Toast';
import { colors } from '@/lib/theme';

export default function HomeScreen() {
  const { firebaseUser, userData, broadcasts } = useAuth();
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as any });
  const [watchingAd, setWatchingAd] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);

  const balance = userData?.balance ?? 0;
  const totalEarned = userData?.totalEarned ?? 0;
  const refCode = userData?.myReferralCode || '------';
  const displayName = userData?.name || 'Member';
  const streak = userData?.streak || 0;
  const referralCount = userData?.referralCount || 0;

  const todayStr = new Date().toDateString();
  const alreadyCheckedIn = userData?.lastCheckin === todayStr;
  const adsToday = getAdCountToday(userData);
  const adsMaxed = adsToday >= MAX_DAILY_ADS;

  const level = getUserLevel(totalEarned);
  const nextStreakReward = getStreakReward(streak + 1);

  // ===== HANDLERS =====

  const handleCheckin = async () => {
    if (!firebaseUser || alreadyCheckedIn) return;

    if (!isRewardedReady()) {
      setToast({ visible: true, message: 'Iklan belum siap, tunggu sebentar...', type: 'warning' });
      return;
    }

    setCheckinLoading(true);
    try {
      const watched = await showRewarded();
      if (!watched) {
        setToast({ visible: true, message: 'Tonton iklan untuk klaim reward!', type: 'warning' });
        setCheckinLoading(false);
        return;
      }
      const res = await dailyCheckin(firebaseUser.uid);
      setToast({ visible: true, message: res.message, type: 'success' });
      sendLocalNotification('🎁 Check-in Berhasil!', res.message, 'reward');
    } catch (e: any) {
      setToast({ visible: true, message: e.message, type: 'warning' });
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleWatchAd = async () => {
    if (!firebaseUser || adsMaxed) return;

    if (!isRewardedReady()) {
      setToast({ visible: true, message: 'Iklan belum siap...', type: 'warning' });
      return;
    }

    setWatchingAd(true);
    try {
      const rewarded = await showRewarded();
      if (rewarded) {
        const result = await claimAdReward(firebaseUser.uid);
        setToast({ visible: true, message: result.message, type: 'success' });
        sendLocalNotification('🎬 Video Reward!', result.message, 'reward');
      } else {
        setToast({ visible: true, message: 'Tonton sampai selesai!', type: 'warning' });
      }
    } catch (e: any) {
      setToast({ visible: true, message: e.message, type: 'error' });
    } finally {
      setWatchingAd(false);
    }
  };

  const handleCopyRef = async () => {
    if (!refCode || refCode === '------') return;
    await Clipboard.setStringAsync(refCode);
    setToast({ visible: true, message: '📋 Kode referral disalin!', type: 'success' });
  };

  const handleShareWA = () => {
    const text = `🎁 Gabung CUANTERUS & dapatkan uang gratis!\n\n✅ Check-in harian Rp 100+\n✅ Nonton video Rp 50\n✅ Lucky Spin berhadiah!\n\nPakai kode referral: *${refCode}*\n\nDownload sekarang!`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(text)}`);
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
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSub}>Halo,</Text>
            <Text style={styles.headerName}>{displayName}</Text>
            <Text style={styles.levelBadge}>
              {level.current.emoji} {level.current.name}
            </Text>
          </View>
          <View style={styles.avatar}>
            <Text style={{ fontSize: 24 }}>👤</Text>
          </View>
        </View>

        {/* Broadcast Banner */}
        {broadcasts.length > 0 && (
          <GlassCard style={styles.broadcastCard}>
            <Text style={styles.broadcastTitle}>📢 {broadcasts[0].title}</Text>
            <Text style={styles.broadcastMsg}>{broadcasts[0].message}</Text>
          </GlassCard>
        )}

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>SALDO ANDA</Text>
          <Text style={styles.balanceAmount}>
            Rp {balance.toLocaleString('id-ID')}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🔥 Streak {streak} hari</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>💎 Total Rp {totalEarned.toLocaleString('id-ID')}</Text>
            </View>
          </View>
          {/* Level Progress */}
          {level.next && (
            <View style={styles.levelProgress}>
              <View style={styles.levelBar}>
                <View style={[styles.levelFill, { width: `${Math.min((totalEarned / level.next.minBalance) * 100, 100)}%` }]} />
              </View>
              <Text style={styles.levelNext}>
                {level.next.emoji} {level.next.name} — Rp {level.next.minBalance.toLocaleString('id-ID')}
              </Text>
            </View>
          )}
        </View>

        {/* Referral Card */}
        <GlassCard yellowBorder style={styles.refCard}>
          <View style={styles.refRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.refLabel}>👥 AJAK TEMAN & CUAN Rp 500</Text>
              <Text style={styles.refCode}>{refCode}</Text>
              <Text style={styles.refCount}>{referralCount} orang sudah bergabung</Text>
            </View>
            <View style={{ gap: 8 }}>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyRef} activeOpacity={0.7}>
                <Text style={styles.copyText}>📋 SALIN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.copyBtn, { backgroundColor: 'rgba(37,211,102,0.2)', borderColor: 'rgba(37,211,102,0.5)' }]} onPress={handleShareWA} activeOpacity={0.7}>
                <Text style={[styles.copyText, { color: '#25D366' }]}>📤 WA</Text>
              </TouchableOpacity>
            </View>
          </View>
        </GlassCard>

        {/* Tasks */}
        <Text style={styles.sectionTitle}>📋 Tugas Hari Ini</Text>

        {/* Check-in Task */}
        <GlassCard style={styles.taskCard}>
          <View style={styles.taskRow}>
            <View style={styles.taskIcon}>
              <Text style={{ fontSize: 22 }}>📅</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskTitle}>Check-in Harian</Text>
              <Text style={styles.taskDesc}>Tonton iklan & dapatkan Rp {getStreakReward(streak + 1)}</Text>
              {streak > 0 && (
                <Text style={[styles.taskDesc, { color: '#f97316', marginTop: 2 }]}>
                  🔥 Streak {streak} hari — besok Rp {getStreakReward(streak + 2)}!
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.claimBtn, alreadyCheckedIn && styles.claimBtnDone]}
              onPress={handleCheckin}
              disabled={alreadyCheckedIn || checkinLoading}
              activeOpacity={0.7}
            >
              {checkinLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.claimText}>
                  {alreadyCheckedIn ? '✅ SUDAH' : 'AMBIL'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Watch Ad Task */}
        <GlassCard style={styles.taskCard}>
          <View style={styles.taskRow}>
            <View style={[styles.taskIcon, { backgroundColor: 'rgba(139,92,246,0.2)' }]}>
              <Text style={{ fontSize: 22 }}>▶️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskTitle}>Tonton Video</Text>
              <Text style={styles.taskDesc}>Rp {WATCH_AD_REWARD} per video</Text>
              <Text style={[styles.taskDesc, { color: adsMaxed ? colors.red : colors.cyan, marginTop: 2 }]}>
                {adsToday}/{MAX_DAILY_ADS} hari ini
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.claimBtn, { backgroundColor: adsMaxed ? '#334155' : colors.purple }]}
              onPress={handleWatchAd}
              disabled={watchingAd || adsMaxed}
              activeOpacity={0.7}
            >
              {watchingAd ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.claimText}>{adsMaxed ? 'MAKS' : 'TONTON'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Streak Calendar */}
        <GlassCard style={{ marginTop: 12 }}>
          <Text style={styles.streakTitle}>🔥 Bonus Streak Harian</Text>
          <View style={styles.streakRow}>
            {STREAK_BONUSES.map((reward, i) => (
              <View key={i} style={[styles.streakDay, i < streak && styles.streakDayActive]}>
                <Text style={styles.streakDayNum}>H{i + 1}</Text>
                <Text style={[styles.streakDayReward, i < streak && { color: colors.yellow }]}>
                  {reward}
                </Text>
              </View>
            ))}
          </View>
        </GlassCard>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBg },
  scroll: { padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 50,
  },
  headerSub: { fontSize: 12, color: colors.textSecondary },
  headerName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  levelBadge: { fontSize: 12, color: colors.cyan, fontWeight: '600', marginTop: 2 },
  avatar: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: colors.cyan,
    justifyContent: 'center', alignItems: 'center',
  },
  broadcastCard: { marginBottom: 16, borderColor: 'rgba(245,158,11,0.3)' },
  broadcastTitle: { fontSize: 13, fontWeight: '700', color: colors.yellow },
  broadcastMsg: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  balanceCard: {
    backgroundColor: 'rgba(6,182,212,0.15)',
    borderWidth: 1, borderColor: 'rgba(6,182,212,0.2)',
    borderRadius: 24, padding: 24, marginBottom: 16,
  },
  balanceLabel: { fontSize: 11, color: 'rgba(165,243,252,0.8)', fontWeight: '700', letterSpacing: 1 },
  balanceAmount: { fontSize: 34, fontWeight: '900', color: '#fff', marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  badge: {
    backgroundColor: 'rgba(6,182,212,0.2)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  badgeText: { fontSize: 10, color: 'rgba(165,243,252,0.9)', fontWeight: '700' },
  levelProgress: { marginTop: 12 },
  levelBar: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden',
  },
  levelFill: { height: '100%', backgroundColor: colors.cyan, borderRadius: 3 },
  levelNext: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  refCard: { marginBottom: 20 },
  refRow: { flexDirection: 'row', alignItems: 'center' },
  refLabel: { fontSize: 10, color: colors.yellow, fontWeight: '700', letterSpacing: 0.5 },
  refCode: { fontSize: 20, fontWeight: '900', color: colors.textPrimary, letterSpacing: 2, marginTop: 4, fontFamily: 'monospace' },
  refCount: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
  copyBtn: {
    backgroundColor: colors.yellowBg, borderWidth: 1, borderColor: colors.yellowBorder,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
  },
  copyText: { fontSize: 11, color: colors.yellow, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  taskCard: { marginBottom: 10 },
  taskRow: { flexDirection: 'row', alignItems: 'center' },
  taskIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.yellowBg,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  taskTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  taskDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  claimBtn: {
    backgroundColor: colors.cyan, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 12, minWidth: 80, alignItems: 'center',
  },
  claimBtnDone: { backgroundColor: '#334155' },
  claimText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  streakTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  streakRow: { flexDirection: 'row', justifyContent: 'space-between' },
  streakDay: {
    alignItems: 'center', padding: 6, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', flex: 1, marginHorizontal: 2,
  },
  streakDayActive: { backgroundColor: 'rgba(251,191,36,0.15)' },
  streakDayNum: { fontSize: 9, fontWeight: '700', color: colors.textMuted },
  streakDayReward: { fontSize: 11, fontWeight: '800', color: colors.textSecondary, marginTop: 2 },
});
