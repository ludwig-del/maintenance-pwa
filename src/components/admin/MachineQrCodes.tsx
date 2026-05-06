'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import QRCode from 'react-qr-code';
import { Download, X, QrCode } from 'lucide-react';
import type { Machine } from '@/types';

export default function MachineQrCodes() {
  const supabase = createClient();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selected, setSelected] = useState<Machine | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    supabase
      .from('machines')
      .select('*')
      .order('name')
      .then(({ data }) => { if (data) setMachines(data as Machine[]); });
  }, [supabase]);

  const downloadSVG = (machine: Machine) => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    // Add white background and padding for printing
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.insertAdjacentHTML(
      'afterbegin',
      `<rect width="100%" height="100%" fill="white"/>`
    );

    const blob = new Blob([clone.outerHTML], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${machine.name}-QR.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg || !selected) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>${selected.name} QR</title>
      <style>
        body { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; }
        h2 { margin-top: 16px; font-size: 20px; }
        p  { color: #666; margin: 4px 0 0; }
      </style></head>
      <body>
        ${svg.outerHTML}
        <h2>${selected.name}</h2>
        <p>${selected.location}</p>
        <script>window.onload=()=>{ window.print(); window.close(); }<\/script>
      </body></html>
    `);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <QrCode className="w-5 h-5 text-blue-600" />
        <h3 className="font-bold text-gray-700">Machine QR Codes</h3>
        <span className="text-xs text-gray-400 ml-1">click a machine to view & download</span>
      </div>

      {/* Machine grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {machines.map((m) => (
          <button
            key={m.machine_id}
            onClick={() => setSelected(m)}
            className="border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-2.5 text-center transition-all"
          >
            <p className="font-bold text-xs text-gray-700 leading-tight">{m.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{m.location}</p>
          </button>
        ))}
      </div>

      {/* QR Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="font-bold text-gray-800">{selected.name}</p>
                <p className="text-xs text-gray-400">{selected.location}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Code */}
            <div ref={qrRef} className="bg-white p-4 rounded-xl border-2 border-gray-100">
              <QRCode
                value={`${baseUrl}/report/${selected.machine_id}`}
                size={200}
                level="H"
              />
            </div>

            <p className="text-xs text-gray-400 text-center break-all">
              {baseUrl}/report/{selected.machine_id}
            </p>

            <div className="flex gap-2 w-full">
              <button
                onClick={() => downloadSVG(selected)}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                <Download className="w-4 h-4" /> Download
              </button>
              <button
                onClick={printQR}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-600 font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
