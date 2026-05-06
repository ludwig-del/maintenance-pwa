import type { Ticket } from '@/types';

export function calcMTTR(tickets: Ticket[]): number {
  const resolved = tickets.filter((t) => t.repair_time_minutes != null);
  if (!resolved.length) return 0;
  const total = resolved.reduce((sum, t) => sum + t.repair_time_minutes!, 0);
  return Math.round(total / resolved.length);
}

// MTBF = total operating time / number of failures
export function calcMTBF(totalOperatingMinutes: number, failureCount: number): number {
  if (!failureCount) return 0;
  return Math.round(totalOperatingMinutes / failureCount);
}

export function topBreakdowns(
  tickets: Ticket[],
  n = 5
): { machine_name: string; count: number }[] {
  const counts: Record<string, { name: string; count: number }> = {};
  for (const t of tickets) {
    const id = t.machine_id;
    if (!counts[id]) counts[id] = { name: t.machines?.name ?? id, count: 0 };
    counts[id].count++;
  }
  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .map(({ name, count }) => ({ machine_name: name, count }));
}
