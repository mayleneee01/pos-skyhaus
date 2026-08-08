// src/components/FullscreenToggle.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Maximize, Minimize } from 'lucide-react';

export default function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
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
