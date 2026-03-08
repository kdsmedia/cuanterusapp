import React, { useEffect, useState, useCallback } from 'react';
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
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, USERS_PATH, ADMIN_EMAIL, ADMIN_PHONE } from '@/lib/firebase';
import {
  logoutUser,
  adminUpdateBalance,
  adminBlockUser,
  adminDeleteUser,
  adminUpdateUserProfile,
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
import { colors } from '@/lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Tab = 'users' | 'deposits' | 'withdrawals' | 'vouchers' | 'youtube' | 'broadcast';

interface Deposit {
  id: string; uid: string; name: string; email: string;
  amount: number; trxId: string; status: string; method: string; date: string;
}

interface Withdrawal {
  id: string; uid: string; name: string; email: string;
  amount: number; method: string; accountNumber: string; status: string; date: string;
}

// ===== REUSABLE COMPONENTS =====

function StatCard({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <View style={[s.statCard, { borderLeftColor: color }]}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function TabButton({ id, label, icon, active, badge, onPress }: {
  id: Tab; label: string; icon: string; active: boolean; badge?: number; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.tabBtn, active && s.tabBtnActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={s.tabIcon}>{icon}</Text>
      <Text style={[s.tabLabel, active && s.tabLabelActive]}>{label}</Text>
      {!!badge && badge > 0 && (
        <View style={s.tabBadge}>
          <Text style={s.tabBadgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {subtitle && <Text style={s.sectionSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={s.emptyState}>
      <Text style={{ fontSize: 40, marginBottom: 8 }}>{icon}</Text>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

function InputField({ label, value, onChangeText, placeholder, keyboardType, multiline, autoCapitalize }: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean; autoCapitalize?: any;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.inputLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && { height: 90, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

// ===== MAIN ADMIN SCREEN =====

export default function AdminScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Voucher
  const [vouchers, setVouchers] = useState<(Voucher & { id: string })[]>([]);
  const [vcAmount, setVcAmount] = useState('');
  const [vcType, setVcType] = useState<'no_deposit' | 'require_deposit'>('no_deposit');
  const [vcLoading, setVcLoading] = useState(false);

  // YouTube
  const [youtubeUrls, setYoutubeUrls] = useState<(YouTubeUrl & { id: string })[]>([]);
  const [ytUrl, setYtUrl] = useState('');
  const [ytTitle, setYtTitle] = useState('');
  const [ytLoading, setYtLoading] = useState(false);

  // Broadcast
  const [bcTitle, setBcTitle] = useState('');
  const [bcMessage, setBcMessage] = useState('');
  const [bcLoading, setBcLoading] = useState(false);

  // Modals
  const [editBalanceUser, setEditBalanceUser] = useState<UserData | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editReason, setEditReason] = useState('');

  const [viewUser, setViewUser] = useState<UserData | null>(null);
  const [editProfileUser, setEditProfileUser] = useState<UserData | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: '', phone: '', ewalletId: '', ewalletName: '', ewalletOwner: '', ewalletNumber: '',
  });

  // ===== DATA LISTENERS =====

  useEffect(() => {
    const unsub = onSnapshot(collection(db, USERS_PATH), (snap) => {
      const list: UserData[] = [];
      const adminVirtualEmail = `${ADMIN_PHONE}@cuanterus.app`.toLowerCase();
      snap.forEach((doc) => {
        const data = doc.data() as UserData;
        if (data.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase() &&
            data.email?.toLowerCase() !== adminVirtualEmail) {
          list.push(data);
        }
      });
      list.sort((a, b) => (b.totalEarned || 0) - (a.totalEarned || 0));
      setUsers(list);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'artifacts/altomedia-8f793/public/data/deposits'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const list: Deposit[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as Deposit));
      setDeposits(list);
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'artifacts/altomedia-8f793/public/data/withdrawals'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const list: Withdrawal[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as Withdrawal));
      setWithdrawals(list);
    });
  }, []);

  useEffect(() => {
    if (tab === 'vouchers') adminGetVouchers().then(setVouchers).catch(console.error);
    if (tab === 'youtube') adminGetYoutubeUrls().then(setYoutubeUrls).catch(console.error);
  }, [tab]);

  // ===== COMPUTED =====

  const totalBalance = users.reduce((s, u) => s + (u.balance || 0), 0);
  const totalEarned = users.reduce((s, u) => s + (u.totalEarned || 0), 0);
  const pendingWDs = withdrawals.filter(w => w.status === 'pending');
  const pendingDeposits = deposits.filter(d => d.status === 'pending');

  const filteredUsers = searchQuery
    ? users.filter(u =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone?.includes(searchQuery)
      )
    : users;

  // ===== HANDLERS =====

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

  const handleDeleteUser = (user: UserData) => {
    Alert.alert(
      '⚠️ Hapus Akun',
      `Yakin ingin menghapus akun "${user.name}"?\n\nEmail: ${user.email}\nSaldo: Rp ${(user.balance || 0).toLocaleString('id-ID')}\n\nTindakan ini TIDAK BISA dibatalkan!`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: '🗑️ HAPUS PERMANEN',
          style: 'destructive',
          onPress: () => {
            // Double confirmation
            Alert.alert('Konfirmasi Terakhir', `Ketik "HAPUS" untuk menghapus ${user.name}`, [
              { text: 'Batal', style: 'cancel' },
              {
                text: 'HAPUS',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await adminDeleteUser(user.uid);
                    Alert.alert('✅ Berhasil', `Akun ${user.name} telah dihapus.`);
                    setViewUser(null);
                  } catch (e: any) {
                    Alert.alert('Gagal', e.message);
                  }
                },
              },
            ]);
          },
        },
      ]
    );
  };

  const openEditProfile = (user: UserData) => {
    setProfileForm({
      name: user.name || '',
      phone: user.phone || '',
      ewalletId: user.ewalletId || '',
      ewalletName: user.ewalletName || '',
      ewalletOwner: user.ewalletOwner || '',
      ewalletNumber: user.ewalletNumber || '',
    });
    setEditProfileUser(user);
  };

  const handleSaveProfile = async () => {
    if (!editProfileUser) return;
    try {
      await adminUpdateUserProfile(editProfileUser.uid, profileForm);
      Alert.alert('✅ Berhasil', 'Profil pengguna diperbarui.');
      setEditProfileUser(null);
    } catch (e: any) {
      Alert.alert('Gagal', e.message);
    }
  };

  const handleEditBalance = async () => {
    if (!editBalanceUser || !editAmount) return;
    const amount = parseInt(editAmount);
    if (isNaN(amount)) return Alert.alert('Error', 'Masukkan angka yang valid');
    await adminUpdateBalance(editBalanceUser.uid, amount, editReason || 'Penyesuaian admin');
    Alert.alert('✅ Berhasil', `Saldo ${editBalanceUser.name} ${amount > 0 ? '+' : ''}${amount}`);
    setEditBalanceUser(null);
    setEditAmount('');
    setEditReason('');
  };

  const handleConfirmDeposit = (dep: Deposit) => {
    Alert.alert('Konfirmasi Deposit', `Konfirmasi Rp ${dep.amount.toLocaleString('id-ID')} dari ${dep.name}?\n\nTRX: ${dep.trxId}`, [
      { text: 'Batal', style: 'cancel' },
      { text: '✅ Konfirmasi', onPress: () => adminConfirmDeposit(dep.id, dep.uid, dep.amount) },
    ]);
  };

  const handleRejectDep = (dep: Deposit) => {
    Alert.alert('Tolak Deposit', `Tolak deposit Rp ${dep.amount.toLocaleString('id-ID')} dari ${dep.name}?`, [
      { text: 'Batal', style: 'cancel' },
      { text: '❌ Tolak', style: 'destructive', onPress: () => adminRejectDeposit(dep.id) },
    ]);
  };

  const handleApproveWD = (wd: Withdrawal) => {
    Alert.alert('Approve WD', `Setujui Rp ${wd.amount.toLocaleString('id-ID')} ke ${wd.method} (${wd.accountNumber})?`, [
      { text: 'Batal', style: 'cancel' },
      { text: '✅ Setujui', onPress: () => adminApproveWithdrawal(wd.id) },
    ]);
  };

  const handleRejectWD = (wd: Withdrawal) => {
    Alert.alert('Reject WD', `Tolak & kembalikan Rp ${wd.amount.toLocaleString('id-ID')} ke ${wd.name}?`, [
      { text: 'Batal', style: 'cancel' },
      { text: '❌ Tolak', style: 'destructive', onPress: () => adminRejectWithdrawal(wd.id, wd.uid, wd.amount) },
    ]);
  };

  const handleCreateVoucher = async () => {
    const amount = parseInt(vcAmount);
    if (!amount || amount < 100) return Alert.alert('Error', 'Nominal minimal Rp 100');
    setVcLoading(true);
    try {
      const code = await adminCreateVoucher(amount, vcType);
      setVcAmount('');
      Alert.alert('✅ Voucher Dibuat!', `Kode: ${code}\nNominal: Rp ${amount.toLocaleString('id-ID')}\nTipe: ${vcType === 'require_deposit' ? 'Wajib Deposit' : 'Tanpa Deposit'}\nBerlaku: 24 jam`);
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
      { text: 'Nonaktifkan', style: 'destructive', onPress: async () => {
        await adminDeactivateVoucher(v.id);
        setVouchers(await adminGetVouchers());
      }},
    ]);
  };

  const handleAddYoutube = async () => {
    if (!ytUrl.trim()) return Alert.alert('Error', 'Masukkan URL YouTube!');
    if (!ytUrl.includes('youtu')) return Alert.alert('Error', 'URL harus YouTube yang valid!');
    setYtLoading(true);
    try {
      await adminAddYoutubeUrl(ytUrl.trim(), ytTitle.trim() || `Video ${youtubeUrls.length + 1}`);
      setYtUrl(''); setYtTitle('');
      setYoutubeUrls(await adminGetYoutubeUrls());
      Alert.alert('✅ Berhasil', 'Video ditambahkan!');
    } catch (e: any) { Alert.alert('Gagal', e.message); }
    finally { setYtLoading(false); }
  };

  const handleRemoveYoutube = (yt: YouTubeUrl & { id: string }) => {
    Alert.alert('Hapus Video', `Hapus "${yt.title}"?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
        await adminRemoveYoutubeUrl(yt.id);
        setYoutubeUrls(await adminGetYoutubeUrls());
      }},
    ]);
  };

  const handleBroadcast = async () => {
    if (!bcTitle.trim() || !bcMessage.trim()) return Alert.alert('Error', 'Isi judul dan pesan!');
    setBcLoading(true);
    await adminBroadcast(bcTitle.trim(), bcMessage.trim());
    Alert.alert('✅ Berhasil', 'Broadcast terkirim!');
    setBcTitle(''); setBcMessage('');
    setBcLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (tab === 'vouchers') setVouchers(await adminGetVouchers());
    if (tab === 'youtube') setYoutubeUrls(await adminGetYoutubeUrls());
    setRefreshing(false);
  }, [tab]);

  // ===== RENDER TABS =====

  const renderUsersTab = () => (
    <View style={{ flex: 1 }}>
      {/* Search */}
      <View style={s.searchContainer}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Cari nama, email, atau HP..."
          placeholderTextColor={colors.textMuted}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={{ color: colors.textMuted, fontSize: 18, padding: 4 }}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={u => u.uid}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={s.userRow}
            onPress={() => setViewUser(item)}
            activeOpacity={0.6}
          >
            <View style={[s.userAvatar, item.blocked && { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
              <Text style={{ fontSize: 18 }}>{item.blocked ? '🚫' : '👤'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userRowName} numberOfLines={1}>
                {item.name || 'Tanpa Nama'}
              </Text>
              <Text style={s.userRowEmail} numberOfLines={1}>{item.email}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.userRowBalance}>Rp {(item.balance || 0).toLocaleString('id-ID')}</Text>
              <Text style={s.userRowSub}>
                {item.blocked ? '🔴 Blocked' : `🟢 Aktif`}
              </Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<EmptyState icon="👥" text="Belum ada pengguna." />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  const renderDepositsTab = () => (
    <FlatList
      data={deposits}
      keyExtractor={d => d.id}
      renderItem={({ item }) => {
        const isPending = item.status === 'pending';
        const statusColor = item.status === 'confirmed' ? colors.green : item.status === 'expired' ? colors.red : colors.yellow;
        return (
          <View style={s.txCard}>
            <View style={s.txHeader}>
              <View style={[s.txStatusDot, { backgroundColor: statusColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.txName}>{item.name}</Text>
                <Text style={s.txMeta}>QRIS • {item.trxId}</Text>
              </View>
              <Text style={s.txAmount}>Rp {(item.amount || 0).toLocaleString('id-ID')}</Text>
            </View>
            <View style={s.txFooter}>
              <Text style={[s.txStatus, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
              {isPending && (
                <View style={s.txActions}>
                  <TouchableOpacity style={[s.txBtn, s.txBtnGreen]} onPress={() => handleConfirmDeposit(item)}>
                    <Text style={[s.txBtnText, { color: colors.green }]}>✅ Konfirmasi</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.txBtn, s.txBtnRed]} onPress={() => handleRejectDep(item)}>
                    <Text style={[s.txBtnText, { color: colors.red }]}>❌ Tolak</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        );
      }}
      contentContainerStyle={{ paddingBottom: 24 }}
      ListEmptyComponent={<EmptyState icon="💳" text="Belum ada deposit." />}
      showsVerticalScrollIndicator={false}
    />
  );

  const renderWithdrawalsTab = () => (
    <FlatList
      data={withdrawals}
      keyExtractor={w => w.id}
      renderItem={({ item }) => {
        const isPending = item.status === 'pending';
        const statusColor = item.status === 'approved' ? colors.green : item.status === 'rejected' ? colors.red : colors.yellow;
        return (
          <View style={s.txCard}>
            <View style={s.txHeader}>
              <View style={[s.txStatusDot, { backgroundColor: statusColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.txName}>{item.name}</Text>
                <Text style={s.txMeta}>{item.method} • {item.accountNumber}</Text>
              </View>
              <Text style={s.txAmount}>Rp {(item.amount || 0).toLocaleString('id-ID')}</Text>
            </View>
            <View style={s.txFooter}>
              <Text style={[s.txStatus, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
              {isPending && (
                <View style={s.txActions}>
                  <TouchableOpacity style={[s.txBtn, s.txBtnGreen]} onPress={() => handleApproveWD(item)}>
                    <Text style={[s.txBtnText, { color: colors.green }]}>✅ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.txBtn, s.txBtnRed]} onPress={() => handleRejectWD(item)}>
                    <Text style={[s.txBtnText, { color: colors.red }]}>❌ Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        );
      }}
      contentContainerStyle={{ paddingBottom: 24 }}
      ListEmptyComponent={<EmptyState icon="💸" text="Belum ada penarikan." />}
      showsVerticalScrollIndicator={false}
    />
  );

  const renderVouchersTab = () => (
    <ScrollView showsVerticalScrollIndicator={false} refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />
    }>
      <SectionHeader title="🎁 Buat Voucher Baru" />
      <View style={s.formCard}>
        <InputField label="Nominal (Rp)" value={vcAmount} onChangeText={setVcAmount} placeholder="5000" keyboardType="numeric" />
        <Text style={s.inputLabel}>Tipe Klaim</Text>
        <View style={s.toggleRow}>
          <TouchableOpacity
            style={[s.toggleBtn, vcType === 'no_deposit' && s.toggleBtnActive]}
            onPress={() => setVcType('no_deposit')}
          >
            <Text style={[s.toggleText, vcType === 'no_deposit' && s.toggleTextActive]}>✅ Tanpa Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, vcType === 'require_deposit' && s.toggleBtnActiveYellow]}
            onPress={() => setVcType('require_deposit')}
          >
            <Text style={[s.toggleText, vcType === 'require_deposit' && { color: colors.yellow }]}>💳 Wajib Deposit</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={s.primaryBtn} onPress={handleCreateVoucher} disabled={vcLoading} activeOpacity={0.7}>
          <Text style={s.primaryBtnText}>{vcLoading ? '...' : '🎲  GENERATE VOUCHER'}</Text>
        </TouchableOpacity>
      </View>

      <SectionHeader title="📋 Daftar Voucher" subtitle={`${vouchers.filter(v => v.active).length} aktif`} />
      {vouchers.length === 0 ? <EmptyState icon="🎁" text="Belum ada voucher." /> : (
        vouchers.map((v) => {
          const expired = new Date() > new Date(v.expiresAt);
          const isActive = v.active && !expired;
          return (
            <View key={v.id} style={[s.txCard, !isActive && { opacity: 0.5 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: isActive ? colors.cyan : colors.textMuted, fontFamily: 'monospace', letterSpacing: 3 }}>{v.code}</Text>
                  <Text style={s.txMeta}>
                    Rp {v.amount.toLocaleString('id-ID')} • {v.type === 'require_deposit' ? '💳 Wajib Deposit' : '✅ Tanpa Deposit'}
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                    Diklaim: {v.claimedBy?.length || 0} user • {isActive ? '🟢 Aktif' : expired ? '🔴 Expired' : '⚫ Nonaktif'}
                  </Text>
                </View>
                {isActive && (
                  <TouchableOpacity style={[s.txBtn, s.txBtnRed]} onPress={() => handleDeactivateVoucher(v)}>
                    <Text style={[s.txBtnText, { color: colors.red, fontSize: 10 }]}>Nonaktifkan</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}
      <View style={{ height: 24 }} />
    </ScrollView>
  );

  const renderYoutubeTab = () => (
    <ScrollView showsVerticalScrollIndicator={false} refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />
    }>
      <SectionHeader title="🎬 Tambah Video YouTube" />
      <View style={s.formCard}>
        <InputField label="URL YouTube *" value={ytUrl} onChangeText={setYtUrl} placeholder="https://youtube.com/watch?v=..." keyboardType="url" autoCapitalize="none" />
        <InputField label="Judul Video (opsional)" value={ytTitle} onChangeText={setYtTitle} placeholder="Deskripsi singkat" />
        <TouchableOpacity style={s.primaryBtn} onPress={handleAddYoutube} disabled={ytLoading} activeOpacity={0.7}>
          <Text style={s.primaryBtnText}>{ytLoading ? '...' : '➕  TAMBAH VIDEO'}</Text>
        </TouchableOpacity>
      </View>

      <SectionHeader title="📋 Daftar Video" subtitle={`${youtubeUrls.filter(y => y.active).length} aktif`} />
      {youtubeUrls.length === 0 ? <EmptyState icon="🎬" text="Belum ada video." /> : (
        youtubeUrls.map((yt) => (
          <View key={yt.id} style={[s.txCard, !yt.active && { opacity: 0.4 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={s.ytIcon}><Text style={{ fontSize: 16 }}>▶️</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.txName} numberOfLines={1}>{yt.title}</Text>
                <Text style={s.txMeta} numberOfLines={1}>{yt.url}</Text>
              </View>
              {yt.active && (
                <TouchableOpacity style={[s.txBtn, s.txBtnRed, { paddingHorizontal: 8 }]} onPress={() => handleRemoveYoutube(yt)}>
                  <Text style={[s.txBtnText, { color: colors.red, fontSize: 10 }]}>🗑️ Hapus</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      )}

      {/* Info box */}
      <View style={s.infoBox}>
        <Text style={s.infoTitle}>ℹ️ Cara Kerja</Text>
        <Text style={s.infoText}>
          • Video ditampilkan random sebagai tugas harian{'\n'}
          • Rp 50 per tonton, maks 10x/hari{'\n'}
          • Video yang sudah ditonton tidak muncul lagi hari itu
        </Text>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  );

  const renderBroadcastTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SectionHeader title="📢 Kirim Broadcast" subtitle="Kirim pesan ke semua pengguna" />
      <View style={s.formCard}>
        <InputField label="Judul" value={bcTitle} onChangeText={setBcTitle} placeholder="Judul pengumuman" />
        <InputField label="Pesan" value={bcMessage} onChangeText={setBcMessage} placeholder="Isi pesan..." multiline />
        <TouchableOpacity style={s.primaryBtn} onPress={handleBroadcast} disabled={bcLoading} activeOpacity={0.7}>
          <Text style={s.primaryBtnText}>{bcLoading ? '...' : '📢  KIRIM BROADCAST'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ===== USER DETAIL MODAL =====

  const renderUserDetailModal = () => {
    if (!viewUser) return null;
    const u = viewUser;
    // Find latest data from users array
    const latest = users.find(x => x.uid === u.uid) || u;

    return (
      <Modal visible={!!viewUser} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            {/* Modal Header */}
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>👤 Detail Pengguna</Text>
              <TouchableOpacity onPress={() => setViewUser(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* Profile Header */}
              <View style={s.profileHeader}>
                <View style={s.profileAvatar}>
                  <Text style={{ fontSize: 32 }}>{latest.blocked ? '🚫' : '👤'}</Text>
                </View>
                <Text style={s.profileName}>{latest.name || 'Tanpa Nama'}</Text>
                <Text style={s.profileEmail}>{latest.email}</Text>
                {latest.blocked && (
                  <View style={s.blockedBadge}>
                    <Text style={s.blockedText}>🔴 BLOCKED</Text>
                  </View>
                )}
              </View>

              {/* Info Grid */}
              <View style={s.detailSection}>
                <Text style={s.detailSectionTitle}>📊 Informasi Akun</Text>
                <View style={s.detailGrid}>
                  <DetailRow label="UID" value={latest.uid.substring(0, 16) + '...'} />
                  <DetailRow label="Saldo" value={`Rp ${(latest.balance || 0).toLocaleString('id-ID')}`} color={colors.cyan} />
                  <DetailRow label="Total Earned" value={`Rp ${(latest.totalEarned || 0).toLocaleString('id-ID')}`} color={colors.yellow} />
                  <DetailRow label="Streak" value={`${latest.streak || 0} hari`} />
                  <DetailRow label="Referral Code" value={latest.myReferralCode || '-'} />
                  <DetailRow label="Referral Count" value={`${latest.referralCount || 0} orang`} />
                  <DetailRow label="Used Referral" value={latest.usedReferral || '-'} />
                  <DetailRow label="Bergabung" value={latest.joinedAt || '-'} />
                </View>
              </View>

              <View style={s.detailSection}>
                <Text style={s.detailSectionTitle}>📱 Kontak & E-Wallet</Text>
                <View style={s.detailGrid}>
                  <DetailRow label="Telepon" value={latest.phone || '-'} />
                  <DetailRow label="E-Wallet" value={latest.ewalletName || '-'} />
                  <DetailRow label="Pemilik" value={latest.ewalletOwner || '-'} />
                  <DetailRow label="Nomor" value={latest.ewalletNumber || '-'} />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={s.detailSection}>
                <Text style={s.detailSectionTitle}>⚡ Aksi</Text>
                <View style={s.detailActions}>
                  <TouchableOpacity
                    style={[s.detailActionBtn, { backgroundColor: 'rgba(6,182,212,0.1)', borderColor: 'rgba(6,182,212,0.3)' }]}
                    onPress={() => { setViewUser(null); setEditBalanceUser(latest); setEditAmount(''); setEditReason(''); }}
                  >
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>💰</Text>
                    <Text style={[s.detailActionText, { color: colors.cyan }]}>Edit Saldo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.detailActionBtn, { backgroundColor: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.3)' }]}
                    onPress={() => { setViewUser(null); openEditProfile(latest); }}
                  >
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>✏️</Text>
                    <Text style={[s.detailActionText, { color: colors.purple }]}>Edit Profil</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.detailActionBtn, { backgroundColor: latest.blocked ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderColor: latest.blocked ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }]}
                    onPress={() => { setViewUser(null); handleBlock(latest); }}
                  >
                    <Text style={{ fontSize: 20, marginBottom: 4 }}>{latest.blocked ? '✅' : '🚫'}</Text>
                    <Text style={[s.detailActionText, { color: latest.blocked ? colors.green : colors.red }]}>
                      {latest.blocked ? 'Unblock' : 'Block'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Delete - separated for emphasis */}
                <TouchableOpacity
                  style={s.deleteBtn}
                  onPress={() => handleDeleteUser(latest)}
                  activeOpacity={0.7}
                >
                  <Text style={s.deleteBtnText}>🗑️  HAPUS AKUN PERMANEN</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ===== RENDER =====

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>🛡️ Admin Panel</Text>
          <Text style={s.headerSub}>{users.length} pengguna terdaftar</Text>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={s.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 16 }}>
        <View style={s.statsRow}>
          <StatCard icon="👥" value={`${users.length}`} label="Users" color={colors.cyan} />
          <StatCard icon="💰" value={`${(totalBalance / 1000).toFixed(0)}K`} label="Total Saldo" color={colors.yellow} />
          <StatCard icon="💳" value={`${pendingDeposits.length}`} label="Dep. Pending" color={colors.green} />
          <StatCard icon="💸" value={`${pendingWDs.length}`} label="WD Pending" color={colors.red} />
        </View>
      </ScrollView>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 12 }}>
        <View style={s.tabBar}>
          <TabButton id="users" label="Users" icon="👥" active={tab === 'users'} onPress={() => setTab('users')} />
          <TabButton id="deposits" label="Deposit" icon="💳" active={tab === 'deposits'} badge={pendingDeposits.length} onPress={() => setTab('deposits')} />
          <TabButton id="withdrawals" label="WD" icon="💸" active={tab === 'withdrawals'} badge={pendingWDs.length} onPress={() => setTab('withdrawals')} />
          <TabButton id="vouchers" label="Voucher" icon="🎁" active={tab === 'vouchers'} onPress={() => setTab('vouchers')} />
          <TabButton id="youtube" label="YouTube" icon="🎬" active={tab === 'youtube'} onPress={() => setTab('youtube')} />
          <TabButton id="broadcast" label="BC" icon="📢" active={tab === 'broadcast'} onPress={() => setTab('broadcast')} />
        </View>
      </ScrollView>

      {/* Tab Content */}
      <View style={{ flex: 1 }}>
        {tab === 'users' && renderUsersTab()}
        {tab === 'deposits' && renderDepositsTab()}
        {tab === 'withdrawals' && renderWithdrawalsTab()}
        {tab === 'vouchers' && renderVouchersTab()}
        {tab === 'youtube' && renderYoutubeTab()}
        {tab === 'broadcast' && renderBroadcastTab()}
      </View>

      {/* Modals */}
      {renderUserDetailModal()}

      {/* Edit Balance Modal */}
      <Modal visible={!!editBalanceUser} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { maxHeight: 350, borderRadius: 24 }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>💰 Edit Saldo</Text>
              <TouchableOpacity onPress={() => setEditBalanceUser(null)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 16 }}>
              {editBalanceUser?.name} — Saldo: Rp {(editBalanceUser?.balance || 0).toLocaleString('id-ID')}
            </Text>
            <InputField label="Jumlah (+/-)" value={editAmount} onChangeText={setEditAmount} placeholder="+5000 atau -1000" keyboardType="numeric" />
            <InputField label="Alasan" value={editReason} onChangeText={setEditReason} placeholder="Penyesuaian admin" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[s.primaryBtn, { flex: 1, backgroundColor: '#334155' }]} onPress={() => setEditBalanceUser(null)}>
                <Text style={[s.primaryBtnText, { color: colors.textMuted }]}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.primaryBtn, { flex: 1 }]} onPress={handleEditBalance}>
                <Text style={s.primaryBtnText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={!!editProfileUser} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>✏️ Edit Profil</Text>
              <TouchableOpacity onPress={() => setEditProfileUser(null)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <InputField label="Nama" value={profileForm.name} onChangeText={v => setProfileForm(p => ({ ...p, name: v }))} placeholder="Nama pengguna" />
              <InputField label="No. Telepon" value={profileForm.phone} onChangeText={v => setProfileForm(p => ({ ...p, phone: v }))} placeholder="08xxxxxxxxxx" keyboardType="phone-pad" />

              <View style={s.formDivider} />
              <Text style={s.formDividerLabel}>E-Wallet</Text>

              <InputField label="Nama E-Wallet" value={profileForm.ewalletName} onChangeText={v => setProfileForm(p => ({ ...p, ewalletName: v }))} placeholder="GoPay, DANA, OVO..." />
              <InputField label="ID E-Wallet" value={profileForm.ewalletId} onChangeText={v => setProfileForm(p => ({ ...p, ewalletId: v }))} placeholder="ID akun" />
              <InputField label="Nama Pemilik" value={profileForm.ewalletOwner} onChangeText={v => setProfileForm(p => ({ ...p, ewalletOwner: v }))} placeholder="Nama di akun e-wallet" />
              <InputField label="Nomor E-Wallet" value={profileForm.ewalletNumber} onChangeText={v => setProfileForm(p => ({ ...p, ewalletNumber: v }))} placeholder="Nomor e-wallet" keyboardType="phone-pad" />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <TouchableOpacity style={[s.primaryBtn, { flex: 1, backgroundColor: '#334155' }]} onPress={() => setEditProfileUser(null)}>
                  <Text style={[s.primaryBtnText, { color: colors.textMuted }]}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.primaryBtn, { flex: 1 }]} onPress={handleSaveProfile}>
                  <Text style={s.primaryBtnText}>💾 Simpan</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ===== DETAIL ROW COMPONENT =====

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={[s.detailValue, color ? { color } : {}]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ===== STYLES =====

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBg,
    paddingHorizontal: 16,
    paddingTop: 52,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  logoutBtn: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logoutText: { fontSize: 13, fontWeight: '700', color: colors.red },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, paddingRight: 16 },
  statCard: {
    backgroundColor: colors.darkSurface,
    borderRadius: 16,
    padding: 14,
    minWidth: 80,
    alignItems: 'center',
    borderLeftWidth: 3,
  },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '700', color: colors.textMuted, marginTop: 4, textTransform: 'uppercase' },

  // Tab Bar
  tabBar: { flexDirection: 'row', gap: 6, paddingRight: 16 },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkSurface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(6,182,212,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.3)',
  },
  tabIcon: { fontSize: 14 },
  tabLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  tabLabelActive: { color: colors.cyan },
  tabBadge: {
    backgroundColor: colors.red,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkSurface,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 44,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },

  // User Row
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkSurface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(6,182,212,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userRowName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  userRowEmail: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  userRowBalance: { fontSize: 13, fontWeight: '700', color: colors.yellow },
  userRowSub: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 20, color: colors.textMuted, marginLeft: 4 },

  // TX Card (deposits/withdrawals)
  txCard: {
    backgroundColor: colors.darkSurface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  txHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txStatusDot: { width: 8, height: 8, borderRadius: 4 },
  txName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  txMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '800', color: colors.yellow },
  txFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  txStatus: { fontSize: 11, fontWeight: '800' },
  txActions: { flexDirection: 'row', gap: 8 },
  txBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  txBtnGreen: { borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.08)' },
  txBtnRed: { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' },
  txBtnText: { fontSize: 11, fontWeight: '700' },

  // Form
  formCard: {
    backgroundColor: colors.darkSurface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.darkBg,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  toggleBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.darkBg,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  toggleBtnActive: { borderColor: 'rgba(16,185,129,0.4)', backgroundColor: 'rgba(16,185,129,0.08)' },
  toggleBtnActiveYellow: { borderColor: 'rgba(251,191,36,0.4)', backgroundColor: 'rgba(251,191,36,0.08)' },
  toggleText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  toggleTextActive: { color: colors.green },
  primaryBtn: {
    backgroundColor: colors.cyan,
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  sectionSubtitle: { fontSize: 12, color: colors.textMuted },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: colors.textMuted, fontSize: 14 },

  // YouTube
  ytIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  // Info Box
  infoBox: {
    backgroundColor: 'rgba(6,182,212,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.1)',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  infoTitle: { fontSize: 12, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  infoText: { fontSize: 11, color: colors.textSecondary, lineHeight: 18 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.darkBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  modalClose: { fontSize: 22, color: colors.textMuted, padding: 4 },

  // Profile Detail
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(6,182,212,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  profileEmail: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  blockedBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  blockedText: { fontSize: 11, fontWeight: '700', color: colors.red },

  // Detail Section
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  detailGrid: {
    backgroundColor: colors.darkSurface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  detailLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  detailValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '700', maxWidth: '55%', textAlign: 'right' },

  // Detail Actions
  detailActions: {
    flexDirection: 'row',
    gap: 10,
  },
  detailActionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  detailActionText: { fontSize: 11, fontWeight: '700' },

  // Delete Button
  deleteBtn: {
    marginTop: 16,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  deleteBtnText: { fontSize: 13, fontWeight: '700', color: colors.red },

  // Form Divider
  formDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 8,
  },
  formDividerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 12,
  },
});
