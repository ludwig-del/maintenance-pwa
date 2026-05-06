import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically imported — html5-qrcode uses browser APIs, cannot run on server
const QrScanner = dynamic(() => import('@/components/operator/QrScanner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
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

  // Operator view — live QR scanner
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-700 flex flex-col">
      {/* Header */}
      <div className="px-5 pt-10 pb-6 text-white">
        <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-1">
          Operator
        </p>
        <h1 className="text-2xl font-bold">Scan Machine QR</h1>
        <p className="text-blue-200 text-sm mt-0.5">
          Hi, {profile?.name ?? user.email}
        </p>
      </div>

      {/* Scanner card */}
      <div className="flex-1 bg-gray-50 rounded-t-3xl px-5 pt-7 pb-10">
        <p className="text-xs text-gray-400 text-center mb-4">
          Point your camera at the QR code on the machine
        </p>
        <QrScanner />
      </div>
    </main>
  );
}
