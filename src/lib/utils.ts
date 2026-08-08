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
  const today = new Date();
  const dateStr = today.getFullYear().toString() +
    (today.getMonth() + 1).toString().padStart(2, '0') +
    today.getDate().toString().padStart(2, '0');
  const seqStr = sequence.toString().padStart(4, '0');
  return `INV-${dateStr}-${seqStr}`;
}

/**
 * Get start and end of today
 */
export function getTodayRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Get date range for a specific period
 */
export function getDateRange(period: 'daily' | 'weekly' | 'monthly', date?: Date): { start: Date; end: Date } {
  const base = date ? new Date(date) : new Date();

  switch (period) {
    case 'daily': {
      const start = new Date(base);
      start.setHours(0, 0, 0, 0);
      const end = new Date(base);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'weekly': {
      const start = new Date(base);
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'monthly': {
      const start = new Date(base.getFullYear(), base.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
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
