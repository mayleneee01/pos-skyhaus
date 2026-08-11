'use client';

import React, { useState, useEffect } from 'react';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import { Table, FileText, DollarSign, BarChart, Banknote, Building, Smartphone, Eye, ArrowLeft, CreditCard } from 'lucide-react';
import Link from 'next/link';
import type { ReportSummary, TransactionWithDetails } from '@/types';

export default function ReportsPage() {
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const getLocalDateString = (d: Date = new Date()) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [selectedTx, setSelectedTx] = useState<TransactionWithDetails | null>(null);

  const productSales = React.useMemo(() => {
    if (!report?.transactions) return [];
    const sales: Record<string, { name: string, quantity: number, total: number }> = {};
    report.transactions.forEach(tx => {
      tx.items.forEach(item => {
        const key = item.productName;
        if (!sales[key]) {
          sales[key] = { name: item.productName, quantity: 0, total: 0 };
        }
        sales[key].quantity += item.quantity;
        sales[key].total += item.subtotal;
      });
    });
    return Object.values(sales).sort((a, b) => b.quantity - a.quantity);
  }, [report]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (data.success) setReport(data.data);
    } catch (error) {
      console.error('Fetch report error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set date range based on period
    const today = new Date();
    let start: Date, end: Date;

    switch (period) {
      case 'daily':
        start = end = today;
        break;
      case 'weekly':
        start = new Date(today);
        start.setDate(start.getDate() - start.getDay());
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        break;
      case 'monthly':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
    }

    setStartDate(getLocalDateString(start));
    setEndDate(getLocalDateString(end));
  }, [period]);

  useEffect(() => {
    if (startDate && endDate) fetchReport();
  }, [startDate, endDate]);

  // Export to CSV (simpler than xlsx for basic needs)
  const exportToCSV = () => {
    if (!report || !report.transactions.length) return;

    const txHeaders = ['No Invoice', 'Tanggal', 'Items', 'Subtotal', 'Pajak', 'Total', 'Metode Bayar', 'Kasir'];
    const txRows = report.transactions.map(tx => [
      tx.invoiceNo,
      new Date(tx.createdAt).toLocaleString('id-ID'),
      tx.items.map(i => `${i.quantity}x ${i.productName}`).join('; '),
      tx.subtotal,
      tx.taxAmount,
      tx.grandTotal,
      tx.paymentMethod,
      tx.user.name,
    ]);

    const prodHeaders = ['Nama Produk', 'Terjual (Pcs)', 'Total Rupiah'];
    const prodRows = productSales.map(prod => [
      prod.name,
      prod.quantity,
      prod.total
    ]);

    const csvLines = [
      'DAFTAR TRANSAKSI',
      txHeaders.join(','),
      ...txRows.map(r => r.join(',')),
      '',
      '',
      'AKUMULASI PRODUK TERJUAL',
      prodHeaders.join(','),
      ...prodRows.map(r => r.join(','))
    ];

    const csv = csvLines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `laporan-skyhaus-${startDate}-${endDate}.csv`;
    link.click();
  };

  // Export to printable PDF (via browser print)
  const exportToPDF = () => {
    window.print();
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <Link href="/pos" className="btn btn-secondary btn-sm" style={{ padding: '8px' }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="page-title" style={{ marginBottom: 0 }}>Laporan & Rekapitulasi</h1>
            <p className="page-subtitle">Analisis penjualan SKY HAUS</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary" onClick={exportToCSV} disabled={!report?.transactions.length}>
            <Table size={16} /> Export Excel/CSV
          </button>
          <button className="btn btn-secondary" onClick={exportToPDF} disabled={!report?.transactions.length}>
            <FileText size={16} /> Export PDF
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="payment-tabs" style={{ width: 'auto', marginBottom: 0 }}>
          {(['daily', 'weekly', 'monthly'] as const).map(p => (
            <button
              key={p}
              className={`payment-tab ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p === 'daily' ? 'Harian' : p === 'weekly' ? 'Mingguan' : 'Bulanan'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <input
            type="date"
            className="form-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ width: 160 }}
          />
          <span style={{ color: 'var(--color-text-muted)' }}>-</span>
          <input
            type="date"
            className="form-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: 160 }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-3xl)' }}>
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      ) : report ? (
        <>
          {/* Summary Cards */}
          <div className="stats-grid" id="report-summary">
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Total Pemasukan</span>
                <span style={{ color: 'var(--color-success)' }}><DollarSign size={24} /></span>
              </div>
              <div className="stat-card-value">{formatRupiah(report.totalRevenue)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Jumlah Transaksi</span>
                <span style={{ color: 'var(--color-info)' }}><FileText size={24} /></span>
              </div>
              <div className="stat-card-value">{report.totalTransactions}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-header">
                <span className="stat-card-label">Rata-rata/Transaksi</span>
                <span style={{ color: 'var(--color-primary-light)' }}><BarChart size={24} /></span>
              </div>
              <div className="stat-card-value">{formatRupiah(report.avgTransaction)}</div>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="card-header">
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Breakdown Metode Pembayaran</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)' }}>
                {[
                  { label: <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Banknote size={16} /> Tunai (CASH)</span>, data: report.paymentBreakdown.CASH, color: 'var(--color-success)' },
                  { label: <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Building size={16} /> Transfer</span>, data: report.paymentBreakdown.TRANSFER, color: 'var(--color-info)' },
                  { label: <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Smartphone size={16} /> QRIS Standar</span>, data: report.paymentBreakdown.QRIS, color: 'var(--color-primary)' },
                  { label: <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Smartphone size={16} /> QRIS EDC</span>, data: report.paymentBreakdown.QRIS_EDC, color: 'var(--color-primary-light)' },
                ].map((item, idx) => (
                  <div key={idx} style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-sm)' }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: item.color }}>{formatRupiah(item.data.amount)}</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {item.data.count} transaksi • {report.totalRevenue > 0 ? Math.round(item.data.amount / report.totalRevenue * 100) : 0}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* EDC Breakdown */}
          {Object.keys(report.edcBreakdown || {}).length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
              <div className="card-header">
                <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Pendapatan per Mesin EDC</h3>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                  {Object.entries(report.edcBreakdown).map(([edcName, data], idx) => (
                    <div key={idx} style={{ padding: 'var(--space-md)', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" style={{ display: 'inline', marginRight: '6px' }}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                        {edcName}
                      </p>
                      <p style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--color-primary-light)' }}>
                        {formatRupiah(data.amount)}
                      </p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {data.count} transaksi
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Product Sales Accumulation */}
          <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="card-header">
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Akumulasi Produk Terjual</h3>
            </div>
            <div className="table-container" style={{ border: 'none', maxHeight: '400px', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Nama Produk</th>
                    <th style={{ textAlign: 'right' }}>Terjual (Pcs)</th>
                    <th style={{ textAlign: 'right' }}>Total Rupiah</th>
                  </tr>
                </thead>
                <tbody>
                  {productSales.map((prod, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{prod.name}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="badge badge-primary">{prod.quantity} pcs</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatRupiah(prod.total)}</td>
                    </tr>
                  ))}
                  {productSales.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-muted)' }}>
                        Belum ada produk yang terjual
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Daftar Transaksi ({report.transactions.length})</h3>
            </div>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Waktu</th>
                    <th>Kasir</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Metode</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {report.transactions.map(tx => (
                    <tr key={tx.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{tx.invoiceNo}</td>
                      <td style={{ fontSize: 'var(--text-xs)' }}>{formatDateTime(tx.createdAt)}</td>
                      <td>{tx.user.name}</td>
                      <td>{tx.items.length} item</td>
                      <td style={{ fontWeight: 700 }}>{formatRupiah(tx.grandTotal)}</td>
                      <td>
                        <span className="badge badge-primary">{tx.paymentMethod}</span>
                        {tx.edcName && <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{tx.edcName}</div>}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedTx(tx)}>
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {report.transactions.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-muted)' }}>
                        Tidak ada transaksi pada periode ini
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="modal-backdrop" onClick={() => setSelectedTx(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Detail Transaksi</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedTx(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Invoice</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{selectedTx.invoiceNo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Tanggal</span>
                  <span>{formatDateTime(selectedTx.createdAt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Kasir</span>
                  <span>{selectedTx.user.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Metode Bayar</span>
                  <span className="badge badge-primary">{selectedTx.paymentMethod}</span>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

                {selectedTx.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.quantity}x {item.productName}</span>
                    <span style={{ fontWeight: 600 }}>{formatRupiah(item.subtotal)}</span>
                  </div>
                ))}

                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal</span>
                  <span>{formatRupiah(selectedTx.subtotal)}</span>
                </div>
                {selectedTx.taxAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pajak ({selectedTx.taxRate}%)</span>
                    <span>{formatRupiah(selectedTx.taxAmount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 'var(--text-lg)' }}>
                  <span>TOTAL</span>
                  <span style={{ color: 'var(--color-primary-light)' }}>{formatRupiah(selectedTx.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
