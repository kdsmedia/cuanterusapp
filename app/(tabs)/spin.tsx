import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { claimSpinReward, getSpinCountToday, SPIN_PRIZES, MAX_DAILY_SPINS } from '@/lib/api';
import { showRewarded, isRewardedReady, reloadRewarded } from '@/lib/admob';
import Toast from '@/components/Toast';
import { colors } from '@/lib/theme';

export default function SpinScreen() {
  const { firebaseUser, userData } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as any });
  const rotation = useRef(new Animated.Value(0)).current;
  const currentRotation = useRef(0);

  const spinsToday = getSpinCountToday(userData);
  const spinsLeft = MAX_DAILY_SPINS - spinsToday;
  const maxedOut = spinsToday >= MAX_DAILY_SPINS;

  const handleSpin = async () => {
    if (!firebaseUser || spinning || maxedOut) return;

    // Tampilkan iklan jika siap, tapi spin tetap jalan
    setSpinning(true);
    setResult(null);

    try {
      if (isRewardedReady()) {
        await showRewarded();
      } else {
        reloadRewarded();
      }

      // Pick random prize (weighted: lower prizes more common)
      const weights = [25, 20, 18, 15, 8, 2, 7, 5]; // total 100
      const rand = Math.random() * 100;
      let cumulative = 0;
      let prizeIndex = 0;
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (rand <= cumulative) {
          prizeIndex = i;
          break;
        }
      }

      const prize = SPIN_PRIZES[prizeIndex];
      const segmentAngle = 360 / SPIN_PRIZES.length;
      const targetAngle = 360 - (prizeIndex * segmentAngle + segmentAngle / 2);
      const fullSpins = 5 * 360; // 5 full rotations
      const toValue = currentRotation.current + fullSpins + targetAngle;

      // Animate spin
      Animated.timing(rotation, {
        toValue,
        duration: 4000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(async () => {
        currentRotation.current = toValue;

        // Claim reward
        try {
          const res = await claimSpinReward(firebaseUser.uid, prize.value);
          setResult(`🎉 ${prize.label}!`);
          setToast({ visible: true, message: res.message, type: 'success' });
        } catch (e: any) {
          setToast({ visible: true, message: e.message, type: 'error' });
        }
        setSpinning(false);
      });
    } catch (e) {
      setSpinning(false);
      setToast({ visible: true, message: 'Gagal spin', type: 'error' });
    }
  };

  const spin = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
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
      <Text style={styles.subtitle}>Nonton iklan → Spin → Dapat cuan!</Text>

      {/* Spin Counter */}
      <View style={styles.counterRow}>
        <Text style={styles.counterText}>Sisa spin hari ini: </Text>
        <Text style={[styles.counterNum, maxedOut && { color: colors.red }]}>
          {spinsLeft}/{MAX_DAILY_SPINS}
        </Text>
      </View>

      {/* Wheel */}
      <View style={styles.wheelContainer}>
        {/* Pointer */}
        <View style={styles.pointer}>
          <Text style={{ fontSize: 28 }}>▼</Text>
        </View>

        <Animated.View style={[styles.wheel, { transform: [{ rotate: spin }] }]}>
          {SPIN_PRIZES.map((prize, i) => {
            const angle = (i * 360) / SPIN_PRIZES.length;
            return (
              <View
                key={i}
                style={[
                  styles.segment,
                  {
                    backgroundColor: prize.color,
                    transform: [
                      { rotate: `${angle}deg` },
                      { translateY: -75 },
                    ],
                  },
                ]}
              >
                <Text style={styles.segmentText}>{prize.label}</Text>
              </View>
            );
          })}
          {/* Center circle */}
          <View style={styles.centerCircle}>
            <Text style={{ fontSize: 24 }}>💰</Text>
          </View>
        </Animated.View>
      </View>

      {/* Result */}
      {result && (
        <Text style={styles.result}>{result}</Text>
      )}

      {/* Spin Button */}
      <TouchableOpacity
        style={[styles.spinBtn, (spinning || maxedOut) && styles.spinBtnDisabled]}
        onPress={handleSpin}
        disabled={spinning || maxedOut}
        activeOpacity={0.8}
      >
        {spinning ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.spinBtnText}>
            {maxedOut ? '🔒 BATAS TERCAPAI' : '🎬 TONTON & SPIN'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Prize Table */}
      <View style={styles.prizeTable}>
        <Text style={styles.prizeTitle}>Hadiah</Text>
        <View style={styles.prizeGrid}>
          {SPIN_PRIZES.filter((v, i, a) => a.findIndex(p => p.value === v.value) === i)
            .sort((a, b) => a.value - b.value)
            .map((p, i) => (
              <View key={i} style={[styles.prizeChip, { backgroundColor: p.color + '30', borderColor: p.color + '60' }]}>
                <Text style={[styles.prizeChipText, { color: p.color }]}>{p.label}</Text>
              </View>
            ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBg,
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 24,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 16 },
  counterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  counterText: { fontSize: 14, color: colors.textSecondary },
  counterNum: { fontSize: 14, fontWeight: '800', color: colors.cyan },
  wheelContainer: {
    width: 260,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  pointer: {
    position: 'absolute',
    top: -10,
    zIndex: 10,
  },
  wheel: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.darkSurface,
    borderWidth: 4,
    borderColor: colors.yellow,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  segment: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  centerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.darkBg,
    borderWidth: 3,
    borderColor: colors.yellow,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  result: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.yellow,
    marginBottom: 16,
  },
  spinBtn: {
    backgroundColor: colors.purple,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 20,
    marginBottom: 24,
  },
  spinBtnDisabled: { backgroundColor: '#334155' },
  spinBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  prizeTable: { alignItems: 'center' },
  prizeTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 },
  prizeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  prizeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  prizeChipText: { fontSize: 12, fontWeight: '700' },
});
