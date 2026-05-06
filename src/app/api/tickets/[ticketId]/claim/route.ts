import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  try {
    const { technician_id } = await req.json();

    if (!technician_id) {
      return NextResponse.json({ error: 'technician_id required' }, { status: 400 });
    }

    // Claim the ticket (only if still Pending)
    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .update({
        status:        'In Progress',
        technician_id,
        started_at:    new Date().toISOString(),
      })
      .eq('ticket_id', params.ticketId)
      .eq('status', 'Pending')
      .select('machine_id')
      .single();

    if (error || !ticket) {
      return NextResponse.json({ error: 'Ticket not found or already claimed' }, { status: 409 });
    }

    // Technician is now on-site → machine moves to maintenance
    await supabaseAdmin
      .from('machines')
      .update({ status: 'maintenance' })
      .eq('machine_id', ticket.machine_id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[POST /api/tickets/claim]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
