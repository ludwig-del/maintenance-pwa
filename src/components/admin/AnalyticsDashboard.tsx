'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
  ComposedChart, Line, CartesianGrid,
} from 'recharts';
import {
  calcMTTR, calcMTBF, calcAvailability, calcAvgResponseTime,
  calcTotalDowntimeHours, mttrBySeverity, severityTrend,
  responseTimeDist, technicianPerformance, repeatFailures,
  machineStats, topBreakdowns,
} from '@/lib/metrics';
import type { Ticket } from '@/types';

const OPERATING_HOURS_PER_DAY = 8;
const ANALYSIS_DAYS           = 30;
const MACHINE_COUNT           = 20;

const SEV_COLOR: Record<string, string> = {
  High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e',
};

const AVAIL_COLOR = (v: number) =>
  v >= 95 ? 'text-emerald-600' : v >= 90 ? 'text-yellow-500' : 'text-red-600';

const AVAIL_HINT = (v: number) =>
  v >= 95 ? '✓ World-class (≥95%)' : v >= 90 ? '⚠ Acceptable (90–95%)' : '✗ Critical (<90%)';

export default function AnalyticsDashboard() {
  const supabase  = createClient();
  const [tickets, setTickets]   = useState<Ticket[]>([]);
  const [allTickets, setAll]    = useState<Ticket[]>([]);
  const [openCount, setOpen]    = useState(0);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      const since30 = new Date();
      since30.setDate(since30.getDate() - ANALYSIS_DAYS);
      const since60 = new Date();
      since60.setDate(since60.getDate() - 56); // 8 weeks

      // Resolved tickets for KPIs + machine/tech stats
      const { data: resolved } = await supabase
        .from('tickets')
        .select('*, machines(name)')
        .eq('status', 'Resolved')
        .gte('resolved_at', since30.toISOString());

      // All tickets (any status) for trend chart
      const { data: trend } = await supabase
        .from('tickets')
        .select('ticket_id, severity, created_at, status, machine_id, machines(name)')
        .gte('created_at', since60.toISOString());

      // Open backlog count
      const { count } = await supabase
        .from('tickets')
        .select('ticket_id', { count: 'exact', head: true })
        .in('status', ['Pending', 'In Progress']);

      // Enrich resolved with technician names
      if (resolved) {
        const techIds = Array.from(
          new Set(resolved.filter((t: any) => t.technician_id).map((t: any) => t.technician_id))
        );
        const { data: techUsers } = techIds.length
          ? await supabase.from('users').select('user_id, name').in('user_id', techIds)
          : { data: [] };

        const techMap: Record<string, string> = {};
        (techUsers ?? []).forEach((u: any) => { techMap[u.user_id] = u.name; });

        const enriched = resolved.map((t: any) => ({
          ...t,
          technician: t.technician_id ? { name: techMap[t.technician_id] ?? '—' } : null,
        }));
        setTickets(enriched as Ticket[]);
      }

      setAll((trend ?? []) as unknown as Ticket[]);
      setOpen(count ?? 0);
      setLoading(false);
    }
    load();
  }, [supabase]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm animate-pulse">
        Loading analytics...
      </div>
    );
  }

  // ── Derived metrics ──────────────────────────────────────────────────────────
  const totalOpMin     = MACHINE_COUNT * OPERATING_HOURS_PER_DAY * 60 * ANALYSIS_DAYS;
  const totalDownMin   = tickets.reduce((s, t) => s + (t.repair_time_minutes ?? 0), 0);
  const perMachineOp   = OPERATING_HOURS_PER_DAY * 60 * ANALYSIS_DAYS;

  const mttr           = calcMTTR(tickets);
  const mtbf           = calcMTBF(totalOpMin, tickets.length);
  const availability   = calcAvailability(totalDownMin, totalOpMin);
  const responseTime   = calcAvgResponseTime(tickets);
  const downtimeHrs    = calcTotalDowntimeHours(tickets);

  const top5           = topBreakdowns(tickets, 5);
  const issueBreakdown = (['Electrical', 'Mechanical', 'Software'] as const).map((type) => ({
    name: type, value: tickets.filter((t) => t.issue_type === type).length,
  }));
  const PIE_COLORS     = ['#f59e0b', '#3b82f6', '#8b5cf6'];

  const mttrBySev      = mttrBySeverity(tickets);
  const weekTrend      = severityTrend(allTickets, 8);
  const respDist       = responseTimeDist(tickets);
  const techPerf       = technicianPerformance(tickets);
  const repeatMachines = repeatFailures(tickets, 3).filter((m) => m.isRepeat);
  const machinePerf    = machineStats(tickets, perMachineOp);

  return (
    <div className="flex flex-col gap-6">

      {/* ── Row 1: KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="MTTR"          value={`${mttr}`}          unit="min avg repair"     color="text-blue-600"    hint={mttr < 30 ? '✓ Excellent' : mttr < 60 ? '~ Acceptable' : '✗ Review'} />
        <KpiCard label="MTBF"          value={`${mtbf}`}          unit="min between fails"  color="text-indigo-600"  hint="per-machine avg" />
        <KpiCard label="Availability"  value={`${availability}%`} unit="fleet uptime"       color={AVAIL_COLOR(availability)} hint={AVAIL_HINT(availability)} />
        <KpiCard label="Response Time" value={`${responseTime}`}  unit="min to claim"       color="text-orange-500"  hint="avg time to claim" />
        <KpiCard label="Downtime"      value={`${downtimeHrs}h`}  unit={`last ${ANALYSIS_DAYS}d`} color="text-red-500"     hint={`${tickets.length} repairs`} />
        <KpiCard label="Open Tickets"  value={`${openCount}`}     unit="pending / in-prog"  color={openCount > 5 ? 'text-red-600' : 'text-gray-700'} hint="" />
      </div>

      {/* ── Row 2: Weekly Severity Trend (full width) ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <SectionTitle>Weekly Failure Trend — Last 8 Weeks</SectionTitle>
        <p className="text-xs text-gray-400 mb-4">Stacked by severity — spot if High failures are rising</p>
        {allTickets.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekTrend} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="High"   stackId="a" fill="#ef4444" radius={[0,0,0,0]} />
              <Bar dataKey="Medium" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Low"    stackId="a" fill="#22c55e" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Row 3: MTTR by Severity + Response Time Distribution ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionTitle>MTTR by Severity</SectionTitle>
          <p className="text-xs text-gray-400 mb-4">Higher severity = longer repair time?</p>
          {tickets.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={mttrBySev} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="severity" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" min" />
                <Tooltip formatter={(v) => [`${v} min`, 'Avg MTTR']} />
                <Bar dataKey="avgMttr" radius={[6,6,0,0]}>
                  {mttrBySev.map((entry) => (
                    <Cell key={entry.severity} fill={SEV_COLOR[entry.severity]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionTitle>Response Time Distribution</SectionTitle>
          <p className="text-xs text-gray-400 mb-4">How fast technicians claim tickets</p>
          {tickets.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={respDist} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="bucket" tick={{ fontSize: 11 }} width={75} />
                <Tooltip />
                <Bar dataKey="count" radius={[0,6,6,0]} fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Row 4: Top breakdowns + Issue type ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionTitle>Top 5 Most Frequent Breakdowns</SectionTitle>
          <p className="text-xs text-gray-400 mb-4">Pareto — focus effort on these machines</p>
          {top5.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={top5} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="machine_name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" radius={[0,6,6,0]}>
                  {top5.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#ef4444' : i === 1 ? '#f97316' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionTitle>Issue Type Distribution</SectionTitle>
          <p className="text-xs text-gray-400 mb-4">Which failure category dominates?</p>
          {tickets.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={issueBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {issueBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Row 5: Machine Performance Table ── */}
      {machinePerf.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <SectionTitle>Machine Performance — Last {ANALYSIS_DAYS} Days</SectionTitle>
          <p className="text-xs text-gray-400 mb-4">Sorted by total downtime — focus on worst machines first</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  {['Machine','Failures','Avg MTTR','Total Downtime','Availability'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {machinePerf.map((m, i) => (
                  <tr key={m.machine_name} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-3 py-2.5 font-semibold text-gray-800 text-sm">{m.machine_name}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`font-bold ${m.failures >= 5 ? 'text-red-600' : 'text-gray-700'}`}>{m.failures}</span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{m.avgMttr} min</td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {m.totalDownMin >= 60
                        ? `${(m.totalDownMin / 60).toFixed(1)}h`
                        : `${m.totalDownMin}m`}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`font-bold ${m.availability >= 95 ? 'text-emerald-600' : m.availability >= 90 ? 'text-yellow-500' : 'text-red-600'}`}>
                        {m.availability}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Row 6: Technician Performance + Chronic Machines ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {techPerf.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionTitle>Technician Performance</SectionTitle>
            <p className="text-xs text-gray-400 mb-4">Tickets closed and average repair time per person</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-100">
                  {['Technician','Tickets','Avg MTTR'].map((h) => (
                    <th key={h} className="px-2 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {techPerf.map((tech, i) => (
                  <tr key={tech.tech} className={`border-b border-gray-50 ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-2 py-2.5 font-medium text-gray-800">{tech.tech}</td>
                    <td className="px-2 py-2.5">
                      <span className="bg-blue-100 text-blue-700 font-bold text-xs px-2 py-0.5 rounded-full">{tech.ticketsClosed}</span>
                    </td>
                    <td className="px-2 py-2.5 text-gray-600">{tech.avgMttr} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {repeatMachines.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <SectionTitle>Chronic Failure Machines</SectionTitle>
            <p className="text-xs text-gray-400 mb-4">≥3 failures this period — root cause investigation needed</p>
            <div className="flex flex-col gap-2">
              {repeatMachines.map((m) => (
                <div key={m.machine_name} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <span className="font-semibold text-gray-800 text-sm">{m.machine_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-red-600">{m.count}×</span>
                    <span className="text-xs bg-red-600 text-white font-bold px-2 py-0.5 rounded-full">CHRONIC</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function KpiCard({ label, value, unit, color, hint }: {
  label: string; value: string; unit: string; color: string; hint: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color} mb-1 leading-none`}>{value}</p>
      <p className="text-xs text-gray-400">{unit}</p>
      {hint && <p className="text-xs text-gray-300 mt-1 italic leading-tight">{hint}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-bold text-gray-700 text-sm mb-1">{children}</h3>;
}

function Empty() {
  return <p className="text-gray-400 text-sm text-center py-10">No resolved tickets yet</p>;
}
