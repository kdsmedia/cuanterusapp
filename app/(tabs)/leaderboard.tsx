import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { getLeaderboard, getUserLevel } from '@/lib/api';
import GlassCard from '@/components/GlassCard';
import { colors } from '@/lib/theme';

interface LeaderEntry {
  name: string;
  totalEarned: number;
  level: string;
  emoji: string;
}

export default function LeaderboardScreen() {
  const { userData } = useAuth();
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = async () => {
    try {
      const data = await getLeaderboard();
      setLeaders(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
  };

  // Current user rank
  const myLevel = getUserLevel(userData?.totalEarned || 0);
  const myRank = leaders.findIndex(l => l.name === userData?.name) + 1;

  const medalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const renderItem = ({ item, index }: { item: LeaderEntry; index: number }) => {
    const rank = index + 1;
    const isTop3 = rank <= 3;

    return (
      <GlassCard style={[styles.card, isTop3 && styles.cardTop3]}>
        <View style={styles.row}>
          <Text style={[styles.rank, isTop3 && styles.rankTop3]}>
            {medalEmoji(rank)}
          </Text>
          <View style={styles.info}>
            <Text style={styles.name}>
              {item.emoji} {item.name}
            </Text>
            <Text style={styles.level}>{item.level}</Text>
          </View>
          <Text style={[styles.earned, isTop3 && { color: colors.yellow }]}>
            Rp {item.totalEarned.toLocaleString('id-ID')}
          </Text>
        </View>
      </GlassCard>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏆 Leaderboard</Text>
      <Text style={styles.subtitle}>Peringkat berdasarkan total penghasilan</Text>

      {/* My Rank */}
      {userData && (
        <View style={styles.myRank}>
          <Text style={styles.myRankLabel}>Peringkat Kamu</Text>
          <View style={styles.myRankRow}>
            <Text style={styles.myRankNum}>
              {myRank > 0 ? `#${myRank}` : '-'}
            </Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.myRankName}>{myLevel.current.emoji} {userData.name}</Text>
              <Text style={styles.myRankLevel}>{myLevel.current.name}</Text>
            </View>
            <Text style={styles.myRankEarned}>
              Rp {(userData.totalEarned || 0).toLocaleString('id-ID')}
            </Text>
          </View>
        </View>
      )}

      {/* List */}
      <FlatList
        data={leaders}
        renderItem={renderItem}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Belum ada data.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBg,
    paddingHorizontal: 16,
    paddingTop: 56,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  myRank: {
    backgroundColor: 'rgba(6,182,212,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.3)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  myRankLabel: { fontSize: 10, color: colors.cyan, fontWeight: '700', marginBottom: 8, letterSpacing: 1 },
  myRankRow: { flexDirection: 'row', alignItems: 'center' },
  myRankNum: { fontSize: 24, fontWeight: '900', color: colors.cyan },
  myRankName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  myRankLevel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  myRankEarned: { fontSize: 14, fontWeight: '700', color: colors.yellow },
  card: { marginBottom: 8 },
  cardTop3: { borderColor: 'rgba(251,191,36,0.3)' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rank: { fontSize: 16, fontWeight: '800', color: colors.textMuted, width: 40 },
  rankTop3: { fontSize: 22 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  level: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  earned: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
});
