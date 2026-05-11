'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Clock, Wrench, MapPin, User, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useLang } from '@/lib/i18n/LangContext';
import type { Ticket } from '@/types';

const SEVERITY_COLOR: Record<string, string> = {
  High:   'text-red-600',
  Medium: 'text-yellow-600',
  Low:    'text-green-600',
};

const SEVERITY_BG: Record<string, string> = {
  High:   'bg-red-50 border-red-200',
  Medium: 'bg-yellow-50 border-yellow-200',
  Low:    'bg-green-50 border-green-200',
};

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

export default function TaskDetailModal({ ticket, currentUserId, onClose, onClaim, onCloseTicket }: Props) {
  const supabase             = createClient();
  const { t }                = useLang();
  const [history, setHistory]           = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoading]    = useState(true);

  const machineName    = (ticket as any).machines?.name ?? ticket.machine_id;
  const location       = (ticket as any).machines?.location ?? '';
  const operatorName   = (ticket as any).users?.name ?? '—';
  const technicianName = (ticket as any).technician?.name as string | undefined;
  const isOwnTask      = ticket.technician_id === currentUserId;

  useEffect(() => {
    supabase
      .from('tickets')
      .select('ticket_id, issue_type, severity, description, root_cause, parts_used, repair_time_minutes, resolved_at, created_at, technician:users!technician_id(name), operator:users!operator_id(name)')
      .eq('machine_id', ticket.machine_id)
      .eq('status', 'Resolved')
      .order('resolved_at', { ascending: false })
      .limit(15)
      .then(({ data }) => {
        if (data) setHistory(data as unknown as HistoryRow[]);
        setLoading(false);
      });
  }, [ticket.machine_id, supabase]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Fixed header */}
        <div className="flex items-start justify-between px-5 pt-2 pb-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="font-bold text-gray-800 text-lg leading-tight">{machineName}</p>
            <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />{location}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 ml-2 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5 pb-8">

          {/* Current report detail */}
          <section>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{t.detail.currentReport}</p>
            <div className={`rounded-2xl border p-4 space-y-3 ${SEVERITY_BG[ticket.severity]}`}>
              {/* Severity + issue */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {ticket.issue_type === 'Electrical' ? '⚡' : ticket.issue_type === 'Mechanical' ? '⚙️' : '💻'}
                  </span>
                  <span className="font-semibold text-gray-700 text-sm">
                    {t.issueType[ticket.issue_type as keyof typeof t.issueType] ?? ticket.issue_type}
                  </span>
                </div>
                <span className={`font-bold text-sm ${SEVERITY_COLOR[ticket.severity]}`}>
                  {t.severity[ticket.severity as keyof typeof t.severity] ?? ticket.severity}
                </span>
              </div>

              {/* Info rows */}
              <div className="text-sm space-y-2 pt-1 border-t border-black/5">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400">{t.detail.reportedBy}</span>
                  <span className="ml-auto font-medium text-gray-700">{operatorName}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400">{t.detail.submitted}</span>
                  <span className="ml-auto font-medium text-gray-700">
                    {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                  </span>
                </div>
                {ticket.status === 'In Progress' && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Wrench className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-400">{t.detail.assignedTo}</span>
                    <span className="ml-auto font-medium text-orange-600">
                      {isOwnTask ? t.detail.you : (technicianName ?? t.detail.anotherTech)}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {ticket.description && (
                <div className="pt-2 border-t border-black/5">
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {t.detail.operatorNote}
                  </p>
                  <p className="text-sm text-gray-700">{ticket.description}</p>
                </div>
              )}
            </div>
          </section>

          {/* Actions */}
          {ticket.status === 'Pending' && onClaim && (
            <button
              onClick={() => { onClaim(); onClose(); }}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-3 rounded-xl text-sm transition-all"
            >
              <Wrench className="w-4 h-4" /> {t.detail.claimTask}
            </button>
          )}
          {ticket.status === 'In Progress' && isOwnTask && onCloseTicket && (
            <button
              onClick={() => { onCloseTicket(); onClose(); }}
              className="w-full bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold py-3 rounded-xl text-sm transition-all"
            >
              {t.detail.closeTask}
            </button>
          )}

          {/* Machine repair history */}
          <section>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              {t.detail.repairHistory} {machineName}
            </p>

            {loadingHistory ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm bg-gray-50 rounded-2xl border border-gray-100">
                {t.detail.noHistory}
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.ticket_id} className="bg-gray-50 rounded-2xl border border-gray-100 p-4 text-sm">
                    {/* Row 1: issue + date */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-700 flex items-center gap-1.5">
                        <span>
                          {h.issue_type === 'Electrical' ? '⚡' : h.issue_type === 'Mechanical' ? '⚙️' : '💻'}
                        </span>
                        {t.issueType[h.issue_type as keyof typeof t.issueType] ?? h.issue_type}
                      </span>
                      <span className="text-xs text-gray-400">
                        {h.resolved_at ? format(new Date(h.resolved_at), 'dd MMM yyyy') : '—'}
                      </span>
                    </div>

                    {/* Root cause */}
                    {h.root_cause && (
                      <p className="text-gray-600 mb-1">
                        <span className="text-gray-400 text-xs">{t.detail.rootCause} </span>{h.root_cause}
                      </p>
                    )}

                    {/* Parts */}
                    {h.parts_used && (
                      <p className="text-gray-600 mb-1">
                        <span className="text-gray-400 text-xs">{t.detail.parts} </span>{h.parts_used}
                      </p>
                    )}

                    {/* Reporter name — from operator join or parsed from description [Name] prefix */}
                    {(() => {
                      const operatorName = (h.operator as any)?.name;
                      const descName = h.description?.match(/^\[(.+?)\]/)?.[1];
                      const reporter = operatorName || descName;
                      return reporter ? (
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 rounded-lg px-2 py-1 mt-2">
                          <User className="w-3 h-3 flex-shrink-0" />
                          <span>{t.detail.reportedBy}: <span className="font-semibold">{reporter}</span></span>
                        </div>
                      ) : null;
                    })()}

                    {/* Footer: repair time + technician + severity */}
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-2 pt-2 border-t border-gray-200">
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
                      <span className={`ml-auto font-semibold ${SEVERITY_COLOR[h.severity]}`}>
                        {t.severity[h.severity as keyof typeof t.severity] ?? h.severity}
                      </span>
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
