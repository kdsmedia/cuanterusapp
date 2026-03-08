import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  BackHandler,
  StatusBar,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import {
  startGameSession,
  endGameSession,
  updateGameBalance,
} from '@/lib/game-bridge';
import { generateSlotHTML } from '@/lib/slot-engine';

export default function GameScreen() {
  const { gameId, gameName } = useLocalSearchParams<{ gameId: string; gameName: string }>();
  const { firebaseUser, userData } = useAuth();
  const router = useRouter();

  const webViewRef = useRef<WebView>(null);
  const [gameBalance, setGameBalance] = useState(userData?.balance ?? 0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [exiting, setExiting] = useState(false);

  const uid = firebaseUser?.uid || '';
  const balance = userData?.balance ?? 0;

  // Start game session saat screen mount
  useEffect(() => {
    if (uid && gameId && !sessionStarted) {
      startGame();
    }
  }, [uid, gameId]);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleExitGame();
      return true;
    });
    return () => backHandler.remove();
  }, [gameBalance]);

  const startGame = async () => {
    try {
      await startGameSession(uid, gameId!);
      setSessionStarted(true);
      setGameBalance(balance);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Gagal memulai game');
      router.back();
    }
  };

  // Handle pesan dari WebView (balance updates)
  const handleWebViewMessage = useCallback(async (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'balance_update':
          const newBalance = Math.round(parseFloat(data.balance));
          setGameBalance(newBalance);
          updateGameBalance(uid, newBalance).catch(() => {});
          break;

        case 'exit_game':
          const finalBalance = Math.round(parseFloat(data.balance));
          await handleEndSession(finalBalance);
          break;

        case 'bridge_ready':
          console.log('[Game] Bridge ready');
          break;
      }
    } catch (e) {
      console.error('[Game] WebView message error:', e);
    }
  }, [uid]);

  // Akhiri sesi game dan sync saldo
  const handleEndSession = async (finalBalance: number) => {
    if (exiting) return;
    setExiting(true);

    try {
      const result = await endGameSession(uid, finalBalance);

      if (result.profit > 0) {
        Alert.alert(
          '🎉 Menang!',
          `Kamu menang Rp ${result.profit.toLocaleString('id-ID')}!\nSaldo: Rp ${result.newBalance.toLocaleString('id-ID')}`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else if (result.profit < 0) {
        Alert.alert(
          '😔 Sayang sekali',
          `Rugi Rp ${Math.abs(result.profit).toLocaleString('id-ID')}\nSaldo: Rp ${result.newBalance.toLocaleString('id-ID')}`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        router.back();
      }
    } catch (e) {
      console.error('[Game] End session error:', e);
      router.back();
    }
  };

  // Konfirmasi keluar game
  const handleExitGame = () => {
    Alert.alert(
      'Keluar Game?',
      'Saldo akan otomatis disinkronkan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: () => handleEndSession(gameBalance),
        },
      ]
    );
  };

  // Generate self-contained HTML game
  const gameHTML = generateSlotHTML(gameId!, balance);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <WebView
        ref={webViewRef}
        source={{ html: gameHTML }}
        style={styles.webView}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        onError={() => {
          Alert.alert(
            'Gagal Memuat',
            'Game tidak bisa dimuat.',
            [{ text: 'Kembali', onPress: () => router.back() }]
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
});
