import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  increment,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { auth, db, USERS_PATH, CHECKIN_REWARD, REFERRAL_REWARD } from './firebase';

export const WATCH_AD_REWARD = 50;
export const MAX_DAILY_ADS = 20;

// Streak bonus: day 1=100, day 2=150, day 3=200, day 4=250, day 5=300, day 6=400, day 7+=500
export const STREAK_BONUSES = [100, 150, 200, 250, 300, 400, 500];

// Spin wheel prizes — 20 segmen (tampil Rp10 - Rp100.000, tapi hasil max Rp250)
export const SPIN_PRIZES = [
  { label: 'Rp 10',     value: 10,     color: '#64748b' },
  { label: 'Rp 5.000',  value: 5000,   color: '#06b6d4' },
  { label: 'Rp 25',     value: 25,     color: '#8b5cf6' },
  { label: 'Rp 50.000', value: 50000,  color: '#f59e0b' },
  { label: 'Rp 50',     value: 50,     color: '#10b981' },
  { label: 'Rp 1.000',  value: 1000,   color: '#0ea5e9' },
  { label: 'Rp 100',    value: 100,    color: '#ef4444' },
  { label: 'Rp 10.000', value: 10000,  color: '#f97316' },
  { label: 'Rp 15',     value: 15,     color: '#a855f7' },
  { label: 'Rp 100K',   value: 100000, color: '#eab308' },
  { label: 'Rp 200',    value: 200,    color: '#ec4899' },
  { label: 'Rp 2.500',  value: 2500,   color: '#14b8a6' },
  { label: 'Rp 20',     value: 20,     color: '#6366f1' },
  { label: 'Rp 25.000', value: 25000,  color: '#f43f5e' },
  { label: 'Rp 75',     value: 75,     color: '#22c55e' },
  { label: 'Rp 500',    value: 500,    color: '#d946ef' },
  { label: 'Rp 250',    value: 250,    color: '#fb923c' },
  { label: 'Rp 75.000', value: 75000,  color: '#facc15' },
  { label: 'Rp 150',    value: 150,    color: '#2dd4bf' },
  { label: 'Rp 30',     value: 30,     color: '#818cf8' },
];

// Weighted index → hasil REAL yang bisa didapat (max Rp250)
// Hanya prize dengan value ≤ 250 yang bisa menang
export const SPIN_REAL_WEIGHTS: { index: number; weight: number }[] = [
  { index: 0,  weight: 20 },  // Rp 10
  { index: 8,  weight: 14 },  // Rp 15
  { index: 12, weight: 12 },  // Rp 20
  { index: 2,  weight: 14 },  // Rp 25
  { index: 19, weight: 10 },  // Rp 30
  { index: 4,  weight: 10 },  // Rp 50
  { index: 14, weight: 7 },   // Rp 75
  { index: 6,  weight: 5 },   // Rp 100
  { index: 18, weight: 3 },   // Rp 150
  { index: 10, weight: 3 },   // Rp 200
  { index: 16, weight: 2 },   // Rp 250
]; // total = 100

// Level thresholds
export const LEVELS = [
  { level: 1, name: 'Pemula', minBalance: 0, emoji: '🌱' },
  { level: 2, name: 'Pejuang', minBalance: 1000, emoji: '⚔️' },
  { level: 3, name: 'Petualang', minBalance: 5000, emoji: '🗺️' },
  { level: 4, name: 'Pedagang', minBalance: 15000, emoji: '💼' },
  { level: 5, name: 'Juragan', minBalance: 30000, emoji: '👑' },
  { level: 6, name: 'Sultan', minBalance: 50000, emoji: '💎' },
  { level: 7, name: 'Legenda', minBalance: 100000, emoji: '🏆' },
];

export function getUserLevel(totalEarned: number) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalEarned >= lvl.minBalance) current = lvl;
  }
  const nextIdx = LEVELS.findIndex(l => l.level === current.level) + 1;
  const next = nextIdx < LEVELS.length ? LEVELS[nextIdx] : null;
  return { current, next };
}

export function getStreakReward(streak: number): number {
  const idx = Math.min(streak - 1, STREAK_BONUSES.length - 1);
  return STREAK_BONUSES[Math.max(0, idx)];
}

