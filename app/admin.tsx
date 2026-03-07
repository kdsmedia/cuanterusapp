import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, USERS_PATH, ADMIN_EMAIL, ADMIN_PHONE } from '@/lib/firebase';
import {
  logoutUser,
  adminUpdateBalance,
  adminBlockUser,
  adminApproveWithdrawal,
  adminRejectWithdrawal,
  adminBroadcast,
  adminConfirmDeposit,
  adminRejectDeposit,
  adminCreateVoucher,
  adminGetVouchers,
  adminDeactivateVoucher,
  adminAddYoutubeUrl,
  adminRemoveYoutubeUrl,
  adminGetYoutubeUrls,
  Voucher,
  YouTubeUrl,
} from '@/lib/api';
import { UserData } from '@/lib/auth-context';
import GlassCard from '@/components/GlassCard';
import PrimaryButton from '@/components/PrimaryButton';
import { colors } from '@/lib/theme';

type Tab = 'users' | 'vouchers' | 'youtube' | 'deposits' | 'withdrawals' | 'broadcast';

interface Deposit {
  id: string;
  uid: string;
  name: string;
  email: string;
  amount: number;
  trxId: string;
  status: string;
  method: string;
  date: string;
}

interface Withdrawal {
  id: string;
  uid: string;
  name: string;
  email: string;
  amount: number;
  method: string;
  accountNumber: string;
  status: string;
  date: string;
}

