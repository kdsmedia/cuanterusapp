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
import Toast from '@/components/Toast';
import { colors } from '@/lib/theme';

const { width } = Dimensions.get('window');
const CARD_GAP = 8;
const PADDING = 12;
const CARD_WIDTH = (width - PADDING * 2 - CARD_GAP * 2) / 3;

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
    router.push({ pathname: '/game', params: { gameId: game.id, gameName: game.displayName } });
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>🎮 Games</Text>
            <Text style={styles.headerSub}>{GAME_LIST.length} game tersedia</Text>
          </View>
          <View style={styles.balanceChip}>
            <Text style={styles.balanceLabel}>Saldo</Text>
            <Text style={styles.balanceValue}>Rp {balance.toLocaleString('id-ID')}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari game atau provider..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Game Grid — 3 kolom */}
        <View style={styles.grid}>
          {filteredGames.map((game) => {
            const icon = gameIcons[game.icon];
            return (
              <TouchableOpacity
                key={game.id}
                style={styles.card}
                activeOpacity={0.75}
                onPress={() => handlePlayGame(game)}
              >
                {/* Icon */}
                <View style={styles.iconWrap}>
                  {icon ? (
                    <Image source={icon} style={styles.iconImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.iconPlaceholder}>
                      <Text style={{ fontSize: 28 }}>🎰</Text>
                    </View>
                  )}
                </View>

                {/* Name */}
                <Text style={styles.gameName} numberOfLines={2}>
                  {game.displayName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Empty state */}
        {filteredGames.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔎</Text>
            <Text style={styles.emptyText}>Game tidak ditemukan</Text>
          </View>
        )}

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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  balanceChip: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(6,182,212,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6,182,212,0.35)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  balanceLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
  },
  balanceValue: {
    color: colors.cyan,
    fontWeight: '800',
    fontSize: 14,
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.darkSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    marginHorizontal: PADDING,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    paddingVertical: 10,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },

  // Grid 3 columns
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: PADDING,
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.darkSurface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.darkCard,
    overflow: 'hidden',
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  iconPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameName: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    lineHeight: 14,
  },

  // Empty
  empty: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
