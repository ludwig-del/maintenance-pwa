'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Wrench, LogOut } from 'lucide-react';

const ROLE_COLOR: Record<string, string> = {
  admin:      'bg-violet-500/20 text-violet-300 border border-violet-500/30',
  technician: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  operator:   'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
};

const ROLE_LABEL: Record<string, string> = {
  admin:      'Admin',
  technician: 'Tech',
  operator:   'Operator',
};

export default function AppNav({ name, role }: { name: string; role: string }) {
  const supabase = createClient();
  const router   = useRouter();
  const [out, setOut] = useState(false);

  const logout = async () => {
    setOut(true);
    await supabase.auth.signOut();
    router.push('/login');
  };

  const initial = (name ?? '?').charAt(0).toUpperCase();

  return (
    <header className="fixed top-0 inset-x-0 z-40 h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-3 shadow-lg">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mr-auto">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/30">
          <Wrench className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-white text-sm tracking-tight">MaintTrack</span>
      </div>

      {/* User chip */}
      <div className="flex items-center gap-2 bg-slate-800 rounded-full pl-1.5 pr-3 py-1 border border-slate-700/80">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {initial}
        </div>
        <span className="text-slate-200 text-xs font-medium hidden sm:block max-w-[110px] truncate">{name}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full hidden sm:block ${ROLE_COLOR[role] ?? 'bg-slate-700/50 text-slate-400 border border-slate-600'}`}>
          {ROLE_LABEL[role] ?? role}
        </span>
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        disabled={out}
        title="Sign out"
        className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex-shrink-0 disabled:opacity-50"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </header>
  );
}
