'use client';

import { useState } from 'react';
import { LayoutGrid, BarChart3, ScrollText } from 'lucide-react';
import AppNav from '@/components/shared/AppNav';
import MachineGrid from './MachineGrid';
import AnalyticsDashboard from './AnalyticsDashboard';
import DowntimeLog from '@/components/shared/DowntimeLog';
import { TText } from '@/components/shared/TText';
import { useLang } from '@/lib/i18n/LangContext';

type Tab = 'floor' | 'analytics' | 'log';

const TABS: { id: Tab; icon: React.ElementType; en: string; th: string; descEn: string; descTh: string }[] = [
  {
    id: 'floor',
    icon: LayoutGrid,
    en: 'Floor Layout',
    th: 'ผังเครื่องจักร',
    descEn: 'Real-time machine status and QR management',
    descTh: 'สถานะเครื่องจักรแบบเรียลไทม์',
  },
  {
    id: 'analytics',
    icon: BarChart3,
    en: 'IE Analytics',
    th: 'สถิติ IE',
    descEn: 'Maintenance KPIs, trends, and performance metrics',
    descTh: 'ตัวชี้วัดการซ่อมบำรุงและแนวโน้ม',
  },
  {
    id: 'log',
    icon: ScrollText,
    en: 'Downtime Log',
    th: 'บันทึกการหยุด',
    descEn: 'Complete resolved ticket history with CSV export',
    descTh: 'ประวัติการซ่อมทั้งหมดพร้อมส่งออก',
  },
];

export default function AdminShell({ name }: { name: string }) {
  const [tab, setTab] = useState<Tab>('floor');
  const { lang }      = useLang();

  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav name={name} role="admin" />

      {/* Sticky tab bar */}
      <div className="fixed top-14 inset-x-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {TABS.map(({ id, icon: Icon, en, th }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                tab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{lang === 'th' ? th : en}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Page content — clears AppNav (56px) + tab bar (52px) */}
      <div className="pt-[108px] pb-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6">

          {/* Section header */}
          <div className="mb-6 pt-2">
            <h1 className="text-xl font-bold text-slate-800">
              {lang === 'th' ? current.th : current.en}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {lang === 'th' ? current.descTh : current.descEn}
            </p>
          </div>

          {tab === 'floor'     && <MachineGrid />}
          {tab === 'analytics' && <AnalyticsDashboard />}
          {tab === 'log'       && <DowntimeLog limit={50} />}
        </div>
      </div>
    </div>
  );
}
