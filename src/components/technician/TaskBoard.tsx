'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLang } from '@/lib/i18n/LangContext';
import AppNav from '@/components/shared/AppNav';
import TaskCard from './TaskCard';
import TaskDetailModal from './TaskDetailModal';
import CloseTicketModal from './CloseTicketModal';
import DowntimeLog from '@/components/shared/DowntimeLog';
import { Wrench } from 'lucide-react';
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

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex animate-pulse">
      <div className="w-1.5 flex-shrink-0 bg-slate-200" />
      <div className="flex-1 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-slate-100 rounded-full w-3/4" />
            <div className="h-3 bg-slate-100 rounded-full w-1/2" />
          </div>
          <div className="h-5 w-12 bg-slate-100 rounded-full" />
        </div>
        <div className="h-9 bg-slate-100 rounded-xl w-full" />
      </div>
    </div>
  );
}

export default function TaskBoard({ currentUser }: { currentUser: User }) {
  const supabase      = createClient();
  const { t, lang }   = useLang();

  const [tab, setTab]       = useState<Tab>('tasks');
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

  const pending     = tickets.filter((t) => t.status === 'Pending');
  const inProgress  = tickets.filter((t) => t.status === 'In Progress');
  const totalActive = pending.length + inProgress.length;
  const firstName   = currentUser.name?.split(' ')[0] ?? currentUser.name ?? 'Tech';

  return (
    <div className="min-h-screen bg-slate-100">
      <AppNav name={currentUser.name} role="technician" />

      <div className="pt-14">
        {/* ── Hero ── */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 pt-8 pb-20 text-white relative overflow-hidden">
          {/* Ambient glows */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />
          {/* Noise texture */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
          />

          <div className="relative">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
              <Wrench className="w-3 h-3" />
              {lang === 'th' ? 'แผงช่างเทคนิค' : 'Technician Portal'}
            </p>
            <h1 className="text-3xl font-black tracking-tight leading-tight">
              {t.board.hi} {firstName}
            </h1>

            {/* Live stat pills */}
            <div className="flex flex-wrap gap-2.5 mt-5">
              <div className="flex items-center gap-3 bg-orange-500/15 border border-orange-500/25 rounded-2xl px-4 py-2.5">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse flex-shrink-0" />
                <span className="text-2xl font-black tabular-nums text-orange-100 leading-none">{inProgress.length}</span>
                <span className="text-xs font-semibold text-orange-300">{t.board.inProgress}</span>
              </div>
              <div className="flex items-center gap-3 bg-blue-500/15 border border-blue-500/25 rounded-2xl px-4 py-2.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <span className="text-2xl font-black tabular-nums text-blue-100 leading-none">{pending.length}</span>
                <span className="text-xs font-semibold text-blue-300">{t.board.pending}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main card (overlaps hero) ── */}
        <div className="px-4 -mt-10 pb-12">
          <div className="bg-white rounded-3xl shadow-2xl shadow-slate-300/60">

            {/* Pill tab switcher — sticky below AppNav */}
            <div className="sticky top-14 z-30 bg-white rounded-t-3xl border-b border-slate-100 px-4 pt-4 pb-3">
              <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
                <button
                  onClick={() => setTab('tasks')}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                    tab === 'tasks'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t.board.activeTasks}
                  {totalActive > 0 && (
                    <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                      tab === 'tasks' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {totalActive}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setTab('history')}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                    tab === 'history'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t.board.history}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 pt-5 pb-8">
              {tab === 'tasks' ? (
                loading ? (
                  <div className="flex flex-col gap-3">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                ) : (
                  <>
                    {/* In Progress */}
                    <section className="mb-7">
                      <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        {t.board.inProgress}
                        <span className="font-normal text-slate-300">({inProgress.length})</span>
                      </h2>
                      {inProgress.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-slate-400 text-sm">{t.board.noInProgress}</p>
                        </div>
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
                      <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        {t.board.pending}
                        <span className="font-normal text-slate-300">({pending.length})</span>
                      </h2>
                      {pending.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-slate-400 text-sm">{t.board.noPending}</p>
                        </div>
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
                <DowntimeLog limit={30} />
              )}
            </div>
          </div>
        </div>
      </div>

      {detail && (
        <TaskDetailModal
          ticket={detail}
          currentUserId={currentUser.user_id}
          onClose={() => setDetail(null)}
          onClaim={detail.status === 'Pending' ? () => { handleClaim(detail.ticket_id); setDetail(null); } : undefined}
          onCloseTicket={
            detail.status === 'In Progress' && detail.technician_id === currentUser.user_id
              ? () => { setDetail(null); setClosing(detail); }
              : undefined
          }
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
