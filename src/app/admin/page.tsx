import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MachineGrid from '@/components/admin/MachineGrid';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import DowntimeLog from '@/components/shared/DowntimeLog';
import TestEmailButton from '@/components/admin/TestEmailButton';

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') redirect('/');

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <TestEmailButton />
        </div>

        <section className="mb-10">
          <h2 className="text-base font-semibold text-gray-600 uppercase tracking-wide mb-4">
            Machine Floor Layout
          </h2>
          <MachineGrid />
        </section>

        <section className="mb-10">
          <h2 className="text-base font-semibold text-gray-600 uppercase tracking-wide mb-4">
            IE Analytics — Last 30 Days
          </h2>
          <AnalyticsDashboard />
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-600 uppercase tracking-wide mb-4">
            Downtime Log
          </h2>
          <DowntimeLog limit={50} />
        </section>
      </div>
    </main>
  );
}
