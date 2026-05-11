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
    .select('name, location, status, photo_url')
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

  const isDown        = machine.status === 'down';
  const isMaintenance = machine.status === 'maintenance';

  const heroBg = isDown
    ? 'from-red-700 via-red-600 to-red-800'
    : isMaintenance
    ? 'from-yellow-600 via-yellow-500 to-yellow-700'
    : 'from-slate-800 via-slate-700 to-slate-900';

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col">
      <AppNav name={profile?.name ?? user.email ?? 'Operator'} role={profile?.role ?? 'operator'} />

      <div className="pt-14 flex-1 flex flex-col">
        {/* Hero */}
        <div className={`bg-gradient-to-br ${heroBg} px-5 pt-8 pb-20 text-white relative overflow-hidden`}>

          {/* Machine photo as subtle background */}
          {(machine as any).photo_url && (
            <img
              src={(machine as any).photo_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity"
            />
          )}

          {/* Noise overlay for texture */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
          />

          <div className="relative">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.2em] mb-3">
              <TText en="Maintenance Report" th="แบบฟอร์มแจ้งซ่อม" />
            </p>

            <h1 className="text-3xl font-black tracking-tight leading-tight">{machine.name}</h1>
            <p className="text-white/60 text-sm mt-1">{machine.location}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {isDown && (
                <span className="inline-flex items-center gap-1.5 bg-red-500/30 border border-red-400/50 text-red-100 text-xs font-bold px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-red-300 rounded-full animate-pulse" />
                  <TText en="MACHINE DOWN" th="เครื่องหยุดทำงาน" />
                </span>
              )}
              {isMaintenance && (
                <span className="inline-flex items-center gap-1.5 bg-yellow-500/30 border border-yellow-400/50 text-yellow-100 text-xs font-bold px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-yellow-300 rounded-full animate-pulse" />
                  <TText en="UNDER MAINTENANCE" th="อยู่ระหว่างซ่อมบำรุง" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Form card — overlapping hero */}
        <div className="px-4 -mt-10 pb-12 flex-1">
          <div className="bg-white rounded-3xl shadow-2xl shadow-slate-300/60 overflow-hidden">
            <ReportForm machineId={params.machineId} userId={user.id} />
          </div>
        </div>
      </div>
    </main>
  );
}
