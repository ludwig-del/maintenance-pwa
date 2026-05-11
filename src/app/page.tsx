import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import AppNav from '@/components/shared/AppNav';
import { ScanLine } from 'lucide-react';

const QrScanner = dynamic(() => import('@/components/operator/QrScanner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full" />
    </div>
  ),
});

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('role, name')
    .eq('user_id', user.id)
    .single();

  if (profile?.role === 'technician') redirect('/technician');
  if (profile?.role === 'admin') redirect('/admin');

  return (
    <main className="min-h-screen bg-slate-100">
      <AppNav name={profile?.name ?? user.email ?? 'Operator'} role="operator" />

      <div className="pt-14">
        {/* ── Hero ── */}
        <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 px-5 pt-8 pb-20 text-white relative overflow-hidden">
          {/* Glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
          {/* Noise texture */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
          />

          <div className="relative">
            <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
              <ScanLine className="w-3 h-3" /> Operator Portal
            </p>
            <h1 className="text-3xl font-black tracking-tight leading-tight">
              Scan Machine QR
            </h1>
            <p className="text-blue-200/70 text-sm mt-1.5">
              Point your camera at the QR code on the machine
            </p>
          </div>
        </div>

        {/* ── Scanner card (overlaps hero) ── */}
        <div className="px-4 -mt-10 pb-12">
          <div className="bg-white rounded-3xl shadow-2xl shadow-slate-300/60">
            <div className="h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 rounded-t-3xl" />
            <div className="p-5">
              <QrScanner />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
