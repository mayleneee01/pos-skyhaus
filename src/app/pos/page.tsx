'use client';

import Link from 'next/link';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { formatRupiah } from '@/lib/utils';
import { History, ShoppingCart, CreditCard, Banknote, Building, Smartphone, AlertTriangle, CheckCircle, Printer, LayoutDashboard, BarChart3, XCircle, Clock, DollarSign, Star } from 'lucide-react';
import FullscreenToggle from '@/components/FullscreenToggle';
import { printWithRawBT } from '@/lib/rawbt';
import type { ProductWithCategory, CartItem, StoreSettingData, CreateTransactionPayload, TransactionWithDetails } from '@/types';

export default function POSPage() {
  const [session, setSession] = useState<any>(null);
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [settings, setSettings] = useState<StoreSettingData | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'QRIS' | 'QRIS_EDC' | 'PAY_LATER'>('CASH');
  const [payLaterMethod, setPayLaterMethod] = useState<'CASH' | 'TRANSFER' | 'QRIS'>('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<TransactionWithDetails | null>(null);
  const [todayTransactions, setTodayTransactions] = useState<TransactionWithDetails[]>([]);

  // EDC States
  const [isEdcProcessing, setIsEdcProcessing] = useState(false);
  const [edcTransactionId, setEdcTransactionId] = useState<string | null>(null);
  const [edcTerminals, setEdcTerminals] = useState<any[]>([]);
  const [selectedEdcId, setSelectedEdcId] = useState<string>('');

  // Void transaction states
  const [voidConfirm, setVoidConfirm] = useState<TransactionWithDetails | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidLoading, setVoidLoading] = useState(false);

  // Settle (lunasi) transaction states
  const [settleConfirm, setSettleConfirm] = useState<TransactionWithDetails | null>(null);
  const [settleMethod, setSettleMethod] = useState<'CASH' | 'TRANSFER' | 'QRIS'>('CASH');
  const [settleLoading, setSettleLoading] = useState(false);

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
      if (activeCategory !== 'all' && activeCategory !== 'favorite') params.set('categoryId', activeCategory);
      params.set('activeOnly', 'true');

      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      if (data.success) {
        if (activeCategory === 'favorite') {
          setProducts(data.data.filter((p: ProductWithCategory) => p.isFavorite));
        } else {
          setProducts(data.data);
        }
      }
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

  const fetchEdcTerminals = async () => {
    try {
      const res = await fetch('/api/edc-terminals?activeOnly=true');
      const data = await res.json();
      if (data.success) {
        setEdcTerminals(data.data);
        if (data.data.length > 0) {
          setSelectedEdcId(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch EDC terminals:', error);
    }
  };

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/me');
      const data = await res.json();
      if (data.success) setSession(data.session);
    } catch (error) {
      console.error('Failed to fetch session:', error);
    }
  };

  useEffect(() => {
    Promise.all([fetchCategories(), fetchSettings(), fetchEdcTerminals(), fetchSession()]).then(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProducts();
    
    // Auto-refresh products periodically to keep stock synced across multiple cashiers
    const interval = setInterval(() => {
      fetchProducts();
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, [fetchProducts]);

  // EDC Polling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isEdcProcessing && edcTransactionId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/edc/status?id=${edcTransactionId}`);
          const data = await res.json();
          if (data.success) {
            if (data.status === 'COMPLETED') {
              setIsEdcProcessing(false);
              setEdcTransactionId(null);
              setLastTransaction(data.transaction);
              setShowPayment(false);
              setShowReceipt(true);
              clearCart();
              setCashReceived('');
              setPaymentMethod('CASH');
              fetchProducts(); // refresh stock
            } else if (data.status === 'FAILED' || data.status === 'VOIDED') {
              setIsEdcProcessing(false);
              setEdcTransactionId(null);
              alert('Transaksi EDC Ditolak / Gagal / Dibatalkan');
            }
          }
        } catch (err) {
          console.error('EDC Polling Error:', err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isEdcProcessing, edcTransactionId]);

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

  // Void (batalkan) transaksi
  const voidTransaction = async () => {
    if (!voidConfirm) return;
    setVoidLoading(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: voidConfirm.id,
          reason: voidReason || 'Dibatalkan oleh kasir',
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Transaksi ${voidConfirm.invoiceNo} berhasil dibatalkan!`);
        setVoidConfirm(null);
        setVoidReason('');
        fetchTodayTransactions();
        fetchProducts(); // refresh stock
      } else {
        alert(data.error || 'Gagal membatalkan transaksi');
      }
    } catch (error) {
      console.error('Void error:', error);
      alert('Gagal membatalkan transaksi');
    } finally {
      setVoidLoading(false);
    }
  };

  // Settle (lunasi) transaksi
  const settleTransaction = async () => {
    if (!settleConfirm) return;
    setSettleLoading(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: settleConfirm.id,
          action: 'settle',
          settleMethod,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Transaksi ${settleConfirm.invoiceNo} berhasil dilunasi!`);
        setSettleConfirm(null);
        setSettleMethod('CASH');
        fetchTodayTransactions();
      } else {
        alert(data.error || 'Gagal melunasi transaksi');
      }
    } catch (error) {
      console.error('Settle error:', error);
      alert('Gagal melunasi transaksi');
    } finally {
      setSettleLoading(false);
    }
  };

  // Process payment
  const processPayment = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'CASH' && (!cashReceived || parseInt(cashReceived) < grandTotal)) {
      return;
    }

    setPaymentLoading(true);
    try {
      const payload = {
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
          name: item.name,
        })),
        subtotal,
        taxRate,
        taxAmount,
        grandTotal,
        paymentMethod: paymentMethod === 'PAY_LATER' ? payLaterMethod : paymentMethod,
        ...(paymentMethod === 'PAY_LATER' && { payLater: true }),
        ...(paymentMethod === 'CASH' && {
          cashReceived: parseInt(cashReceived),
          changeAmount: parseInt(cashReceived) - grandTotal,
        }),
        ...(paymentMethod === 'QRIS_EDC' && {
          edcTerminalId: selectedEdcId
        }),
        ...(customerName && {
          note: `Pemesan: ${customerName}`
        }),
      };

      if (paymentMethod === 'QRIS_EDC') {
        if (!selectedEdcId) {
          alert('Silakan pilih Mesin EDC terlebih dahulu');
          setPaymentLoading(false);
          return;
        }
        // For standalone EDC, we just fall through to normal processing
        // and record the selectedEdcId in the transaction.
      }

      // Normal processing for Cash/Transfer/QRIS/Standalone EDC
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

  const [loading, setLoading] = useState(true);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { fetchTodayTransactions(); setShowHistory(true); }}
            >
              <History size={16} /> Riwayat
            </button>
            <FullscreenToggle />
            {(session?.user as any)?.role === 'ADMIN' && (
              <Link href="/admin" className="btn btn-sm" style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'var(--color-primary-bg)', color: 'var(--color-primary)',
                border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)', fontWeight: 600, padding: '6px 10px', textDecoration: 'none',
              }}>
                <LayoutDashboard size={14} /> Admin
              </Link>
            )}
            {(session?.user as any)?.role === 'CASHIER' && (
              <Link href="/pos/reports" className="btn btn-sm" style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'var(--color-primary-bg)', color: 'var(--color-primary)',
                border: '1px solid var(--color-primary)', borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)', fontWeight: 600, padding: '6px 10px', textDecoration: 'none',
              }}>
                <BarChart3 size={14} /> Laporan
              </Link>
            )}
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              {session?.user?.name}
            </span>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={async () => {
                await fetch('/api/logout', { method: 'POST' });
                window.location.href = '/login';
              }}
            >
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              style={{ paddingLeft: 40 }}
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="category-tabs">
          <button
            className={`category-tab ${activeCategory === 'favorite' ? 'active' : ''}`}
            onClick={() => setActiveCategory('favorite')}
            style={{ color: activeCategory === 'favorite' ? 'var(--color-primary-light)' : 'var(--color-text-secondary)', fontWeight: activeCategory === 'favorite' ? 700 : 500 }}
          >
            <Star size={16} fill={activeCategory === 'favorite' ? 'currentColor' : 'none'} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
            Favorit
          </button>
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
              <div className="product-card-icon" style={{ position: 'relative' }}>
                {product.isFavorite && (
                  <div style={{ position: 'absolute', top: '8px', right: '8px', color: '#fbbf24', filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.3))' }}>
                    <Star size={16} fill="currentColor" />
                  </div>
                )}
                <img src={product.image || "/logo-sky-haus.png"} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div className="product-card-content">
                <span className="product-card-name">{product.name}</span>
                <span className="product-card-price">{formatRupiah(product.price)}</span>
                <span className="product-card-stock">
                  {product.stock <= 0 ? 'Habis' : 
                   product.stock <= product.lowStock ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}><AlertTriangle size={14} /> Sisa {product.stock}</span> : 
                   `Stok: ${product.stock}`}
                </span>
              </div>
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
                <CreditCard size={20} /> Bayar - {formatRupiah(grandTotal)}
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
              {isEdcProcessing ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div className="spinner" style={{ width: 60, height: 60, borderWidth: 4, margin: '0 auto 24px auto' }} />
                  <h3 style={{ fontSize: 'var(--text-xl)', marginBottom: '8px' }}>Memproses EDC...</h3>
                  <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
                    Silakan tap atau gesek kartu pada mesin EDC.
                  </p>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => { setIsEdcProcessing(false); setEdcTransactionId(null); }}
                  >
                    Batal Transaksi
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Total Pembayaran</p>
                    <p style={{ fontSize: 'var(--text-4xl)', fontWeight: 800, color: 'var(--color-primary-light)' }}>
                      {formatRupiah(grandTotal)}
                    </p>
                  </div>

                  <div className="payment-tabs">
                    <button className={`payment-tab ${paymentMethod === 'CASH' ? 'active' : ''}`} onClick={() => setPaymentMethod('CASH')}><Banknote size={16} /> Tunai</button>
                    <button className={`payment-tab ${paymentMethod === 'TRANSFER' ? 'active' : ''}`} onClick={() => setPaymentMethod('TRANSFER')}><Building size={16} /> Transfer</button>
                    <button className={`payment-tab ${paymentMethod === 'QRIS' ? 'active' : ''}`} onClick={() => setPaymentMethod('QRIS')}><Smartphone size={16} /> QRIS Standar</button>
                    <button className={`payment-tab ${paymentMethod === 'QRIS_EDC' ? 'active' : ''}`} onClick={() => setPaymentMethod('QRIS_EDC')}><Smartphone size={16} /> QRIS EDC</button>
                    <button className={`payment-tab ${paymentMethod === 'PAY_LATER' ? 'active' : ''}`} onClick={() => setPaymentMethod('PAY_LATER')} style={paymentMethod === 'PAY_LATER' ? { background: '#f59e0b', color: '#fff', borderColor: '#f59e0b' } : {}}><Clock size={16} /> Bayar Nanti</button>
                  </div>

                  {paymentMethod === 'CASH' && (
                    <div>
                      <div className="form-group">
                        <label className="form-label">Uang Diterima</label>
                        <input type="number" className="form-input" placeholder="Masukkan jumlah uang..." value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} style={{ fontSize: 'var(--text-lg)', fontWeight: 700, textAlign: 'center', padding: '10px' }} />
                      </div>
                      <div className="quick-amount-grid" style={{ marginTop: '16px', gap: '8px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        {[grandTotal, 20000, 50000, 75000, 100000, 150000, 200000, 250000, 500000].map(amount => (
                          <button key={amount} className="quick-amount-btn" onClick={() => setCashReceived(amount.toString())}>{amount === grandTotal ? 'Uang Pas' : formatRupiah(amount)}</button>
                        ))}
                      </div>
                      {cashReceived && parseInt(cashReceived) >= grandTotal && (
                        <div className="change-display"><p className="change-label">Kembalian</p><p className="change-amount">{formatRupiah(changeAmount)}</p></div>
                      )}
                    </div>
                  )}

                  {paymentMethod === 'TRANSFER' && (
                    <div style={{ textAlign: 'center', padding: 'var(--space-xl) 0', color: 'var(--color-text-muted)' }}>
                      <p>Pastikan pembayaran transfer telah diterima sebelum menekan tombol Proses.</p>
                    </div>
                  )}

                  {paymentMethod === 'QRIS' && (
                    <div style={{ textAlign: 'center', padding: 'var(--space-xl) 0', color: 'var(--color-text-muted)' }}>
                      <p>Pastikan pelanggan sudah scan QRIS dan saldo masuk sebelum menekan tombol Proses.</p>
                      <div style={{ marginTop: 'var(--space-md)' }}>
                        {settings?.qrisImage ? (
                          <>
                            <img src={settings.qrisImage} alt="QRIS" className="qris-image" style={{ maxHeight: '150px', maxWidth: '150px', margin: '0 auto' }} />
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)', textAlign: 'center', marginTop: 'var(--space-xs)' }}>Minta pelanggan scan QRIS di atas</p>
                          </>
                        ) : (
                          <p style={{ color: 'var(--color-warning)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}><AlertTriangle size={16} /> Gambar QRIS belum diatur di Pengaturan</p>
                        )}
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'QRIS_EDC' && (
                    <div style={{ padding: 'var(--space-md) 0' }}>
                      <div className="form-group">
                        <label className="form-label">Pilih Mesin EDC</label>
                        {edcTerminals.length === 0 ? (
                          <div style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangle size={16} /> Belum ada mesin EDC yang aktif. Hubungi Admin.
                          </div>
                        ) : (
                          <select 
                            className="form-input" 
                            value={selectedEdcId} 
                            onChange={e => setSelectedEdcId(e.target.value)}
                            style={{ padding: '12px' }}
                          >
                            {edcTerminals.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.bankName})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                        <p>Ketik nominal pada mesin EDC secara manual. Pastikan pelanggan sudah scan QRIS di layar EDC dan saldo masuk sebelum menekan tombol Proses.</p>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'PAY_LATER' && (
                    <div style={{ textAlign: 'center', padding: 'var(--space-md) 0' }}>
                      <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                        <p style={{ fontWeight: 700, color: '#b45309', marginBottom: '4px' }}>
                          <Clock size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                          Transaksi akan dicatat sebagai BELUM LUNAS
                        </p>
                        <p style={{ fontSize: 'var(--text-xs)', color: '#92400e' }}>Stok produk akan langsung berkurang. Pelunasan bisa dilakukan nanti dari menu Riwayat.</p>
                      </div>
                      
                      <div className="form-group" style={{ marginTop: 'var(--space-md)', textAlign: 'left' }}>
                        <label className="form-label">Rencana Metode Pembayaran (Opsional)</label>
                        <div className="payment-tabs" style={{ marginTop: '8px' }}>
                          <button className={`payment-tab ${payLaterMethod === 'CASH' ? 'active' : ''}`} onClick={() => setPayLaterMethod('CASH')}><Banknote size={14} /> Tunai</button>
                          <button className={`payment-tab ${payLaterMethod === 'TRANSFER' ? 'active' : ''}`} onClick={() => setPayLaterMethod('TRANSFER')}><Building size={14} /> Transfer</button>
                          <button className={`payment-tab ${payLaterMethod === 'QRIS' ? 'active' : ''}`} onClick={() => setPayLaterMethod('QRIS')}><Smartphone size={14} /> QRIS</button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
                    <label className="form-label">
                      Nama Pemesan {paymentMethod === 'PAY_LATER' ? <span style={{ color: '#dc2626' }}>*Wajib</span> : '(Opsional)'}
                    </label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder={paymentMethod === 'PAY_LATER' ? 'WAJIB: Masukkan nama pemesan...' : 'Masukkan nama pemesan...'}
                      value={customerName} 
                      onChange={(e) => setCustomerName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      style={paymentMethod === 'PAY_LATER' && !customerName ? { borderColor: '#dc2626' } : {}}
                    />
                  </div>

                  <button
                    className="btn btn-primary btn-lg btn-full"
                    onClick={processPayment}
                    disabled={paymentLoading || (paymentMethod === 'CASH' && (!cashReceived || parseInt(cashReceived) < grandTotal)) || (paymentMethod === 'PAY_LATER' && !customerName.trim())}
                    style={{ marginTop: 'var(--space-lg)' }}
                  >
                    {paymentLoading ? (
                      <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Memproses...</>
                    ) : paymentMethod === 'PAY_LATER' ? (<><Clock size={18} /> Catat Bayar Nanti</>) : 'Proses Pembayaran'}
                  </button>
                </>
              )}
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
              <button className="btn btn-primary" onClick={() => {
                if (lastTransaction) {
                  printWithRawBT(lastTransaction, settings || undefined);
                }
              }}>
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
                        <th>Status</th>
                        <th>Aksi</th>
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
                          <td>
                            {tx.status === 'VOIDED' ? (
                              <span className="badge" style={{ background: '#fef2f2', color: '#dc2626', fontWeight: 700 }}>BATAL</span>
                            ) : tx.status === 'UNPAID' ? (
                              <span className="badge" style={{ background: '#fffbeb', color: '#b45309', fontWeight: 700 }}>BELUM LUNAS</span>
                            ) : (
                              <span className="badge" style={{ background: '#f0fdf4', color: '#16a34a', fontWeight: 700 }}>SELESAI</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => printWithRawBT(tx, settings || undefined)}
                              >
                                <Printer size={14} /> Cetak
                              </button>
                              {tx.status === 'UNPAID' && (
                                <button
                                  className="btn btn-sm"
                                  style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #16a34a' }}
                                  onClick={() => { setSettleConfirm(tx); setSettleMethod('CASH'); }}
                                >
                                  <DollarSign size={14} /> Lunasi
                                </button>
                              )}
                              {tx.status !== 'VOIDED' && (
                                <button
                                  className="btn btn-sm"
                                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #dc2626' }}
                                  onClick={() => { setVoidConfirm(tx); setVoidReason(''); }}
                                >
                                  <XCircle size={14} /> Batalkan
                                </button>
                              )}
                            </div>
                          </td>
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

      {/* VOID CONFIRMATION MODAL */}
      {voidConfirm && (
        <div className="modal-backdrop" onClick={() => !voidLoading && setVoidConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger, #dc2626)' }}>
                <XCircle size={20} /> Batalkan Transaksi
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setVoidConfirm(null)} disabled={voidLoading}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--color-danger-bg, #fef2f2)', border: '1px solid var(--color-danger, #dc2626)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                <p style={{ fontWeight: 700, color: 'var(--color-danger, #dc2626)', marginBottom: '8px' }}>
                  <AlertTriangle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Peringatan: Tindakan ini tidak bisa dibatalkan!
                </p>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  Uang dari transaksi ini akan ditarik dari laporan keuangan dan stok produk akan dikembalikan.
                </p>
              </div>

              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Transaksi yang akan dibatalkan:</p>
                <div style={{ background: 'var(--color-bg-secondary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ fontWeight: 700 }}>{voidConfirm.invoiceNo}</p>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    {voidConfirm.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                  </p>
                  <p style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--color-primary)', marginTop: '4px' }}>
                    {formatRupiah(voidConfirm.grandTotal)}
                  </p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Alasan Pembatalan (Opsional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Pelanggan ganti pesanan..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
                <button
                  className="btn btn-secondary btn-full"
                  onClick={() => setVoidConfirm(null)}
                  disabled={voidLoading}
                >
                  Kembali
                </button>
                <button
                  className="btn btn-full"
                  style={{ background: 'var(--color-danger, #dc2626)', color: 'white', border: 'none' }}
                  onClick={voidTransaction}
                  disabled={voidLoading}
                >
                  {voidLoading ? (
                    <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Memproses...</>
                  ) : (
                    <><XCircle size={16} /> Ya, Batalkan Transaksi</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* SETTLE (LUNASI) CONFIRMATION MODAL */}
      {settleConfirm && (
        <div className="modal-backdrop" onClick={() => !settleLoading && setSettleConfirm(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a' }}>
                <DollarSign size={20} /> Lunasi Transaksi
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setSettleConfirm(null)} disabled={settleLoading}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#f0fdf4', border: '1px solid #16a34a', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                <p style={{ fontWeight: 700, color: '#16a34a', marginBottom: '4px' }}>
                  Pelunasan transaksi "Bayar Nanti"
                </p>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  Setelah dilunasi, transaksi ini akan masuk ke laporan pemasukan.
                </p>
              </div>
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <div style={{ background: 'var(--color-bg-secondary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ fontWeight: 700 }}>{settleConfirm.invoiceNo}</p>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    {settleConfirm.note || ''}
                  </p>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    {settleConfirm.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                  </p>
                  <p style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--color-primary)', marginTop: '4px' }}>
                    {formatRupiah(settleConfirm.grandTotal)}
                  </p>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Metode Pembayaran</label>
                <div className="payment-tabs" style={{ marginTop: '8px' }}>
                  <button className={`payment-tab ${settleMethod === 'CASH' ? 'active' : ''}`} onClick={() => setSettleMethod('CASH')}><Banknote size={14} /> Tunai</button>
                  <button className={`payment-tab ${settleMethod === 'TRANSFER' ? 'active' : ''}`} onClick={() => setSettleMethod('TRANSFER')}><Building size={14} /> Transfer</button>
                  <button className={`payment-tab ${settleMethod === 'QRIS' ? 'active' : ''}`} onClick={() => setSettleMethod('QRIS')}><Smartphone size={14} /> QRIS</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
                <button className="btn btn-secondary btn-full" onClick={() => setSettleConfirm(null)} disabled={settleLoading}>Kembali</button>
                <button className="btn btn-full" style={{ background: '#16a34a', color: 'white', border: 'none' }} onClick={settleTransaction} disabled={settleLoading}>
                  {settleLoading ? (<><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Memproses...</>) : (<><DollarSign size={16} /> Lunasi Sekarang</>)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
