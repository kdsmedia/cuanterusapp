import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { colors } from '@/lib/theme';

export default function SplashScreen() {
  const { firebaseUser, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      if (!firebaseUser) {
        router.replace('/auth');
      } else if (isAdmin) {
        router.replace('/admin');
      } else {
        router.replace('/(tabs)');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [loading, firebaseUser, isAdmin]);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>💰</Text>
      <Text style={styles.title}>CUANTERUS</Text>
      <Text style={styles.subtitle}>Kumpulkan Cuanmu</Text>
      <ActivityIndicator color={colors.cyan} style={{ marginTop: 32 }} size="large" />
      <Text style={styles.status}>Menghubungkan ke server...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.cyan,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  status: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 16,
  },
});
