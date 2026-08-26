'use client';

import { useState, useEffect } from 'react';
import { Plus, Tag, Edit, Trash2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  order: number;
  _count: { products: number };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formOrder, setFormOrder] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) setCategories(data.data);
    } catch (error) {
      console.error('Fetch categories error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormOrder('0');
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormName(category.name);
    setFormOrder(category.order.toString());
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      alert('Nama kategori wajib diisi');
      return;
    }

    setSaving(true);
    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim(), order: parseInt(formOrder) || 0 }),
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchCategories();
      } else {
        alert(data.error || 'Gagal menyimpan kategori');
      }
    } catch (error) {
      console.error('Save category error:', error);
      alert('Gagal menyimpan kategori');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus kategori "${name}"?`)) return;

    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchCategories();
      } else {
        alert(data.error || 'Gagal menghapus kategori');
      }
    } catch (error) {
      console.error('Delete category error:', error);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manajemen Kategori</h1>
          <p className="page-subtitle">{categories.length} kategori terdaftar</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} /> Tambah Kategori
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-3xl)' }}>
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nama Kategori</th>
                <th>Urutan</th>
                <th>Jumlah Produk</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(category => (
                <tr key={category.id}>
                  <td style={{ fontWeight: 600, fontSize: 'var(--text-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag size={18} className="text-primary" /> {category.name}
                  </td>
                  <td>
                    <span className="badge badge-secondary">{category.order}</span>
                  </td>
                  <td>
                    <span className="badge badge-info">{category._count.products} produk</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(category)}>
                        <Edit size={16} /> Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(category.id, category.name)}>
                        <Trash2 size={16} /> Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-muted)' }}>
                    Belum ada kategori
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nama Kategori</label>
                <input
                  className="form-input"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Contoh: Kopi, Makanan, Snack..."
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
              </div>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Urutan Tampil (Angka)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formOrder}
                  onChange={e => setFormOrder(e.target.value)}
                  placeholder="0, 1, 2, 3..."
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
                <small style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: '4px', display: 'block' }}>
                  Kategori dengan urutan paling kecil akan tampil paling depan.
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : editingCategory ? 'Simpan Perubahan' : 'Tambah Kategori'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
