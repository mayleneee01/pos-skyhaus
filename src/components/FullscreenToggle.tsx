// src/components/FullscreenToggle.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Maximize, Minimize } from 'lucide-react';

export default function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const intentionalExit = useRef(false);

  const handleFullscreenChange = useCallback(() => {
    const isFull = !!document.fullscreenElement;
    setIsFullscreen(isFull);

    // Jika keluar dari fullscreen secara tidak sengaja (karena popup RawBT)
    if (!isFull && !intentionalExit.current) {
      const restoreFullscreen = async () => {
        try {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          }
        } catch (err) {
          // Abaikan error jika gagal restore
        } finally {
          document.removeEventListener('click', restoreFullscreen);
          document.removeEventListener('touchstart', restoreFullscreen);
        }
      };
      
      // Pasang listener untuk sentuhan/klik pertama setelah kembali ke aplikasi
      setTimeout(() => {
        document.addEventListener('click', restoreFullscreen);
        document.addEventListener('touchstart', restoreFullscreen, { passive: true });
      }, 500);
    }
    
    // Reset flag setelah event selesai diproses
    if (!isFull) {
      intentionalExit.current = false;
    }
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [handleFullscreenChange]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        intentionalExit.current = true;
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={toggleFullscreen}
      title={isFullscreen ? 'Keluar Fullscreen' : 'Mode Fullscreen'}
      style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '6px 10px',
        background: isFullscreen ? 'var(--color-primary-bg)' : 'transparent',
        color: isFullscreen ? 'var(--color-primary)' : 'var(--color-text-secondary)',
        border: `1px solid ${isFullscreen ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-sm)',
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
      }}
    >
      {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
      {isFullscreen ? 'Keluar' : 'Fullscreen'}
    </button>
  );
}