export default function AdminScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);

  // Voucher state
  const [vouchers, setVouchers] = useState<(Voucher & { id: string })[]>([]);
  const [vcAmount, setVcAmount] = useState('');
  const [vcType, setVcType] = useState<'no_deposit' | 'require_deposit'>('no_deposit');
  const [vcLoading, setVcLoading] = useState(false);
  const [vcCreated, setVcCreated] = useState<string | null>(null);

  // YouTube state
  const [youtubeUrls, setYoutubeUrls] = useState<(YouTubeUrl & { id: string })[]>([]);
  const [ytUrl, setYtUrl] = useState('');
  const [ytTitle, setYtTitle] = useState('');
  const [ytLoading, setYtLoading] = useState(false);

  // Broadcast state
  const [bcTitle, setBcTitle] = useState('');
  const [bcMessage, setBcMessage] = useState('');
  const [bcLoading, setBcLoading] = useState(false);

  // Edit balance modal
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editReason, setEditReason] = useState('');

  // Listen users
  useEffect(() => {
    const unsub = onSnapshot(collection(db, USERS_PATH), (snap) => {
      const list: UserData[] = [];
      snap.forEach((doc) => {
        const data = doc.data() as UserData;
        const adminVirtualEmail = `${ADMIN_PHONE}@cuanterus.app`.toLowerCase();
        if (data.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && data.email?.toLowerCase() !== adminVirtualEmail) {
          list.push(data);
        }
      });
      setUsers(list);
    });
    return unsub;
  }, []);

  // Load vouchers/youtube when tab changes
  useEffect(() => {
    if (tab === 'vouchers') {
      adminGetVouchers().then(setVouchers).catch(console.error);
    }
    if (tab === 'youtube') {
      adminGetYoutubeUrls().then(setYoutubeUrls).catch(console.error);
    }
  }, [tab]);

  const handleCreateVoucher = async () => {
    const amount = parseInt(vcAmount);
    if (!amount || amount < 100) return Alert.alert('Error', 'Nominal minimal Rp 100');

    setVcLoading(true);
    try {
      const code = await adminCreateVoucher(amount, vcType);
      setVcCreated(code);
      setVcAmount('');
      Alert.alert('✅ Voucher Dibuat!', `Kode: ${code}\nNominal: Rp ${amount.toLocaleString('id-ID')}\nTipe: ${vcType === 'require_deposit' ? 'Wajib Deposit' : 'Tanpa Deposit'}\nBerlaku: 24 jam`);
      // Refresh list
      const updated = await adminGetVouchers();
      setVouchers(updated);
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    } finally {
      setVcLoading(false);
    }
  };

  const handleDeactivateVoucher = (v: Voucher & { id: string }) => {
    Alert.alert('Nonaktifkan', `Nonaktifkan voucher ${v.code}?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Nonaktifkan', style: 'destructive',
        onPress: async () => {
          await adminDeactivateVoucher(v.id);
          const updated = await adminGetVouchers();
          setVouchers(updated);
        },
      },
    ]);
  };

  // Listen deposits
  useEffect(() => {
    const q = query(
      collection(db, 'artifacts/altomedia-8f793/public/data/deposits'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: Deposit[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as Deposit));
      setDeposits(list);
    });
    return unsub;
  }, []);

  // Listen withdrawals
  useEffect(() => {
    const q = query(
      collection(db, 'artifacts/altomedia-8f793/public/data/withdrawals'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: Withdrawal[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as Withdrawal));
      setWithdrawals(list);
    });
    return unsub;
  }, []);

  const totalBalance = users.reduce((s, u) => s + (u.balance || 0), 0);
  const pendingWDs = withdrawals.filter(w => w.status === 'pending');
  const pendingDeposits = deposits.filter(d => d.status === 'pending');

  const handleConfirmDeposit = (dep: Deposit) => {
    Alert.alert('Konfirmasi Deposit', `Konfirmasi Rp ${dep.amount.toLocaleString('id-ID')} dari ${dep.name}?\n\nTRX: ${dep.trxId}`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Konfirmasi', onPress: () => adminConfirmDeposit(dep.id, dep.uid, dep.amount) },
    ]);
  };

  const handleRejectDep = (dep: Deposit) => {
    Alert.alert('Tolak Deposit', `Tolak deposit Rp ${dep.amount.toLocaleString('id-ID')} dari ${dep.name}?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Tolak', style: 'destructive', onPress: () => adminRejectDeposit(dep.id) },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Keluar dari Admin?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: async () => { await logoutUser(); router.replace('/auth'); } },
    ]);
  };

  const handleBlock = (user: UserData) => {
    const action = user.blocked ? 'Unblock' : 'Block';
    Alert.alert(`${action} User`, `${action} ${user.name}?`, [
      { text: 'Batal', style: 'cancel' },
      { text: action, style: 'destructive', onPress: () => adminBlockUser(user.uid, !user.blocked) },
    ]);
  };

  const handleEditBalance = async () => {
    if (!editUser || !editAmount) return;
    const amount = parseInt(editAmount);
    if (isNaN(amount)) return Alert.alert('Error', 'Masukkan angka yang valid');
    await adminUpdateBalance(editUser.uid, amount, editReason || 'Penyesuaian admin');
    Alert.alert('Berhasil', `Saldo ${editUser.name} ${amount > 0 ? '+' : ''}${amount}`);
    setEditUser(null);
    setEditAmount('');
    setEditReason('');
  };

  const handleApproveWD = (wd: Withdrawal) => {
    Alert.alert('Approve', `Setujui Rp ${wd.amount.toLocaleString('id-ID')} ke ${wd.method} (${wd.accountNumber})?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Setujui', onPress: () => adminApproveWithdrawal(wd.id) },
    ]);
  };

  const handleRejectWD = (wd: Withdrawal) => {
    Alert.alert('Reject', `Tolak & kembalikan Rp ${wd.amount.toLocaleString('id-ID')} ke ${wd.name}?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Tolak', style: 'destructive', onPress: () => adminRejectWithdrawal(wd.id, wd.uid, wd.amount) },
    ]);
  };

  // ===== YouTube Handlers =====
  const handleAddYoutube = async () => {
    if (!ytUrl.trim()) return Alert.alert('Error', 'Masukkan URL YouTube!');
    if (!ytUrl.includes('youtu')) return Alert.alert('Error', 'URL harus YouTube yang valid!');

    setYtLoading(true);
    try {
      const title = ytTitle.trim() || `Video ${youtubeUrls.length + 1}`;
      await adminAddYoutubeUrl(ytUrl.trim(), title);
      setYtUrl('');
      setYtTitle('');
      const updated = await adminGetYoutubeUrls();
      setYoutubeUrls(updated);
      Alert.alert('✅ Berhasil', `Video "${title}" ditambahkan!`);
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    } finally {
      setYtLoading(false);
    }
  };

  const handleRemoveYoutube = (yt: YouTubeUrl & { id: string }) => {
    Alert.alert('Hapus Video', `Hapus "${yt.title}" dari daftar tugas?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          await adminRemoveYoutubeUrl(yt.id);
          const updated = await adminGetYoutubeUrls();
          setYoutubeUrls(updated);
        },
      },
    ]);
  };

  const handleBroadcast = async () => {
    if (!bcTitle.trim() || !bcMessage.trim()) return Alert.alert('Error', 'Isi judul dan pesan!');
    setBcLoading(true);
    await adminBroadcast(bcTitle.trim(), bcMessage.trim());
    Alert.alert('Berhasil', 'Broadcast terkirim ke semua user!');
    setBcTitle('');
    setBcMessage('');
    setBcLoading(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛡️ Admin</Text>
        <PrimaryButton title="LOGOUT" onPress={handleLogout} variant="red" style={{ width: 90, height: 36 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <GlassCard style={styles.stat}>
          <Text style={styles.statNum}>{users.length}</Text>
          <Text style={styles.statLabel}>Users</Text>
        </GlassCard>
        <GlassCard style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.yellow }]}>Rp {totalBalance.toLocaleString('id-ID')}</Text>
          <Text style={styles.statLabel}>Total Saldo</Text>
        </GlassCard>
        <GlassCard style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.green }]}>{pendingDeposits.length}</Text>
          <Text style={styles.statLabel}>Pending Dep</Text>
        </GlassCard>
        <GlassCard style={styles.stat}>
          <Text style={[styles.statNum, { color: colors.red }]}>{pendingWDs.length}</Text>
          <Text style={styles.statLabel}>Pending WD</Text>
        </GlassCard>
      </View>

      {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={styles.tabs}>
            {(['users', 'vouchers', 'youtube', 'deposits', 'withdrawals', 'broadcast'] as Tab[]).map(t => (
              <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                <Text style={[styles.tabText, tab === t && { color: colors.cyan }]}>
                  {t === 'users' ? '👥' : t === 'vouchers' ? '🎁' : t === 'youtube' ? '🎬' : t === 'deposits' ? '💳' : t === 'withdrawals' ? '💸' : '📢'}
                  {' '}
                  {t === 'users' ? 'Users' : t === 'vouchers' ? 'Voucher' : t === 'youtube' ? 'YT' : t === 'deposits' ? 'Deposit' : t === 'withdrawals' ? 'WD' : 'BC'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

      {/* Tab Content */}
      {tab === 'users' && (
        <FlatList
          data={users}
          keyExtractor={u => u.uid}
          renderItem={({ item }) => (
            <GlassCard style={styles.userCard}>
              <View style={styles.userTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>
                    {item.blocked ? '🚫 ' : ''}{item.name}
                  </Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                </View>
                <Text style={styles.userBal}>Rp {(item.balance || 0).toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.userActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditUser(item); setEditAmount(''); setEditReason(''); }}>
                  <Text style={styles.actionText}>💰 Edit Saldo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: item.blocked ? colors.green : colors.red }]} onPress={() => handleBlock(item)}>
                  <Text style={[styles.actionText, { color: item.blocked ? colors.green : colors.red }]}>
                    {item.blocked ? '✅ Unblock' : '🚫 Block'}
                  </Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}

      {tab === 'vouchers' && (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Create Voucher */}
          <GlassCard style={{ marginBottom: 16 }}>
            <Text style={styles.bcLabel}>🎁 Buat Voucher Baru</Text>

            <Text style={[styles.bcLabel, { fontSize: 12, marginTop: 8 }]}>Nominal (Rp)</Text>
            <TextInput
              style={styles.bcInput}
              value={vcAmount}
              onChangeText={setVcAmount}
              placeholder="Contoh: 5000"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={[styles.bcLabel, { fontSize: 12, marginTop: 12 }]}>Tipe Klaim</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <TouchableOpacity
                style={[styles.tab, vcType === 'no_deposit' && styles.tabActive, { flex: 1 }]}
                onPress={() => setVcType('no_deposit')}
              >
                <Text style={[styles.tabText, vcType === 'no_deposit' && { color: colors.green }]}>
                  ✅ Tanpa Deposit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, vcType === 'require_deposit' && styles.tabActive, { flex: 1 }]}
                onPress={() => setVcType('require_deposit')}
              >
                <Text style={[styles.tabText, vcType === 'require_deposit' && { color: colors.yellow }]}>
                  💳 Wajib Deposit
                </Text>
              </TouchableOpacity>
            </View>

            <PrimaryButton
              title="🎲  GENERATE VOUCHER"
              onPress={handleCreateVoucher}
              loading={vcLoading}
              style={{ marginTop: 16 }}
            />

            {vcCreated && (
              <View style={{ marginTop: 16, alignItems: 'center', padding: 12, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 12 }}>
                <Text style={{ fontSize: 11, color: colors.green, fontWeight: '700' }}>KODE VOUCHER:</Text>
                <Text style={{ fontSize: 28, fontWeight: '900', color: colors.yellow, fontFamily: 'monospace', letterSpacing: 6, marginTop: 4 }}>{vcCreated}</Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>Berlaku 24 jam • 1x klaim per user</Text>
              </View>
            )}
          </GlassCard>

          {/* Voucher List */}
          <Text style={[styles.bcLabel, { marginBottom: 8 }]}>📋 Daftar Voucher</Text>
          {vouchers.length === 0 ? (
            <Text style={styles.empty}>Belum ada voucher.</Text>
          ) : (
            vouchers.map((v) => {
              const expired = new Date() > new Date(v.expiresAt);
              const isActive = v.active && !expired;
              return (
                <GlassCard key={v.id} style={{ marginBottom: 8, opacity: isActive ? 1 : 0.5 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: isActive ? colors.cyan : colors.textMuted, fontFamily: 'monospace', letterSpacing: 3 }}>{v.code}</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                        Rp {v.amount.toLocaleString('id-ID')} • {v.type === 'require_deposit' ? '💳 Wajib Deposit' : '✅ Tanpa Deposit'}
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                        Diklaim: {v.claimedBy?.length || 0} user • {isActive ? '🟢 Aktif' : expired ? '🔴 Expired' : '⚫ Nonaktif'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.yellow }}>
                        Rp {v.amount.toLocaleString('id-ID')}
                      </Text>
                      {isActive && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { borderColor: colors.red, marginTop: 8, paddingHorizontal: 10 }]}
                          onPress={() => handleDeactivateVoucher(v)}
                        >
                          <Text style={[styles.actionText, { color: colors.red, fontSize: 10 }]}>Nonaktifkan</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </GlassCard>
              );
            })
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {tab === 'deposits' && (
        <FlatList
          data={deposits}
          keyExtractor={d => d.id}
          renderItem={({ item }) => (
            <GlassCard style={styles.wdCard}>
              <View style={styles.wdTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userEmail}>QRIS — {item.trxId}</Text>
                </View>
                <Text style={styles.userBal}>Rp {(item.amount || 0).toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.wdStatus}>
                <Text style={[
                  styles.statusBadge,
                  item.status === 'confirmed' && { color: colors.green },
                  item.status === 'expired' && { color: colors.red },
                  item.status === 'pending' && { color: colors.yellow },
                ]}>
                  {item.status.toUpperCase()}
                </Text>
                {item.status === 'pending' && (
                  <View style={styles.wdActions}>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.green }]} onPress={() => handleConfirmDeposit(item)}>
                      <Text style={[styles.actionText, { color: colors.green }]}>✅ Konfirmasi</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.red }]} onPress={() => handleRejectDep(item)}>
                      <Text style={[styles.actionText, { color: colors.red }]}>❌ Tolak</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </GlassCard>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={<Text style={styles.empty}>Belum ada deposit.</Text>}
        />
      )}

      {tab === 'withdrawals' && (
        <FlatList
          data={withdrawals}
          keyExtractor={w => w.id}
          renderItem={({ item }) => (
            <GlassCard style={styles.wdCard}>
              <View style={styles.wdTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userEmail}>{item.method} — {item.accountNumber}</Text>
                </View>
                <Text style={styles.userBal}>Rp {(item.amount || 0).toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.wdStatus}>
                <Text style={[
                  styles.statusBadge,
                  item.status === 'approved' && { color: colors.green },
                  item.status === 'rejected' && { color: colors.red },
                  item.status === 'pending' && { color: colors.yellow },
                ]}>
                  {item.status.toUpperCase()}
                </Text>
                {item.status === 'pending' && (
                  <View style={styles.wdActions}>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.green }]} onPress={() => handleApproveWD(item)}>
                      <Text style={[styles.actionText, { color: colors.green }]}>✅ Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.red }]} onPress={() => handleRejectWD(item)}>
                      <Text style={[styles.actionText, { color: colors.red }]}>❌ Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </GlassCard>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={<Text style={styles.empty}>Belum ada penarikan.</Text>}
        />
      )}

      {tab === 'youtube' && (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Add YouTube URL */}
          <GlassCard style={{ marginBottom: 16 }}>
            <Text style={styles.bcLabel}>🎬 Tambah Video YouTube</Text>
            <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
              Video akan ditampilkan secara random sebagai tugas untuk pengguna.
              Semakin banyak video, semakin bervariasi tugas yang muncul!
            </Text>

            <Text style={[styles.bcLabel, { fontSize: 12, marginTop: 4 }]}>URL YouTube *</Text>
            <TextInput
              style={styles.bcInput}
              value={ytUrl}
              onChangeText={setYtUrl}
              placeholder="https://youtube.com/watch?v=..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={[styles.bcLabel, { fontSize: 12, marginTop: 12 }]}>Judul Video (opsional)</Text>
            <TextInput
              style={styles.bcInput}
              value={ytTitle}
              onChangeText={setYtTitle}
              placeholder="Deskripsi singkat video"
              placeholderTextColor={colors.textMuted}
            />

            <PrimaryButton
              title="➕  TAMBAH VIDEO"
              onPress={handleAddYoutube}
              loading={ytLoading}
              style={{ marginTop: 16 }}
            />
          </GlassCard>

          {/* YouTube URL List */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.bcLabel}>📋 Daftar Video ({youtubeUrls.filter(y => y.active).length} aktif)</Text>
          </View>

          {youtubeUrls.length === 0 ? (
            <Text style={styles.empty}>Belum ada video YouTube.</Text>
          ) : (
            youtubeUrls.map((yt, idx) => (
              <GlassCard key={yt.id} style={{ marginBottom: 8, opacity: yt.active ? 1 : 0.4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: yt.active ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                    <Text style={{ fontSize: 16 }}>▶️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: yt.active ? colors.textPrimary : colors.textMuted }} numberOfLines={1}>
                      {yt.title}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                      {yt.url}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                    <Text style={{ fontSize: 10, color: yt.active ? colors.green : colors.red, fontWeight: '700' }}>
                      {yt.active ? '🟢 Aktif' : '🔴 Nonaktif'}
                    </Text>
                    {yt.active && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: colors.red, marginTop: 6, paddingHorizontal: 8, paddingVertical: 4 }]}
                        onPress={() => handleRemoveYoutube(yt)}
                      >
                        <Text style={[styles.actionText, { color: colors.red, fontSize: 9 }]}>🗑️ Hapus</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </GlassCard>
            ))
          )}

          {/* Info */}
          <GlassCard style={{ marginTop: 8, marginBottom: 24 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 }}>ℹ️ Cara Kerja</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 18 }}>
              • Video ditampilkan random ke pengguna sebagai tugas harian{'\n'}
              • Setiap tonton = Rp 50 reward{'\n'}
              • Maks 10x tonton/hari{'\n'}
              • Video yang sudah ditonton tidak muncul lagi di hari yang sama{'\n'}
              • Jika semua video sudah ditonton, video akan di-recycle
            </Text>
          </GlassCard>
        </ScrollView>
      )}

      {tab === 'broadcast' && (
        <ScrollView>
          <GlassCard>
            <Text style={styles.bcLabel}>Judul</Text>
            <TextInput style={styles.bcInput} value={bcTitle} onChangeText={setBcTitle} placeholder="Judul pengumuman" placeholderTextColor={colors.textMuted} />
            <Text style={[styles.bcLabel, { marginTop: 12 }]}>Pesan</Text>
            <TextInput style={[styles.bcInput, { height: 100, textAlignVertical: 'top' }]} value={bcMessage} onChangeText={setBcMessage} placeholder="Isi pesan..." placeholderTextColor={colors.textMuted} multiline />
            <PrimaryButton title="📢  KIRIM BROADCAST" onPress={handleBroadcast} loading={bcLoading} style={{ marginTop: 16 }} />
          </GlassCard>
        </ScrollView>
      )}

      {/* Edit Balance Modal */}
      <Modal visible={!!editUser} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalCard}>
            <Text style={styles.modalTitle}>💰 Edit Saldo</Text>
            <Text style={styles.modalSub}>{editUser?.name} — Rp {(editUser?.balance || 0).toLocaleString('id-ID')}</Text>
            <TextInput style={styles.bcInput} value={editAmount} onChangeText={setEditAmount} placeholder="Jumlah (+/- angka)" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
            <TextInput style={[styles.bcInput, { marginTop: 8 }]} value={editReason} onChangeText={setEditReason} placeholder="Alasan" placeholderTextColor={colors.textMuted} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <PrimaryButton title="Batal" onPress={() => setEditUser(null)} variant="disabled" style={{ flex: 1 }} />
              <PrimaryButton title="Simpan" onPress={handleEditBalance} style={{ flex: 1 }} />
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBg, paddingHorizontal: 16, paddingTop: 52 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.red },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  stat: { flex: 1, alignItems: 'center', padding: 10 },
  statNum: { fontSize: 18, fontWeight: '900', color: colors.textPrimary },
  statLabel: { fontSize: 9, color: colors.textMuted, fontWeight: '700', marginTop: 4 },
  tabs: { flexDirection: 'row', gap: 4, marginBottom: 16 },
  tab: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: colors.glass, alignItems: 'center' },
  tabActive: { borderWidth: 1, borderColor: colors.cyan },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  userCard: { marginBottom: 8 },
  userTop: { flexDirection: 'row', alignItems: 'center' },
  userName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  userEmail: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  userBal: { fontSize: 14, fontWeight: '700', color: colors.yellow },
  userActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    flex: 1, padding: 8, borderRadius: 10,
    borderWidth: 1, borderColor: colors.cyan, alignItems: 'center',
  },
  actionText: { fontSize: 11, fontWeight: '700', color: colors.cyan },
  wdCard: { marginBottom: 8 },
  wdTop: { flexDirection: 'row', alignItems: 'center' },
  wdStatus: { marginTop: 8 },
  wdActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statusBadge: { fontSize: 12, fontWeight: '800' },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: 40 },
  bcLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  bcInput: {
    backgroundColor: colors.darkSurface, borderWidth: 1, borderColor: '#334155',
    borderRadius: 12, padding: 14, fontSize: 14, color: colors.textPrimary,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', padding: 24,
  },
  modalCard: { padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  modalSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },
});
