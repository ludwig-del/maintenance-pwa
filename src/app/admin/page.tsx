import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import MachineGrid from '@/components/admin/MachineGrid';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import DowntimeLog from '@/components/shared/DowntimeLog';
import UserManagement from '@/components/admin/UserManagement';
import { TText } from '@/components/shared/TText';

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
        <h1 className="text-2xl font-bold text-gray-800 mb-8">
          <TText en="Admin Dashboard" th="แดชบอร์ดผู้ดูแล" />
        </h1>

        <section className="mb-10">
          <h2 className="text-base font-semibold text-gray-600 uppercase tracking-wide mb-4">
            <TText en="Machine Floor Layout" th="ผังเครื่องจักร" />
          </h2>
          <MachineGrid />
        </section>

        <section className="mb-10">
          <h2 className="text-base font-semibold text-gray-600 uppercase tracking-wide mb-4">
            <TText en="IE Analytics — Last 30 Days" th="สถิติ IE — 30 วันล่าสุด" />
          </h2>
          <AnalyticsDashboard />
        </section>

        <section className="mb-10">
          <h2 className="text-base font-semibold text-gray-600 uppercase tracking-wide mb-4">
            <TText en="Downtime Log" th="บันทึกการหยุดทำงาน" />
          </h2>
          <DowntimeLog limit={50} />
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-600 uppercase tracking-wide mb-4">
            <TText en="User Management" th="จัดการผู้ใช้" />
          </h2>
          <UserManagement />
        </section>
      </div>
    </main>
  );
}
