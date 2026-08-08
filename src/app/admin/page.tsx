'use client';

import { useState, useEffect } from 'react';
import { formatRupiah } from '@/lib/utils';
import Link from 'next/link';
import { CreditCard, DollarSign, FileText, BarChart, AlertTriangle, CheckCircle } from 'lucide-react';
import type { ReportSummary } from '@/types';

export default function AdminDashboard() {
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<{ name: string; stock: number; lowStock: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [reportRes, productsRes] = await Promise.all([
          fetch(`/api/reports?startDate=${today}&endDate=${today}`),
          fetch('/api/products?activeOnly=true'),
        ]);

        const reportData = await reportRes.json();
        const productsData = await productsRes.json();

        if (reportData.success) setReport(reportData.data);
        if (productsData.success) {
          const lowStock = productsData.data.filter(
            (p: { stock: number; lowStock: number }) => p.stock <= p.lowStock
          );
          setLowStockProducts(lowStock);
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Ringkasan aktivitas hari ini — {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <Link href="/pos" className="btn btn-primary">
          <CreditCard size={18} /> Buka Kasir
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Pemasukan Hari Ini</span>
            <div className="stat-card-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
              <DollarSign size={24} />
            </div>
          </div>
          <div className="stat-card-value">{formatRupiah(report?.totalRevenue || 0)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Transaksi</span>
            <div className="stat-card-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
              <FileText size={24} />
            </div>
          </div>
          <div className="stat-card-value">{report?.totalTransactions || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Rata-rata Transaksi</span>
            <div className="stat-card-icon" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary-light)' }}>
              <BarChart size={24} />
            </div>
          </div>
          <div className="stat-card-value">{formatRupiah(report?.avgTransaction || 0)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Stok Menipis</span>
            <div className="stat-card-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
              <AlertTriangle size={24} />
            </div>
          </div>
          <div className="stat-card-value">{lowStockProducts.length}</div>
        </div>
      </div>

      {/* Payment Breakdown & Low Stock */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)' }}>
        {/* Payment Breakdown */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>Metode Pembayaran Hari Ini</h3>
          </div>
          <div className="card-body">
            {report && report.totalTransactions > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {[
                  { label: 'Tunai (CASH)', value: report.paymentBreakdown.CASH, color: 'var(--color-success)' },
                  { label: 'Transfer', value: report.paymentBreakdown.TRANSFER, color: 'var(--color-info)' },
                  { label: 'QRIS', value: report.paymentBreakdown.QRIS, color: 'var(--color-primary-light)' },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>{item.label}</span>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>{formatRupiah(item.value)}</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${report.totalRevenue > 0 ? (item.value / report.totalRevenue * 100) : 0}%`,
                        background: item.color,
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-xl)' }}>
                Belum ada transaksi hari ini
              </p>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} className="text-warning" /> Peringatan Stok Menipis
            </h3>
          </div>
          <div className="card-body">
            {lowStockProducts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {lowStockProducts.map((product, i) => (
                  <div key={i} className="low-stock-alert">
                    <span style={{ flex: 1 }}>{product.name}</span>
                    <span className={`badge ${product.stock <= 0 ? 'badge-danger' : 'badge-warning'}`}>
                      {product.stock <= 0 ? 'Habis' : `Sisa ${product.stock}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={24} /> Semua stok aman
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
