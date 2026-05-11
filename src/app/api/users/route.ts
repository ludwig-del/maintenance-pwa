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

  // Check if email already exists in users table
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('user_id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'This email is already registered.' }, { status: 400 });
  }

  // Check if email already exists in Supabase Auth
  const { data: authList } = await supabaseAdmin.auth.admin.listUsers();
  const authExists = authList?.users?.find((u) => u.email === email);

  if (authExists) {
    // Auth user exists but not in users table — insert the missing row
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert({ user_id: authExists.id, name, role, email });

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json({ user_id: authExists.id }, { status: 201 });
  }

  // Create brand new auth user
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
