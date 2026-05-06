import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TaskBoard from '@/components/technician/TaskBoard';
import type { User } from '@/types';

export default async function TechnicianPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.role !== 'technician') redirect('/');

  return <TaskBoard currentUser={profile as User} />;
}
