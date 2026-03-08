import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ActivityIndicator,
  Dimensions,
  Vibration,
} from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { useAuth } from '@/lib/auth-context';
import {
  claimSpinReward, getSpinCountToday,
  SPIN_PRIZES, SPIN_REAL_WEIGHTS, MAX_DAILY_SPINS,
} from '@/lib/api';
import { showRewarded, isRewardedReady, reloadRewarded } from '@/lib/admob';
import Toast from '@/components/Toast';
import { colors } from '@/lib/theme';

const WHEEL_SIZE = Math.min(Dimensions.get('window').width - 48, 320);
const NUM_SEGMENTS = SPIN_PRIZES.length; // 20
const SEGMENT_ANGLE = 360 / NUM_SEGMENTS; // 18°

// ===== SOUND HELPERS (using expo-audio) =====
let tickPlayer: ReturnType<typeof useAudioPlayer> | null = null;
let winPlayer: ReturnType<typeof useAudioPlayer> | null = null;

function playTick() {
  try {
    if (tickPlayer) {
      tickPlayer.seekTo(0);
      tickPlayer.play();
    }
  } catch (_) {}
}

function playWin() {
  try {
    if (winPlayer) {
      winPlayer.seekTo(0);
      winPlayer.play();
    }
    Vibration.vibrate([0, 100, 50, 100, 50, 200]);
  } catch (_) {}
}

