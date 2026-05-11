import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/user-names?ids=uuid1,uuid2,...
// Returns { [user_id]: name } — uses service role to bypass RLS
export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get('ids');
  if (!ids) return NextResponse.json({});

  const idList = ids.split(',').filter(Boolean);
  if (!idList.length) return NextResponse.json({});

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('user_id, name')
    .in('user_id', idList);

  if (error) return NextResponse.json({}, { status: 500 });

  const map: Record<string, string> = {};
  (data ?? []).forEach((u) => { map[u.user_id] = u.name; });
  return NextResponse.json(map);
}
