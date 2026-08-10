'use client';

import { useState, useEffect, useRef } from 'react';
import { formatRupiah } from '@/lib/utils';
import { Plus, Edit, Trash2, Upload } from 'lucide-react';
import type { ProductWithCategory } from '@/types';

interface Category {
  id: string;
  name: string;
  _count: { products: number };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formLowStock, setFormLowStock] = useState('5');
  const [formCategory, setFormCategory] = useState('');
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formIsActive, setFormIsActive] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams({ activeOnly: 'false' });
      if (search) params.set('search', search);
      if (filterCategory) params.set('categoryId', filterCategory);
      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();
      if (data.success) setProducts(data.data);
    } catch (error) {
      console.error('Fetch products error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const res = await fetch('/api/categories');
    const data = await res.json();
    if (data.success) setCategories(data.data);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, filterCategory]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku('');
    setFormPrice('');
    setFormStock('');
    setFormLowStock('5');
    setFormCategory(categories[0]?.id || '');
    setFormImage(null);
    setFormIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (product: ProductWithCategory) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormSku(product.sku || '');
    setFormPrice(product.price.toString());
    setFormStock(product.stock.toString());
    setFormLowStock(product.lowStock.toString());
    setFormCategory(product.categoryId);
    setFormImage(product.image);
    setFormIsActive(product.isActive);
    setShowModal(true);
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setFormImage(data.data.path);
      } else {
        alert(data.error || 'Gagal mengupload gambar');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Gagal mengupload gambar');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formName || !formPrice || !formCategory) {
      alert('Nama, harga, dan kategori wajib diisi');
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: formName,
        sku: formSku || null,
        price: formPrice,
        stock: formStock || '0',
        lowStock: formLowStock || '5',
        categoryId: formCategory,
        image: formImage,
        isActive: formIsActive,
      };

      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchProducts();
      } else {
        alert(data.error || 'Gagal menyimpan produk');
      }
    } catch (error) {
      console.error('Save product error:', error);
      alert('Gagal menyimpan produk');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus produk "${name}"?`)) return;

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchProducts();
      } else {
        alert(data.error || 'Gagal menghapus produk');
      }
    } catch (error) {
      console.error('Delete product error:', error);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Manajemen Produk</h1>
          <p className="page-subtitle">{products.length} produk terdaftar</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={18} /> Tambah Produk
        </button>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            type="text"
            className="form-input"
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }}
          />
        </div>
        <select
          className="form-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ width: 200 }}
        >
          <option value="">Semua Kategori</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-3xl)' }}>
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Foto</th>
                <th>Produk</th>
                <th>SKU</th>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Stok</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id}>
                  <td>
                    <div style={{ width: 40, height: 40, background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
                      <img
                        src={product.image || '/logo-sky-haus.png'}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{product.name}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {product.sku || '-'}
                  </td>
                  <td><span className="badge badge-primary">{product.category.name}</span></td>
                  <td style={{ fontWeight: 600 }}>{formatRupiah(product.price)}</td>
                  <td>
                    <span className={`badge ${
                      product.stock <= 0 ? 'badge-danger' :
                      product.stock <= product.lowStock ? 'badge-warning' :
                      'badge-success'
                    }`}>
                      {product.stock}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${product.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {product.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(product)}>
                        <Edit size={16} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(product.id, product.name)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-muted)' }}>
                    Tidak ada produk ditemukan
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
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                  <div style={{ width: 100, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ width: 100, height: 100, background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={formImage || '/logo-sky-haus.png'} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleUploadImage} style={{ display: 'none' }} />
                    <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} style={{ padding: '4px 8px', fontSize: '11px' }}>
                      {uploadingImage ? 'Loading...' : <><Upload size={12} /> Ubah Foto</>}
                    </button>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <div className="form-group">
                      <label className="form-label">Nama Produk *</label>
                      <input className="form-input" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Contoh: Americano" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">SKU (Opsional)</label>
                      <input className="form-input" value={formSku} onChange={e => setFormSku(e.target.value)} placeholder="Contoh: KPI-001" />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Kategori *</label>
                  <select className="form-select" value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                    <option value="">Pilih Kategori</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)' }}>
                  <div className="form-group">
                    <label className="form-label">Harga (Rp) *</label>
                    <input type="number" className="form-input" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stok</label>
                    <input type="number" className="form-input" value={formStock} onChange={e => setFormStock(e.target.value)} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Min. Stok</label>
                    <input type="number" className="form-input" value={formLowStock} onChange={e => setFormLowStock(e.target.value)} placeholder="5" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                    Produk Aktif (ditampilkan di kasir)
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : editingProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