export default function SpinScreen() {
  const { firebaseUser, userData } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultValue, setResultValue] = useState(0);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as any });
  const rotation = useRef(new Animated.Value(0)).current;
  const currentRotation = useRef(0);
  const tickInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const spinsToday = getSpinCountToday(userData);
  const spinsLeft = MAX_DAILY_SPINS - spinsToday;
  const maxedOut = spinsToday >= MAX_DAILY_SPINS;

  // Load sounds using expo-audio hooks
  tickPlayer = useAudioPlayer(
    { uri: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' },
    { volume: 0.3 }
  );
  winPlayer = useAudioPlayer(
    { uri: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3' },
    { volume: 0.6 }
  );

  useEffect(() => {
    return () => {
      if (tickInterval.current) clearInterval(tickInterval.current);
    };
  }, []);

  // Pick weighted random prize
  const pickPrize = (): { index: number; value: number } => {
    const totalWeight = SPIN_REAL_WEIGHTS.reduce((sum, w) => sum + w.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const w of SPIN_REAL_WEIGHTS) {
      rand -= w.weight;
      if (rand <= 0) {
        return { index: w.index, value: SPIN_PRIZES[w.index].value };
      }
    }
    // Fallback
    return { index: 0, value: SPIN_PRIZES[0].value };
  };

  const handleSpin = async () => {
    if (!firebaseUser || spinning || maxedOut) return;

    setSpinning(true);
    setResult(null);
    setResultValue(0);

    try {
      // Show ad if ready
      if (isRewardedReady()) {
        await showRewarded();
      } else {
        reloadRewarded();
      }

      // Pick prize
      const prize = pickPrize();
      const prizeData = SPIN_PRIZES[prize.index];

      // Calculate target rotation
      // Wheel rotates clockwise; pointer is at top
      // Prize at index i starts at angle (i * SEGMENT_ANGLE)
      // We want the center of that segment under the pointer
      const prizeCenter = prize.index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
      // To land on this segment, rotate so that prizeCenter aligns with top (0°)
      const targetAngle = 360 - prizeCenter;
      // Add random offset within segment for natural feel
      const randomOffset = (Math.random() - 0.5) * (SEGMENT_ANGLE * 0.6);
      const fullSpins = (6 + Math.floor(Math.random() * 3)) * 360; // 6-8 full rotations
      const toValue = currentRotation.current + fullSpins + targetAngle + randomOffset;

      // Start tick sounds during spin
      let tickSpeed = 50;
      tickInterval.current = setInterval(() => {
        playTick();
      }, tickSpeed);

      // Gradually slow down tick speed
      const slowdownTimer = setTimeout(() => {
        if (tickInterval.current) clearInterval(tickInterval.current);
        tickInterval.current = setInterval(() => {
          playTick();
        }, 150);
      }, 2500);

      const slowdownTimer2 = setTimeout(() => {
        if (tickInterval.current) clearInterval(tickInterval.current);
        tickInterval.current = setInterval(() => {
          playTick();
        }, 300);
      }, 4000);

      // Animate with natural deceleration
      Animated.timing(rotation, {
        toValue,
        duration: 5500,
        easing: Easing.out(Easing.quad), // Natural deceleration
        useNativeDriver: true,
      }).start(async () => {
        currentRotation.current = toValue;

        // Stop tick sounds
        clearTimeout(slowdownTimer);
        clearTimeout(slowdownTimer2);
        if (tickInterval.current) {
          clearInterval(tickInterval.current);
          tickInterval.current = null;
        }

        // Play win sound & vibrate
        await playWin();

        // Claim reward
        try {
          const res = await claimSpinReward(firebaseUser.uid, prizeData.value);
          setResult(`🎉 ${prizeData.label}!`);
          setResultValue(prizeData.value);
          setToast({ visible: true, message: res.message, type: 'success' });
        } catch (e: any) {
          setToast({ visible: true, message: e.message, type: 'error' });
        }
        setSpinning(false);
      });
    } catch (e) {
      setSpinning(false);
      if (tickInterval.current) {
        clearInterval(tickInterval.current);
        tickInterval.current = null;
      }
      setToast({ visible: true, message: 'Gagal spin', type: 'error' });
    }
  };

  const spinInterpolation = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  // Render wheel segments
  const renderWheel = () => {
    const radius = WHEEL_SIZE / 2;
    const innerRadius = radius * 0.3; // Center circle radius

    return (
      <Animated.View
        style={[
          styles.wheel,
          {
            width: WHEEL_SIZE,
            height: WHEEL_SIZE,
            borderRadius: WHEEL_SIZE / 2,
            transform: [{ rotate: spinInterpolation }],
          },
        ]}
      >
        {SPIN_PRIZES.map((prize, i) => {
          const startAngle = i * SEGMENT_ANGLE - 90; // -90 to start from top
          const midAngle = startAngle + SEGMENT_ANGLE / 2;
          const midRad = (midAngle * Math.PI) / 180;
          const textRadius = radius * 0.65;
          const textX = radius + textRadius * Math.cos(midRad);
          const textY = radius + textRadius * Math.sin(midRad);

          return (
            <View key={i} style={StyleSheet.absoluteFill}>
              {/* Segment background using a positioned view */}
              <View
                style={[
                  styles.segmentSlice,
                  {
                    backgroundColor: prize.color,
                    transform: [
                      { translateX: radius - 1 },
                      { translateY: 0 },
                      { rotate: `${startAngle + SEGMENT_ANGLE / 2}deg` },
                      { translateY: -radius / 2 },
                    ],
                    width: 2,
                    height: radius,
                    left: 0,
                    top: radius,
                  },
                ]}
              />
              {/* Prize text */}
              <View
                style={[
                  styles.segmentLabel,
                  {
                    left: textX - 28,
                    top: textY - 10,
                    transform: [{ rotate: `${midAngle + 90}deg` }],
                  },
                ]}
              >
                <Text style={styles.segmentText} numberOfLines={1}>
                  {prize.label.replace('Rp ', '')}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Colored segments - simplified approach with pie slices */}
        {SPIN_PRIZES.map((prize, i) => {
          const angle = i * SEGMENT_ANGLE;
          const rad = ((angle + SEGMENT_ANGLE / 2 - 90) * Math.PI) / 180;
          const dotR = radius * 0.82;
          const x = radius + dotR * Math.cos(rad) - 4;
          const y = radius + dotR * Math.sin(rad) - 4;
          return (
            <View
              key={`dot-${i}`}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#fff',
                opacity: 0.6,
              }}
            />
          );
        })}

        {/* Center circle */}
        <View style={[styles.centerCircle, {
          width: WHEEL_SIZE * 0.25,
          height: WHEEL_SIZE * 0.25,
          borderRadius: WHEEL_SIZE * 0.125,
          left: WHEEL_SIZE * 0.375,
          top: WHEEL_SIZE * 0.375,
        }]}>
          <Text style={{ fontSize: 22 }}>💰</Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />

      <Text style={styles.title}>🎰 Lucky Spin</Text>
      <Text style={styles.subtitle}>Putar roda & dapatkan hadiah!</Text>

      {/* Spin Counter */}
      <View style={styles.counterRow}>
        <Text style={styles.counterText}>Sisa spin: </Text>
        <Text style={[styles.counterNum, maxedOut && { color: colors.red }]}>
          {spinsLeft}/{MAX_DAILY_SPINS}
        </Text>
      </View>

      {/* Wheel Container */}
      <View style={[styles.wheelContainer, { width: WHEEL_SIZE + 24, height: WHEEL_SIZE + 24 }]}>
        {/* Pointer */}
        <View style={styles.pointer}>
          <View style={styles.pointerTriangle} />
        </View>

        {/* Outer ring decorations */}
        <View style={[styles.outerRing, {
          width: WHEEL_SIZE + 16,
          height: WHEEL_SIZE + 16,
          borderRadius: (WHEEL_SIZE + 16) / 2,
        }]}>
          {renderWheel()}
        </View>
      </View>

      {/* Result */}
      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      )}

      {/* Spin Button */}
      <TouchableOpacity
        style={[styles.spinBtn, (spinning || maxedOut) && styles.spinBtnDisabled]}
        onPress={handleSpin}
        disabled={spinning || maxedOut}
        activeOpacity={0.8}
      >
        {spinning ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.spinBtnText}>MEMUTAR...</Text>
          </View>
        ) : (
          <Text style={styles.spinBtnText}>
            {maxedOut ? '🔒 BATAS TERCAPAI' : '🎰 PUTAR RODA'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBg,
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  title: { fontSize: 26, fontWeight: '900', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 12 },
  counterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  counterText: { fontSize: 14, color: colors.textSecondary },
  counterNum: { fontSize: 14, fontWeight: '900', color: colors.cyan },

  // Wheel
  wheelContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  outerRing: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.yellow,
    backgroundColor: colors.darkSurface,
  },
  wheel: {
    backgroundColor: colors.darkSurface,
    overflow: 'hidden',
  },
  segmentSlice: {
    position: 'absolute',
    opacity: 0.6,
  },
  segmentLabel: {
    position: 'absolute',
    width: 56,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  centerCircle: {
    position: 'absolute',
    backgroundColor: colors.darkBg,
    borderWidth: 3,
    borderColor: colors.yellow,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },

  // Pointer
  pointer: {
    position: 'absolute',
    top: -4,
    zIndex: 20,
    alignItems: 'center',
  },
  pointerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.yellow,
  },

  // Result
  resultBox: {
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 16,
  },
  resultText: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.yellow,
    textAlign: 'center',
  },

  // Spin Button
  spinBtn: {
    backgroundColor: colors.purple,
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 24,
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  spinBtnDisabled: {
    backgroundColor: '#334155',
    shadowOpacity: 0,
  },
  spinBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
