'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLang } from '@/lib/i18n/LangContext';
import AppNav from '@/components/shared/AppNav';
import TaskCard from './TaskCard';
import TaskDetailModal from './TaskDetailModal';
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
  const { t }    = useLang();

  const [tab, setTab]         = useState<Tab>('tasks');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [closing, setClosing] = useState<Ticket | null>(null);
  const [detail, setDetail]   = useState<Ticket | null>(null);
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
    await fetch(`/api/tickets/${ticketId}/claim`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ technician_id: currentUser.user_id }),
    });
    fetchTickets();
  };

  const pending    = tickets.filter((t) => t.status === 'Pending');
  const inProgress = tickets.filter((t) => t.status === 'In Progress');
  const totalActive = pending.length + inProgress.length;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav name={currentUser.name} role="technician" />

      {/* Sticky tab bar */}
      <div className="fixed top-14 inset-x-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 flex">
          <button
            onClick={() => setTab('tasks')}
            className={`flex-1 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'tasks'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {t.board.activeTasks}
            {totalActive > 0 && (
              <span className="ml-1.5 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">
                {totalActive}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {t.board.history}
          </button>
        </div>
      </div>

      {/* Content — clears AppNav (56px) + tab bar (~52px) */}
      <div className="pt-[108px] px-4 max-w-2xl mx-auto pb-10">
        {tab === 'tasks' ? (
          loading ? (
            <div className="flex items-center justify-center h-48 mt-6">
              <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Stats strip */}
              {totalActive > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-4 mb-6">
                  <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-4 text-center">
                    <p className="text-3xl font-bold text-orange-500 tabular-nums">{inProgress.length}</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{t.board.inProgress}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4 text-center">
                    <p className="text-3xl font-bold text-blue-500 tabular-nums">{pending.length}</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{t.board.pending}</p>
                  </div>
                </div>
              )}

              {/* In Progress */}
              <section className="mb-6">
                <h2 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse inline-block" />
                  {t.board.inProgress} ({inProgress.length})
                </h2>
                {inProgress.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    {t.board.noInProgress}
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {inProgress.map((ticket) => (
                      <TaskCard
                        key={ticket.ticket_id}
                        ticket={ticket}
                        currentUserId={currentUser.user_id}
                        onExpand={() => setDetail(ticket)}
                        onClose={() => setClosing(ticket)}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Pending */}
              <section>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                  {t.board.pending} ({pending.length})
                </h2>
                {pending.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    {t.board.noPending}
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {pending.map((ticket) => (
                      <TaskCard
                        key={ticket.ticket_id}
                        ticket={ticket}
                        currentUserId={currentUser.user_id}
                        onExpand={() => setDetail(ticket)}
                        onClaim={() => handleClaim(ticket.ticket_id)}
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

      {detail && (
        <TaskDetailModal
          ticket={detail}
          currentUserId={currentUser.user_id}
          onClose={() => setDetail(null)}
          onClaim={detail.status === 'Pending' ? () => { handleClaim(detail.ticket_id); setDetail(null); } : undefined}
          onCloseTicket={detail.status === 'In Progress' && detail.technician_id === currentUser.user_id
            ? () => { setDetail(null); setClosing(detail); }
            : undefined}
        />
      )}

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
