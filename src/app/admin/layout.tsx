'use client';

import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

import { LayoutDashboard, Package, Tags, BarChart3, Settings, CreditCard, LogOut } from 'lucide-react';
import FullscreenToggle from '@/components/FullscreenToggle';

function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const links = [
    { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/admin/products', label: 'Produk', icon: <Package size={18} /> },
    { href: '/admin/categories', label: 'Kategori', icon: <Tags size={18} /> },
    { href: '/admin/reports', label: 'Laporan', icon: <BarChart3 size={18} /> },
    { href: '/admin/edc', label: 'Mesin EDC', icon: <CreditCard size={18} /> },
    { href: '/admin/settings', label: 'Pengaturan', icon: <Settings size={18} /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src="/logo-sky-haus.png" alt="SKY HAUS" className="sidebar-logo" />
        <div>
          <div className="sidebar-brand">SKY <span>HAUS</span></div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Admin Panel</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">Menu</div>
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`sidebar-link ${pathname === link.href ? 'active' : ''}`}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>{link.icon}</span>
            {link.label}
          </Link>
        ))}

        <div className="sidebar-section" style={{ marginTop: 'auto' }}>Akses Cepat</div>
        <Link href="/pos" className="sidebar-link">
          <span style={{ display: 'flex', alignItems: 'center' }}><CreditCard size={18} /></span>
          Buka Kasir (POS)
        </Link>
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{session?.user?.name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Admin</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => signOut()}>
            Keluar
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="layout-wrapper">
        <AdminSidebar />
        <main className="main-content">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
