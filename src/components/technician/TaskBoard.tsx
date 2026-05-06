'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import TaskCard from './TaskCard';
import CloseTicketModal from './CloseTicketModal';
import type { Ticket, User } from '@/types';

const SEVERITY_ORDER = { High: 0, Medium: 1, Low: 2 };

function sortTickets(tickets: Ticket[]) {
  return [...tickets].sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export default function TaskBoard({ currentUser }: { currentUser: User }) {
  const supabase = createClient();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [closing, setClosing] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    const { data } = await supabase
      .from('tickets')
      .select('*, machines(name, location), users!operator_id(name)')
      .in('status', ['Pending', 'In Progress'])
      .order('created_at', { ascending: true });

    if (data) setTickets(sortTickets(data as Ticket[]));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel('tickets-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchTickets)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchTickets, supabase]);

  const handleClaim = async (ticketId: string) => {
    // eq status: 'Pending' acts as an optimistic lock — prevents double-claiming
    await supabase
      .from('tickets')
      .update({
        status:        'In Progress',
        technician_id: currentUser.user_id,
        started_at:    new Date().toISOString(),
      })
      .eq('ticket_id', ticketId)
      .eq('status', 'Pending');

    fetchTickets();
  };

  const pending    = tickets.filter((t) => t.status === 'Pending');
  const inProgress = tickets.filter((t) => t.status === 'In Progress');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Task Board</h1>
        <span className="text-sm text-gray-400">Hi, {currentUser.name}</span>
      </div>

      {/* In Progress */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-orange-600 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse inline-block" />
          In Progress ({inProgress.length})
        </h2>
        {inProgress.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6 bg-white rounded-2xl border border-gray-100">
            No tasks in progress
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {inProgress.map((t) => (
              <TaskCard
                key={t.ticket_id}
                ticket={t}
                currentUserId={currentUser.user_id}
                onClose={() => setClosing(t)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Pending */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
          Pending ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6 bg-white rounded-2xl border border-gray-100">
            No pending tasks — all clear!
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((t) => (
              <TaskCard
                key={t.ticket_id}
                ticket={t}
                currentUserId={currentUser.user_id}
                onClaim={() => handleClaim(t.ticket_id)}
              />
            ))}
          </div>
        )}
      </section>

      {closing && (
        <CloseTicketModal
          ticket={closing}
          onClose={() => setClosing(null)}
          onResolved={() => { setClosing(null); fetchTickets(); }}
        />
      )}
    </div>
  );
}
