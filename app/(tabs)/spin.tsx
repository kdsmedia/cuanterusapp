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
import Svg, { Path, G, Text as SvgText, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Audio } from 'expo-av';
import { useAuth } from '@/lib/auth-context';
import {
  claimSpinReward, getSpinCountToday,
  SPIN_PRIZES, SPIN_REAL_WEIGHTS, MAX_DAILY_SPINS,
} from '@/lib/api';
import { showRewarded, isRewardedReady, reloadRewarded } from '@/lib/admob';
import Toast from '@/components/Toast';
import { colors } from '@/lib/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const WHEEL_SIZE = Math.min(SCREEN_WIDTH - 48, 320);
const WHEEL_RADIUS = WHEEL_SIZE / 2;
const NUM_SEGMENTS = SPIN_PRIZES.length; // 20
const SEGMENT_ANGLE = 360 / NUM_SEGMENTS; // 18°

// ===== SOUND EFFECTS =====
let tickSound: Audio.Sound | null = null;
let winSound: Audio.Sound | null = null;

async function loadSounds() {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound: tick } = await Audio.Sound.createAsync(
      { uri: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' },
      { shouldPlay: false, volume: 0.3 }
    );
    tickSound = tick;
    const { sound: win } = await Audio.Sound.createAsync(
      { uri: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3' },
      { shouldPlay: false, volume: 0.6 }
    );
    winSound = win;
  } catch (e) {
    console.log('[Spin] Failed to load sounds:', e);
  }
}

async function playTick() {
  try {
    if (tickSound) {
      await tickSound.setPositionAsync(0);
      await tickSound.playAsync();
    }
  } catch (_) {}
}

async function playWin() {
  try {
    if (winSound) {
      await winSound.setPositionAsync(0);
      await winSound.playAsync();
    }
    Vibration.vibrate([0, 100, 50, 100, 50, 200]);
  } catch (_) {}
}

// ===== SVG PIE SLICE HELPER =====
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

// ===== WHEEL COMPONENT (static SVG) =====
const WheelSvg = React.memo(() => {
  const cx = WHEEL_RADIUS;
  const cy = WHEEL_RADIUS;
  const r = WHEEL_RADIUS - 4;
  const textR = r * 0.68;
  const dotR = r * 0.92;

  return (
    <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
      <Defs>
        <LinearGradient id="rimGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fbbf24" />
          <Stop offset="1" stopColor="#d97706" />
        </LinearGradient>
      </Defs>

      {/* Outer rim */}
      <Circle cx={cx} cy={cy} r={WHEEL_RADIUS} fill="url(#rimGrad)" />
      <Circle cx={cx} cy={cy} r={WHEEL_RADIUS - 3} fill="none" stroke="#92400e" strokeWidth={1} />

      {/* Segments */}
      {SPIN_PRIZES.map((prize, i) => {
        const startA = i * SEGMENT_ANGLE;
        const endA = startA + SEGMENT_ANGLE;
        const midA = startA + SEGMENT_ANGLE / 2;
        const midRad = ((midA - 90) * Math.PI) / 180;

        // Alternate slightly darker shade for contrast
        const segColor = i % 2 === 0 ? prize.color : shadeColor(prize.color, -15);

        // Text position
        const tx = cx + textR * Math.cos(midRad);
        const ty = cy + textR * Math.sin(midRad);

        // Dot position (outer edge decoration)
        const dx = cx + dotR * Math.cos(midRad);
        const dy = cy + dotR * Math.sin(midRad);

        return (
          <G key={i}>
            <Path d={describeArc(cx, cy, r, startA, endA)} fill={segColor} stroke="#0f172a" strokeWidth={0.8} />
            {/* Segment divider lines */}
            <Path
              d={describeArc(cx, cy, r, startA, startA + 0.3)}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
            />
            {/* Prize text */}
            <SvgText
              x={tx}
              y={ty}
              fill="#fff"
              fontSize={8.5}
              fontWeight="bold"
              textAnchor="middle"
              alignmentBaseline="central"
              rotation={midA}
              origin={`${tx}, ${ty}`}
            >
              {prize.label.replace('Rp ', '').replace('.000', 'K')}
            </SvgText>
            {/* Outer dots */}
            <Circle cx={dx} cy={dy} r={2.5} fill="rgba(255,255,255,0.5)" />
          </G>
        );
      })}

      {/* Inner ring shadow */}
      <Circle cx={cx} cy={cy} r={r * 0.28} fill="#0f172a" opacity={0.3} />

      {/* Center circle */}
      <Circle cx={cx} cy={cy} r={r * 0.24} fill="#0f172a" stroke="#fbbf24" strokeWidth={3} />
      <SvgText x={cx} y={cy + 1} fontSize={18} textAnchor="middle" alignmentBaseline="central" fill="#fbbf24">
        💰
      </SvgText>
    </Svg>
  );
});

function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

