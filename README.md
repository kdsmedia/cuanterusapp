# 💰 CUANTERUS - Expo React Native App

Aplikasi penghasil uang native Android/iOS menggunakan **Expo** + **Firebase**.

## 📁 Struktur Project

```
cuanterus-expo/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root layout (AuthProvider)
│   ├── index.tsx                 # Splash screen → auto route
│   ├── auth.tsx                  # Login & Register
│   ├── admin.tsx                 # Admin panel (live user list)
│   └── (tabs)/                   # Bottom tab navigation
│       ├── _layout.tsx           # Tab config
│       ├── index.tsx             # Home (dashboard + check-in)
│       ├── withdraw.tsx          # Penarikan saldo
│       └── profile.tsx           # Profil user
├── components/                   # Reusable components
│   ├── GlassCard.tsx
│   ├── PrimaryButton.tsx
│   └── Toast.tsx
├── lib/                          # Core logic
│   ├── firebase.ts               # Firebase config & constants
│   ├── auth-context.tsx          # Auth state management
│   ├── api.ts                    # Register, login, check-in, referral
│   └── theme.ts                  # Colors
├── assets/                       # Icons & splash
├── app.json                      # Expo config
├── eas.json                      # EAS Build config (APK/AAB)
├── package.json
└── tsconfig.json
```

## 🚀 Cara Setup & Jalankan

### 1. Install Dependencies

```bash
cd cuanterus-expo
npm install
```

### 2. Jalankan di HP (Expo Go)

```bash
npx expo start
```

Scan QR code pakai app **Expo Go** di HP Android/iOS.

### 3. Build APK (Tanpa Android Studio!)

Install EAS CLI:
```bash
npm install -g eas-cli
```

Login ke Expo:
```bash
eas login
```

Build APK:
```bash
eas build -p android --profile preview
```

Build AAB (untuk Play Store):
```bash
eas build -p android --profile production
```

> ✅ Build dilakukan di **cloud Expo** — TIDAK perlu Android Studio!

### 4. (Opsional) Build iOS
```bash
eas build -p ios --profile production
```

## 📱 Fitur

- ✅ Register & Login (Firebase Auth)
- ✅ Check-in harian (Rp 100)
- ✅ Sistem referral (Rp 500 per undangan)
- ✅ Dashboard saldo real-time (Firestore listener)
- ✅ Progress bar penarikan
- ✅ Admin panel (lihat semua user + stats)
- ✅ Dark mode UI
- ✅ Bottom tab navigation
- ✅ Toast notifications
- ✅ Auto-route (splash → auth/user/admin)
- ✅ Session persist (auto login setelah restart)

## 🛠️ Tech Stack

- **Expo SDK 52** + Expo Router
- **React Native** 0.76
- **Firebase** 11.x (Auth + Firestore)
- **TypeScript**
- **AsyncStorage** (auth persistence)

## ⚙️ Konfigurasi Firebase

Firebase sudah dikonfigurasi di `lib/firebase.ts` menggunakan project:
- Project ID: `altomedia-8f793`
- Admin email: `appsidhanie@gmail.com`

### Penting:
- Pastikan **Authentication** (Email/Password) aktif di Firebase Console
- Pastikan **Firestore** rules mengizinkan read/write untuk authenticated users

## 📋 Perintah Berguna

| Perintah | Fungsi |
|----------|--------|
| `npx expo start` | Jalankan dev server |
| `npx expo start --android` | Langsung buka di Android |
| `eas build -p android --profile preview` | Build APK |
| `eas build -p android --profile production` | Build AAB (Play Store) |
| `eas submit -p android` | Upload ke Play Store |

## 🔒 Keamanan

Untuk production, tambahkan Firestore security rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/public/data/users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
