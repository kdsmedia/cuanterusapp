/**
 * Game Balance Bridge
 * Sinkronisasi saldo Firebase ↔ Game Session
 * Tanpa mengubah logika game PHP sama sekali
 */

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  increment,
  serverTimestamp,
  addDoc,
  collection,
} from 'firebase/firestore';
import { db, USERS_PATH, APP_ID } from './firebase';

// ===== CONFIG =====
// URL server game (PHP/VanguardLTE). Ganti dengan URL server kamu.
export const GAME_SERVER_URL = 'https://game.cuanterusapp.com';

const GAME_SESSIONS_PATH = `artifacts/${APP_ID}/public/data/gameSessions`;
const TRANSACTIONS_PATH = (uid: string) =>
  `artifacts/${APP_ID}/public/data/users/${uid}/transactions`;

// ===== GAME LIST =====
export interface GameInfo {
  id: string;
  name: string;
  displayName: string;
  icon: string; // filename in ico/
  provider: string;
  category: string;
}

export const GAME_LIST: GameInfo[] = [
  { id: 'AztecGemsDeluxe', name: 'AztecGemsDeluxe', displayName: 'Aztec Gems Deluxe', icon: 'AztecGemsDeluxe.jpg', provider: 'Pragmatic Play', category: 'Slots' },
  { id: 'BonanzaGold', name: 'BonanzaGold', displayName: 'Bonanza Gold', icon: 'BonanzaGold.jpg', provider: 'Pragmatic Play', category: 'Slots' },
  { id: 'CandyVillage', name: 'CandyVillage', displayName: 'Candy Village', icon: 'CandyVillage.jpg', provider: 'Pragmatic Play', category: 'Slots' },
  { id: 'ChilliHeat', name: 'ChilliHeat', displayName: 'Chilli Heat', icon: 'ChilliHeat.jpg', provider: 'Pragmatic Play', category: 'Slots' },
  { id: 'CrazyParty', name: 'CrazyParty', displayName: 'Crazy Party', icon: 'CrazyParty.jpg', provider: 'VanguardLTE', category: 'Slots' },
  { id: 'EmperorsChina', name: 'EmperorsChina', displayName: "Emperor's China", icon: 'EmperorsChina.jpg', provider: 'VanguardLTE', category: 'Slots' },
  { id: 'GatesofOlympus', name: 'GatesofOlympus', displayName: 'Gates of Olympus', icon: 'GatesofOlympus.jpg', provider: 'Pragmatic Play', category: 'Slots' },
  { id: 'Geisha', name: 'Geisha', displayName: 'Geisha', icon: 'Geisha.jpg', provider: 'Endorphina', category: 'Slots' },
  { id: 'LuckyGirls', name: 'LuckyGirls', displayName: 'Lucky Girls', icon: 'LuckyGirls.jpg', provider: 'VanguardLTE', category: 'Slots' },
  { id: 'MadameDestiny', name: 'MadameDestiny', displayName: 'Madame Destiny', icon: 'MadameDestiny.jpg', provider: 'Pragmatic Play', category: 'Slots' },
  { id: 'MagicPrincess', name: 'MagicPrincess', displayName: 'Magic Princess', icon: 'MagicPrincess.jpg', provider: 'Novomatic', category: 'Slots' },
  { id: 'SafariKing', name: 'SafariKing', displayName: 'Safari King', icon: 'SafariKing.jpg', provider: 'Pragmatic Play', category: 'Slots' },
  { id: 'StarlightPrincess', name: 'StarlightPrincess', displayName: 'Starlight Princess', icon: 'StarlightPrincess.jpg', provider: 'Pragmatic Play', category: 'Slots' },
  { id: 'SunWukongPT', name: 'SunWukongPT', displayName: 'Sun Wukong', icon: 'SunWukongPT.jpg', provider: 'Playtech', category: 'Slots' },
  { id: 'SweetBonanza', name: 'SweetBonanza', displayName: 'Sweet Bonanza', icon: 'SweetBonanza.jpg', provider: 'Pragmatic Play', category: 'Slots' },
  { id: 'TheDogHouse', name: 'TheDogHouse', displayName: 'The Dog House', icon: 'TheDogHouse.jpg', provider: 'Pragmatic Play', category: 'Slots' },
  { id: 'TweetyHouse', name: 'TweetyHouse', displayName: 'Tweety House', icon: 'TweetyHouse.jpg', provider: 'VanguardLTE', category: 'Slots' },
  { id: 'WildDragonAM', name: 'WildDragonAM', displayName: 'Wild Dragon', icon: 'WildDragonAM.jpg', provider: 'Ameba', category: 'Slots' },
  { id: 'WildWestGold', name: 'WildWestGold', displayName: 'Wild West Gold', icon: 'WildWestGold.jpg', provider: 'Pragmatic Play', category: 'Slots' },
];

// ===== GAME SESSION =====

export interface GameSession {
  uid: string;
  gameId: string;
  startBalance: number;
  currentBalance: number;
  startedAt: any;
  active: boolean;
}

/**
 * Mulai sesi game — simpan saldo awal ke Firestore
 * Saldo app dikunci selama sesi game aktif
 */
