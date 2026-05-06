'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import QRCode from 'react-qr-code';
import { X, Download, Printer, Pencil, Trash2, Plus, Camera, AlertTriangle } from 'lucide-react';
import { useLang } from '@/lib/i18n/LangContext';
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

// ─── Photo upload helper ────────────────────────────────────────────────────
async function uploadMachinePhoto(supabase: ReturnType<typeof createClient>, machineId: string, file: File): Promise<string> {
  const ext  = file.name.split('.').pop();
  const path = `machine-photos/${machineId}.${ext}`;
  const { error } = await supabase.storage
    .from('ticket-images')
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('ticket-images').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Photo picker sub-component ─────────────────────────────────────────────
function PhotoPicker({
  current, onFile, changeLabel, addLabel, optionalLabel,
}: {
  current: string | null;
  onFile: (f: File, preview: string) => void;
  changeLabel: string;
  addLabel: string;
  optionalLabel: string;
}) {
  return (
    <div className="relative">
      {current ? (
        <div className="relative w-full h-32 rounded-xl overflow-hidden">
          <img src={current} alt="machine" className="w-full h-full object-cover" />
          <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer rounded-xl">
            <span className="text-white text-xs font-semibold flex items-center gap-1">
              <Camera className="w-4 h-4" /> {changeLabel}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f, URL.createObjectURL(f));
            }} />
          </label>
        </div>
      ) : (
        <label className="flex flex-col items-center gap-2 w-full border-2 border-dashed border-gray-300 rounded-xl py-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
          <Camera className="w-7 h-7 text-gray-400" />
          <span className="text-xs text-gray-500">{addLabel} <span className="text-gray-400">{optionalLabel}</span></span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f, URL.createObjectURL(f));
          }} />
        </label>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function MachineGrid() {
  const supabase = createClient();
  const { t }    = useLang();
  const [machines, setMachines] = useState<Machine[]>([]);

  // Modal state
  type View = 'qr' | 'edit' | null;
  const [selected, setSelected] = useState<Machine | null>(null);
  const [view, setView]         = useState<View>(null);
  const [addOpen, setAddOpen]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  // Shared async state
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr]           = useState<string | null>(null);

  // Edit form
  const [eName, setEName]       = useState('');
  const [eLoc, setELoc]         = useState('');
  const [eFile, setEFile]       = useState<File | null>(null);
  const [ePreview, setEPreview] = useState<string | null>(null);

  // Add form
  const [aName, setAName]       = useState('');
  const [aLoc, setALoc]         = useState('');
  const [aFile, setAFile]       = useState<File | null>(null);
  const [aPreview, setAPreview] = useState<string | null>(null);

  const qrRef  = useRef<HTMLDivElement>(null);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // ── Data loading ────────────────────────────────────────────────────────
  const load = async () => {
    const { data } = await supabase.from('machines').select('*').order('name');
    if (data) {
      setMachines(data as Machine[]);
      setSelected((prev) =>
        prev ? (data.find((m) => m.machine_id === prev.machine_id) as Machine ?? prev) : null
      );
    }
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('machine-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'machines' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, load)
      .subscribe();
    const poll = setInterval(load, 15_000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [supabase]);

  // ── Open helpers ────────────────────────────────────────────────────────
  const openQr = (m: Machine) => {
    setSelected(m); setView('qr'); setErr(null); setConfirmDel(false);
  };

  const openEdit = (m: Machine) => {
    setSelected(m);
    setEName(m.name); setELoc(m.location);
    setEFile(null);   setEPreview(m.photo_url);
    setErr(null);     setView('edit');
  };

  const openAdd = () => {
    setAName(''); setALoc(''); setAFile(null); setAPreview(null);
    setErr(null); setAddOpen(true);
  };

  const closeAll = () => {
    setView(null); setSelected(null); setAddOpen(false);
    setConfirmDel(false); setErr(null);
  };

  // ── Save edit ────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!selected) return;
    setSaving(true); setErr(null);
    try {
      let photo_url = selected.photo_url;
      if (eFile) photo_url = await uploadMachinePhoto(supabase, selected.machine_id, eFile);

      const res = await fetch(`/api/machines/${selected.machine_id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: eName, location: eLoc, photo_url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
      setView('qr');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Add machine ──────────────────────────────────────────────────────────
  const handleAdd = async () => {
    setSaving(true); setErr(null);
    try {
      const res = await fetch('/api/machines', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: aName, location: aLoc }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      if (aFile) {
        const photo_url = await uploadMachinePhoto(supabase, json.machine_id, aFile);
        await fetch(`/api/machines/${json.machine_id}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ name: aName, location: aLoc, photo_url }),
        });
      }

      await load();
      setAddOpen(false);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete machine ───────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true); setErr(null);
    try {
      const res  = await fetch(`/api/machines/${selected.machine_id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
      closeAll();
    } catch (e: any) {
      setErr(e.message);
      setConfirmDel(false);
    } finally {
      setDeleting(false);
    }
  };

  // ── QR helpers ───────────────────────────────────────────────────────────
  const downloadQR = (machine: Machine) => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.insertAdjacentHTML('afterbegin', '<rect width="100%" height="100%" fill="white"/>');
    const blob = new Blob([clone.outerHTML], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${machine.name}-QR.svg`; a.click();
    URL.revokeObjectURL(url);
  };

  const printQR = (machine: Machine) => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>${machine.name} QR Code</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;
        height:100vh;margin:0;font-family:sans-serif;}h2{margin:16px 0 4px;font-size:22px;}p{color:#666;margin:0;}</style>
      </head><body>${svg.outerHTML}<h2>${machine.name}</h2><p>${machine.location}</p>
      <script>window.onload=()=>{window.print();window.close()}<\/script></body></html>
    `);
  };

  const counts = {
    active:      machines.filter((m) => m.status === 'active').length,
    down:        machines.filter((m) => m.status === 'down').length,
    maintenance: machines.filter((m) => m.status === 'maintenance').length,
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

      {/* Legend + Add button */}
      <div className="flex flex-wrap gap-4 mb-5 text-xs font-medium items-center">
        {(['active', 'down', 'maintenance'] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5 capitalize text-gray-600">
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${STATUS_DOT[s]}`} />
            {t.status[s]} ({counts[s]})
          </span>
        ))}
        <span className="text-gray-400 italic hidden sm:inline">{t.grid.clickHint}</span>
        <button
          onClick={openAdd}
          className="ml-auto flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> {t.grid.addMachine}
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {machines.map((m) => (
          <div key={m.machine_id} className="relative group">

            {m.photo_url ? (
              /* ── Photo card ── */
              <button
                onClick={() => openQr(m)}
                className={`w-full rounded-xl border-2 overflow-hidden transition-all hover:scale-105 hover:shadow-lg relative ${STATUS_STYLES[m.status]}`}
                style={{ minHeight: '90px' }}
              >
                <img
                  src={m.photo_url}
                  alt={m.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <span className={`absolute top-1.5 left-1.5 w-2 h-2 rounded-full border border-white/60 ${STATUS_DOT[m.status]}`} />
                <div className="relative z-10 p-2 pt-6 text-left">
                  <p className="font-bold text-xs text-white leading-tight drop-shadow">{m.name}</p>
                  <p className="text-xs text-white/70 mt-0.5 leading-tight">{m.location}</p>
                </div>
              </button>
            ) : (
              /* ── No-photo card ── */
              <button
                onClick={() => openQr(m)}
                className={`w-full border-2 rounded-xl p-2.5 text-center transition-all hover:scale-105 hover:shadow-md ${STATUS_STYLES[m.status]}`}
              >
                <span className={`w-2 h-2 rounded-full inline-block mb-1 ${STATUS_DOT[m.status]}`} />
                <p className="font-bold text-xs leading-tight">{m.name}</p>
                <p className="text-xs opacity-60 mt-0.5">{m.location}</p>
              </button>
            )}

            {/* Edit button overlay */}
            <button
              onClick={(e) => { e.stopPropagation(); openEdit(m); }}
              className="absolute top-1.5 right-1.5 p-1 rounded-md bg-white/80 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              title={t.grid.editMachine}
            >
              <Pencil className="w-3 h-3 text-gray-600" />
            </button>
          </div>
        ))}
      </div>

      {/* ── QR Modal ─────────────────────────────────────────────────────── */}
      {selected && view === 'qr' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={closeAll}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>

            {selected.photo_url && (
              <img src={selected.photo_url} alt={selected.name} className="w-full h-36 object-cover" />
            )}

            <div className="p-5 flex flex-col items-center gap-4">
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
                    {t.status[selected.status as keyof typeof t.status]}
                  </span>
                </div>
                <button onClick={closeAll} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* QR Code */}
              <div ref={qrRef} className="bg-white p-4 rounded-xl border-2 border-gray-100">
                <QRCode value={`${baseUrl}/report/${selected.machine_id}`} size={170} level="H" />
              </div>
              <p className="text-xs text-gray-300 text-center break-all leading-tight">
                {baseUrl}/report/{selected.machine_id}
              </p>

              {/* QR actions */}
              <div className="flex gap-2 w-full">
                <button onClick={() => downloadQR(selected)} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl text-sm transition-colors">
                  <Download className="w-4 h-4" /> {t.grid.download}
                </button>
                <button onClick={() => printQR(selected)} className="flex-1 flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-600 font-semibold py-2 rounded-xl text-sm transition-colors">
                  <Printer className="w-4 h-4" /> {t.grid.print}
                </button>
              </div>

              {/* Divider */}
              <div className="w-full border-t border-gray-100" />

              {/* Manage actions */}
              {!confirmDel ? (
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => openEdit(selected)}
                    className="flex-1 flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2 rounded-xl text-sm transition-colors"
                  >
                    <Pencil className="w-4 h-4" /> {t.grid.edit}
                  </button>
                  <button
                    onClick={() => setConfirmDel(true)}
                    className="flex-1 flex items-center justify-center gap-2 border border-red-200 hover:bg-red-50 text-red-600 font-semibold py-2 rounded-xl text-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> {t.grid.delete}
                  </button>
                </div>
              ) : (
                <div className="w-full space-y-2">
                  <p className="text-sm text-center text-gray-700 font-medium">{t.grid.delete} <span className="font-bold">{selected.name}</span>?</p>
                  <p className="text-xs text-center text-gray-400">{t.grid.deleteConfirm}</p>
                  {err && <p className="text-xs text-center text-red-600">{err}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => { setConfirmDel(false); setErr(null); }} className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2 rounded-xl text-sm hover:bg-gray-50">
                      {t.grid.cancel}
                    </button>
                    <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 rounded-xl text-sm transition-colors">
                      {deleting ? t.grid.deleting : t.grid.yesDelete}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ───────────────────────────────────────────────────── */}
      {selected && view === 'edit' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={closeAll}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>

            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg">{t.grid.editMachine}</h2>
              <button onClick={closeAll} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <PhotoPicker
              current={ePreview}
              onFile={(f, p) => { setEFile(f); setEPreview(p); }}
              changeLabel={t.grid.changePhoto}
              addLabel={t.grid.addMachinePhoto}
              optionalLabel={t.grid.optional}
            />

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t.grid.machineName}</label>
              <input
                value={eName}
                onChange={(e) => setEName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t.grid.machineNamePH}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t.grid.location}</label>
              <input
                value={eLoc}
                onChange={(e) => setELoc(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t.grid.locationPH}
              />
            </div>

            {err && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {err}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => { setView('qr'); setErr(null); }} className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50">
                {t.grid.cancel}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !eName.trim() || !eLoc.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {saving ? t.grid.saving : t.grid.saveChanges}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Machine Modal ─────────────────────────────────────────────── */}
      {addOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={closeAll}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>

            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg">{t.grid.addNewMachine}</h2>
              <button onClick={closeAll} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <PhotoPicker
              current={aPreview}
              onFile={(f, p) => { setAFile(f); setAPreview(p); }}
              changeLabel={t.grid.changePhoto}
              addLabel={t.grid.addMachinePhoto}
              optionalLabel={t.grid.optional}
            />

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t.grid.machineName}</label>
              <input
                value={aName}
                onChange={(e) => setAName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t.grid.machineNamePH}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{t.grid.location}</label>
              <input
                value={aLoc}
                onChange={(e) => setALoc(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t.grid.locationPH}
              />
            </div>

            {err && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {err}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={closeAll} className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50">
                {t.grid.cancel}
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !aName.trim() || !aLoc.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {saving ? t.grid.adding : <><Plus className="w-4 h-4" /> {t.grid.addMachine}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
