import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { name, location, photo_url } = await req.json();

    if (!name?.trim() || !location?.trim()) {
      return NextResponse.json({ error: 'Name and location are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('machines')
      .insert({ name: name.trim(), location: location.trim(), status: 'active', photo_url: photo_url ?? null })
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/machines]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
