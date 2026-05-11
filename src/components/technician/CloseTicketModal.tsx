'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import { useLang } from '@/lib/i18n/LangContext';
import type { Ticket } from '@/types';

interface Props {
  ticket: Ticket;
  onClose: () => void;
  onResolved: () => void;
}

const ISSUE_ICON: Record<string, string> = {
  Electrical: '⚡',
  Mechanical: '⚙️',
  Software:   '💻',
};

export default function CloseTicketModal({ ticket, onClose, onResolved }: Props) {
  const { t }                     = useLang();
  const [rootCause, setRootCause] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const handleResolve = async () => {
    if (!rootCause.trim()) { setError(t.close.rootCauseRequired); return; }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tickets/${ticket.ticket_id}/close`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ root_cause: rootCause, parts_used: partsUsed }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Failed to close ticket');
      }

      onResolved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const machineName = (ticket as any).machines?.name ?? ticket.machine_id;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Dark header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 pt-5 pb-6 text-white relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{ISSUE_ICON[ticket.issue_type] ?? '🔧'}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{ticket.issue_type}</span>
              </div>
              <h2 className="text-lg font-black leading-tight">{t.close.title}</h2>
              <p className="text-slate-400 text-sm mt-0.5">{machineName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form body */}
        <div className="px-5 py-5 flex flex-col gap-4">

          {/* Root cause */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">
              {t.close.rootCause}
              <span className="ml-1 text-red-400">*</span>
            </p>
            <textarea
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              rows={3}
              placeholder={t.close.rootCausePH}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none transition-all"
            />
          </div>

          {/* Parts used */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2">
              {t.close.partsUsed}
              <span className="ml-1 normal-case font-normal text-slate-300">({t.form.optional})</span>
            </p>
            <input
              type="text"
              value={partsUsed}
              onChange={(e) => setPartsUsed(e.target.value)}
              placeholder={t.close.partsPH}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <span className="flex-shrink-0">⚠️</span>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-colors"
            >
              {t.close.cancel}
            </button>
            <button
              onClick={handleResolve}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-black text-sm transition-all active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {t.close.markResolved}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
