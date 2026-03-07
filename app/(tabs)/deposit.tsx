import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '@/lib/auth-context';
import { createDeposit } from '@/lib/api';
import { generateQRIS, generateTrxId, DEPOSIT_NOMINALS } from '@/lib/qris';
import GlassCard from '@/components/GlassCard';
import PrimaryButton from '@/components/PrimaryButton';
import Toast from '@/components/Toast';
import { colors } from '@/lib/theme';

export default function DepositScreen() {
  const { firebaseUser, userData } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [qrisData, setQrisData] = useState<string | null>(null);
  const [trxId, setTrxId] = useState('');
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as any });
  const qrRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleGenerate = async () => {
    if (!selectedAmount || !firebaseUser) return;

    setLoading(true);
    try {
      const txId = generateTrxId();
      const qris = generateQRIS(selectedAmount);

      // Save deposit to Firestore
      await createDeposit(firebaseUser.uid, selectedAmount, txId);

      setQrisData(qris);
      setTrxId(txId);

      // Start 3 minute timer
      setTimer(180);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            Alert.alert('Waktu Habis', 'QR Code sudah expired. Silakan buat ulang.');
            setQrisData(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setToast({ visible: true, message: 'QR Code berhasil dibuat! 📱', type: 'success' });
    } catch (e: any) {
      setToast({ visible: true, message: e.message || 'Gagal membuat QR', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQR = async () => {
    if (!qrRef.current) return;
    try {
      const uri = await captureRef(qrRef, {
        format: 'png',
        quality: 1,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Simpan QR Code QRIS',
        });
      } else {
        setToast({ visible: true, message: 'Sharing tidak tersedia', type: 'warning' });
      }
    } catch (e) {
      setToast({ visible: true, message: 'Gagal menyimpan QR', type: 'error' });
    }
  };

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={() => setToast((t) => ({ ...t, visible: false }))}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>💳 Deposit via QRIS</Text>
        <Text style={styles.subtitle}>Top-up saldo langsung via QRIS</Text>

        {/* Current Balance */}
        <GlassCard style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>Saldo saat ini</Text>
          <Text style={styles.balanceValue}>
            Rp {(userData?.balance ?? 0).toLocaleString('id-ID')}
          </Text>
        </GlassCard>

        {/* Nominal Selection */}
        <Text style={styles.sectionTitle}>Pilih Nominal</Text>
        <View style={styles.nominalGrid}>
          {DEPOSIT_NOMINALS.map((nom) => (
            <TouchableOpacity
              key={nom}
              style={[
                styles.nominalBtn,
                selectedAmount === nom && styles.nominalBtnActive,
              ]}
              onPress={() => {
                setSelectedAmount(nom);
                setQrisData(null); // Reset QR when changing amount
                if (timerRef.current) clearInterval(timerRef.current);
                setTimer(0);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.nominalText,
                  selectedAmount === nom && styles.nominalTextActive,
                ]}
              >
                Rp {nom.toLocaleString('id-ID')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Generate Button */}
        {!qrisData && (
          <PrimaryButton
            title="📱  BUAT QR CODE"
            onPress={handleGenerate}
            loading={loading}
            disabled={!selectedAmount}
            variant={selectedAmount ? 'cyan' : 'disabled'}
            style={{ marginTop: 16 }}
          />
        )}

        {/* QR Code Display */}
        {qrisData && (
          <View style={styles.qrSection}>
            {/* Timer */}
            <Text style={[styles.timer, timer <= 30 && { color: colors.red }]}>
              ⏱️ Selesaikan dalam {formatTimer(timer)}
            </Text>

            {/* QR Code Card */}
            <View ref={qrRef} collapsable={false} style={styles.qrCard}>
              <Text style={styles.qrTitle}>CUANTERUS DEPOSIT</Text>
              <Text style={styles.qrMethod}>Scan QRIS</Text>

              <View style={styles.qrWrapper}>
                <QRCode
                  value={qrisData}
                  size={200}
                  backgroundColor="#FFFFFF"
                  color="#000000"
                />
              </View>

              <Text style={styles.qrAmount}>
                Rp {selectedAmount?.toLocaleString('id-ID')}
              </Text>

              <View style={styles.qrDivider} />
              <Text style={styles.qrTrxId}>{trxId}</Text>
            </View>

            {/* Save Button */}
            <PrimaryButton
              title="💾  SIMPAN QR CODE"
              onPress={handleSaveQR}
              variant="blue"
              style={{ marginTop: 16 }}
            />

            {/* New QR Button */}
            <TouchableOpacity
              style={styles.newQrBtn}
              onPress={() => {
                setQrisData(null);
                if (timerRef.current) clearInterval(timerRef.current);
                setTimer(0);
              }}
            >
              <Text style={styles.newQrText}>🔄 Buat QR Baru</Text>
            </TouchableOpacity>

            {/* Instructions */}
            <GlassCard style={styles.instructions}>
              <Text style={styles.instrTitle}>📋 Cara Pembayaran:</Text>
              <Text style={styles.instrStep}>1. Klik tombol "SIMPAN QR CODE"</Text>
              <Text style={styles.instrStep}>2. Buka aplikasi BCA, DANA, GoPay, dll</Text>
              <Text style={styles.instrStep}>3. Pilih menu Scan / QRIS</Text>
              <Text style={styles.instrStep}>4. Klik ikon Galeri, pilih gambar QR tadi</Text>
              <Text style={styles.instrStep}>5. Nominal muncul otomatis, bayar!</Text>
              <Text style={[styles.instrStep, { color: colors.yellow, marginTop: 8 }]}>
                ⚠️ Saldo masuk setelah admin konfirmasi (maks 1x24 jam)
              </Text>
            </GlassCard>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.darkBg },
  scroll: { padding: 20, paddingTop: 56 },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 16 },
  balanceInfo: { marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 13, color: colors.textSecondary },
  balanceValue: { fontSize: 18, fontWeight: '800', color: colors.yellow },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },

  // Nominal grid
  nominalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  nominalBtn: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nominalBtnActive: {
    borderColor: colors.cyan,
    backgroundColor: 'rgba(6,182,212,0.15)',
  },
  nominalText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  nominalTextActive: {
    color: colors.cyan,
  },

  // QR Section
  qrSection: { marginTop: 20, alignItems: 'center' },
  timer: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.yellow,
    marginBottom: 16,
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 1,
  },
  qrMethod: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 16,
    fontWeight: '600',
  },
  qrWrapper: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  qrAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 16,
  },
  qrDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
    borderStyle: 'dashed',
  },
  qrTrxId: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
  },

  newQrBtn: {
    marginTop: 12,
    padding: 10,
  },
  newQrText: {
    fontSize: 14,
    color: colors.cyan,
    fontWeight: '700',
  },

  // Instructions
  instructions: { marginTop: 16, width: '100%' },
  instrTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  instrStep: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 20 },
});