// ===== MAIN SCREEN =====
export default function SpinScreen() {
  const { firebaseUser, userData } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultValue, setResultValue] = useState(0);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as any });
  const rotation = useRef(new Animated.Value(0)).current;
  const currentRotation = useRef(0);
  const tickInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const glowAnim = useRef(new Animated.Value(0)).current;

  const spinsToday = getSpinCountToday(userData);
  const spinsLeft = MAX_DAILY_SPINS - spinsToday;
  const maxedOut = spinsToday >= MAX_DAILY_SPINS;

  // Load sounds on mount
  useEffect(() => {
    loadSounds();
    return () => {
      tickSound?.unloadAsync();
      winSound?.unloadAsync();
      if (tickInterval.current) clearInterval(tickInterval.current);
    };
  }, []);

  // Idle glow pulse animation
  useEffect(() => {
    if (!spinning) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: false }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [spinning]);

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
    return { index: 0, value: SPIN_PRIZES[0].value };
  };

  const handleSpin = async () => {
    if (!firebaseUser || spinning || maxedOut) return;

    setSpinning(true);
    setResult(null);
    setResultValue(0);

    try {
      // Show rewarded ad first — wait for result
      if (isRewardedReady()) {
        const adWatched = await showRewarded();
        if (!adWatched) {
          // Ad was dismissed early, still allow spin but log it
          console.log('[Spin] Ad dismissed or failed, proceeding with spin');
        }
      } else {
        // Ad not ready, preload for next time
        reloadRewarded();
      }

      // Pick prize
      const prize = pickPrize();
      const prizeData = SPIN_PRIZES[prize.index];

      // Calculate target rotation
      const prizeCenter = prize.index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
      const targetAngle = 360 - prizeCenter;
      const randomOffset = (Math.random() - 0.5) * (SEGMENT_ANGLE * 0.6);
      const fullSpins = (6 + Math.floor(Math.random() * 3)) * 360;
      const toValue = currentRotation.current + fullSpins + targetAngle + randomOffset;

      // Start tick sounds
      tickInterval.current = setInterval(() => playTick(), 50);

      // Gradually slow down tick
      const slowdown1 = setTimeout(() => {
        if (tickInterval.current) clearInterval(tickInterval.current);
        tickInterval.current = setInterval(() => playTick(), 150);
      }, 2500);

      const slowdown2 = setTimeout(() => {
        if (tickInterval.current) clearInterval(tickInterval.current);
        tickInterval.current = setInterval(() => playTick(), 300);
      }, 4000);

      // Animate
      Animated.timing(rotation, {
        toValue,
        duration: 5500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(async () => {
        currentRotation.current = toValue;

        clearTimeout(slowdown1);
        clearTimeout(slowdown2);
        if (tickInterval.current) {
          clearInterval(tickInterval.current);
          tickInterval.current = null;
        }

        await playWin();

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

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.6],
  });

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
        <Text style={styles.counterText}>Sisa spin hari ini: </Text>
        <Text style={[styles.counterNum, maxedOut && { color: colors.red }]}>
          {spinsLeft}/{MAX_DAILY_SPINS}
        </Text>
      </View>

      {/* Wheel Container */}
      <View style={styles.wheelWrapper}>
        {/* Glow effect behind wheel */}
        <Animated.View
          style={[
            styles.wheelGlow,
            {
              width: WHEEL_SIZE + 40,
              height: WHEEL_SIZE + 40,
              borderRadius: (WHEEL_SIZE + 40) / 2,
              opacity: spinning ? 0.5 : glowOpacity,
            },
          ]}
        />

        {/* Pointer at top */}
        <View style={styles.pointer}>
          <View style={styles.pointerTriangle} />
          <View style={styles.pointerDot} />
        </View>

        {/* Rotating Wheel */}
        <Animated.View
          style={{
            width: WHEEL_SIZE,
            height: WHEEL_SIZE,
            transform: [{ rotate: spinInterpolation }],
          }}
        >
          <WheelSvg />
        </Animated.View>
      </View>

      {/* Result */}
      {result && (
        <Animated.View style={styles.resultBox}>
          <Text style={styles.resultEmoji}>🎉</Text>
          <Text style={styles.resultText}>{result}</Text>
          <Text style={styles.resultSubtext}>Ditambahkan ke saldo kamu</Text>
        </Animated.View>
      )}

      {/* Spin Button */}
      <TouchableOpacity
        style={[styles.spinBtn, (spinning || maxedOut) && styles.spinBtnDisabled]}
        onPress={handleSpin}
        disabled={spinning || maxedOut}
        activeOpacity={0.8}
      >
        {spinning ? (
          <View style={styles.spinBtnRow}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.spinBtnText}>MEMUTAR...</Text>
          </View>
        ) : (
          <Text style={styles.spinBtnText}>
            {maxedOut ? '🔒 BATAS TERCAPAI' : '🎰 PUTAR RODA'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Ad hint */}
      {!maxedOut && !spinning && (
        <Text style={styles.adHint}>Tonton iklan untuk spin gratis</Text>
      )}
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
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: colors.darkSurface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  counterText: { fontSize: 14, color: colors.textSecondary },
  counterNum: { fontSize: 14, fontWeight: '900', color: colors.cyan },

  // Wheel
  wheelWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  wheelGlow: {
    position: 'absolute',
    backgroundColor: colors.yellow,
    shadowColor: colors.yellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 10,
  },

  // Pointer
  pointer: {
    position: 'absolute',
    top: -12,
    zIndex: 20,
    alignItems: 'center',
  },
  pointerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderTopWidth: 28,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fbbf24',
  },
  pointerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d97706',
    marginTop: -6,
  },

  // Result
  resultBox: {
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  resultEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  resultText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.yellow,
    textAlign: 'center',
  },
  resultSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Spin Button
  spinBtn: {
    backgroundColor: colors.purple,
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 28,
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    minWidth: 220,
    alignItems: 'center',
  },
  spinBtnDisabled: {
    backgroundColor: '#334155',
    shadowOpacity: 0,
    elevation: 0,
  },
  spinBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spinBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  adHint: {
    marginTop: 12,
    fontSize: 12,
    color: colors.textMuted,
  },
});
