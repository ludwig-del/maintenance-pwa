import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';

export default async function AdminPage() {
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

  if (!profile || profile.role !== 'admin') redirect('/');

  return <AdminShell name={profile.name ?? 'Admin'} />;
}
