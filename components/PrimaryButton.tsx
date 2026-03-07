import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { colors } from '@/lib/theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'cyan' | 'blue' | 'red' | 'disabled';
  style?: ViewStyle;
}

export default function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  variant = 'cyan',
  style,
}: Props) {
  const bg = {
    cyan: { backgroundColor: colors.cyan },
    blue: { backgroundColor: colors.blue },
    red: { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.5)' },
    disabled: { backgroundColor: '#334155' },
  };

  const textColor = variant === 'red' ? colors.red : variant === 'disabled' ? colors.textMuted : '#fff';

  return (
    <TouchableOpacity
      style={[styles.btn, bg[variant], disabled && { opacity: 0.6 }, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
});
