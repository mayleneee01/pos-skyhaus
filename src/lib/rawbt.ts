import type { TransactionWithDetails, StoreSettingData } from '@/types';

// ============================================
// ESC/POS Commands
// ============================================
const ESC = 0x1B;
const GS  = 0x1D;
const LF  = 0x0A;

const CMD = {
  INIT:           [ESC, 0x40],
  ALIGN_LEFT:     [ESC, 0x61, 0x00],
  ALIGN_CENTER:   [ESC, 0x61, 0x01],
  BOLD_ON:        [ESC, 0x45, 0x01],
  BOLD_OFF:       [ESC, 0x45, 0x00],
  DOUBLE_STRIKE_ON: [ESC, 0x47, 0x01],
  CUT_PAPER:      [GS,  0x56, 0x01],
  FEED_LINES:     (n: number) => [ESC, 0x64, n],
};

const CHAR_WIDTH = 32;

// ============================================
// Helpers
// ============================================

function strToBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    // basic ascii only
    if (code > 127) code = 63; // '?'
    bytes.push(code);
  }
  return bytes;
}

function padRight(text: string, len: number): string {
  return text.length >= len ? text.substring(0, len) : text + ' '.repeat(len - text.length);
}

function padLeft(text: string, len: number): string {
  return text.length >= len ? text.substring(0, len) : ' '.repeat(len - text.length) + text;
}

function formatLine(left: string, right: string): string {
  const maxLeft = CHAR_WIDTH - right.length - 1;
  let truncLeft = left;
  if (truncLeft.length > maxLeft) {
    truncLeft = truncLeft.substring(0, maxLeft);
  }
  return padRight(truncLeft, CHAR_WIDTH - right.length) + right + '\n';
}

function divider(): string {
  return '-'.repeat(CHAR_WIDTH) + '\n';
}

function formatRupiahPlain(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

// ============================================
// Image to ESC/POS Raster (GS v 0)
// ============================================

async function getImagePixels(url: string, maxWidth: number = 384): Promise<{ data: Uint8ClampedArray, width: number, height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);

      let w = img.width;
      let h = img.height;

      // Scale down if too wide
      if (w > maxWidth) {
        const ratio = maxWidth / w;
        w = maxWidth;
        h = Math.floor(h * ratio);
      }

      // Width must be multiple of 8 for raster bit image
      w = Math.floor(w / 8) * 8;
      if (w === 0) return resolve(null);

      canvas.width = w;
      canvas.height = h;

      // Draw white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      
      // Draw image
      ctx.drawImage(img, 0, 0, w, h);
      
      resolve({
        data: ctx.getImageData(0, 0, w, h).data,
        width: w,
        height: h
      });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function getLogoBytes(url: string): Promise<number[]> {
  const pixels = await getImagePixels(url, 160); // Reduced logo size
  if (!pixels) return [];

  const { data, width, height } = pixels;
  const xL = Math.floor(width / 8) % 256;
  const xH = Math.floor(width / 8 / 256);
  const yL = height % 256;
  const yH = Math.floor(height / 256);

  // GS v 0 command: 1D 76 30 00 xL xH yL yH
  const bytes = [GS, 0x76, 0x30, 0x00, xL, xH, yL, yH];

  // Convert RGBA to 1-bit monochrome
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < Math.floor(width / 8); x++) {
      let byte = 0;
      for (let b = 0; b < 8; b++) {
        const idx = (y * width + (x * 8 + b)) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const bl = data[idx + 2];
        const a = data[idx + 3];
        
        // Luminance calculation
        const luminance = (0.299 * r + 0.587 * g + 0.114 * bl);
        const isBlack = (luminance < 128) && (a > 128);
        
        if (isBlack) {
          byte |= (1 << (7 - b));
        }
      }
      bytes.push(byte);
    }
  }

  return bytes;
}

// ============================================
// Receipt Builder
// ============================================

