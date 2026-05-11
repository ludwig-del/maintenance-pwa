import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ReportForm from '@/components/operator/ReportForm';
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
    .select('name')
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
    <main className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-700 flex flex-col">
      {/* Header */}
      <div className="px-5 pt-10 pb-6 text-white">
        <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">
          <TText en="Maintenance Report" th="แบบฟอร์มแจ้งซ่อม" />
        </p>
        <h1 className="text-2xl font-bold">{machine.name}</h1>
        <p className="text-blue-200 text-sm mt-0.5">{machine.location}</p>

        {isDown && (
          <div className="mt-3 flex items-center gap-2 bg-red-500/30 border border-red-400/40 text-red-100 text-xs font-semibold px-3 py-2 rounded-xl w-fit">
            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse inline-block" />
            <TText en="Machine currently DOWN" th="เครื่องจักรหยุดทำงาน" />
          </div>
        )}
      </div>

      {/* Form card */}
      <div className="flex-1 bg-gray-50 rounded-t-3xl px-5 pt-7 pb-10">
        <ReportForm machineId={params.machineId} userId={user.id} defaultName={profile?.name ?? ''} />
      </div>
    </main>
  );
}
