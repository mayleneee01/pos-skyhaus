'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Wifi, Power, Server, Smartphone, CreditCard } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface EDCTerminal {
  id: string;
  name: string;
  bankName: string;
  terminalId: string | null;
  merchantId: string | null;
  connectionType: string;
  ipAddress: string;
  isActive: boolean;
  createdAt: string;
}

export default function EDCManagementPage() {
  const [terminals, setTerminals] = useState<EDCTerminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    bankName: '',
    terminalId: '',
    merchantId: '',
    connectionType: 'API',
    ipAddress: '',
    isActive: true,
  });

  const [pingStatus, setPingStatus] = useState<Record<string, 'loading' | 'success' | 'error' | null>>({});

  const fetchTerminals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/edc-terminals');
      const data = await res.json();
      if (data.success) {
        setTerminals(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerminals();
  }, []);

  const handleOpenModal = (terminal?: EDCTerminal) => {
    if (terminal) {
      setEditingId(terminal.id);
      setFormData({
        name: terminal.name,
        bankName: terminal.bankName,
        terminalId: terminal.terminalId || '',
        merchantId: terminal.merchantId || '',
        connectionType: terminal.connectionType,
        ipAddress: terminal.ipAddress,
        isActive: terminal.isActive,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        bankName: '',
        terminalId: '',
        merchantId: '',
        connectionType: 'API',
        ipAddress: '',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/edc-terminals/${editingId}` : '/api/edc-terminals';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        fetchTerminals();
      } else {
        const err = await res.json();
        alert('Gagal menyimpan: ' + err.error);
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus mesin EDC "${name}"?`)) return;
    try {
      const res = await fetch(`/api/edc-terminals/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTerminals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePing = async (id: string, ipAddress: string) => {
    setPingStatus(prev => ({ ...prev, [id]: 'loading' }));
    try {
      const res = await fetch('/api/edc-terminals/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipAddress }),
      });
      if (res.ok) {
        setPingStatus(prev => ({ ...prev, [id]: 'success' }));
        setTimeout(() => setPingStatus(prev => ({ ...prev, [id]: null })), 3000);
      } else {
        setPingStatus(prev => ({ ...prev, [id]: 'error' }));
        setTimeout(() => setPingStatus(prev => ({ ...prev, [id]: null })), 3000);
      }
    } catch (err) {
      setPingStatus(prev => ({ ...prev, [id]: 'error' }));
      setTimeout(() => setPingStatus(prev => ({ ...prev, [id]: null })), 3000);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-2xl)' }}>
        <div>
          <h1 className="page-title">Manajemen EDC</h1>
          <p className="page-subtitle">Kelola terminal EDC dan koneksinya</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={16} /> Tambah Mesin EDC
        </button>
      </div>

      <div className="card">
        <div className="table-container" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nama Mesin</th>
                <th>Bank/Vendor</th>
                <th>IP / Device ID</th>
                <th>Status</th>
                <th>Test Koneksi</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                  </td>
                </tr>
              ) : terminals.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--color-text-muted)' }}>
                    Belum ada mesin EDC yang terdaftar.
                  </td>
                </tr>
              ) : terminals.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CreditCard size={14} style={{ color: 'var(--color-primary-light)' }} />
                      {t.name}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      TID: {t.terminalId || '-'} | MID: {t.merchantId || '-'}
                    </div>
                  </td>
                  <td>{t.bankName}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
                    {t.ipAddress}
                  </td>
                  <td>
                    <span className={`badge ${t.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {t.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className={`btn btn-sm ${pingStatus[t.id] === 'success' ? 'btn-success' : pingStatus[t.id] === 'error' ? 'btn-danger' : 'btn-secondary'}`}
                      onClick={() => handlePing(t.id, t.ipAddress)}
                      disabled={pingStatus[t.id] === 'loading'}
                    >
                      {pingStatus[t.id] === 'loading' ? (
                        <div className="spinner" style={{ width: 14, height: 14 }}></div>
                      ) : (
                        <><Wifi size={14} /> Ping</>
                      )}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleOpenModal(t)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDelete(t.id, t.name)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingId ? 'Edit Mesin EDC' : 'Tambah Mesin EDC Baru'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div className="form-group">
                    <label className="form-label">Nama Display Mesin</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      placeholder="e.g. EDC BCA Kasir Utama"
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bank / Vendor</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.bankName} 
                      onChange={e => setFormData({...formData, bankName: e.target.value})} 
                      placeholder="e.g. BCA, Mandiri, Youtap"
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">IP Address / Host (Webhook)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.ipAddress} 
                    onChange={e => setFormData({...formData, ipAddress: e.target.value})} 
                    placeholder="e.g. 192.168.1.100 atau edc.vendor.com"
                    required 
                  />
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Alamat API/IP mesin EDC untuk menerima request dari POS.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div className="form-group">
                    <label className="form-label">Terminal ID (TID) - Opsional</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.terminalId} 
                      onChange={e => setFormData({...formData, terminalId: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Merchant ID (MID) - Opsional</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.merchantId} 
                      onChange={e => setFormData({...formData, merchantId: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.isActive} 
                      onChange={e => setFormData({...formData, isActive: e.target.checked})} 
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{ fontWeight: 600 }}>Aktifkan Mesin Ini</span>
                  </label>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginLeft: '24px' }}>
                    Mesin yang tidak aktif tidak akan muncul di layar pilihan kasir.
                  </p>
                </div>

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Simpan Perubahan' : 'Tambahkan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
