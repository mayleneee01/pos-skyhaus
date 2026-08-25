// ============================================
// TypeScript Type Definitions — POS SKY HAUS
// ============================================

export type { Role, PaymentMethod, TransactionStatus } from '@prisma/client';

// Cart types for POS interface
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
}

export interface CartState {
  items: CartItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
}

// Product with category for display
export interface ProductWithCategory {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
  lowStock: number;
  image: string | null;
  isActive: boolean;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
}

// Transaction with items and user for display
export interface TransactionWithDetails {
  id: string;
  invoiceNo: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: string;
  cashReceived: number | null;
  changeAmount: number | null;
  status: string;
  note: string | null;
  edcReference: string | null;
  edcName: string | null;
  createdAt: string;
  user: {
    name: string;
  };
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    productName: string;
  }[];
}

// Store settings
export interface StoreSettingData {
  id: string;
  storeName: string;
  address: string | null;
  phone: string | null;
  taxRate: number;
  qrisImage: string | null;
  receiptFooter: string | null;
}

// Report data types
export interface DailyReport {
  date: string;
  totalRevenue: number;
  totalTransactions: number;
  avgTransaction: number;
  cashTotal: number;
  transferTotal: number;
  qrisTotal: number;
}

export interface ReportSummary {
  totalRevenue: number;
  totalTransactions: number;
  avgTransaction: number;
  paymentBreakdown: {
    CASH: { amount: number; count: number };
    TRANSFER: { amount: number; count: number };
    QRIS: { amount: number; count: number };
    QRIS_EDC: { amount: number; count: number };
  };
  edcBreakdown: Record<string, { amount: number; count: number }>;
  cashierBreakdown?: Record<string, { amount: number; count: number }>;
  transactions: TransactionWithDetails[];
}

// Create transaction payload
export interface CreateTransactionPayload {
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    productName: string;
  }[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: 'CASH' | 'TRANSFER' | 'QRIS';
  cashReceived?: number;
  changeAmount?: number;
  note?: string;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
