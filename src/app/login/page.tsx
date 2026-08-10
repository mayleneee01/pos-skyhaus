'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();

      if (result.success) {
        // Navigate to the correct dashboard based on role
        const target = result.role === 'ADMIN' ? '/admin' : '/pos';
        window.location.href = target;
        return;
      }

      setError(result.error || 'Email atau password salah');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(`Terjadi kesalahan: ${err.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-bg-glow login-bg-glow-1" />
      <div className="login-bg-glow login-bg-glow-2" />

      <div className="login-card animate-slide-up">
        <div className="login-logo-wrapper">
          <img
            src="/logo-sky-haus.png"
            alt="SKY HAUS Logo"
            className="login-logo"
          />
          <h1 className="login-title">
            SKY <span style={{ color: 'var(--color-primary)' }}>HAUS</span>
          </h1>
          <p className="login-subtitle">Point of Sale System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="masukkan email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="masukkan password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-full"
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Memproses...
              </>
            ) : (
              'Masuk'
            )}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: '24px',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)'
        }}>
          SKY HAUS POS v1.0 • Jl. Lapas, Kec. Jati Agung, Lampung
        </p>
      </div>
    </div>
  );
}
