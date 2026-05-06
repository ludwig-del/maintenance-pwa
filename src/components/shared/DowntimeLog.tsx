'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, formatDistanceStrict } from 'date-fns';
import { Clock, Wrench, AlertTriangle } from 'lucide-react';

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

const SEV_BADGE: Record<string, string> = {
  High:   'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low:    'bg-green-100 text-green-700',
};

export default function DowntimeLog({ limit = 30 }: { limit?: number }) {
  const supabase = createClient();
  const [logs, setLogs]       = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('tickets')
      .select(`
        ticket_id, machine_id, issue_type, severity,
        created_at, started_at, resolved_at, repair_time_minutes,
        root_cause, parts_used,
        machines(name, location),
        operator:users!operator_id(name),
        technician:users!technician_id(name)
      `)
      .eq('status', 'Resolved')
      .order('resolved_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        if (data) setLogs(data as LogRow[]);
        setLoading(false);
      });
  }, [supabase, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
        <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
        Loading log...
      </div>
    );
  }

  if (!logs.length) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        No resolved tickets yet — log will appear here after first repair.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {logs.map((log) => {
        const downAt    = new Date(log.created_at);
        const fixedAt   = log.resolved_at ? new Date(log.resolved_at) : null;
        const totalDown = fixedAt
          ? formatDistanceStrict(downAt, fixedAt)
          : '—';
        const mttr = log.repair_time_minutes != null
          ? `${log.repair_time_minutes} min`
          : '—';

        return (
          <div
            key={log.ticket_id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
          >
            {/* Top row */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {log.issue_type === 'Electrical' ? '⚡' :
                   log.issue_type === 'Mechanical' ? '⚙️' : '💻'}
                </span>
                <div>
                  <p className="font-bold text-gray-800 text-sm leading-tight">
                    {log.machines?.name ?? log.machine_id}
                  </p>
                  <p className="text-xs text-gray-400">{log.machines?.location}</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEV_BADGE[log.severity]}`}>
                {log.severity}
              </span>
            </div>

            {/* Time row */}
            <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
              <div className="bg-gray-50 rounded-xl p-2 text-center">
                <p className="text-gray-400 mb-0.5 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Reported
                </p>
                <p className="font-semibold text-gray-700">
                  {format(downAt, 'dd MMM HH:mm')}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2 text-center">
                <p className="text-gray-400 mb-0.5 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" /> Total Down
                </p>
                <p className="font-semibold text-gray-700">{totalDown}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-2 text-center">
                <p className="text-blue-400 mb-0.5 flex items-center justify-center gap-1">
                  <Wrench className="w-3 h-3" /> MTTR
                </p>
                <p className="font-semibold text-blue-700">{mttr}</p>
              </div>
            </div>

            {/* Root cause */}
            {log.root_cause && (
              <div className="bg-gray-50 rounded-xl px-3 py-2 mb-2">
                <p className="text-xs text-gray-400 mb-0.5">Root Cause</p>
                <p className="text-xs text-gray-700">{log.root_cause}</p>
              </div>
            )}

            {/* Parts + Technician */}
            <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
              <span>
                {log.parts_used ? `🔩 ${log.parts_used}` : 'No parts logged'}
              </span>
              <span className="flex items-center gap-1">
                <Wrench className="w-3 h-3" />
                {(log.technician as any)?.name ?? 'Unassigned'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
