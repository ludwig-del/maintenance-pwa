'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { calcMTTR, calcMTBF, topBreakdowns } from '@/lib/metrics';
import type { Ticket } from '@/types';

const OPERATING_HOURS_PER_DAY = 8;
const ANALYSIS_DAYS           = 30;
const MACHINE_COUNT           = 20;

export default function AnalyticsDashboard() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const since = new Date();
      since.setDate(since.getDate() - ANALYSIS_DAYS);

      const { data } = await supabase
        .from('tickets')
        .select('*, machines(name)')
        .eq('status', 'Resolved')
        .gte('resolved_at', since.toISOString());

      if (data) setTickets(data as Ticket[]);
      setLoading(false);
    };
    load();
  }, [supabase]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
        Loading analytics...
      </div>
    );
  }

  const mttr  = calcMTTR(tickets);
  const totalOperatingMinutes =
    MACHINE_COUNT * OPERATING_HOURS_PER_DAY * 60 * ANALYSIS_DAYS;
  const mtbf  = calcMTBF(totalOperatingMinutes, tickets.length);
  const top5  = topBreakdowns(tickets, 5);

  // Issue type breakdown for pie chart
  const issueBreakdown = ['Electrical', 'Mechanical', 'Software'].map((type) => ({
    name:  type,
    value: tickets.filter((t) => t.issue_type === type).length,
  }));
  const PIE_COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6'];

  return (
    <div className="flex flex-col gap-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="MTTR"
          value={mttr}
          unit="min avg repair time"
          color="text-blue-600"
          hint={mttr < 30 ? 'Excellent' : mttr < 60 ? 'Acceptable' : 'Needs attention'}
        />
        <KpiCard
          label="MTBF"
          value={mtbf}
          unit="min between failures"
          color="text-green-600"
          hint="per machine average"
        />
        <KpiCard
          label="Tickets Closed"
          value={tickets.length}
          unit={`in last ${ANALYSIS_DAYS} days`}
          color="text-purple-600"
          hint=""
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 5 breakdowns */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-700 text-sm mb-4">Top 5 Most Frequent Breakdowns</h3>
          {top5.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No resolved tickets yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={top5} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="machine_name"
                  tick={{ fontSize: 11 }}
                  width={80}
                />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {top5.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === 0 ? '#ef4444' : i === 1 ? '#f97316' : '#3b82f6'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Issue type pie */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-700 text-sm mb-4">Issue Type Distribution</h3>
          {tickets.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No resolved tickets yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={issueBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {issueBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label, value, unit, color, hint,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  hint: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-4xl font-bold ${color} mb-1`}>{value}</p>
      <p className="text-xs text-gray-400">{unit}</p>
      {hint && <p className="text-xs text-gray-300 mt-1 italic">{hint}</p>}
    </div>
  );
}
