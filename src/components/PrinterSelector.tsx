// src/components/PrinterSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { Bluetooth, Printer, RefreshCw, X, CheckCircle, Unplug } from 'lucide-react';
import {
  canUseBluetooth,
  scanBluetoothDevices,
  connectToPrinter,
  disconnectPrinter,
  isPrinterConnected,
  autoReconnect,
} from '@/lib/bluetoothPrinter';
import type { BluetoothDevice } from '@/lib/bluetoothPrinter';

export default function PrinterSelector() {
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectedName, setConnectedName] = useState('');
  const [connecting, setConnecting] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  // Cek status & auto-reconnect saat pertama load
  useEffect(() => {
    if (!canUseBluetooth()) return;

    const init = async () => {
      const isConn = await isPrinterConnected();
      if (isConn) {
        setConnected(true);
        setConnectedName(localStorage.getItem('pos_printer_name') || 'Printer');
      } else {
        // Coba auto-reconnect
        const reconnected = await autoReconnect();
        if (reconnected) {
          setConnected(true);
          setConnectedName(localStorage.getItem('pos_printer_name') || 'Printer');
        }
      }
    };
    init();
  }, []);

  // Jika bukan platform native, tidak render apa-apa
  if (!canUseBluetooth()) return null;

  const handleScan = async () => {
    setError('');
    setScanning(true);
    try {
      const found = await scanBluetoothDevices();
      setDevices(found);
      if (found.length === 0) {
        setError('Tidak ada perangkat ditemukan. Pastikan printer sudah di-pair di Pengaturan Bluetooth Android terlebih dahulu.');
      }
    } catch (e: any) {
      setError(e.message || 'Gagal memindai perangkat Bluetooth');
    } finally {
      setScanning(false);
    }
  };

  const handleConnect = async (device: BluetoothDevice) => {
    setError('');
    setConnecting(device.address);
    try {
      await connectToPrinter(device.address);
      localStorage.setItem('pos_printer_name', device.name || 'Printer');
      setConnected(true);
      setConnectedName(device.name || 'Printer');
      setShowModal(false);
    } catch (e: any) {
      setError(e.message || 'Gagal terhubung ke printer');
    } finally {
      setConnecting('');
    }
  };

  const handleDisconnect = async () => {
    await disconnectPrinter();
    setConnected(false);
    setConnectedName('');
  };

  return (
    <>
      {/* Tombol status printer di header POS */}
      <button
        className="btn btn-sm"
        onClick={() => { setShowModal(true); if (!connected) handleScan(); }}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: connected ? 'var(--color-success-bg)' : 'var(--color-bg-elevated)',
          color: connected ? 'var(--color-success)' : 'var(--color-text-secondary)',
          border: `1px solid ${connected ? 'var(--color-success)' : 'var(--color-border)'}`,
        }}
      >
        <Bluetooth size={14} />
        {connected ? connectedName : 'Printer'}
      </button>

      {/* Modal pemilih printer */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Printer size={20} className="text-primary" /> Printer Bluetooth
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Status terhubung */}
              {connected && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', background: 'var(--color-success-bg)',
                  borderRadius: 'var(--radius-md)', marginBottom: '16px',
                }}>
                  <span style={{ color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-sm)' }}>
                    <CheckCircle size={16} /> {connectedName}
                  </span>
                  <button className="btn btn-danger btn-sm" onClick={handleDisconnect}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Unplug size={14} /> Putuskan
                  </button>
                </div>
              )}

              {/* Tombol scan */}
              <button
                className="btn btn-primary btn-full"
                onClick={handleScan}
                disabled={scanning}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {scanning
                  ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Memindai...</>
                  : <><RefreshCw size={16} /> Pindai Perangkat Bluetooth</>
                }
              </button>

              {/* Error message */}
              {error && (
                <p style={{
                  color: 'var(--color-danger)', fontSize: 'var(--text-sm)',
                  marginTop: '12px', padding: '8px 12px',
                  background: 'var(--color-danger-bg)', borderRadius: 'var(--radius-sm)',
                }}>
                  {error}
                </p>
              )}

              {/* Daftar perangkat */}
              {devices.length > 0 && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                    Perangkat yang ditemukan:
                  </p>
                  {devices.map(device => (
                    <button
                      key={device.address}
                      className="btn btn-secondary btn-full"
                      onClick={() => handleConnect(device)}
                      disabled={connecting === device.address}
                      style={{ justifyContent: 'flex-start', gap: '12px', padding: '12px 16px' }}
                    >
                      {connecting === device.address
                        ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                        : <Bluetooth size={18} />
                      }
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600 }}>{device.name || 'Unknown Device'}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                          {device.address}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Petunjuk pairing */}
              <div style={{
                marginTop: '16px', padding: '12px 16px',
                background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
              }}>
                <strong>Cara menghubungkan printer:</strong><br />
                1. Hidupkan printer POS58B<br />
                2. Buka Pengaturan Android → Bluetooth → Pair perangkat baru<br />
                3. Pilih printer (biasanya bernama &quot;POS58&quot; atau &quot;BT Printer&quot;)<br />
                4. Kembali ke sini dan tekan &quot;Pindai Perangkat Bluetooth&quot;
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
