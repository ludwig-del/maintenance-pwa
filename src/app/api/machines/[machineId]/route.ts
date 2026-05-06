import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { machineId: string } }
) {
  try {
    const { name, location, photo_url } = await req.json();

    if (!name?.trim() || !location?.trim()) {
      return NextResponse.json({ error: 'Name and location are required' }, { status: 400 });
    }

    const update: Record<string, any> = { name: name.trim(), location: location.trim() };
    if (photo_url !== undefined) update.photo_url = photo_url;

    const { data, error } = await supabaseAdmin
      .from('machines')
      .update(update)
      .eq('machine_id', params.machineId)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[PATCH /api/machines]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { machineId: string } }
) {
  try {
    // Block if machine has open tickets
    const { data: open } = await supabaseAdmin
      .from('tickets')
      .select('ticket_id')
      .eq('machine_id', params.machineId)
      .in('status', ['Pending', 'In Progress'])
      .limit(1);

    if (open?.length) {
      return NextResponse.json(
        { error: 'Cannot delete — machine has open tickets. Resolve them first.' },
        { status: 409 }
      );
    }

    // Delete resolved tickets first to satisfy FK constraint, then delete machine
    await supabaseAdmin.from('tickets').delete().eq('machine_id', params.machineId);

    const { error } = await supabaseAdmin
      .from('machines')
      .delete()
      .eq('machine_id', params.machineId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/machines]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