// ===== TRANSACTIONS PATH =====
const TRANSACTIONS_PATH = (uid: string) =>
  `artifacts/${auth.currentUser ? 'altomedia-8f793' : 'altomedia-8f793'}/public/data/users/${uid}/transactions`;

const WITHDRAWALS_PATH = 'artifacts/altomedia-8f793/public/data/withdrawals';
const BROADCASTS_PATH = 'artifacts/altomedia-8f793/public/data/broadcasts';

// ===== LOG TRANSACTION =====
async function logTransaction(uid: string, type: string, amount: number, description: string) {
  try {
    await addDoc(collection(db, TRANSACTIONS_PATH(uid)), {
      type,
      amount,
      description,
      createdAt: serverTimestamp(),
      date: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Log transaction error:', e);
  }
}

// ===== AUTH =====

export interface EwalletData {
  ewalletId: string;
  ewalletName: string;
  ewalletOwner: string;
  ewalletNumber: string;
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  phone: string,
  referralCode: string,
  ewallet?: EwalletData
) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  const now = new Date();
  const joinDate = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const refCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  await setDoc(doc(db, USERS_PATH, uid), {
    uid,
    name,
    email,
    phone,
    balance: 0,
    totalEarned: 0,
    lastCheckin: '',
    streak: 0,
    myReferralCode: refCode,
    usedReferral: referralCode,
    referralCount: 0,
    joinedAt: joinDate,
    createdAt: now.toISOString(),
    adsToday: 0,
    lastAdDate: '',
    spinsToday: 0,
    lastSpinDate: '',
    blocked: false,
    // E-Wallet data
    ewalletId: ewallet?.ewalletId || '',
    ewalletName: ewallet?.ewalletName || '',
    ewalletOwner: ewallet?.ewalletOwner || '',
    ewalletNumber: ewallet?.ewalletNumber || '',
  });

  if (referralCode) {
    await processReferral(referralCode, uid);
  }

  await logTransaction(uid, 'register', 0, 'Akun baru dibuat');
}

export async function loginUser(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
}

/** Login via Google - returns { isNewUser, needsProfile } */
export async function loginWithGoogle(idToken: string): Promise<{
  isNewUser: boolean;
  needsProfile: boolean;
}> {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  const user = result.user;

  // Cek apakah user sudah punya profil di Firestore
  const userRef = doc(db, USERS_PATH, user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    // User baru via Google — buat dokumen dasar
    await setDoc(userRef, {
      email: user.email || '',
      name: user.displayName || '',
      phone: '',
      balance: 0,
      totalEarned: 0,
      referralCode: user.uid.slice(0, 8).toUpperCase(),
      referredBy: '',
      loginMethod: 'google',
      profileComplete: false,
      blocked: false,
      createdAt: serverTimestamp(),
    });
    return { isNewUser: true, needsProfile: true };
  }

  const data = snap.data();
  // User lama tapi profil belum lengkap
  if (!data.profileComplete && data.loginMethod === 'google') {
    return { isNewUser: false, needsProfile: true };
  }

  return { isNewUser: false, needsProfile: false };
}

/** Lengkapi profil user Google */
export async function completeGoogleProfile(
  uid: string,
  data: {
    name: string;
    phone: string;
    ewalletId: string;
    ewalletName: string;
    ewalletOwner: string;
    ewalletNumber: string;
  }
): Promise<void> {
  const userRef = doc(db, USERS_PATH, uid);
  await updateDoc(userRef, {
    name: data.name,
    phone: data.phone,
    ewalletId: data.ewalletId,
    ewalletName: data.ewalletName,
    ewalletOwner: data.ewalletOwner,
    ewalletNumber: data.ewalletNumber,
    profileComplete: true,
  });
}

export async function logoutUser() {
  await signOut(auth);
}

// ===== CHECK-IN WITH STREAK =====

export async function dailyCheckin(uid: string): Promise<{ message: string; streak: number; reward: number }> {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const userRef = doc(db, USERS_PATH, uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) throw new Error('User tidak ditemukan');

  const data = snap.data();
  if (data.blocked) throw new Error('Akun kamu diblokir. Hubungi admin.');
  const lastCheckin = data?.lastCheckin || '';

  if (lastCheckin === today) {
    throw new Error('Kamu sudah check-in hari ini.');
  }

  // Calculate streak
  let streak = lastCheckin === yesterday ? (data?.streak || 0) + 1 : 1;
  const reward = getStreakReward(streak);

  await updateDoc(userRef, {
    balance: increment(reward),
    totalEarned: increment(reward),
    lastCheckin: today,
    streak,
  });

  await logTransaction(uid, 'checkin', reward, `Check-in hari ke-${streak} (streak bonus)`);

  return {
    message: `Rp ${reward} masuk! 🔥 Streak ${streak} hari`,
    streak,
    reward,
  };
}

// ===== AD REWARD =====

export async function claimAdReward(uid: string): Promise<{ message: string; adsToday: number }> {
  const today = new Date().toDateString();
  const userRef = doc(db, USERS_PATH, uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) throw new Error('User tidak ditemukan');

  const data = snap.data();
  if (data.blocked) throw new Error('Akun kamu diblokir.');
  const lastAdDate = data?.lastAdDate || '';
  let adsToday = lastAdDate === today ? (data?.adsToday || 0) : 0;

  if (adsToday >= MAX_DAILY_ADS) {
    throw new Error(`Batas ${MAX_DAILY_ADS}x tercapai. Coba lagi besok!`);
  }

  adsToday += 1;
  await updateDoc(userRef, {
    balance: increment(WATCH_AD_REWARD),
    totalEarned: increment(WATCH_AD_REWARD),
    adsToday,
    lastAdDate: today,
  });

  await logTransaction(uid, 'watch_ad', WATCH_AD_REWARD, `Nonton video (${adsToday}/${MAX_DAILY_ADS})`);

  return {
    message: `Rp ${WATCH_AD_REWARD} masuk! (${adsToday}/${MAX_DAILY_ADS}) 🎬`,
    adsToday,
  };
}

export function getAdCountToday(userData: any): number {
  const today = new Date().toDateString();
  if (userData?.lastAdDate === today) return userData?.adsToday || 0;
  return 0;
}

// ===== LUCKY SPIN =====

export const MAX_DAILY_SPINS = 5;

export function getSpinCountToday(userData: any): number {
  const today = new Date().toDateString();
  if (userData?.lastSpinDate === today) return userData?.spinsToday || 0;
  return 0;
}

export async function claimSpinReward(uid: string, prizeValue: number): Promise<{ message: string; spinsToday: number }> {
  const today = new Date().toDateString();
  const userRef = doc(db, USERS_PATH, uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) throw new Error('User tidak ditemukan');

  const data = snap.data();
  if (data.blocked) throw new Error('Akun kamu diblokir.');
  const lastSpinDate = data?.lastSpinDate || '';
  let spinsToday = lastSpinDate === today ? (data?.spinsToday || 0) : 0;

  if (spinsToday >= MAX_DAILY_SPINS) {
    throw new Error(`Batas ${MAX_DAILY_SPINS}x spin tercapai. Coba besok!`);
  }

  spinsToday += 1;
  await updateDoc(userRef, {
    balance: increment(prizeValue),
    totalEarned: increment(prizeValue),
    spinsToday,
    lastSpinDate: today,
  });

  await logTransaction(uid, 'spin', prizeValue, `Lucky Spin Rp ${prizeValue} (${spinsToday}/${MAX_DAILY_SPINS})`);

  return {
    message: `🎰 Selamat! Kamu dapat Rp ${prizeValue}! (${spinsToday}/${MAX_DAILY_SPINS})`,
    spinsToday,
  };
}

// ===== REFERRAL =====

async function processReferral(refCode: string, newUid: string) {
  try {
    const q = query(
      collection(db, USERS_PATH),
      where('myReferralCode', '==', refCode)
    );
    const snap = await getDocs(q);
    snap.forEach(async (docSnap) => {
      const ownerUid = docSnap.data().uid;
      if (ownerUid && ownerUid !== newUid) {
        await updateDoc(doc(db, USERS_PATH, ownerUid), {
          balance: increment(REFERRAL_REWARD),
          totalEarned: increment(REFERRAL_REWARD),
          referralCount: increment(1),
        });
        await logTransaction(ownerUid, 'referral', REFERRAL_REWARD, 'Bonus referral teman baru');
      }
    });
  } catch (e) {
    console.error('Referral error:', e);
  }
}

// ===== WITHDRAWAL =====

export async function requestWithdrawal(uid: string, amount: number, method: string, accountNumber: string) {
  const userRef = doc(db, USERS_PATH, uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('User tidak ditemukan');

  const data = snap.data();
  if (data.balance < amount) throw new Error('Saldo tidak cukup');
  if (amount < 50000) throw new Error('Minimal penarikan Rp 50.000');

  // Deduct balance
  await updateDoc(userRef, {
    balance: increment(-amount),
  });

  // Create withdrawal request
  await addDoc(collection(db, WITHDRAWALS_PATH), {
    uid,
    name: data.name,
    email: data.email,
    amount,
    method,
    accountNumber,
    status: 'pending', // pending | approved | rejected
    createdAt: serverTimestamp(),
    date: new Date().toISOString(),
  });

  await logTransaction(uid, 'withdraw_request', -amount, `Penarikan Rp ${amount.toLocaleString('id-ID')} via ${method}`);
}

// ===== ADMIN FUNCTIONS =====

export async function adminUpdateBalance(uid: string, amount: number, reason: string) {
  const userRef = doc(db, USERS_PATH, uid);
  await updateDoc(userRef, {
    balance: increment(amount),
    totalEarned: amount > 0 ? increment(amount) : increment(0),
  });
  await logTransaction(uid, 'admin_adjust', amount, `Admin: ${reason}`);
}

export async function adminBlockUser(uid: string, blocked: boolean) {
  await updateDoc(doc(db, USERS_PATH, uid), { blocked });
}

export async function adminApproveWithdrawal(docId: string) {
  const ref = doc(db, WITHDRAWALS_PATH, docId);
  await updateDoc(ref, { status: 'approved' });
}

export async function adminRejectWithdrawal(docId: string, uid: string, amount: number) {
  const ref = doc(db, WITHDRAWALS_PATH, docId);
  await updateDoc(ref, { status: 'rejected' });
  // Refund balance
  await updateDoc(doc(db, USERS_PATH, uid), {
    balance: increment(amount),
  });
  await logTransaction(uid, 'withdraw_refund', amount, 'Penarikan ditolak - saldo dikembalikan');
}

export async function adminBroadcast(title: string, message: string) {
  await addDoc(collection(db, BROADCASTS_PATH), {
    title,
    message,
    createdAt: serverTimestamp(),
    date: new Date().toISOString(),
  });
}

// ===== DEPOSIT =====

const DEPOSITS_PATH = 'artifacts/altomedia-8f793/public/data/deposits';

export async function createDeposit(uid: string, amount: number, trxId: string): Promise<string> {
  const userRef = doc(db, USERS_PATH, uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('User tidak ditemukan');
  const data = snap.data();

  const docRef = await addDoc(collection(db, DEPOSITS_PATH), {
    uid,
    name: data.name || '',
    email: data.email || '',
    amount,
    trxId,
    status: 'pending', // pending | confirmed | expired
    method: 'QRIS',
    createdAt: serverTimestamp(),
    date: new Date().toISOString(),
  });

  await logTransaction(uid, 'deposit_pending', amount, `Deposit QRIS Rp ${amount.toLocaleString('id-ID')} (${trxId})`);
  return docRef.id;
}

export async function adminConfirmDeposit(docId: string, uid: string, amount: number) {
  const ref = doc(db, DEPOSITS_PATH, docId);
  await updateDoc(ref, { status: 'confirmed' });
  await updateDoc(doc(db, USERS_PATH, uid), {
    balance: increment(amount),
    totalEarned: increment(amount),
  });
  await logTransaction(uid, 'deposit_confirmed', amount, `Deposit QRIS Rp ${amount.toLocaleString('id-ID')} dikonfirmasi`);
}

export async function adminRejectDeposit(docId: string) {
  const ref = doc(db, DEPOSITS_PATH, docId);
  await updateDoc(ref, { status: 'expired' });
}

// ===== VOUCHER =====

const VOUCHERS_PATH = 'artifacts/altomedia-8f793/public/data/vouchers';

export interface Voucher {
  id?: string;
  code: string;
  amount: number;
  type: 'no_deposit' | 'require_deposit';
  createdAt: any;
  expiresAt: string; // ISO date string (24h after creation)
  claimedBy: string[]; // array of UIDs who claimed
  active: boolean;
}

export async function adminCreateVoucher(amount: number, type: 'no_deposit' | 'require_deposit'): Promise<string> {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  await addDoc(collection(db, VOUCHERS_PATH), {
    code,
    amount,
    type,
    createdAt: serverTimestamp(),
    expiresAt: expires.toISOString(),
    claimedBy: [],
    active: true,
  });

  return code;
}

export async function claimVoucher(uid: string, code: string): Promise<string> {
  // Find voucher by code
  const q = query(
    collection(db, VOUCHERS_PATH),
    where('code', '==', code.toUpperCase()),
    where('active', '==', true)
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('Kode voucher tidak ditemukan atau sudah tidak aktif.');
  }

  const voucherDoc = snap.docs[0];
  const voucher = voucherDoc.data() as Voucher;

  // Check expiry
  const now = new Date();
  const expiresAt = new Date(voucher.expiresAt);
  if (now > expiresAt) {
    throw new Error('Voucher sudah expired (masa berlaku 24 jam).');
  }

  // Check if already claimed by this user
  if (voucher.claimedBy && voucher.claimedBy.includes(uid)) {
    throw new Error('Kamu sudah pernah klaim voucher ini.');
  }

  // Check deposit requirement
  if (voucher.type === 'require_deposit') {
    // Check if user has any confirmed deposit
    const depQ = query(
      collection(db, DEPOSITS_PATH),
      where('uid', '==', uid),
      where('status', '==', 'confirmed')
    );
    const depSnap = await getDocs(depQ);
    if (depSnap.empty) {
      throw new Error('Voucher ini hanya untuk user yang sudah pernah deposit. Deposit dulu ya!');
    }
  }

  // Claim: add balance + record
  const userRef = doc(db, USERS_PATH, uid);
  await updateDoc(userRef, {
    balance: increment(voucher.amount),
    totalEarned: increment(voucher.amount),
  });

  // Update voucher claimedBy
  const updatedClaimed = [...(voucher.claimedBy || []), uid];
  await updateDoc(doc(db, VOUCHERS_PATH, voucherDoc.id), {
    claimedBy: updatedClaimed,
  });

  await logTransaction(uid, 'voucher', voucher.amount, `Klaim voucher ${code} — Rp ${voucher.amount.toLocaleString('id-ID')}`);

  return `🎉 Voucher berhasil! Rp ${voucher.amount.toLocaleString('id-ID')} masuk ke saldo!`;
}

export async function adminGetVouchers(): Promise<(Voucher & { id: string })[]> {
  const q = query(collection(db, VOUCHERS_PATH), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Voucher & { id: string }));
}

export async function adminDeactivateVoucher(docId: string) {
  await updateDoc(doc(db, VOUCHERS_PATH, docId), { active: false });
}

// ===== YOUTUBE TASK URLs =====

const YOUTUBE_URLS_PATH = 'artifacts/altomedia-8f793/public/data/youtubeUrls';

export interface YouTubeUrl {
  id?: string;
  url: string;
  title: string;
  addedAt: any;
  active: boolean;
}

/** Admin: tambah URL YouTube */
export async function adminAddYoutubeUrl(url: string, title: string): Promise<void> {
  await addDoc(collection(db, YOUTUBE_URLS_PATH), {
    url,
    title,
    addedAt: serverTimestamp(),
    active: true,
  });
}

/** Admin: hapus/nonaktifkan URL YouTube */
export async function adminRemoveYoutubeUrl(docId: string): Promise<void> {
  const ref = doc(db, YOUTUBE_URLS_PATH, docId);
  await updateDoc(ref, { active: false });
}

/** Admin: ambil semua URL YouTube */
export async function adminGetYoutubeUrls(): Promise<(YouTubeUrl & { id: string })[]> {
  const q = query(collection(db, YOUTUBE_URLS_PATH), orderBy('addedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as YouTubeUrl & { id: string }));
}

/** User: ambil URL YouTube random yang belum ditonton hari ini */
export async function getRandomYoutubeUrl(uid: string): Promise<(YouTubeUrl & { id: string }) | null> {
  // Ambil semua URL aktif
  const q = query(
    collection(db, YOUTUBE_URLS_PATH),
    where('active', '==', true)
  );
  const snap = await getDocs(q);
  const allUrls = snap.docs.map(d => ({ id: d.id, ...d.data() } as YouTubeUrl & { id: string }));

  if (allUrls.length === 0) return null;

  // Ambil URL yang sudah ditonton hari ini
  const today = new Date().toDateString();
  const userRef = doc(db, USERS_PATH, uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();

  const watchedToday: string[] = userData?.watchedYoutubeToday === today
    ? (userData?.watchedYoutubeIds || [])
    : [];

  // Filter yang belum ditonton
  const unwatched = allUrls.filter(u => !watchedToday.includes(u.id));

  // Kalau semua sudah ditonton, reset & pilih random dari semua
  const pool = unwatched.length > 0 ? unwatched : allUrls;

  // Random pick
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

/** User: tandai YouTube sudah ditonton & klaim reward */
export const YOUTUBE_WATCH_REWARD = 50;
export const MAX_DAILY_YOUTUBE = 10;

export async function claimYoutubeReward(uid: string, youtubeDocId: string): Promise<{
  message: string;
  watchedToday: number;
}> {
  const today = new Date().toDateString();
  const userRef = doc(db, USERS_PATH, uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) throw new Error('User tidak ditemukan');

  const data = snap.data();
  if (data.blocked) throw new Error('Akun diblokir.');

  // Hitung berapa kali sudah nonton hari ini
  const isToday = data?.watchedYoutubeToday === today;
  let watchedIds: string[] = isToday ? (data?.watchedYoutubeIds || []) : [];
  const watchedCount = watchedIds.length;

  if (watchedCount >= MAX_DAILY_YOUTUBE) {
    throw new Error(`Batas ${MAX_DAILY_YOUTUBE}x tonton YouTube tercapai hari ini!`);
  }

  // Tambahkan ke daftar yang sudah ditonton
  watchedIds.push(youtubeDocId);

  await updateDoc(userRef, {
    balance: increment(YOUTUBE_WATCH_REWARD),
    totalEarned: increment(YOUTUBE_WATCH_REWARD),
    watchedYoutubeToday: today,
    watchedYoutubeIds: watchedIds,
  });

  const newCount = watchedIds.length;
  await logTransaction(uid, 'youtube_watch', YOUTUBE_WATCH_REWARD,
    `Tonton YouTube (${newCount}/${MAX_DAILY_YOUTUBE})`);

  return {
    message: `Rp ${YOUTUBE_WATCH_REWARD} masuk! 🎬 (${newCount}/${MAX_DAILY_YOUTUBE})`,
    watchedToday: newCount,
  };
}

/** User: ambil jumlah tonton YouTube hari ini */
export function getYoutubeWatchCount(userData: any): number {
  const today = new Date().toDateString();
  if (userData?.watchedYoutubeToday === today) {
    return (userData?.watchedYoutubeIds || []).length;
  }
  return 0;
}

// ===== LEADERBOARD =====

export async function getLeaderboard(): Promise<Array<{ name: string; totalEarned: number; level: string; emoji: string }>> {
  const q = query(
    collection(db, USERS_PATH),
    orderBy('totalEarned', 'desc'),
    limit(50)
  );
  const snap = await getDocs(q);
  const list: any[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.email?.toLowerCase() === 'appsidhanie@gmail.com') return;
    if (data.blocked) return;
    const lvl = getUserLevel(data.totalEarned || 0);
    list.push({
      name: data.name || 'Anonim',
      totalEarned: data.totalEarned || 0,
      level: lvl.current.name,
      emoji: lvl.current.emoji,
    });
  });
  return list;
}

// ===== GET TRANSACTIONS =====

export async function getTransactions(uid: string, max: number = 50) {
  const q = query(
    collection(db, TRANSACTIONS_PATH(uid)),
    orderBy('createdAt', 'desc'),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