export async function startGameSession(uid: string, gameId: string): Promise<string> {
  // Cek saldo user
  const userRef = doc(db, USERS_PATH, uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('User tidak ditemukan');

  const userData = userSnap.data();
  if (userData.blocked) throw new Error('Akun diblokir');

  const balance = userData.balance || 0;
  if (balance < 10) throw new Error('Saldo minimal Rp 10 untuk bermain');

  // Buat sesi game di Firestore
  const sessionRef = doc(db, GAME_SESSIONS_PATH, `${uid}_active`);
  await setDoc(sessionRef, {
    uid,
    gameId,
    startBalance: balance,
    currentBalance: balance,
    startedAt: serverTimestamp(),
    active: true,
  });

  return `${uid}_active`;
}

/**
 * Akhiri sesi game — hitung selisih dan update saldo Firebase
 * finalBalance = saldo akhir dari game server
 */
export async function endGameSession(uid: string, finalBalance: number): Promise<{
  profit: number;
  newBalance: number;
}> {
  const sessionRef = doc(db, GAME_SESSIONS_PATH, `${uid}_active`);
  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) {
    // Tidak ada sesi aktif, return saldo current
    const userSnap = await getDoc(doc(db, USERS_PATH, uid));
    return { profit: 0, newBalance: userSnap.data()?.balance || 0 };
  }

  const session = sessionSnap.data() as GameSession;
  const profit = finalBalance - session.startBalance;

  // Update saldo Firebase dengan selisih (profit/loss)
  const userRef = doc(db, USERS_PATH, uid);
  if (profit !== 0) {
    await updateDoc(userRef, {
      balance: increment(profit),
      ...(profit > 0 ? { totalEarned: increment(profit) } : {}),
    });

    // Log transaksi
    const gameInfo = GAME_LIST.find(g => g.id === session.gameId);
    const gameName = gameInfo?.displayName || session.gameId;
    const desc = profit > 0
      ? `Menang Rp ${profit.toLocaleString('id-ID')} di ${gameName} 🎰`
      : `Kalah Rp ${Math.abs(profit).toLocaleString('id-ID')} di ${gameName}`;

    await logGameTransaction(uid, profit, desc, session.gameId);
  }

  // Hapus sesi aktif
  await deleteDoc(sessionRef);

  // Ambil saldo terbaru
  const updatedUser = await getDoc(userRef);
  const newBalance = updatedUser.data()?.balance || 0;

  return { profit, newBalance };
}

/**
 * Update saldo game secara realtime (dipanggil dari WebView bridge)
 */
export async function updateGameBalance(uid: string, newBalance: number): Promise<void> {
  const sessionRef = doc(db, GAME_SESSIONS_PATH, `${uid}_active`);
  await updateDoc(sessionRef, {
    currentBalance: newBalance,
  });
}

/**
 * Cek apakah ada sesi game aktif
 */
export async function getActiveGameSession(uid: string): Promise<GameSession | null> {
  const sessionRef = doc(db, GAME_SESSIONS_PATH, `${uid}_active`);
  const snap = await getDoc(sessionRef);
  if (snap.exists() && snap.data().active) {
    return snap.data() as GameSession;
  }
  return null;
}

/**
 * Force close sesi game (jika crash/hang)
 * Mengembalikan saldo ke startBalance (no profit/loss)
 */
export async function forceCloseGameSession(uid: string): Promise<void> {
  const sessionRef = doc(db, GAME_SESSIONS_PATH, `${uid}_active`);
  const snap = await getDoc(sessionRef);
  if (snap.exists()) {
    await deleteDoc(sessionRef);
  }
}

// ===== HELPERS =====

async function logGameTransaction(uid: string, amount: number, description: string, gameId: string) {
  try {
    await addDoc(collection(db, TRANSACTIONS_PATH(uid)), {
      type: amount >= 0 ? 'game_win' : 'game_loss',
      amount,
      description,
      gameId,
      createdAt: serverTimestamp(),
      date: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Log game transaction error:', e);
  }
}

/**
 * Generate URL game untuk WebView
 * Menyisipkan token sesi dan saldo ke URL
 */
export function getGameUrl(gameId: string, uid: string, balance: number): string {
  return `${GAME_SERVER_URL}/game/${gameId}?uid=${uid}&balance=${balance}&token=${uid}_active`;
}

/**
 * JavaScript yang di-inject ke WebView untuk bridge saldo
 * Menangkap perubahan saldo dari game dan kirim ke React Native
 */
export const WEBVIEW_BRIDGE_JS = `
  (function() {
    // Override balance display dari game
    var currentBalance = 0;

    // Intercept XMLHttpRequest untuk menangkap response saldo dari game server
    var origOpen = XMLHttpRequest.prototype.open;
    var origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function() {
      this._url = arguments[1];
      origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function() {
      var self = this;
      this.addEventListener('load', function() {
        try {
          var response = self.responseText || '';
          // Parse balance dari response game (format: balance=XXXX)
          var balanceMatch = response.match(/balance=([\\d.]+)/);
          if (balanceMatch) {
            var newBalance = parseFloat(balanceMatch[1]);
            if (newBalance !== currentBalance) {
              currentBalance = newBalance;
              // Kirim ke React Native
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: 'balance_update', balance: newBalance })
              );
            }
          }
        } catch(e) {}
      });
      origSend.apply(this, arguments);
    };

    // Notify when user wants to exit
    window.exitGame = function() {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'exit_game', balance: currentBalance })
      );
    };

    // Send initial ready signal
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'bridge_ready' })
    );
  })();
`;
