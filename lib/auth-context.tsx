import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { auth, db, USERS_PATH, ADMIN_EMAIL } from './firebase';

export interface UserData {
  uid: string;
  name: string;
  email: string;
  phone: string;
  balance: number;
  totalEarned: number;
  lastCheckin: string;
  streak: number;
  myReferralCode: string;
  usedReferral: string;
  referralCount: number;
  joinedAt: string;
  createdAt: string;
  adsToday: number;
  lastAdDate: string;
  spinsToday: number;
  lastSpinDate: string;
  blocked: boolean;
  ewalletId: string;
  ewalletName: string;
  ewalletOwner: string;
  ewalletNumber: string;
}

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  date: string;
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userData: UserData | null;
  isAdmin: boolean;
  loading: boolean;
  broadcasts: Broadcast[];
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  userData: null,
  isAdmin: false,
  loading: true,
  broadcasts: [],
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserData(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    const email = firebaseUser.email?.toLowerCase() || '';
    const admin = email === ADMIN_EMAIL.toLowerCase();
    setIsAdmin(admin);

    if (admin) {
      setLoading(false);
      return;
    }

    const userRef = doc(db, USERS_PATH, firebaseUser.uid);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setUserData(snap.data() as UserData);
      }
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [firebaseUser]);

  // Listen to broadcasts
  useEffect(() => {
    if (!firebaseUser) return;
    const q = query(
      collection(db, 'artifacts/altomedia-8f793/public/data/broadcasts'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items: Broadcast[] = [];
      snap.forEach(d => {
        items.push({ id: d.id, ...d.data() } as Broadcast);
      });
      setBroadcasts(items);
    });
    return unsub;
  }, [firebaseUser]);

  return (
    <AuthContext.Provider value={{ firebaseUser, userData, isAdmin, loading, broadcasts }}>
      {children}
    </AuthContext.Provider>
  );
}
