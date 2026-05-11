'use client';

import { useState } from 'react';
import { LayoutGrid, BarChart3, ScrollText, ShieldCheck } from 'lucide-react';
import AppNav from '@/components/shared/AppNav';
import MachineGrid from './MachineGrid';
import AnalyticsDashboard from './AnalyticsDashboard';
import DowntimeLog from '@/components/shared/DowntimeLog';
import { useLang } from '@/lib/i18n/LangContext';

type Tab = 'floor' | 'analytics' | 'log';

const TABS: {
  id: Tab;
  icon: React.ElementType;
  en: string;
  th: string;
}[] = [
  { id: 'floor',     icon: LayoutGrid, en: 'Floor Layout',  th: 'ผังเครื่องจักร' },
  { id: 'analytics', icon: BarChart3,  en: 'IE Analytics',  th: 'สถิติ IE'       },
  { id: 'log',       icon: ScrollText, en: 'Downtime Log',  th: 'บันทึกการหยุด'  },
];

export default function AdminShell({ name }: { name: string }) {
  const [tab, setTab] = useState<Tab>('floor');
  const { lang }      = useLang();

  const firstName = name?.split(' ')[0] ?? name ?? 'Admin';

  return (
    <div className="min-h-screen bg-slate-100">
      <AppNav name={name} role="admin" />

      <div className="pt-14">
        {/* ── Hero ── */}
        <div className="bg-gradient-to-br from-violet-900 via-violet-800 to-slate-900 px-6 pt-8 pb-20 text-white relative overflow-hidden">
          {/* Ambient glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
          {/* Noise texture */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
          />

          <div className="relative max-w-7xl mx-auto">
            <p className="text-violet-400/80 text-[10px] font-bold uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" />
              {lang === 'th' ? 'แผงผู้ดูแลระบบ' : 'Admin Dashboard'}
            </p>
            <h1 className="text-3xl font-black tracking-tight leading-tight">
              {lang === 'th' ? 'สวัสดี,' : 'Welcome,'} {firstName}
            </h1>
            <p className="text-violet-300/60 text-sm mt-1.5">
              {lang === 'th' ? 'จัดการเครื่องจักรและดูสถิติ' : 'Manage machines, analytics, and downtime records'}
            </p>
          </div>
        </div>

        {/* ── Main card (overlaps hero) ── */}
        <div className="-mt-10">
          <div className="bg-white rounded-t-3xl shadow-2xl shadow-slate-300/60">

            {/* Pill tab bar — sticky below AppNav */}
            <div className="sticky top-14 z-30 bg-white rounded-t-3xl border-b border-slate-100 px-6 pt-4 pb-3">
              <div className="max-w-7xl mx-auto">
                <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
                  {TABS.map(({ id, icon: Icon, en, th }) => (
                    <button
                      key={id}
                      onClick={() => setTab(id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all ${
                        tab === id
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{lang === 'th' ? th : en}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 md:px-6 pt-5 pb-12">
              {tab === 'floor'     && <MachineGrid />}
              {tab === 'analytics' && <AnalyticsDashboard />}
              {tab === 'log'       && <DowntimeLog limit={50} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
