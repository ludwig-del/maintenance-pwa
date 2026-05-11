'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Clock, Wrench, MapPin, User, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useLang } from '@/lib/i18n/LangContext';
import type { Ticket } from '@/types';

// ─── Config ─────────────────────────────────────────────────────────────────

const SEV_GRADIENT: Record<string, string> = {
  High:   'from-red-900 via-red-800 to-red-900',
  Medium: 'from-yellow-800 via-yellow-700 to-yellow-800',
  Low:    'from-green-900 via-green-800 to-green-900',
};

const SEV_BADGE: Record<string, string> = {
  High:   'bg-red-500/25 border-red-400/40 text-red-200',
  Medium: 'bg-yellow-500/25 border-yellow-400/40 text-yellow-200',
  Low:    'bg-green-500/25 border-green-400/40 text-green-200',
};

const SEV_STRIP: Record<string, string> = {
  High:   'border-red-300',
  Medium: 'border-yellow-300',
  Low:    'border-green-300',
};

const ISSUE_ICON: Record<string, string> = {
  Electrical: '⚡',
  Mechanical: '⚙️',
  Software:   '💻',
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface HistoryRow {
  ticket_id: string;
  issue_type: string;
  severity: string;
  description: string | null;
  root_cause: string | null;
  parts_used: string | null;
  repair_time_minutes: number | null;
  resolved_at: string | null;
  created_at: string;
  technician: { name: string } | null;
  operator: { name: string } | null;
}

interface Props {
  ticket: Ticket;
  currentUserId: string;
  onClose: () => void;
  onClaim?: () => void;
  onCloseTicket?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TaskDetailModal({ ticket, currentUserId, onClose, onClaim, onCloseTicket }: Props) {
  const supabase                = createClient();
  const { t }                   = useLang();
  const [history, setHistory]   = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoading] = useState(true);

  const machineName    = (ticket as any).machines?.name ?? ticket.machine_id;
  const location       = (ticket as any).machines?.location ?? '';
  const operatorName   = (ticket as any).users?.name ?? '—';
  const technicianName = (ticket as any).technician?.name as string | undefined;
  const isOwnTask      = ticket.technician_id === currentUserId;

  useEffect(() => {
    async function load() {
      const { data: tickets } = await supabase
        .from('tickets')
        .select('ticket_id, issue_type, severity, description, root_cause, parts_used, repair_time_minutes, resolved_at, created_at, operator_id, technician:users!technician_id(name)')
        .eq('machine_id', ticket.machine_id)
        .eq('status', 'Resolved')
        .order('resolved_at', { ascending: false })
        .limit(15);

      if (!tickets) { setLoading(false); return; }

      const operatorIds = Array.from(new Set(tickets.map((t: any) => t.operator_id).filter(Boolean)));
      const nameMap: Record<string, string> = {};
      if (operatorIds.length) {
        const res = await fetch(`/api/user-names?ids=${operatorIds.join(',')}`);
        if (res.ok) Object.assign(nameMap, await res.json());
      }

      const merged = tickets.map((t: any) => ({
        ...t,
        operator: nameMap[t.operator_id] ? { name: nameMap[t.operator_id] } : null,
      }));

      setHistory(merged as unknown as HistoryRow[]);
      setLoading(false);
    }
    load();
  }, [ticket.machine_id, supabase]);

  const gradient = SEV_GRADIENT[ticket.severity] ?? SEV_GRADIENT.Medium;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Dark gradient header ── */}
        <div className={`bg-gradient-to-br ${gradient} px-5 pt-4 pb-6 text-white relative`}>
          {/* Drag handle */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{ISSUE_ICON[ticket.issue_type] ?? '🔧'}</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${SEV_BADGE[ticket.severity]}`}>
                  {t.severity[ticket.severity as keyof typeof t.severity] ?? ticket.severity}
                </span>
                <span className="text-xs font-semibold text-white/50">
                  {t.issueType[ticket.issue_type as keyof typeof t.issueType] ?? ticket.issue_type}
                </span>
              </div>
              <h2 className="text-xl font-black leading-tight">{machineName}</h2>
              <p className="text-white/60 text-sm flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />{location}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">

          {/* Current report */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-3">
              {t.detail.currentReport}
            </p>
            <div className="bg-slate-50 rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 text-sm">
                <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-slate-400 text-xs">{t.detail.reportedBy}</span>
                <span className="ml-auto font-semibold text-slate-700">{operatorName}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 text-sm">
                <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-slate-400 text-xs">{t.detail.submitted}</span>
                <span className="ml-auto font-semibold text-slate-700">
                  {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                </span>
              </div>
              {ticket.status === 'In Progress' && (
                <div className="flex items-center gap-2 px-4 py-3 text-sm">
                  <Wrench className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-400 text-xs">{t.detail.assignedTo}</span>
                  <span className={`ml-auto font-semibold ${isOwnTask ? 'text-green-600' : 'text-orange-600'}`}>
                    {isOwnTask ? t.detail.you : (technicianName ?? t.detail.anotherTech)}
                  </span>
                </div>
              )}
            </div>

            {ticket.description && (
              <div className="mt-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 flex items-center gap-1 mb-1.5">
                  <AlertTriangle className="w-3 h-3" /> {t.detail.operatorNote}
                </p>
                <p className="text-sm text-slate-700">{ticket.description}</p>
              </div>
            )}
          </section>

          {/* Actions */}
          {ticket.status === 'Pending' && onClaim && (
            <button
              onClick={() => { onClaim(); onClose(); }}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-3.5 rounded-2xl text-sm transition-all shadow-sm shadow-blue-200"
            >
              <Wrench className="w-4 h-4" /> {t.detail.claimTask}
            </button>
          )}
          {ticket.status === 'In Progress' && isOwnTask && onCloseTicket && (
            <button
              onClick={() => { onCloseTicket(); onClose(); }}
              className="w-full bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold py-3.5 rounded-2xl text-sm transition-all shadow-sm shadow-green-200"
            >
              {t.detail.closeTask}
            </button>
          )}

          {/* Repair history */}
          <section>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-3">
              {t.detail.repairHistory} {machineName}
            </p>

            {loadingHistory ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-slate-100">
                {t.detail.noHistory}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {history.map((h) => (
                  <div
                    key={h.ticket_id}
                    className={`bg-slate-50 rounded-2xl border-l-4 border border-slate-100 p-4 text-sm ${SEV_STRIP[h.severity] ?? 'border-l-slate-200'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-700 flex items-center gap-1.5">
                        {ISSUE_ICON[h.issue_type] ?? '🔧'}
                        {t.issueType[h.issue_type as keyof typeof t.issueType] ?? h.issue_type}
                      </span>
                      <span className="text-xs text-slate-400">
                        {h.resolved_at ? format(new Date(h.resolved_at), 'dd MMM yyyy') : '—'}
                      </span>
                    </div>

                    {h.root_cause && (
                      <p className="text-slate-600 mb-1">
                        <span className="text-slate-400 text-xs">{t.detail.rootCause} </span>{h.root_cause}
                      </p>
                    )}
                    {h.parts_used && (
                      <p className="text-slate-600 mb-1">
                        <span className="text-slate-400 text-xs">{t.detail.parts} </span>{h.parts_used}
                      </p>
                    )}

                    {(() => {
                      const opName = (h.operator as any)?.name;
                      const descName = h.description?.match(/^\[(.+?)\]/)?.[1];
                      const reporter = opName || descName;
                      return reporter ? (
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg px-2 py-1 mt-2 w-fit">
                          <User className="w-3 h-3 flex-shrink-0" />
                          {t.detail.reportedBy}: <span className="font-semibold">{reporter}</span>
                        </div>
                      ) : null;
                    })()}

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 pt-2 border-t border-slate-200">
                      {h.repair_time_minutes != null && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{h.repair_time_minutes} min
                        </span>
                      )}
                      {(h.technician as any)?.name && (
                        <span className="flex items-center gap-1">
                          <Wrench className="w-3 h-3" />{(h.technician as any).name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
