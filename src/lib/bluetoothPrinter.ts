// src/lib/bluetoothPrinter.ts
// Modul Bluetooth Thermal Printer untuk POS SKY HAUS
// Kompatibel dengan: POS58B, 58mm, ESC/POS
//
// Catatan: Modul ini hanya aktif di dalam APK Android (Capacitor).
// Di browser biasa, semua fungsi akan fallback / skip.

// ============================================
// Types
// ============================================
export interface BluetoothDevice {
  name: string;
  address: string;
  id?: string;
  class?: number;
}

export interface ReceiptData {
  storeName: string;
  address?: string;
  phone?: string;
  invoiceNo: string;
  cashierName: string;
  date: string;
  time: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  grandTotal: number;
  paymentMethod: string;
  cashReceived?: number;
  changeAmount?: number;
  footer?: string;
}

// ============================================
// Platform Detection
// ============================================
function isNativePlatform(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
}

// ============================================
// Lazy-load BluetoothSerial (hanya di native)
// ============================================
let _btSerial: any = null;

async function getBTSerial() {
  if (!isNativePlatform()) {
    throw new Error('Bluetooth hanya tersedia di aplikasi Android (APK).');
  }
  if (!_btSerial) {
    const mod = await import('capacitor-bluetooth-serial');
    _btSerial = mod.BluetoothSerial;
  }
  return _btSerial;
}

// ============================================
// ESC/POS Command Constants
// ============================================
const ESC = 0x1B;
const GS  = 0x1D;

const CMD = {
  INIT:           [ESC, 0x40],
  ALIGN_LEFT:     [ESC, 0x61, 0x00],
  ALIGN_CENTER:   [ESC, 0x61, 0x01],
  BOLD_ON:        [ESC, 0x45, 0x01],
  BOLD_OFF:       [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT:  [ESC, 0x21, 0x10],
  NORMAL_SIZE:    [ESC, 0x21, 0x00],
  CUT_PAPER:      [GS,  0x56, 0x01],
  FEED_LINES:     (n: number) => [ESC, 0x64, n],
};

// ============================================
// Helpers
// ============================================
const CHAR_WIDTH = 32; // 58mm thermal = 32 chars per line

function strToBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 128) {
      bytes.push(code);
    } else {
      bytes.push(0x3F); // '?' for non-ASCII
    }
  }
  return bytes;
}

function padRight(text: string, len: number): string {
  return text.length >= len ? text.substring(0, len) : text + ' '.repeat(len - text.length);
}

function formatRow(left: string, right: string): string {
  const maxLeft = CHAR_WIDTH - right.length - 1;
  const truncLeft = left.length > maxLeft ? left.substring(0, maxLeft) : left;
  return padRight(truncLeft, CHAR_WIDTH - right.length) + right + '\n';
}

function divider(): string {
  return '-'.repeat(CHAR_WIDTH) + '\n';
}

function formatRupiahPlain(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

// ============================================
// State
// ============================================
let connectedAddress: string | null = null;

// ============================================
// PUBLIC API
// ============================================

/**
 * Cek apakah bisa menggunakan Bluetooth (di APK native)
 */
export function canUseBluetooth(): boolean {
  return isNativePlatform();
}

/**
 * Scan perangkat Bluetooth yang sudah di-pair
 */
export async function scanBluetoothDevices(): Promise<BluetoothDevice[]> {
  const BT = await getBTSerial();

  const enabled = await BT.isEnabled();
  if (!enabled.enabled) {
    throw new Error('Bluetooth tidak aktif. Aktifkan Bluetooth di pengaturan perangkat.');
  }

  const result = await BT.list();
  return (result.devices || []) as BluetoothDevice[];
}

/**
 * Hubungkan ke printer Bluetooth
 */
export async function connectToPrinter(address: string): Promise<void> {
  const BT = await getBTSerial();

  if (connectedAddress) {
    try { await BT.disconnect(); } catch { /* ignore */ }
  }

  await BT.connect({ address });
  connectedAddress = address;

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('pos_printer_address', address);
  }
}

/**
 * Putuskan koneksi printer
 */
export async function disconnectPrinter(): Promise<void> {
  if (!connectedAddress) return;
  try {
    const BT = await getBTSerial();
    await BT.disconnect();
  } catch { /* ignore */ }
  connectedAddress = null;
}

