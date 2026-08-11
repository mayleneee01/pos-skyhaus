// ============================================
// Utility Functions — POS SKY HAUS
// ============================================

/**
 * Format angka ke format Rupiah Indonesia
 * @example formatRupiah(50000) => "Rp 50.000"
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format tanggal ke format Indonesia
 * @example formatDate(new Date()) => "07 Agustus 2026"
 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Format tanggal dan waktu
 * @example formatDateTime(new Date()) => "07 Agustus 2026, 14:30"
 */
export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Format waktu saja
 * @example formatTime(new Date()) => "14:30:25"
 */
export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(date));
}

/**
 * Generate invoice number
 * @example generateInvoiceNo() => "INV-20260807-0001"
 */
export function generateInvoiceNo(sequence: number): string {
  const now = new Date();
  const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  
  const dateStr = wibTime.getUTCFullYear().toString() +
    (wibTime.getUTCMonth() + 1).toString().padStart(2, '0') +
    wibTime.getUTCDate().toString().padStart(2, '0');
  const seqStr = sequence.toString().padStart(4, '0');
  return `INV-${dateStr}-${seqStr}`;
}

/**
 * Helper: Parse 'YYYY-MM-DD' and return Date objects representing 00:00:00 to 23:59:59 in WIB (UTC+7)
 */
export function getWibRangeFromDateString(dateStr: string): { start: Date; end: Date } {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  
  // WIB is UTC+7.
  // 00:00 WIB today = 17:00 UTC previous day (which is -7 hours from 00:00 UTC today)
  const start = new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0));
  // 23:59:59.999 WIB today = 16:59:59.999 UTC today
  const end = new Date(Date.UTC(year, month - 1, day, 16, 59, 59, 999));
  
  return { start, end };
}

/**
 * Get start and end of today in WIB (UTC+7)
 */
export function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  // Geser waktu ke WIB (+7 jam dari UTC) untuk mendapatkan tanggal yang benar di Indonesia
  const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  const dateStr = wibTime.toISOString().slice(0, 10);
  
  return getWibRangeFromDateString(dateStr);
}

/**
 * Get date range for a specific period (WIB aligned)
 */
export function getDateRange(period: 'daily' | 'weekly' | 'monthly', date?: Date): { start: Date; end: Date } {
  const now = date ? new Date(date) : new Date();
  // Geser ke WIB
  const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  
  switch (period) {
    case 'daily': {
      return getWibRangeFromDateString(wibTime.toISOString().slice(0, 10));
    }
    case 'weekly': {
      // Cari hari minggu (0) sebagai awal minggu di WIB
      const startWib = new Date(wibTime);
      startWib.setDate(startWib.getDate() - startWib.getDay());
      const endWib = new Date(startWib);
      endWib.setDate(endWib.getDate() + 6);
      
      const startRange = getWibRangeFromDateString(startWib.toISOString().slice(0, 10));
      const endRange = getWibRangeFromDateString(endWib.toISOString().slice(0, 10));
      return { start: startRange.start, end: endRange.end };
    }
    case 'monthly': {
      const year = wibTime.getUTCFullYear();
      const month = wibTime.getUTCMonth();
      
      const start = new Date(Date.UTC(year, month, 1, -7, 0, 0, 0));
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const end = new Date(Date.UTC(year, month, lastDay, 16, 59, 59, 999));
      
      return { start, end };
    }
  }
}

/**
 * Classify stock level
 */
export function getStockStatus(stock: number, lowStock: number): 'out' | 'low' | 'normal' {
  if (stock <= 0) return 'out';
  if (stock <= lowStock) return 'low';
  return 'normal';
}

/**
 * Debounce function for search
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
