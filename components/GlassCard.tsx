import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { colors } from '@/lib/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  yellowBorder?: boolean;
}

export default function GlassCard({ children, style, yellowBorder }: Props) {
  return (
    <View style={[
      styles.card,
      yellowBorder && styles.yellowBorder,
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  yellowBorder: {
    borderColor: colors.yellowBorder,
  },
});
