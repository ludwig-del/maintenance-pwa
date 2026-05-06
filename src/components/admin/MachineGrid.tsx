'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Machine } from '@/types';

const STATUS_STYLES: Record<string, string> = {
  active:      'bg-green-50 border-green-400 text-green-800',
  down:        'bg-red-50 border-red-500 text-red-800 animate-pulse',
  maintenance: 'bg-yellow-50 border-yellow-400 text-yellow-800',
};

const STATUS_DOT: Record<string, string> = {
  active:      'bg-green-500',
  down:        'bg-red-500',
  maintenance: 'bg-yellow-400',
};

export default function MachineGrid() {
  const supabase = createClient();
  const [machines, setMachines] = useState<Machine[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('machines').select('*').order('name');
      if (data) setMachines(data as Machine[]);
    };

    load();

    const channel = supabase
      .channel('machine-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'machines' }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const counts = {
    active:      machines.filter((m) => m.status === 'active').length,
    down:        machines.filter((m) => m.status === 'down').length,
    maintenance: machines.filter((m) => m.status === 'maintenance').length,
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* Legend */}
      <div className="flex gap-5 mb-5 text-xs font-medium">
        {(['active', 'down', 'maintenance'] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5 capitalize text-gray-600">
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${STATUS_DOT[s]}`} />
            {s} ({counts[s]})
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {machines.map((m) => (
          <div
            key={m.machine_id}
            className={`border-2 rounded-xl p-2.5 text-center select-none ${STATUS_STYLES[m.status]}`}
          >
            <p className="font-bold text-xs leading-tight">{m.name}</p>
            <p className="text-xs opacity-60 mt-0.5">{m.location}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
