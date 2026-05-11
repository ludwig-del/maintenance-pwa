import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function assertAdmin() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users').select('role, user_id').eq('user_id', user.id).single();
  if (data?.role !== 'admin') return null;
  return user.id;
}

export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  if (!(await assertAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { role } = await req.json();
  if (!role) return NextResponse.json({ error: 'Missing role' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('users')
    .update({ role })
    .eq('user_id', params.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { userId: string } }) {
  const callerId = await assertAdmin();
  if (!callerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (callerId === params.userId) {
    return NextResponse.json({ error: 'Cannot delete your own account.' }, { status: 400 });
  }

  // Check if user has any tickets (FK constraint would block deletion)
  const { count } = await supabaseAdmin
    .from('tickets')
    .select('ticket_id', { count: 'exact', head: true })
    .or(`operator_id.eq.${params.userId},technician_id.eq.${params.userId}`);

  if (count && count > 0) {
    // Has tickets — remove from auth only so they can't log in, keep users row for data integrity
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(params.userId);
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });
    return NextResponse.json({ hasTickets: true }, { status: 200 });
  }

  // No tickets — safe to fully delete
  const { error: dbError } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('user_id', params.userId);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(params.userId);
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
