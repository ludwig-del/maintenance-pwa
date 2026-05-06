import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ReportForm from '@/components/operator/ReportForm';

interface Props {
  params: { machineId: string };
}

export default async function ReportPage({ params }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: machine } = await supabase
    .from('machines')
    .select('name, location, status')
    .eq('machine_id', params.machineId)
    .single();

  if (!machine) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-gray-800">Machine Not Found</h1>
          <p className="text-gray-500 text-sm mt-2">Invalid QR code. Please scan again.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Report Issue</h1>
          <p className="text-sm text-gray-500 mt-1">
            {machine.name} — {machine.location}
          </p>
          {machine.status === 'down' && (
            <div className="mt-2 bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-3 py-2 rounded-lg">
              This machine is already marked as DOWN
            </div>
          )}
        </div>
        <ReportForm machineId={params.machineId} userId={user.id} />
      </div>
    </main>
  );
}
