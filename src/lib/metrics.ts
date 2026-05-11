import type { Ticket } from '@/types';

// ─── Existing ────────────────────────────────────────────────────────────────

export function calcMTTR(tickets: Ticket[]): number {
  const resolved = tickets.filter((t) => t.repair_time_minutes != null);
  if (!resolved.length) return 0;
  const total = resolved.reduce((sum, t) => sum + t.repair_time_minutes!, 0);
  return Math.round(total / resolved.length);
}

export function calcMTBF(totalOperatingMinutes: number, failureCount: number): number {
  if (!failureCount) return 0;
  return Math.round(totalOperatingMinutes / failureCount);
}

export function topBreakdowns(tickets: Ticket[], n = 5): { machine_name: string; count: number }[] {
  const counts: Record<string, { name: string; count: number }> = {};
  for (const t of tickets) {
    const id = t.machine_id;
    if (!counts[id]) counts[id] = { name: (t as any).machines?.name ?? id, count: 0 };
    counts[id].count++;
  }
  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .map(({ name, count }) => ({ machine_name: name, count }));
}

// ─── New IE metrics ───────────────────────────────────────────────────────────

/** Machine availability % over the analysis window */
export function calcAvailability(
  totalDowntimeMinutes: number,
  totalOperatingMinutes: number
): number {
  if (!totalOperatingMinutes) return 100;
  const pct = ((totalOperatingMinutes - totalDowntimeMinutes) / totalOperatingMinutes) * 100;
  return Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
}

/** Average time (minutes) from ticket created → claimed by a technician */
export function calcAvgResponseTime(tickets: Ticket[]): number {
  const with_response = tickets.filter((t) => t.started_at);
  if (!with_response.length) return 0;
  const total = with_response.reduce((sum, t) => {
    return sum + (new Date(t.started_at!).getTime() - new Date(t.created_at).getTime()) / 60000;
  }, 0);
  return Math.round(total / with_response.length);
}

/** Total downtime in hours across all resolved tickets */
export function calcTotalDowntimeHours(tickets: Ticket[]): number {
  const total = tickets.reduce((sum, t) => sum + (t.repair_time_minutes ?? 0), 0);
  return Math.round((total / 60) * 10) / 10;
}

/** Average MTTR grouped by severity */
export function mttrBySeverity(
  tickets: Ticket[]
): { severity: string; avgMttr: number; count: number }[] {
  const groups: Record<string, number[]> = { High: [], Medium: [], Low: [] };
  for (const t of tickets) {
    if (t.repair_time_minutes != null) groups[t.severity]?.push(t.repair_time_minutes);
  }
  return (['High', 'Medium', 'Low'] as const).map((s) => ({
    severity: s,
    avgMttr: groups[s].length
      ? Math.round(groups[s].reduce((a, b) => a + b, 0) / groups[s].length)
      : 0,
    count: groups[s].length,
  }));
}

/** Weekly failure counts split by severity — last N weeks */
export function severityTrend(
  tickets: Ticket[],
  weeks = 8
): { week: string; High: number; Medium: number; Low: number; total: number }[] {
  const now = new Date();
  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (weeks - 1 - i) * 7 - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const slice = tickets.filter((t) => {
      const d = new Date(t.created_at);
      return d >= weekStart && d <= weekEnd;
    });

    const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
    return {
      week:   label,
      High:   slice.filter((t) => t.severity === 'High').length,
      Medium: slice.filter((t) => t.severity === 'Medium').length,
      Low:    slice.filter((t) => t.severity === 'Low').length,
      total:  slice.length,
    };
  });
}

/** Response-time distribution: how quickly technicians claimed tickets */
export function responseTimeDist(
  tickets: Ticket[]
): { bucket: string; count: number }[] {
  const buckets = [
    { bucket: '< 15 min',  min: 0,   max: 15 },
    { bucket: '15–30 min', min: 15,  max: 30 },
    { bucket: '30–60 min', min: 30,  max: 60 },
    { bucket: '> 60 min',  min: 60,  max: Infinity },
  ];
  const with_response = tickets.filter((t) => t.started_at);
  return buckets.map(({ bucket, min, max }) => ({
    bucket,
    count: with_response.filter((t) => {
      const wait = (new Date(t.started_at!).getTime() - new Date(t.created_at).getTime()) / 60000;
      return wait >= min && wait < max;
    }).length,
  }));
}

/** Per-technician performance stats */
export function technicianPerformance(
  tickets: Ticket[]
): { tech: string; ticketsClosed: number; avgMttr: number }[] {
  const map: Record<string, { name: string; repairs: number[] }> = {};
  for (const t of tickets) {
    if (!t.technician_id || !t.repair_time_minutes) continue;
    const name = (t as any).technician?.name ?? t.technician_id.slice(0, 8);
    if (!map[t.technician_id]) map[t.technician_id] = { name, repairs: [] };
    map[t.technician_id].repairs.push(t.repair_time_minutes);
  }
  return Object.values(map)
    .map(({ name, repairs }) => ({
      tech:          name,
      ticketsClosed: repairs.length,
      avgMttr:       Math.round(repairs.reduce((a, b) => a + b, 0) / repairs.length),
    }))
    .sort((a, b) => b.ticketsClosed - a.ticketsClosed);
}

/** Machines with repeated failures (>= threshold) — chronic problem machines */
export function repeatFailures(
  tickets: Ticket[],
  threshold = 3
): { machine_name: string; count: number; isRepeat: boolean }[] {
  const counts: Record<string, { name: string; count: number }> = {};
  for (const t of tickets) {
    const id = t.machine_id;
    if (!counts[id]) counts[id] = { name: (t as any).machines?.name ?? id, count: 0 };
    counts[id].count++;
  }
  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .map(({ name, count }) => ({ machine_name: name, count, isRepeat: count >= threshold }));
}

/** Per-machine breakdown for the performance table */
export function machineStats(
  tickets: Ticket[],
  operatingMinutesPerMachine: number
): { machine_name: string; failures: number; avgMttr: number; totalDownMin: number; availability: number }[] {
  const map: Record<string, { name: string; repairs: number[]; downtime: number }> = {};
  for (const t of tickets) {
    const id = t.machine_id;
    if (!map[id]) map[id] = { name: (t as any).machines?.name ?? id, repairs: [], downtime: 0 };
    if (t.repair_time_minutes) {
      map[id].repairs.push(t.repair_time_minutes);
      map[id].downtime += t.repair_time_minutes;
    } else {
      map[id].repairs.push(0);
    }
  }
  return Object.values(map)
    .sort((a, b) => b.downtime - a.downtime)
    .map(({ name, repairs, downtime }) => ({
      machine_name:   name,
      failures:       repairs.length,
      avgMttr:        repairs.length ? Math.round(repairs.reduce((a, b) => a + b, 0) / repairs.length) : 0,
      totalDownMin:   downtime,
      availability:   calcAvailability(downtime, operatingMinutesPerMachine),
    }));
}
