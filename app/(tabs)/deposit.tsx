import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useAuth } from '@/lib/auth-context';
import { createDeposit, confirmDepositPayment } from '@/lib/api';
import { generateQRIS, generateTrxId, DEPOSIT_NOMINALS } from '@/lib/qris';
import { sendLocalNotification } from '@/lib/permissions';
import GlassCard from '@/components/GlassCard';
import PrimaryButton from '@/components/PrimaryButton';
import Toast from '@/components/Toast';
import { colors } from '@/lib/theme';

export default function DepositScreen() {
  const { firebaseUser, userData } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [qrisData, setQrisData] = useState<string | null>(null);
  const [trxId, setTrxId] = useState('');
  const [depositDocId, setDepositDocId] = useState('');
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as any });
  const qrRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleGenerate = async () => {
    if (!selectedAmount || !firebaseUser) return;

    setLoading(true);
    setConfirmed(false);
    try {
      const txId = generateTrxId();
      const qris = generateQRIS(selectedAmount);
      const docId = await createDeposit(firebaseUser.uid, selectedAmount, txId);

      setQrisData(qris);
      setTrxId(txId);
      setDepositDocId(docId);

      // Start 5 minute timer
      setTimer(300);
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

      setToast({ visible: true, message: 'QR Code berhasil dibuat! Scan & bayar 📱', type: 'success' });
    } catch (e: any) {
      setToast({ visible: true, message: e.message || 'Gagal membuat QR', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ===== AUTO CONFIRM PAYMENT =====
  const handleConfirmPayment = async () => {
    if (!firebaseUser || !depositDocId || !selectedAmount || confirmed) return;

    Alert.alert(
      '✅ Konfirmasi Pembayaran',
      `Apakah kamu sudah berhasil membayar Rp ${selectedAmount.toLocaleString('id-ID')} via QRIS?\n\nSaldo akan langsung masuk ke akunmu.`,
      [
        { text: 'Belum', style: 'cancel' },
        {
          text: 'Sudah Bayar',
          onPress: async () => {
            setConfirming(true);
            try {
              await confirmDepositPayment(depositDocId, firebaseUser.uid, selectedAmount);
              setConfirmed(true);
              if (timerRef.current) clearInterval(timerRef.current);

              setToast({
                visible: true,
                message: `✅ Rp ${selectedAmount.toLocaleString('id-ID')} berhasil masuk ke saldo!`,
                type: 'success',
              });

              sendLocalNotification(
                '💳 Deposit Berhasil!',
                `Rp ${selectedAmount.toLocaleString('id-ID')} telah ditambahkan ke saldo kamu.`,
                'deposit'
              );
            } catch (e: any) {
              setToast({ visible: true, message: e.message, type: 'error' });
            } finally {
              setConfirming(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveQR = async () => {
    if (!qrRef.current) return;
    try {
      const uri = await captureRef(qrRef, { format: 'png', quality: 1 });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Simpan QR Code QRIS' });
      } else {
        setToast({ visible: true, message: 'Sharing tidak tersedia', type: 'warning' });
      }
    } catch (e) {
      setToast({ visible: true, message: 'Gagal menyimpan QR', type: 'error' });
    }
  };

  const handleReset = () => {
    setQrisData(null);
    setConfirmed(false);
    setDepositDocId('');
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(0);
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
        {!qrisData && (
          <>
            <Text style={styles.sectionTitle}>Pilih Nominal</Text>
            <View style={styles.nominalGrid}>
              {DEPOSIT_NOMINALS.map((nom) => (
                <TouchableOpacity
                  key={nom}
                  style={[styles.nominalBtn, selectedAmount === nom && styles.nominalBtnActive]}
                  onPress={() => setSelectedAmount(nom)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.nominalText, selectedAmount === nom && styles.nominalTextActive]}>
                    Rp {nom.toLocaleString('id-ID')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <PrimaryButton
              title="📱  BUAT QR CODE"
              onPress={handleGenerate}
              loading={loading}
              disabled={!selectedAmount}
              variant={selectedAmount ? 'cyan' : 'disabled'}
              style={{ marginTop: 16 }}
            />
          </>
        )}

        {/* QR Code Display */}
        {qrisData && !confirmed && (
          <View style={styles.qrSection}>
            <Text style={[styles.timer, timer <= 60 && { color: colors.red }]}>
              ⏱️ Selesaikan dalam {formatTimer(timer)}
            </Text>

            {/* QR Code Card */}
            <View ref={qrRef} collapsable={false} style={styles.qrCard}>
              <Text style={styles.qrTitle}>CUANTERUS DEPOSIT</Text>
              <Text style={styles.qrMethod}>Scan QRIS</Text>
              <View style={styles.qrWrapper}>
                <QRCode value={qrisData} size={200} backgroundColor="#FFFFFF" color="#000000" />
              </View>
              <Text style={styles.qrAmount}>
                Rp {selectedAmount?.toLocaleString('id-ID')}
              </Text>
              <View style={styles.qrDivider} />
              <Text style={styles.qrTrxId}>{trxId}</Text>
            </View>

            {/* Save QR */}
            <PrimaryButton
              title="💾  SIMPAN QR CODE"
              onPress={handleSaveQR}
              variant="blue"
              style={{ marginTop: 16 }}
            />

            {/* CONFIRM PAYMENT BUTTON */}
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirmPayment}
              disabled={confirming}
              activeOpacity={0.8}
            >
              {confirming ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.confirmBtnIcon}>✅</Text>
                  <Text style={styles.confirmBtnText}>SUDAH BAYAR</Text>
                  <Text style={styles.confirmBtnDesc}>Tekan setelah pembayaran berhasil</Text>
                </>
              )}
            </TouchableOpacity>

            {/* New QR Button */}
            <TouchableOpacity style={styles.newQrBtn} onPress={handleReset}>
              <Text style={styles.newQrText}>🔄 Buat QR Baru</Text>
            </TouchableOpacity>

            {/* Instructions */}
            <GlassCard style={styles.instructions}>
              <Text style={styles.instrTitle}>📋 Cara Pembayaran:</Text>
              <Text style={styles.instrStep}>1. Simpan QR Code ke galeri</Text>
              <Text style={styles.instrStep}>2. Buka aplikasi DANA, GoPay, BCA, dll</Text>
              <Text style={styles.instrStep}>3. Pilih menu Scan / QRIS</Text>
              <Text style={styles.instrStep}>4. Klik ikon Galeri, pilih gambar QR tadi</Text>
              <Text style={styles.instrStep}>5. Bayar sesuai nominal</Text>
              <Text style={[styles.instrStep, { color: colors.green, fontWeight: '700', marginTop: 8 }]}>
                6. Kembali ke sini → Tekan "SUDAH BAYAR"
              </Text>
              <Text style={[styles.instrStep, { color: colors.cyan, marginTop: 4 }]}>
                💡 Saldo otomatis masuk setelah konfirmasi!
              </Text>
            </GlassCard>
          </View>
        )}

        {/* Success State */}
        {confirmed && (
          <View style={styles.successSection}>
            <Text style={styles.successIcon}>🎉</Text>
            <Text style={styles.successTitle}>Deposit Berhasil!</Text>
            <Text style={styles.successAmount}>
              +Rp {selectedAmount?.toLocaleString('id-ID')}
            </Text>
            <Text style={styles.successDesc}>
              Saldo telah ditambahkan ke akunmu
            </Text>

            <GlassCard style={{ marginTop: 20, width: '100%' }}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Nominal</Text>
                <Text style={styles.receiptValue}>Rp {selectedAmount?.toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Metode</Text>
                <Text style={styles.receiptValue}>QRIS</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>ID Transaksi</Text>
                <Text style={[styles.receiptValue, { fontFamily: 'monospace', fontSize: 11 }]}>{trxId}</Text>
              </View>
              <View style={[styles.receiptRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.receiptLabel}>Status</Text>
                <Text style={[styles.receiptValue, { color: colors.green }]}>✅ Berhasil</Text>
              </View>
            </GlassCard>

            <PrimaryButton
              title="💳  DEPOSIT LAGI"
              onPress={handleReset}
              style={{ marginTop: 20 }}
            />
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

  nominalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nominalBtn: {
    width: '31%', flexGrow: 1,
    backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  nominalBtnActive: { borderColor: colors.cyan, backgroundColor: 'rgba(6,182,212,0.15)' },
  nominalText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  nominalTextActive: { color: colors.cyan },

  qrSection: { marginTop: 20, alignItems: 'center' },
  timer: { fontSize: 14, fontWeight: '800', color: colors.yellow, marginBottom: 16 },
  qrCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24,
    alignItems: 'center', width: '100%',
  },
  qrTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', letterSpacing: 1 },
  qrMethod: { fontSize: 11, color: '#64748b', marginBottom: 16, fontWeight: '600' },
  qrWrapper: {
    padding: 12, backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 2, borderColor: '#e2e8f0',
  },
  qrAmount: { fontSize: 28, fontWeight: '900', color: '#0f172a', marginTop: 16 },
  qrDivider: { width: '100%', height: 1, backgroundColor: '#e2e8f0', marginVertical: 12 },
  qrTrxId: { fontSize: 10, fontWeight: '800', color: '#94a3b8' },

  // Confirm Payment Button
  confirmBtn: {
    marginTop: 16,
    width: '100%',
    backgroundColor: '#10b981',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmBtnIcon: { fontSize: 28 },
  confirmBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    marginTop: 4,
    letterSpacing: 1,
  },
  confirmBtnDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },

  newQrBtn: { marginTop: 12, padding: 10 },
  newQrText: { fontSize: 14, color: colors.cyan, fontWeight: '700' },

  instructions: { marginTop: 16, width: '100%' },
  instrTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  instrStep: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 20 },

  // Success
  successSection: { marginTop: 20, alignItems: 'center' },
  successIcon: { fontSize: 64 },
  successTitle: { fontSize: 24, fontWeight: '900', color: colors.green, marginTop: 8 },
  successAmount: { fontSize: 36, fontWeight: '900', color: colors.yellow, marginTop: 8 },
  successDesc: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  receiptRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  receiptLabel: { fontSize: 13, color: colors.textMuted },
  receiptValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
});
