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
  if (!user) return false;
  const { data } = await supabase.from('users').select('role').eq('user_id', user.id).single();
  return data?.role === 'admin';
}

export async function GET() {
  if (!(await assertAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('user_id, name, role, email, created_at')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!(await assertAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, email, password, role } = await req.json();

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Look up auth by email first (source of truth)
  const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const existingAuthUser = authList?.users?.find((u) => u.email === email);

  if (existingAuthUser) {
    // Auth user exists — check if they already have a users table row
    const { data: existingRow } = await supabaseAdmin
      .from('users')
      .select('user_id')
      .eq('user_id', existingAuthUser.id)
      .maybeSingle();

    if (existingRow) {
      return NextResponse.json({ error: 'This email is already registered.' }, { status: 400 });
    }

    // Auth exists but no users row — create the missing row (fix orphaned account)
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert({ user_id: existingAuthUser.id, name, role, email });

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json({ user_id: existingAuthUser.id }, { status: 201 });
  }

  // Completely new user — create auth account then users row
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  const { error: dbError } = await supabaseAdmin
    .from('users')
    .insert({ user_id: authData.user.id, name, role, email });

  if (dbError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ user_id: authData.user.id }, { status: 201 });
}
