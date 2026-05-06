'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import QRCode from 'react-qr-code';
import { X, Download, Printer } from 'lucide-react';
import type { Machine } from '@/types';

const STATUS_STYLES: Record<string, string> = {
  active:      'bg-green-50 border-green-400 text-green-800',
  down:        'bg-red-50 border-red-500 text-red-800 animate-pulse',
  maintenance: 'bg-yellow-50 border-yellow-400 text-yellow-800',
};

const STATUS_DOT: Record<string, string> = {
  active:      'bg-green-500',
  down:        'bg-red-500',
  maintenance: 'bg-yellow-400',
};

const STATUS_LABEL: Record<string, string> = {
  active:      'Active',
  down:        'DOWN',
  maintenance: 'Maintenance',
};

export default function MachineGrid() {
  const supabase = createClient();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selected, setSelected] = useState<Machine | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('machines').select('*').order('name');
      if (data) setMachines(data as Machine[]);
    };
    load();

    const channel = supabase
      .channel('machine-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'machines' }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const counts = {
    active:      machines.filter((m) => m.status === 'active').length,
    down:        machines.filter((m) => m.status === 'down').length,
    maintenance: machines.filter((m) => m.status === 'maintenance').length,
  };

  const downloadQR = (machine: Machine) => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.insertAdjacentHTML('afterbegin', '<rect width="100%" height="100%" fill="white"/>');
    const blob = new Blob([clone.outerHTML], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `${machine.name}-QR.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printQR = (machine: Machine) => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>${machine.name} QR Code</title>
      <style>
        body{display:flex;flex-direction:column;align-items:center;justify-content:center;
             height:100vh;margin:0;font-family:sans-serif;}
        h2{margin:16px 0 4px;font-size:22px;}
        p{color:#666;margin:0;}
      </style></head>
      <body>
        ${svg.outerHTML}
        <h2>${machine.name}</h2>
        <p>${machine.location}</p>
        <script>window.onload=()=>{window.print();window.close();}<\/script>
      </body></html>
    `);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* Legend */}
      <div className="flex gap-5 mb-5 text-xs font-medium">
        {(['active', 'down', 'maintenance'] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5 capitalize text-gray-600">
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${STATUS_DOT[s]}`} />
            {s} ({counts[s]})
          </span>
        ))}
        <span className="ml-auto text-gray-400 italic">click machine to view QR</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {machines.map((m) => (
          <button
            key={m.machine_id}
            onClick={() => setSelected(m)}
            className={`border-2 rounded-xl p-2.5 text-center transition-all hover:scale-105 hover:shadow-md ${STATUS_STYLES[m.status]}`}
          >
            <p className="font-bold text-xs leading-tight">{m.name}</p>
            <p className="text-xs opacity-60 mt-0.5">{m.location}</p>
          </button>
        ))}
      </div>

      {/* QR Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between w-full">
              <div>
                <p className="font-bold text-gray-800 text-lg">{selected.name}</p>
                <p className="text-xs text-gray-400">{selected.location}</p>
                <span className={`inline-flex items-center gap-1.5 mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full
                  ${selected.status === 'active' ? 'bg-green-100 text-green-700' :
                    selected.status === 'down'   ? 'bg-red-100 text-red-700' :
                                                   'bg-yellow-100 text-yellow-700'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[selected.status]}`} />
                  {STATUS_LABEL[selected.status]}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Code */}
            <div ref={qrRef} className="bg-white p-4 rounded-xl border-2 border-gray-100">
              <QRCode
                value={`${baseUrl}/report/${selected.machine_id}`}
                size={190}
                level="H"
              />
            </div>

            <p className="text-xs text-gray-300 text-center break-all leading-tight">
              {baseUrl}/report/{selected.machine_id}
            </p>

            {/* Actions */}
            <div className="flex gap-2 w-full">
              <button
                onClick={() => downloadQR(selected)}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                <Download className="w-4 h-4" /> Download
              </button>
              <button
                onClick={() => printQR(selected)}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-600 font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
