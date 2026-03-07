import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/lib/auth-context';
import { initAdMob } from '@/lib/admob';
import { requestAllPermissions, scheduleDailyReminder } from '@/lib/permissions';
import { colors } from '@/lib/theme';

export default function RootLayout() {
  useEffect(() => {
    // Init AdMob
    initAdMob();

    // Request permissions & schedule notifications
    requestAllPermissions().then(() => {
      scheduleDailyReminder();
    });
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.darkBg },
          animation: 'fade',
        }}
      />
    </AuthProvider>
  );
}