/**
 * Cek apakah printer terhubung
 */
export async function isPrinterConnected(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const BT = await getBTSerial();
    const result = await BT.isConnected();
    return result.connected;
  } catch {
    return false;
  }
}

/**
 * Auto-reconnect ke printer terakhir jika tersimpan
 */
export async function autoReconnect(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  const saved = localStorage.getItem('pos_printer_address');
  if (!saved) return false;
  try {
    await connectToPrinter(saved);
    return true;
  } catch {
    return false;
  }
}

/**
 * Bangun byte array struk ESC/POS untuk printer 58mm
 */
export function buildReceiptBytes(data: ReceiptData): Uint8Array {
  const bytes: number[] = [];
  const push = (...args: number[][]) => args.forEach(a => bytes.push(...a));
  const text = (s: string) => bytes.push(...strToBytes(s));

  // INIT
  push(CMD.INIT);

  // HEADER — centered, bold, double height
  push(CMD.ALIGN_CENTER, CMD.BOLD_ON, CMD.DOUBLE_HEIGHT);
  text(data.storeName + '\n');
  push(CMD.NORMAL_SIZE, CMD.BOLD_OFF);
  if (data.address) text(data.address + '\n');
  if (data.phone) text('WA: ' + data.phone + '\n');

  // DIVIDER
  push(CMD.ALIGN_LEFT);
  text(divider());

  // INFO TRANSAKSI
  text(formatRow('Invoice', data.invoiceNo));
  text(formatRow('Tanggal', data.date));
  text(formatRow('Waktu', data.time));
  text(formatRow('Kasir', data.cashierName));
  text(formatRow('Bayar', data.paymentMethod));
  text(divider());

  // ITEMS
  for (const item of data.items) {
    text(item.name + '\n');
    text(formatRow(
      `  ${item.quantity} x ${formatRupiahPlain(item.unitPrice)}`,
      formatRupiahPlain(item.subtotal)
    ));
  }
  text(divider());

  // TOTAL SECTION
  text(formatRow('Subtotal', formatRupiahPlain(data.subtotal)));
  if (data.taxRate && data.taxRate > 0 && data.taxAmount) {
    text(formatRow(`Pajak (${data.taxRate}%)`, formatRupiahPlain(data.taxAmount)));
  }

  push(CMD.BOLD_ON);
  text(formatRow('TOTAL', formatRupiahPlain(data.grandTotal)));
  push(CMD.BOLD_OFF);
  text(divider());

  // PEMBAYARAN TUNAI
  if (data.paymentMethod === 'CASH' && data.cashReceived !== undefined) {
    text(formatRow('Tunai', formatRupiahPlain(data.cashReceived)));
    text(formatRow('Kembalian', formatRupiahPlain(data.changeAmount || 0)));
    text(divider());
  }

  // FOOTER
  push(CMD.ALIGN_CENTER);
  text('\n');
  text((data.footer || 'Terima Kasih!') + '\n');
  text('SKY HAUS\n');
  text('\n');

  // FEED & CUT
  push(CMD.FEED_LINES(4), CMD.CUT_PAPER);

  return new Uint8Array(bytes);
}

/**
 * Kirim struk ke printer Bluetooth
 */
export async function printReceipt(data: ReceiptData): Promise<void> {
  // Auto-connect jika perlu
  if (!connectedAddress) {
    const saved = typeof localStorage !== 'undefined'
      ? localStorage.getItem('pos_printer_address')
      : null;
    if (saved) {
      await connectToPrinter(saved);
    } else {
      throw new Error('Printer belum terhubung. Pilih printer di menu Bluetooth.');
    }
  }

  const connected = await isPrinterConnected();
  if (!connected) {
    throw new Error('Koneksi printer terputus. Hubungkan ulang.');
  }

  const BT = await getBTSerial();
  const receiptBytes = buildReceiptBytes(data);

  // Kirim dalam chunks 512 byte untuk stabilitas
  const CHUNK = 512;
  for (let i = 0; i < receiptBytes.length; i += CHUNK) {
    const slice = receiptBytes.slice(i, i + CHUNK);
    const base64 = btoa(String.fromCharCode(...slice));
    await BT.write({ data: base64 });
    await new Promise(r => setTimeout(r, 50));
  }
}
