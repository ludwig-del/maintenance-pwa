import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ReportForm from '@/components/operator/ReportForm';
import AppNav from '@/components/shared/AppNav';
import { TText } from '@/components/shared/TText';

interface Props {
  params: { machineId: string };
}

export default async function ReportPage({ params }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('user_id', user.id)
    .single();

  const { data: machine } = await supabase
    .from('machines')
    .select('name, location, status')
    .eq('machine_id', params.machineId)
    .single();

  if (!machine) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="text-center bg-white rounded-2xl p-10 shadow-sm border border-gray-100">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-gray-800">
            <TText en="Machine Not Found" th="ไม่พบเครื่องจักร" />
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            <TText en="Invalid QR code. Please scan again." th="QR Code ไม่ถูกต้อง กรุณาสแกนใหม่" />
          </p>
        </div>
      </main>
    );
  }

  const isDown = machine.status === 'down';

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <AppNav name={profile?.name ?? user.email ?? 'Operator'} role={profile?.role ?? 'operator'} />

      <div className="pt-14 flex-1 flex flex-col">
        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-blue-700 px-5 pt-8 pb-16 text-white relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.4) 0%, transparent 60%)' }}
          />
          <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-2 relative">
            <TText en="Maintenance Report" th="แบบฟอร์มแจ้งซ่อม" />
          </p>
          <h1 className="text-2xl font-bold relative">{machine.name}</h1>
          <p className="text-blue-200 text-sm mt-0.5 relative">{machine.location}</p>

          {isDown && (
            <div className="mt-3 flex items-center gap-2 bg-red-500/30 border border-red-400/40 text-red-100 text-xs font-semibold px-3 py-2 rounded-xl w-fit relative">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse inline-block" />
              <TText en="Machine currently DOWN" th="เครื่องจักรหยุดทำงาน" />
            </div>
          )}
        </div>

        {/* Form card */}
        <div className="px-4 -mt-8 pb-10 flex-1">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 rounded-t-2xl" />
            <div className="p-5">
              <ReportForm machineId={params.machineId} userId={user.id} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
