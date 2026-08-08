'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { formatRupiah } from '@/lib/utils';
import { History, ShoppingCart, CreditCard, Banknote, Building, Smartphone, AlertTriangle, CheckCircle, Printer } from 'lucide-react';
import type { ProductWithCategory, CartItem, StoreSettingData, CreateTransactionPayload, TransactionWithDetails } from '@/types';

export default function POSPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [settings, setSettings] = useState<StoreSettingData | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<TransactionWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'QRIS'>('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [todayTransactions, setTodayTransactions] = useState<TransactionWithDetails[]>([]);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxRate = settings?.taxRate || 0;
  const taxAmount = Math.round(subtotal * taxRate / 100);
  const grandTotal = subtotal + taxAmount;
  const changeAmount = cashReceived ? parseInt(cashReceived) - grandTotal : 0;

  // Fetch data
  const fetchProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (activeCategory !== 'all') params.set('categoryId', activeCategory);
      params.set('activeOnly', 'true');

      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      if (data.success) setProducts(data.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  }, [search, activeCategory]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) setCategories(data.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) setSettings(data.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const fetchTodayTransactions = async () => {
    try {
      const res = await fetch('/api/transactions?todayOnly=true');
      const data = await res.json();
      if (data.success) setTodayTransactions(data.data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  useEffect(() => {
    Promise.all([fetchCategories(), fetchSettings()]).then(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Cart operations
  const addToCart = (product: ProductWithCategory) => {
    if (product.stock <= 0) return;

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        stock: product.stock,
      }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.productId !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.stock) return item;
          return { ...item, quantity: newQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const clearCart = () => setCart([]);

  // Process payment
  const processPayment = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'CASH' && (!cashReceived || parseInt(cashReceived) < grandTotal)) {
      return;
    }

    setPaymentLoading(true);
    try {
      const payload: CreateTransactionPayload = {
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
          productName: item.name,
        })),
        subtotal,
        taxRate,
        taxAmount,
        grandTotal,
        paymentMethod,
        ...(paymentMethod === 'CASH' && {
          cashReceived: parseInt(cashReceived),
          changeAmount: parseInt(cashReceived) - grandTotal,
        }),
      };

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setLastTransaction(data.data);
        setShowPayment(false);
        setShowReceipt(true);
        clearCart();
        setCashReceived('');
        setPaymentMethod('CASH');
        fetchProducts(); // refresh stock
      } else {
        alert(data.error || 'Gagal memproses transaksi');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Gagal memproses transaksi');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div className="pos-layout">
      {/* LEFT — Product Grid */}
      <div className="pos-products">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <img src="/logo-sky-haus.png" alt="SKY HAUS" style={{ width: 36, height: 36 }} />
            <div>
              <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, letterSpacing: '-0.02em' }}>
                SKY <span style={{ color: 'var(--color-primary)' }}>HAUS</span>
              </h1>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Point of Sale</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { fetchTodayTransactions(); setShowHistory(true); }}
            >
              <History size={16} /> Riwayat
            </button>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              {session?.user?.name}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => signOut()}>
              Keluar
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="search-bar">
          <div className="search-input-wrapper" style={{ flex: 1 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              type="text"
              className="form-input"
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 40 }}
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="category-tabs">
          <button
            className={`category-tab ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            Semua
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="product-grid">
          {products.map(product => (
            <div
              key={product.id}
              className={`product-card ${product.stock <= 0 ? 'out-of-stock' : ''}`}
              onClick={() => addToCart(product)}
            >
              <div className="product-card-icon" style={{ width: '100%', height: '80px', background: 'transparent', padding: '4px' }}>
                <img src={product.image || "/logo-sky-haus.png"} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <span className="product-card-name">{product.name}</span>
              <span className="product-card-price">{formatRupiah(product.price)}</span>
              <span className="product-card-stock">
                {product.stock <= 0 ? 'Habis' : 
                 product.stock <= product.lowStock ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}><AlertTriangle size={14} /> Sisa {product.stock}</span> : 
                 `Stok: ${product.stock}`}
              </span>
            </div>
          ))}
          {products.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>
              <p>Tidak ada produk ditemukan</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — Cart */}
      <div className="pos-cart">
        <div className="cart-header">
          <h2 className="cart-header-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ShoppingCart size={20} className="text-primary" /> Keranjang</h2>
          {cart.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={clearCart}>
              Hapus Semua
            </button>
          )}
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
              </svg>
              <p>Keranjang kosong</p>
              <p style={{ fontSize: 'var(--text-xs)' }}>Klik produk untuk menambahkan</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.productId} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">{formatRupiah(item.price)}</div>
                </div>
                <div className="cart-item-qty">
                  <button onClick={() => updateQuantity(item.productId, -1)}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId, 1)}>+</button>
                </div>
                <div className="cart-item-subtotal">{formatRupiah(item.price * item.quantity)}</div>
                <button className="cart-item-remove" onClick={() => removeFromCart(item.productId)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <>
            <div className="cart-summary">
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              {taxRate > 0 && (
                <div className="cart-summary-row">
                  <span>Pajak ({taxRate}%)</span>
                  <span>{formatRupiah(taxAmount)}</span>
                </div>
              )}
              <div className="cart-summary-total">
                <span>Total</span>
                <span>{formatRupiah(grandTotal)}</span>
              </div>
            </div>

            <div className="cart-actions">
              <button
                className="btn btn-primary btn-lg btn-full"
                onClick={() => setShowPayment(true)}
              >
                <CreditCard size={20} /> Bayar — {formatRupiah(grandTotal)}
              </button>
            </div>
          </>
        )}
      </div>

      {/* PAYMENT MODAL */}
      {showPayment && (
        <div className="modal-backdrop" onClick={() => setShowPayment(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Pembayaran</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPayment(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="modal-body">
              {/* Total */}
              <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Total Pembayaran</p>
                <p style={{ fontSize: 'var(--text-4xl)', fontWeight: 800, color: 'var(--color-primary-light)' }}>
                  {formatRupiah(grandTotal)}
                </p>
              </div>

              {/* Payment Method Tabs */}
              <div className="payment-tabs">
                <button
                  className={`payment-tab ${paymentMethod === 'CASH' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('CASH')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Banknote size={16} /> Tunai</span>
                </button>
                <button
                  className={`payment-tab ${paymentMethod === 'TRANSFER' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('TRANSFER')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Building size={16} /> Transfer</span>
                </button>
                <button
                  className={`payment-tab ${paymentMethod === 'QRIS' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('QRIS')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Smartphone size={16} /> QRIS</span>
                </button>
              </div>

              {/* CASH Payment */}
              {paymentMethod === 'CASH' && (
                <div>
                  <div className="form-group">
                    <label className="form-label">Uang Diterima</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Masukkan jumlah uang..."
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      style={{ fontSize: 'var(--text-xl)', fontWeight: 700, textAlign: 'center' }}
                      autoFocus
                    />
                  </div>

                  <div className="quick-amount-grid">
                    {[grandTotal, 20000, 50000, 75000, 100000, 150000, 200000, 250000, 500000].map(amount => (
                      <button
                        key={amount}
                        className="quick-amount-btn"
                        onClick={() => setCashReceived(amount.toString())}
                      >
                        {amount === grandTotal ? 'Uang Pas' : formatRupiah(amount)}
                      </button>
                    ))}
                  </div>

                  {cashReceived && parseInt(cashReceived) >= grandTotal && (
                    <div className="change-display">
                      <p className="change-label">Kembalian</p>
                      <p className="change-amount">{formatRupiah(changeAmount)}</p>
                    </div>
                  )}

                  {cashReceived && parseInt(cashReceived) < grandTotal && (
                    <div style={{
                      textAlign: 'center', padding: 'var(--space-lg)',
                      background: 'var(--color-danger-bg)', borderRadius: 'var(--radius-md)',
                      marginTop: 'var(--space-lg)', color: 'var(--color-danger)', fontWeight: 600
                    }}>
                      Uang tidak cukup (kurang {formatRupiah(grandTotal - parseInt(cashReceived))})
                    </div>
                  )}
                </div>
              )}

              {/* TRANSFER / QRIS Payment */}
              {(paymentMethod === 'TRANSFER' || paymentMethod === 'QRIS') && (
                <div className="qris-display">
                  {settings?.qrisImage ? (
                    <>
                      <img src={settings.qrisImage} alt="QRIS" className="qris-image" />
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>
                        Minta pelanggan scan QRIS di atas
                      </p>
                    </>
                  ) : (
                    <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      <p style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-md)' }}><Smartphone size={48} /></p>
                      <p>Gambar QRIS belum diatur.</p>
                      <p style={{ fontSize: 'var(--text-xs)' }}>Upload melalui menu Pengaturan (Admin).</p>
                    </div>
                  )}
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <AlertTriangle size={16} /> Pastikan dana sudah masuk sebelum konfirmasi
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPayment(false)}>
                Batal
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={processPayment}
                disabled={
                  paymentLoading ||
                  (paymentMethod === 'CASH' && (!cashReceived || parseInt(cashReceived) < grandTotal))
                }
              >
                {paymentLoading ? (
                  <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Memproses...</>
                ) : paymentMethod === 'CASH' ? (
                  <><CheckCircle size={18} /> Proses Pembayaran</>
                ) : (
                  <><CheckCircle size={18} /> Konfirmasi Pembayaran</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {showReceipt && lastTransaction && (
        <div className="modal-backdrop" onClick={() => setShowReceipt(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success)' }}><CheckCircle size={20} /> Transaksi Berhasil</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowReceipt(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              {/* Receipt Preview */}
              <div className="receipt" id="receipt-print">
                <div className="receipt-header">
                  <img src="/logo-sky-haus.png" alt="Logo" className="receipt-logo" />
                  <div className="receipt-store-name">{settings?.storeName || 'SKY HAUS'}</div>
                  <div className="receipt-store-info">{settings?.address}</div>
                  <div className="receipt-store-info">WA: {settings?.phone}</div>
                </div>

                <hr className="receipt-divider" />
                <div style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{lastTransaction.invoiceNo}</span>
                  <span>{new Date(lastTransaction.createdAt).toLocaleDateString('id-ID')}</span>
                </div>
                <div style={{ fontSize: 10, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Kasir: {lastTransaction.user?.name}</span>
                  <span>{new Date(lastTransaction.createdAt).toLocaleTimeString('id-ID')}</span>
                </div>
                <hr className="receipt-divider" />

                {lastTransaction.items.map((item, i) => (
                  <div key={i}>
                    <div className="receipt-item">
                      <span>{item.productName}</span>
                    </div>
                    <div className="receipt-item-detail" style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{item.quantity} x {formatRupiah(item.unitPrice)}</span>
                      <span>{formatRupiah(item.subtotal)}</span>
                    </div>
                  </div>
                ))}

                <div className="receipt-total-section">
                  <div className="receipt-total-row">
                    <span>Subtotal</span>
                    <span>{formatRupiah(lastTransaction.subtotal)}</span>
                  </div>
                  {lastTransaction.taxAmount > 0 && (
                    <div className="receipt-total-row">
                      <span>Pajak ({lastTransaction.taxRate}%)</span>
                      <span>{formatRupiah(lastTransaction.taxAmount)}</span>
                    </div>
                  )}
                  <div className="receipt-total-row receipt-grand-total">
                    <span>TOTAL</span>
                    <span>{formatRupiah(lastTransaction.grandTotal)}</span>
                  </div>
                  <hr className="receipt-divider" />
                  <div className="receipt-total-row" style={{ fontSize: 11 }}>
                    <span>Bayar ({lastTransaction.paymentMethod})</span>
                    <span>{formatRupiah(lastTransaction.cashReceived || lastTransaction.grandTotal)}</span>
                  </div>
                  {lastTransaction.paymentMethod === 'CASH' && lastTransaction.changeAmount !== null && lastTransaction.changeAmount > 0 && (
                    <div className="receipt-total-row" style={{ fontSize: 11 }}>
                      <span>Kembali</span>
                      <span>{formatRupiah(lastTransaction.changeAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="receipt-footer">
                  <p>{settings?.receiptFooter || 'Terima Kasih!'}</p>
                  <p>SKY HAUS • {settings?.phone}</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowReceipt(false)}>
                Tutup
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={16} /> Cetak Struk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {showHistory && (
        <div className="modal-backdrop" onClick={() => setShowHistory(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><History size={20} className="text-primary" /> Riwayat Transaksi Hari Ini</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowHistory(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {todayTransactions.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-2xl)' }}>
                  Belum ada transaksi hari ini
                </p>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Waktu</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Metode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayTransactions.map(tx => (
                        <tr key={tx.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{tx.invoiceNo}</td>
                          <td>{new Date(tx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td>
                            {tx.items.map((item, i) => (
                              <div key={i} style={{ fontSize: 'var(--text-xs)' }}>
                                {item.quantity}x {item.productName}
                              </div>
                            ))}
                          </td>
                          <td style={{ fontWeight: 700 }}>{formatRupiah(tx.grandTotal)}</td>
                          <td><span className="badge badge-primary">{tx.paymentMethod}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
