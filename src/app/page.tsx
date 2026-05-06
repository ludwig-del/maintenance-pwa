import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function HomePage() {
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

  if (profile?.role === 'technician') redirect('/technician');
  if (profile?.role === 'admin') redirect('/admin');

  // Operators land here — they access reports via QR code scan
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-sm w-full">
        <div className="text-6xl mb-4">📷</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Scan Machine QR Code</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Point your camera at the QR code on the machine to report an issue. The form will open automatically.
        </p>
      </div>
    </main>
  );
}
