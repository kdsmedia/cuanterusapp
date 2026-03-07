import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
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
  getGameUrl,
  WEBVIEW_BRIDGE_JS,
  GAME_LIST,
} from '@/lib/game-bridge';
import { colors } from '@/lib/theme';

export default function GameScreen() {
  const { gameId, gameName } = useLocalSearchParams<{ gameId: string; gameName: string }>();
  const { firebaseUser, userData } = useAuth();
  const router = useRouter();

  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
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
      return true; // Prevent default back
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
          const newBalance = parseFloat(data.balance);
          setGameBalance(newBalance);
          // Sync ke Firestore (non-blocking)
          updateGameBalance(uid, newBalance).catch(() => {});
          break;

        case 'exit_game':
          const finalBalance = parseFloat(data.balance);
          await handleEndSession(finalBalance);
          break;

        case 'bridge_ready':
          console.log('Game bridge ready');
          break;
      }
    } catch (e) {
      console.error('WebView message error:', e);
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
      console.error('End session error:', e);
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

  // Generate game URL
  const gameUrl = getGameUrl(gameId!, uid, balance);
  const gameInfo = GAME_LIST.find(g => g.id === gameId);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Home Button - floating top left */}
      <TouchableOpacity style={styles.homeButton} onPress={handleExitGame} activeOpacity={0.7}>
        <Text style={styles.homeButtonIcon}>🏠</Text>
      </TouchableOpacity>

      {/* WebView Game */}
      <View style={styles.webViewContainer}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.cyan} />
            <Text style={styles.loadingText}>Memuat {gameName}...</Text>
          </View>
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: gameUrl }}
          style={styles.webView}
          injectedJavaScript={WEBVIEW_BRIDGE_JS}
          onMessage={handleWebViewMessage}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          scalesPageToFit={true}
          originWhitelist={['*']}
          onError={() => {
            setLoading(false);
            Alert.alert(
              'Gagal Memuat',
              'Game tidak bisa dimuat. Periksa koneksi internet atau hubungi admin.',
              [{ text: 'Kembali', onPress: () => router.back() }]
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  homeButton: {
    position: 'absolute',
    top: 44,
    left: 12,
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  homeButtonIcon: {
    fontSize: 18,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
});
