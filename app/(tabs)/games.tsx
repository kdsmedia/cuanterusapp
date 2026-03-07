import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { GAME_LIST, GameInfo } from '@/lib/game-bridge';
import GlassCard from '@/components/GlassCard';
import Toast from '@/components/Toast';
import { colors } from '@/lib/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

// Map game icons to require() - karena React Native butuh static require untuk bundled assets
// Untuk production, ganti dengan URL server atau CDN
const gameIcons: Record<string, any> = {
  'AztecGemsDeluxe.jpg': require('@/assets/ico/AztecGemsDeluxe.jpg'),
  'BonanzaGold.jpg': require('@/assets/ico/BonanzaGold.jpg'),
  'CandyVillage.jpg': require('@/assets/ico/CandyVillage.jpg'),
  'ChilliHeat.jpg': require('@/assets/ico/ChilliHeat.jpg'),
  'CrazyParty.jpg': require('@/assets/ico/CrazyParty.jpg'),
  'EmperorsChina.jpg': require('@/assets/ico/EmperorsChina.jpg'),
  'GatesofOlympus.jpg': require('@/assets/ico/GatesofOlympus.jpg'),
  'Geisha.jpg': require('@/assets/ico/Geisha.jpg'),
  'LuckyGirls.jpg': require('@/assets/ico/LuckyGirls.jpg'),
  'MadameDestiny.jpg': require('@/assets/ico/MadameDestiny.jpg'),
  'MagicPrincess.jpg': require('@/assets/ico/MagicPrincess.jpg'),
  'SafariKing.jpg': require('@/assets/ico/SafariKing.jpg'),
  'StarlightPrincess.jpg': require('@/assets/ico/StarlightPrincess.jpg'),
  'SunWukongPT.jpg': require('@/assets/ico/SunWukongPT.jpg'),
  'SweetBonanza.jpg': require('@/assets/ico/SweetBonanza.jpg'),
  'TheDogHouse.jpg': require('@/assets/ico/TheDogHouse.jpg'),
  'TweetyHouse.jpg': require('@/assets/ico/TweetyHouse.jpg'),
  'WildDragonAM.jpg': require('@/assets/ico/WildDragonAM.jpg'),
  'WildWestGold.jpg': require('@/assets/ico/WildWestGold.jpg'),
};

export default function GamesScreen() {
  const { firebaseUser, userData } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'warning' as any });

  const balance = userData?.balance ?? 0;

  // Filter games berdasarkan search
  const filteredGames = GAME_LIST.filter(game =>
    game.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    game.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlayGame = (game: GameInfo) => {
    if (!firebaseUser) {
      setToast({ visible: true, message: 'Login dulu untuk bermain!', type: 'warning' });
      return;
    }
    if (balance <= 0) {
      setToast({ visible: true, message: 'Saldo tidak cukup! Deposit atau klaim bonus dulu.', type: 'warning' });
      return;
    }
    // Navigate ke game screen dengan parameter
    router.push({ pathname: '/game', params: { gameId: game.id, gameName: game.displayName } });
  };

  const renderGameCard = (game: GameInfo) => {
    const icon = gameIcons[game.icon];

    return (
      <TouchableOpacity
        key={game.id}
        style={styles.gameCard}
        activeOpacity={0.8}
        onPress={() => handlePlayGame(game)}
      >
        <View style={styles.gameImageContainer}>
          {icon ? (
            <Image source={icon} style={styles.gameImage} resizeMode="cover" />
          ) : (
            <View style={styles.gamePlaceholder}>
              <Text style={styles.gamePlaceholderText}>🎰</Text>
            </View>
          )}
          {/* Provider badge */}
          <View style={styles.providerBadge}>
            <Text style={styles.providerBadgeText}>{game.provider}</Text>
          </View>
        </View>
        <View style={styles.gameInfo}>
          <Text style={styles.gameName} numberOfLines={1}>{game.displayName}</Text>
          <Text style={styles.gameCategory}>{game.category}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🎮 Games</Text>
          <View style={styles.balanceChip}>
            <Text style={styles.balanceChipText}>
              Rp {balance.toLocaleString('id-ID')}
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari game..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Game Count */}
        <Text style={styles.gameCount}>
          {filteredGames.length} game tersedia
        </Text>

        {/* Game Grid */}
        <View style={styles.gameGrid}>
          {filteredGames.map(game => renderGameCard(game))}
        </View>

        {/* Info Footer */}
        <GlassCard style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Info Bermain</Text>
          <Text style={styles.infoText}>
            • Saldo game otomatis terhubung dengan saldo aplikasi{'\n'}
            • Kemenangan langsung masuk ke saldo utama{'\n'}
            • Pastikan koneksi internet stabil saat bermain{'\n'}
            • Bermain dengan bijak dan bertanggung jawab
          </Text>
        </GlassCard>

        <View style={{ height: 30 }} />
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBg,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  balanceChip: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: colors.cyan,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  balanceChipText: {
    color: colors.cyan,
    fontWeight: '700',
    fontSize: 13,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: colors.darkSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 14,
  },
  gameCount: {
    paddingHorizontal: 16,
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 12,
  },
  gameGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  gameCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.darkSurface,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  gameImageContainer: {
    width: '100%',
    height: CARD_WIDTH * 0.6,
    backgroundColor: colors.darkCard,
    position: 'relative',
  },
  gameImage: {
    width: '100%',
    height: '100%',
  },
  gamePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.darkCard,
  },
  gamePlaceholderText: {
    fontSize: 36,
  },
  providerBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  providerBadgeText: {
    color: colors.cyan,
    fontSize: 8,
    fontWeight: '600',
  },
  gameInfo: {
    padding: 10,
  },
  gameName: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2,
  },
  gameCategory: {
    color: colors.textMuted,
    fontSize: 10,
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
  },
  infoTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 8,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 20,
  },
});
