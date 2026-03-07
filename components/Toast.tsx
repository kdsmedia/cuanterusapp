import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { colors } from '@/lib/theme';

interface Props {
  message: string;
  type?: 'success' | 'error' | 'warning';
  visible: boolean;
  onHide: () => void;
}

export default function Toast({ message, type = 'success', visible, onHide }: Props) {
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.spring(translateY, { toValue: 50, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }),
      ]).start(() => onHide());
    }
  }, [visible]);

  const bgColors = {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: bgColors[type], transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    padding: 14,
    borderRadius: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