export async function generateReceiptEscPos(transaction: TransactionWithDetails, settings?: StoreSettingData): Promise<Uint8Array> {
  const bytes: number[] = [];
  const push = (...args: number[][]) => args.forEach(a => bytes.push(...a));
  const text = (s: string) => bytes.push(...strToBytes(s));

  // 1. INIT
  push(CMD.INIT);
  push([ESC, 0x4D, 0x00]); // 1. Paksa gunakan Font A (Font paling besar/tebal standar)
  push([ESC, 0x21, 0x08]); // 2. Nyalakan Mode Emphasized (Tebal ekstra)
  push(CMD.DOUBLE_STRIKE_ON); // 3. Double Strike (Print 2 kali)
  push(CMD.BOLD_ON); // 4. Mode Bold biasa

  // 2. LOGO
  push(CMD.ALIGN_CENTER);
  try {
    const logoUrl = '/logo-sky-haus.png'; // Use local static logo
    const logoBytes = await getLogoBytes(logoUrl);
    if (logoBytes.length > 0) {
      bytes.push(...logoBytes);
    }
  } catch (err) {
    console.error('Logo failed', err);
  }

  // 3. HEADER
  text((settings?.storeName || 'SKY HAUS') + '\n');
  
  if (settings?.address) text(settings.address + '\n');
  if (settings?.phone) text('WA: ' + settings.phone + '\n');
  text(divider());

  // 4. INFO TRANSAKSI
  push(CMD.ALIGN_LEFT);
  text(formatLine('No. INV', transaction.invoiceNo));
  text(formatLine('Tanggal', new Date(transaction.createdAt).toLocaleString('id-ID')));
  text(formatLine('Kasir', transaction.user?.name || 'Kasir'));
  text(formatLine('Metode', transaction.paymentMethod));
  if (transaction.note) {
    text(transaction.note + '\n');
  }
  text(divider());

  // 5. ITEMS
  for (const item of transaction.items) {
    let name = item.productName;
    // Auto wrap nama item jika kepanjangan
    while (name.length > CHAR_WIDTH) {
      text(name.substring(0, CHAR_WIDTH) + '\n');
      name = name.substring(CHAR_WIDTH);
    }
    text(name + '\n');
    
    text(formatLine(
      `  ${item.quantity} x ${formatRupiahPlain(item.unitPrice)}`,
      formatRupiahPlain(item.subtotal)
    ));
  }
  text(divider());

  // 6. TOTALS
  text(formatLine('Subtotal', formatRupiahPlain(transaction.subtotal)));
  if (transaction.taxRate && transaction.taxRate > 0 && transaction.taxAmount) {
    text(formatLine(`Pajak (${transaction.taxRate}%)`, formatRupiahPlain(transaction.taxAmount)));
  }
  
  text(formatLine('TOTAL', formatRupiahPlain(transaction.grandTotal)));
  
  text(formatLine(`Bayar (${transaction.paymentMethod})`, formatRupiahPlain(transaction.cashReceived || transaction.grandTotal)));
  
  if (transaction.paymentMethod === 'CASH' && transaction.changeAmount !== null && transaction.changeAmount > 0) {
    text(formatLine('Kembali', formatRupiahPlain(transaction.changeAmount)));
  }
  text(divider());

  // 7. FOOTER
  push(CMD.ALIGN_CENTER);
  text('\n');
  text((settings?.receiptFooter || 'Terima Kasih Atas Kunjungan Anda!') + '\n');
  text('SKY HAUS\n');
  text(divider());
  text('Instagram: @skyhaus.coffee\n');
  text('WiFi: Sky Haus\n');
  text('Pass: WORKATSKY\n');
  
  // 8. FEED & CUT
  push(CMD.FEED_LINES(4));
  push(CMD.CUT_PAPER);

  return new Uint8Array(bytes);
}

export async function printWithRawBT(transaction: TransactionWithDetails, settings?: StoreSettingData) {
  try {
    const escPosArray = await generateReceiptEscPos(transaction, settings);
    
    // Convert Uint8Array to base64
    let binary = '';
    for (let i = 0; i < escPosArray.length; i++) {
      binary += String.fromCharCode(escPosArray[i]);
    }
    const base64Str = btoa(binary);
    
    // Construct RawBT intent URL with base64 payload
    const url = "intent:base64," + base64Str + "#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;";
    
    window.location.href = url;
    
  } catch (err) {
    console.error('Error generating print intent:', err);
    window.print();
  }
}
