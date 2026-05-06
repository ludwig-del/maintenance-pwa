'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import TaskCard from './TaskCard';
import CloseTicketModal from './CloseTicketModal';
import DowntimeLog from '@/components/shared/DowntimeLog';
import type { Ticket, User } from '@/types';

const SEVERITY_ORDER = { High: 0, Medium: 1, Low: 2 };

function sortTickets(tickets: Ticket[]) {
  return [...tickets].sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

type Tab = 'tasks' | 'history';

export default function TaskBoard({ currentUser }: { currentUser: User }) {
  const supabase = createClient();

  const [tab, setTab]         = useState<Tab>('tasks');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [closing, setClosing] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    const { data } = await supabase
      .from('tickets')
      .select('*, machines(name, location), users!operator_id(name), technician:users!technician_id(name)')
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
  const totalActive = pending.length + inProgress.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-8 pb-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Task Board</h1>
              <p className="text-sm text-gray-400">Hi, {currentUser.name}</p>
            </div>
            {totalActive > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {totalActive} active
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="flex">
            <button
              onClick={() => setTab('tasks')}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === 'tasks'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Active Tasks
              {totalActive > 0 && (
                <span className="ml-1.5 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">
                  {totalActive}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('history')}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === 'history'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Repair History
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-2xl mx-auto pb-10">
        {tab === 'tasks' ? (
          loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* In Progress */}
              <section className="mb-6 mt-4">
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
            </>
          )
        ) : (
          <div className="mt-4">
            <DowntimeLog limit={30} />
          </div>
        )}
      </div>

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
