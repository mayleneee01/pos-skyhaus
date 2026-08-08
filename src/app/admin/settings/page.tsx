'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, Save, Smartphone, RefreshCw, Upload, Info, Key, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { StoreSettingData } from '@/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [receiptFooter, setReceiptFooter] = useState('');

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        setStoreName(data.data.storeName || '');
        setAddress(data.data.address || '');
        setPhone(data.data.phone || '');
        setTaxRate(data.data.taxRate?.toString() || '0');
        setReceiptFooter(data.data.receiptFooter || '');
      }
    } catch (error) {
      console.error('Fetch settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName,
          address,
          phone,
          taxRate,
          receiptFooter,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        setSaveMessage('Pengaturan berhasil disimpan!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('Error: Gagal menyimpan');
      }
    } catch (error) {
      console.error('Save settings error:', error);
      setSaveMessage('Error: Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadQris = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.success) {
        alert(uploadData.error || 'Gagal upload');
        return;
      }

      // Save QRIS path to settings
      const settingsRes = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrisImage: uploadData.data.path }),
      });

      const settingsData = await settingsRes.json();
      if (settingsData.success) {
        setSettings(settingsData.data);
        setSaveMessage('Gambar QRIS berhasil diupload!');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Upload QRIS error:', error);
      alert('Gagal upload gambar QRIS');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-3xl)' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pengaturan Toko</h1>
          <p className="page-subtitle">Kelola informasi toko, QRIS, dan pajak</p>
        </div>
      </div>

      {saveMessage && (
        <div style={{
          padding: 'var(--space-md) var(--space-lg)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-xl)',
          background: !saveMessage.startsWith('Error') ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
          color: !saveMessage.startsWith('Error') ? 'var(--color-success)' : 'var(--color-danger)',
          fontWeight: 600,
          fontSize: 'var(--text-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {!saveMessage.startsWith('Error') ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {saveMessage.replace('Error: ', '')}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)' }}>
        {/* Store Info */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={20} className="text-primary" /> Informasi Toko</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              <div className="form-group">
                <label className="form-label">Nama Toko</label>
                <input className="form-input" value={storeName} onChange={e => setStoreName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Alamat</label>
                <input className="form-input" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">No. WhatsApp</label>
                <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Tarif Pajak (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={taxRate}
                  onChange={e => setTaxRate(e.target.value)}
                  placeholder="0 = tidak ada pajak"
                  min="0"
                  max="100"
                  step="0.1"
                />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  Masukkan 0 jika tidak menerapkan pajak
                </span>
              </div>
              <div className="form-group">
                <label className="form-label">Footer Struk</label>
                <input className="form-input" value={receiptFooter} onChange={e => setReceiptFooter(e.target.value)} placeholder="Terima Kasih Atas Kunjungan Anda!" />
              </div>

              <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : <><Save size={16} /> Simpan Pengaturan</>}
              </button>
            </div>
          </div>
        </div>

        {/* QRIS Settings */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}><Smartphone size={20} className="text-primary" /> QRIS Pembayaran</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-xl)' }}>
              {settings?.qrisImage ? (
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={settings.qrisImage}
                    alt="QRIS"
                    style={{
                      maxWidth: 300,
                      borderRadius: 'var(--radius-md)',
                      border: '2px solid var(--color-border)',
                      marginBottom: 'var(--space-md)',
                    }}
                  />
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    QRIS saat ini aktif
                  </p>
                </div>
              ) : (
                <div style={{
                  padding: 'var(--space-3xl)',
                  textAlign: 'center',
                  border: '2px dashed var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--color-text-muted)',
                  width: '100%',
                }}>
                  <p style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-md)' }}><Smartphone size={48} /></p>
                  <p>Belum ada QRIS diupload</p>
                  <p style={{ fontSize: 'var(--text-xs)' }}>Upload gambar QRIS Static toko Anda</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadQris}
                style={{ display: 'none' }}
              />

              <button
                className="btn btn-secondary btn-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Mengupload...' : settings?.qrisImage ? <><RefreshCw size={16} /> Ganti Gambar QRIS</> : <><Upload size={16} /> Upload Gambar QRIS</>}
              </button>

              <div style={{
                padding: 'var(--space-md) var(--space-lg)',
                background: 'var(--color-info-bg)',
                borderRadius: 'var(--radius-md)',
                width: '100%',
              }}>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-info)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <Info size={16} style={{ flexShrink: 0 }} />
                  <span>
                    Gunakan gambar QRIS Static dari bank/payment provider Anda.
                    Gambar ini akan ditampilkan saat pelanggan memilih metode pembayaran QRIS di kasir.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
        <div className="card-header">
          <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}><Key size={20} className="text-primary" /> Informasi Akun Default</h3>
        </div>
        <div className="card-body">
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Password</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="badge badge-primary">Admin</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>admin@skyhaus.com</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>admin123</td>
                </tr>
                <tr>
                  <td><span className="badge badge-info">Kasir</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>kasir@skyhaus.com</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>kasir123</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', marginTop: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={16} /> Segera ubah password default sebelum digunakan di produksi!
          </p>
        </div>
      </div>
    </div>
  );
}
