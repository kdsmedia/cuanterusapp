/**
 * QRIS Generator - Generate dynamic QRIS payment codes
 * Based on QRIS standard with CRC16-CCITT checksum
 */

const QRIS_BASE =
  '00020101021126610014COM.GO-JEK.WWW01189360091439663050810210G9663050810303UMI51440014ID.CO.QRIS.WWW0215ID10254671365660303UMI5204549953033605802ID5917ALTOMEDIA, Grosir6008KARAWANG61054136162070703A016304D21A';

/**
 * CRC16-CCITT calculation for QRIS
 */
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generate full QRIS string with amount
 */
export function generateQRIS(amount: number): string {
  const amountStr = amount.toString();
  const qrisTanpaCRC = QRIS_BASE.split('6304')[0];
  const tagNominal = '54' + amountStr.length.toString().padStart(2, '0') + amountStr;
  const dataSiapCRC = qrisTanpaCRC + tagNominal + '6304';
  return dataSiapCRC + crc16(dataSiapCRC);
}

/**
 * Generate transaction ID
 */
export function generateTrxId(): string {
  return 'TRX-' + Math.floor(Date.now() / 1000);
}

/**
 * Deposit nominal options
 */
export const DEPOSIT_NOMINALS = [
  5_000,
  10_000,
  20_000,
  30_000,
  40_000,
  50_000,
  100_000,
  150_000,
  200_000,
];
