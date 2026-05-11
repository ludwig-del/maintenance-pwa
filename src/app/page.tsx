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
    <main className="min-h-screen bg-slate-50">
      <AppNav name={profile?.name ?? user.email ?? 'Operator'} role="operator" />

      <div className="pt-14">
        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-blue-700 px-5 pt-8 pb-20 text-white relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, rgba(255,255,255,0.4) 0%, transparent 60%)' }}
          />
          <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5 relative">
            <ScanLine className="w-3.5 h-3.5" /> Operator Portal
          </p>
          <h2 className="text-2xl font-bold relative">Scan Machine QR</h2>
          <p className="text-blue-200 text-sm mt-1 relative">
            Point your camera at the QR code on the machine
          </p>
        </div>

        {/* Scanner card — overlapping hero */}
        <div className="px-4 -mt-10 pb-10">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200">
            <div className="h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 rounded-t-2xl" />
            <div className="p-5">
              <QrScanner />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
