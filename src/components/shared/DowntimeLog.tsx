'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { Database } from 'lucide-react';

interface LogRow {
  ticket_id: string;
  machine_id: string;
  issue_type: string;
  severity: string;
  created_at: string;
  started_at: string | null;
  resolved_at: string | null;
  repair_time_minutes: number | null;
  root_cause: string | null;
  parts_used: string | null;
  machines: { name: string; location: string } | null;
  operator: { name: string } | null;
  technician: { name: string } | null;
}

const SEV_STRIP: Record<string, string> = {
  High:   'bg-red-500',
  Medium: 'bg-yellow-400',
  Low:    'bg-green-500',
};

const SEV_BADGE: Record<string, string> = {
  High:   'bg-red-100 text-red-700 ring-1 ring-red-300',
  Medium: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300',
  Low:    'bg-green-100 text-green-700 ring-1 ring-green-300',
};

const ISSUE_ICON: Record<string, string> = {
  Electrical: '⚡',
  Mechanical: '⚙️',
  Software:   '💻',
};

function totalDownMinutes(created_at: string, resolved_at: string | null): number | null {
  if (!resolved_at) return null;
  return Math.round((new Date(resolved_at).getTime() - new Date(created_at).getTime()) / 60000);
}

function downtimeColor(minutes: number | null): string {
  if (minutes == null) return 'text-gray-400';
  if (minutes > 240) return 'text-red-600 font-semibold';
  if (minutes > 60)  return 'text-orange-500 font-semibold';
  return 'text-gray-700';
}

function fmtMinutes(minutes: number | null): string {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const COLS = [
  { label: '#',           cls: 'w-10  text-center' },
  { label: 'Machine',     cls: 'min-w-[140px]' },
  { label: 'Issue',       cls: 'min-w-[120px]' },
  { label: 'Severity',    cls: 'w-24  text-center' },
  { label: 'Reported by', cls: 'min-w-[110px]' },
  { label: 'Reported',    cls: 'min-w-[120px]' },
  { label: 'Resolved',    cls: 'min-w-[120px]' },
  { label: 'Total Down',  cls: 'w-28  text-right' },
  { label: 'MTTR',        cls: 'w-24  text-right' },
  { label: 'Root Cause',  cls: 'min-w-[220px]' },
];

export default function DowntimeLog({ limit = 30 }: { limit?: number }) {
  const supabase = createClient();
  const [logs, setLogs]       = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: tickets } = await supabase
        .from('tickets')
        .select(`
          ticket_id, machine_id, issue_type, severity,
          created_at, started_at, resolved_at, repair_time_minutes,
          root_cause, parts_used, operator_id,
          machines(name, location),
          technician:users!technician_id(name)
        `)
        .eq('status', 'Resolved')
        .order('resolved_at', { ascending: false })
        .limit(limit);

      if (!tickets) { setLoading(false); return; }

      const operatorIds = Array.from(new Set(tickets.map((t: any) => t.operator_id).filter(Boolean)));
      const { data: users } = operatorIds.length
        ? await supabase.from('users').select('user_id, name').in('user_id', operatorIds)
        : { data: [] };

      const nameMap: Record<string, string> = {};
      (users ?? []).forEach((u: any) => { nameMap[u.user_id] = u.name; });

      const merged = tickets.map((t: any) => ({
        ...t,
        operator: nameMap[t.operator_id] ? { name: nameMap[t.operator_id] } : null,
      }));

      setLogs(merged as unknown as LogRow[]);
      setLoading(false);
    }
    load();
  }, [supabase, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
        <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full" />
        Loading log...
      </div>
    );
  }

  if (!logs.length) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No resolved tickets yet — log will appear here after first repair.
      </div>
    );
  }

  const highCount   = logs.filter(l => l.severity === 'High').length;
  const avgMttr     = logs.filter(l => l.repair_time_minutes != null).length
    ? Math.round(logs.reduce((s, l) => s + (l.repair_time_minutes ?? 0), 0) / logs.filter(l => l.repair_time_minutes != null).length)
    : null;

  return (
    <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden bg-white">

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 text-gray-500">
          <Database className="w-4 h-4" />
          <span className="text-sm font-semibold text-gray-700">{logs.length} records</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>
            High severity: <span className="font-semibold text-red-600">{highCount}</span>
          </span>
          {avgMttr != null && (
            <span>
              Avg MTTR: <span className="font-semibold text-blue-600">{fmtMinutes(avgMttr)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">

          {/* Header */}
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              {/* severity strip placeholder */}
              <th className="w-1 p-0" />
              {COLS.map((col) => (
                <th
                  key={col.label}
                  className={`px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${col.cls}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {logs.map((log, idx) => {
              const totalMin = totalDownMinutes(log.created_at, log.resolved_at);

              return (
                <tr
                  key={log.ticket_id}
                  className={`border-b border-gray-100 transition-colors hover:bg-blue-50/40 ${
                    idx % 2 === 1 ? 'bg-gray-50/60' : 'bg-white'
                  }`}
                >
                  {/* Severity color strip */}
                  <td className={`w-1 p-0 ${SEV_STRIP[log.severity]}`} />

                  {/* # */}
                  <td className="px-3 py-2.5 text-center text-xs text-gray-400 tabular-nums">
                    {idx + 1}
                  </td>

                  {/* Machine */}
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-gray-800 leading-tight text-xs">
                      {log.machines?.name ?? log.machine_id}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{log.machines?.location}</p>
                  </td>

                  {/* Issue */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="flex items-center gap-1.5 text-xs text-gray-700">
                      <span>{ISSUE_ICON[log.issue_type] ?? '🔧'}</span>
                      {log.issue_type}
                    </span>
                  </td>

                  {/* Severity */}
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${SEV_BADGE[log.severity]}`}>
                      {log.severity}
                    </span>
                  </td>

                  {/* Reported by */}
                  <td className="px-3 py-2.5 text-xs text-gray-700 font-medium whitespace-nowrap">
                    {log.operator?.name ?? <span className="text-gray-300">—</span>}
                  </td>

                  {/* Reported */}
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600 tabular-nums">
                    {format(new Date(log.created_at), 'dd MMM yy HH:mm')}
                  </td>

                  {/* Resolved */}
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600 tabular-nums">
                    {log.resolved_at ? format(new Date(log.resolved_at), 'dd MMM yy HH:mm') : '—'}
                  </td>

                  {/* Total Down */}
                  <td className={`px-3 py-2.5 text-right text-xs tabular-nums whitespace-nowrap ${downtimeColor(totalMin)}`}>
                    {fmtMinutes(totalMin)}
                  </td>

                  {/* MTTR */}
                  <td className="px-3 py-2.5 text-right text-xs tabular-nums whitespace-nowrap text-blue-600 font-medium">
                    {log.repair_time_minutes != null ? fmtMinutes(log.repair_time_minutes) : '—'}
                  </td>

                  {/* Root Cause */}
                  <td className="px-3 py-2.5 text-xs text-gray-600 max-w-[240px]">
                    <span className="block truncate" title={log.root_cause ?? ''}>
                      {log.root_cause ?? <span className="text-gray-300">—</span>}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Footer summary row */}
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              <td className="w-1 p-0" />
              <td colSpan={8} className="px-3 py-2.5 text-xs text-gray-400 font-medium">
                {logs.length} resolved tickets
              </td>
              <td className="px-3 py-2.5 text-right text-xs font-semibold text-blue-600 tabular-nums">
                {avgMttr != null ? `avg ${fmtMinutes(avgMttr)}` : ''}
              </td>
              <td />
            </tr>
          </tfoot>

        </table>
      </div>
    </div>
  );
}
