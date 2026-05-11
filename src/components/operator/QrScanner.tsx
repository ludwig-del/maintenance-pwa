'use client';

import { useEffect, useRef, useState } from 'react';
import { ScanLine, CameraOff, Loader2 } from 'lucide-react';

type Status = 'loading' | 'scanning' | 'error';

export default function QrScanner() {
  const scannerRef  = useRef<any>(null);
  const [status, setStatus]     = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let stopped = false;

    async function start() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (stopped) return;

        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 230, height: 230 } },
          (text: string) => {
            try {
              const url = new URL(text);
              if (url.pathname.startsWith('/report/')) {
                scanner.stop().catch(() => {});
                // Full page load instead of client-side nav — avoids RSC fetch errors on first scan
                window.location.href = url.pathname;
              }
            } catch {
              // not a valid URL — keep scanning
            }
          },
          () => {}, // per-frame decode errors are normal
        );

        if (!stopped) setStatus('scanning');
      } catch (err: any) {
        if (stopped) return;
        const msg = err?.message ?? '';
        if (
          msg.includes('Permission') ||
          err?.name === 'NotAllowedError' ||
          msg.includes('not allowed')
        ) {
          setErrorMsg('Camera permission denied. Please allow camera access and refresh.');
        } else if (msg.includes('NotFoundError') || msg.includes('no camera')) {
          setErrorMsg('No camera found on this device.');
        } else {
          setErrorMsg('Could not start camera. Please check permissions and try again.');
        }
        setStatus('error');
      }
    }

    start();

    return () => {
      stopped = true;
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-sm">

        {/* Loading overlay */}
        {status === 'loading' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/80 rounded-2xl gap-3 min-h-[240px]">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <p className="text-white text-sm">Starting camera…</p>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="flex flex-col items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <CameraOff className="w-12 h-12 text-red-400" />
            <p className="text-red-600 text-sm font-medium">{errorMsg}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* html5-qrcode mounts video here */}
        <div
          id="qr-reader"
          className="w-full rounded-2xl overflow-hidden [&>video]:w-full [&>video]:rounded-2xl"
        />

        {/* Scanning frame overlay */}
        {status === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-52 h-52 relative">
              <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
              <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
              <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
              <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
              <span className="absolute left-2 right-2 h-0.5 bg-blue-400 animate-bounce top-1/2" />
            </div>
          </div>
        )}
      </div>

      {status === 'scanning' && (
        <p className="flex items-center gap-2 text-slate-500 text-sm">
          <ScanLine className="w-4 h-4" />
          Point at the QR code on the machine
        </p>
      )}
    </div>
  );
}
